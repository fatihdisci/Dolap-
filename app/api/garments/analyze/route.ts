import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { uploadFile } from '@/lib/drive';
import { removeBackground } from '@/lib/rembg';
import { analyzeGarment, type GarmentAnalysis } from '@/lib/gemini';
import type { StoredFolderIds } from '@/types';

export const maxDuration = 60;

const VARSAYILAN_ANALIZ: GarmentAnalysis = {
  kategori: 'üst',
  altKategori: '',
  renkler: [],
  desen: 'düz',
  mevsim: [],
};

// Yeni mimari: dosya client → Drive'a yüklenir (413 yok), bize sadece Drive ID gelir.
// Biz Drive'dan indirip Gemini'ye göndeririz.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken as string | undefined;
  if (!token) {
    return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 });
  }

  let body: { driveOrigId?: string; folderIds?: StoredFolderIds };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 });
  }

  const { driveOrigId, folderIds } = body;
  if (!driveOrigId || !folderIds) {
    return NextResponse.json({ error: 'driveOrigId veya folderIds eksik' }, { status: 400 });
  }

  try {
    // 1. Drive'dan orijinali indir (küçük sunucu içi istek, Vercel body limiti yok).
    const fileRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveOrigId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!fileRes.ok) {
      return NextResponse.json({ error: `Drive indirme hatası: ${fileRes.status}` }, { status: 502 });
    }
    const buffer = Buffer.from(await fileRes.arrayBuffer());

    // 2. rembg → izole PNG (REMBG_URL varsa; yoksa null).
    let driveIsoId: string | null = null;
    if (process.env.REMBG_URL) {
      try {
        const origBlob = new Blob([buffer], { type: 'image/jpeg' });
        const isoBlob = await removeBackground(origBlob, 'foto.jpg');
        const isoName = `${Date.now()}-iso.png`;
        driveIsoId = await uploadFile(isoName, folderIds.izole, isoBlob, 'image/png', token);
      } catch (err) {
        console.error('rembg hatası:', err);
      }
    }

    // 3. Gemini analiz.
    let analysis: GarmentAnalysis = VARSAYILAN_ANALIZ;
    let analizHatasi: string | null = null;
    try {
      analysis = await analyzeGarment(buffer.toString('base64'), 'image/jpeg');
    } catch (err) {
      analizHatasi = err instanceof Error ? err.message : String(err);
      console.error('Gemini analiz hatası:', analizHatasi);
    }

    return NextResponse.json({ driveOrigId, driveIsoId, analysis, folderIds, analizHatasi });
  } catch (err) {
    console.error('Analiz hatası:', err);
    return NextResponse.json({ error: 'Analiz sırasında hata oluştu' }, { status: 500 });
  }
}

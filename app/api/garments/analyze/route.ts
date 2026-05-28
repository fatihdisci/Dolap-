import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { setupDriveFolders, uploadFile } from '@/lib/drive';
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken as string | undefined;
  if (!token) {
    return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Geçersiz form verisi' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
  }

  // Klasör ID'leri client'tan gelebilir; yoksa kur (idempotent).
  let folderIds: StoredFolderIds;
  const folderIdsRaw = form.get('folderIds');
  if (typeof folderIdsRaw === 'string') {
    try {
      folderIds = JSON.parse(folderIdsRaw);
    } catch {
      folderIds = await setupDriveFolders(token);
    }
  } else {
    folderIds = await setupDriveFolders(token);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'image/jpeg';
    const baseName = `${Date.now()}-${(file.name || 'foto').replace(/[^\w.-]/g, '_')}`;

    // 1. Orijinali Drive'a yükle.
    const origBlob = new Blob([buffer], { type: mimeType });
    const driveOrigId = await uploadFile(baseName, folderIds.orijinal, origBlob, mimeType, token);

    // 2. rembg → izole PNG (best effort; başarısızsa null).
    let driveIsoId: string | null = null;
    try {
      const isoBlob = await removeBackground(origBlob, baseName);
      const isoName = baseName.replace(/\.[^.]+$/, '') + '.png';
      driveIsoId = await uploadFile(isoName, folderIds.izole, isoBlob, 'image/png', token);
    } catch (err) {
      console.error('rembg/izole hatası:', err);
    }

    // 3. Gemini analiz (best effort; başarısızsa varsayılan).
    let analysis: GarmentAnalysis = VARSAYILAN_ANALIZ;
    try {
      analysis = await analyzeGarment(buffer.toString('base64'), mimeType);
    } catch (err) {
      console.error('Gemini analiz hatası:', err);
    }

    return NextResponse.json({
      driveOrigId,
      driveIsoId,
      analysis,
      folderIds,
    });
  } catch (err) {
    console.error('Yükleme analiz hatası:', err);
    return NextResponse.json({ error: 'Yükleme sırasında hata oluştu' }, { status: 500 });
  }
}

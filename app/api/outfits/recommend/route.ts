import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { readMetadata } from '@/lib/drive';
import { recommendOutfits } from '@/lib/gemini';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken as string | undefined;
  if (!token) {
    return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 });
  }

  let body: { metadataId?: string; vesile?: string; mevsim?: string; hava?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }

  if (!body.metadataId) {
    return NextResponse.json({ error: 'metadataId eksik' }, { status: 400 });
  }

  try {
    const metadata = await readMetadata(body.metadataId, token);
    if (!metadata.garments.length) {
      return NextResponse.json({ recommendations: [] });
    }

    const recommendations = await recommendOutfits(metadata.garments, {
      vesile: body.vesile,
      mevsim: body.mevsim,
      hava: body.hava,
    });

    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error('Kombin önerisi hatası:', err);
    return NextResponse.json({ error: 'Öneri oluşturulamadı' }, { status: 500 });
  }
}

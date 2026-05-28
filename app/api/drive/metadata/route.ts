import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { readMetadata, writeMetadata } from '@/lib/drive';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 });
  }

  const metadataId = req.nextUrl.searchParams.get('id');
  if (!metadataId) return NextResponse.json({ error: 'id eksik' }, { status: 400 });

  try {
    const data = await readMetadata(metadataId, session.accessToken as string);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Drive readMetadata error:', err);
    return NextResponse.json({ error: 'Metadata okunamadı' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 });
  }

  const { metadataId, data } = await req.json();
  if (!metadataId || !data) return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 });

  try {
    await writeMetadata(metadataId, data, session.accessToken as string);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Drive writeMetadata error:', err);
    return NextResponse.json({ error: 'Metadata yazılamadı' }, { status: 500 });
  }
}

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { setupDriveFolders } from '@/lib/drive';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Oturum açılmamış' }, { status: 401 });
  }

  try {
    const ids = await setupDriveFolders(session.accessToken as string);
    return NextResponse.json(ids);
  } catch (err) {
    console.error('Drive setup error:', err);
    return NextResponse.json({ error: 'Drive kurulum hatası' }, { status: 500 });
  }
}

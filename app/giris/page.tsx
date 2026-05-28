'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogIn } from 'lucide-react';

export default function GirisPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--murekkep)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 px-6">
      <div className="text-center">
        <h1
          className="font-[var(--font-space-grotesk)] text-4xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          Dolap Stilisti
        </h1>
        <p className="mt-3 text-sm text-[var(--murekkep)] opacity-60">
          Kişisel akıllı gardırop asistanın
        </p>
      </div>

      <button
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--kenar)] bg-[var(--panel)] px-6 py-4 text-sm font-medium shadow-sm transition-all hover:shadow-md active:scale-95"
      >
        <LogIn size={20} />
        Google ile giriş yap
      </button>

      <p className="max-w-xs text-center text-xs text-[var(--murekkep)] opacity-40">
        Uygulama yalnızca kendi oluşturduğu Drive dosyalarına erişir.
      </p>
    </div>
  );
}

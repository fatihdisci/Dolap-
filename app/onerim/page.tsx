'use client';

import { AuthGuard } from '@/components/auth-guard';
import { Sparkles } from 'lucide-react';

export default function OnerimPage() {
  return (
    <AuthGuard>
      <div>
        <h1
          className="mb-6 text-2xl font-bold"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          Kombin Önerisi
        </h1>

        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <Sparkles size={56} strokeWidth={1} className="opacity-20" />
          <p className="text-sm opacity-50">Kombin önerisi yakında aktif olacak.</p>
        </div>
      </div>
    </AuthGuard>
  );
}

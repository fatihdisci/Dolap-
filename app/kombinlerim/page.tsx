'use client';

import { AuthGuard } from '@/components/auth-guard';
import { BookOpen } from 'lucide-react';

export default function KombinlerimPage() {
  return (
    <AuthGuard>
      <div>
        <h1
          className="mb-6 text-2xl font-bold"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          Kombinlerim
        </h1>

        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <BookOpen size={56} strokeWidth={1} className="opacity-20" />
          <p className="text-sm opacity-50">Kayıtlı kombin bulunamadı.</p>
        </div>
      </div>
    </AuthGuard>
  );
}

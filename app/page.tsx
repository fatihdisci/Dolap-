'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { GarmentImage } from '@/components/garment-image';
import { useStore } from '@/lib/store';
import type { Garment, Kategori } from '@/types';
import { Layers } from 'lucide-react';

const KATEGORİLER: { label: string; value: Kategori | 'tümü' }[] = [
  { label: 'Tümü', value: 'tümü' },
  { label: 'Üst', value: 'üst' },
  { label: 'Dış', value: 'dış' },
  { label: 'Alt', value: 'alt' },
  { label: 'Ayakkabı', value: 'ayakkabı' },
  { label: 'Aksesuar', value: 'aksesuar' },
];

function GarmentCard({ garment }: { garment: Garment }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--kenar)] bg-[var(--panel)] shadow-sm transition-shadow hover:shadow-md">
      <div className="aspect-square w-full bg-[var(--kenar)]">
        <GarmentImage garment={garment} className="h-full w-full object-cover" />
      </div>
      <div className="px-3 py-2">
        <p className="truncate text-xs font-medium capitalize">{garment.altKategori}</p>
        <p className="truncate text-xs opacity-50">{garment.renkler.join(', ')}</p>
      </div>
    </div>
  );
}

function DolabimContent() {
  const { state } = useStore();
  const [aktifKategori, setAktifKategori] = useState<Kategori | 'tümü'>('tümü');

  const garments = state.metadata?.garments ?? [];
  const filtered =
    aktifKategori === 'tümü'
      ? garments
      : garments.filter((g) => g.kategori === aktifKategori);

  return (
    <div>
      <h1
        className="mb-6 text-2xl font-bold"
        style={{ fontFamily: 'var(--font-space-grotesk)' }}
      >
        Dolabım
      </h1>

      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
        {KATEGORİLER.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setAktifKategori(value)}
            className={`cursor-pointer whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              aktifKategori === value
                ? 'border-[var(--murekkep)] bg-[var(--murekkep)] text-[var(--kum)]'
                : 'border-[var(--kenar)] bg-[var(--panel)] text-[var(--murekkep)] hover:border-[var(--murekkep)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <Layers size={56} strokeWidth={1} className="opacity-20" />
          <p className="text-sm opacity-50">
            {garments.length === 0
              ? 'Dolabın boş. İlk kıyafetini ekle!'
              : 'Bu kategoride kıyafet yok.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {filtered.map((g) => (
            <GarmentCard key={g.id} garment={g} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DolabimPage() {
  return (
    <AuthGuard>
      <DolabimContent />
    </AuthGuard>
  );
}

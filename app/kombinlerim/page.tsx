'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { GarmentImage } from '@/components/garment-image';
import { useStore } from '@/lib/store';
import { fetchMetadata, persistMetadata } from '@/lib/metadata-client';
import type { Garment } from '@/types';
import { BookOpen, Trash2, Loader2, Sparkles, Hand } from 'lucide-react';

function KombinlerimContent() {
  const { state, dispatch } = useStore();
  const garments = state.metadata?.garments ?? [];
  const outfits = state.metadata?.outfits ?? [];
  const byId = (id: string) => garments.find((g) => g.id === id);

  const [siliniyor, setSiliniyor] = useState<string | null>(null);

  async function sil(outfitId: string) {
    if (!state.folderIds) return;
    setSiliniyor(outfitId);
    try {
      const metadataId = state.folderIds.metadataId;
      const metadata = await fetchMetadata(metadataId);
      const yeni = {
        ...metadata,
        outfits: metadata.outfits.filter((o) => o.id !== outfitId),
        updatedAt: new Date().toISOString(),
      };
      await persistMetadata(metadataId, yeni);
      dispatch({ type: 'SET_METADATA', payload: yeni });
    } catch {
      // sessiz hata
    } finally {
      setSiliniyor(null);
    }
  }

  // En yeni en üstte
  const sirali = [...outfits].sort((a, b) => b.olusturma.localeCompare(a.olusturma));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
        Kombinlerim
      </h1>

      {sirali.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <BookOpen size={56} strokeWidth={1} className="opacity-20" />
          <p className="text-sm opacity-50">Kayıtlı kombin bulunamadı.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sirali.map((o) => {
            const parcalar = o.garmentIds.map(byId).filter(Boolean) as Garment[];
            return (
              <div key={o.id} className="rounded-xl border border-[var(--kenar)] bg-[var(--panel)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--kenar)] px-2.5 py-1 text-xs font-medium">
                    {o.kaynak === 'ai' ? <Sparkles size={13} /> : <Hand size={13} />}
                    {o.kaynak === 'ai' ? 'AI önerisi' : 'Senin seçimin'}
                  </span>
                  <button
                    onClick={() => sil(o.id)}
                    disabled={siliniyor === o.id}
                    aria-label="Kombini sil"
                    className="flex cursor-pointer items-center justify-center rounded-lg p-2 text-[var(--murekkep)] opacity-40 transition-opacity hover:opacity-100 disabled:opacity-30"
                  >
                    {siliniyor === o.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {parcalar.map((g) => (
                    <div
                      key={g.id}
                      className="aspect-square overflow-hidden rounded-lg border border-[var(--kenar)] bg-[var(--kum)] p-1"
                    >
                      <GarmentImage garment={g} className="h-full w-full object-contain" />
                    </div>
                  ))}
                </div>

                {o.not && <p className="mt-3 text-sm opacity-70">{o.not}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function KombinlerimPage() {
  return (
    <AuthGuard>
      <KombinlerimContent />
    </AuthGuard>
  );
}

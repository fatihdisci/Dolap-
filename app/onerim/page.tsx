'use client';

import { useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import { GarmentImage } from '@/components/garment-image';
import { useStore } from '@/lib/store';
import { fetchMetadata, persistMetadata, yeniId } from '@/lib/metadata-client';
import type { Garment, Outfit } from '@/types';
import { Sparkles, Loader2, Check, Hand, Wand2 } from 'lucide-react';

type Recommendation = { garmentIds: string[]; gerekce: string };

function FlatLay({ garments }: { garments: Garment[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {garments.map((g) => (
        <div
          key={g.id}
          className="aspect-square overflow-hidden rounded-lg border border-[var(--kenar)] bg-[var(--panel)] p-1"
        >
          <GarmentImage garment={g} className="h-full w-full object-contain" />
        </div>
      ))}
    </div>
  );
}

function OnerimContent() {
  const { state, dispatch } = useStore();
  const garments = state.metadata?.garments ?? [];
  const byId = (id: string) => garments.find((g) => g.id === id);

  const [mod, setMod] = useState<'ai' | 'manuel'>('ai');

  // --- AI modu
  const [vesile, setVesile] = useState('');
  const [mevsim, setMevsim] = useState('');
  const [hava, setHava] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [oneriler, setOneriler] = useState<Recommendation[]>([]);
  const [kaydedilenler, setKaydedilenler] = useState<Set<number>>(new Set());
  const [hata, setHata] = useState<string | null>(null);
  const [denendi, setDenendi] = useState(false);

  // --- Manuel mod
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [not, setNot] = useState('');
  const [manuelKaydediliyor, setManuelKaydediliyor] = useState(false);
  const [manuelKaydedildi, setManuelKaydedildi] = useState(false);

  async function oneriIste() {
    if (!state.folderIds) return;
    setYukleniyor(true);
    setHata(null);
    setDenendi(true);
    setOneriler([]);
    setKaydedilenler(new Set());
    try {
      const res = await fetch('/api/outfits/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadataId: state.folderIds.metadataId,
          vesile: vesile.trim() || undefined,
          mevsim: mevsim.trim() || undefined,
          hava: hava.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Öneri alınamadı');
      }
      const data = await res.json();
      setOneriler(data.recommendations || []);
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setYukleniyor(false);
    }
  }

  async function kombinKaydet(garmentIds: string[], gerekce: string, kaynak: 'ai' | 'kullanici') {
    if (!state.folderIds) return;
    try {
      const metadataId = state.folderIds.metadataId;
      const metadata = await fetchMetadata(metadataId);
      const outfit: Outfit = {
        id: yeniId(),
        garmentIds,
        kaynak,
        not: gerekce,
        olusturma: new Date().toISOString(),
      };
      const yeni = {
        ...metadata,
        outfits: [...metadata.outfits, outfit],
        updatedAt: new Date().toISOString(),
      };
      await persistMetadata(metadataId, yeni);
      dispatch({ type: 'SET_METADATA', payload: yeni });
      return true;
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Kaydetme başarısız');
      return false;
    }
  }

  async function aiKombinKaydet(idx: number) {
    const o = oneriler[idx];
    const ok = await kombinKaydet(o.garmentIds, o.gerekce, 'ai');
    if (ok) setKaydedilenler((prev) => new Set(prev).add(idx));
  }

  function seciliToggle(id: string) {
    setSecili((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setManuelKaydedildi(false);
  }

  async function manuelKaydet() {
    if (secili.size < 2) return;
    setManuelKaydediliyor(true);
    const ok = await kombinKaydet(Array.from(secili), not.trim(), 'kullanici');
    setManuelKaydediliyor(false);
    if (ok) {
      setManuelKaydedildi(true);
      setSecili(new Set());
      setNot('');
    }
  }

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
        Kombin Önerisi
      </h1>

      {/* Mod seçici */}
      <div className="mb-6 flex gap-2 rounded-xl border border-[var(--kenar)] bg-[var(--panel)] p-1">
        <button
          onClick={() => setMod('ai')}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            mod === 'ai' ? 'bg-[var(--murekkep)] text-[var(--kum)]' : 'text-[var(--murekkep)] hover:opacity-70'
          }`}
        >
          <Wand2 size={18} /> AI önersin
        </button>
        <button
          onClick={() => setMod('manuel')}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${
            mod === 'manuel' ? 'bg-[var(--murekkep)] text-[var(--kum)]' : 'text-[var(--murekkep)] hover:opacity-70'
          }`}
        >
          <Hand size={18} /> Kendim seçeyim
        </button>
      </div>

      {hata && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {hata}
        </div>
      )}

      {garments.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <Sparkles size={56} strokeWidth={1} className="opacity-20" />
          <p className="text-sm opacity-50">Önce dolabına kıyafet eklemelisin.</p>
        </div>
      )}

      {/* ---------------- AI MODU ---------------- */}
      {mod === 'ai' && garments.length > 0 && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-3">
            <Alan label="Vesile (isteğe bağlı)" value={vesile} onChange={setVesile} placeholder="iş toplantısı, gezme, davet…" />
            <div className="grid grid-cols-2 gap-3">
              <Alan label="Mevsim" value={mevsim} onChange={setMevsim} placeholder="yaz, kış…" />
              <Alan label="Hava" value={hava} onChange={setHava} placeholder="yağmurlu, sıcak…" />
            </div>
          </div>

          <button
            onClick={oneriIste}
            disabled={yukleniyor}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--murekkep)] py-3 text-sm font-medium text-[var(--kum)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {yukleniyor ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {yukleniyor ? 'Kombinler hazırlanıyor…' : 'Kombin öner'}
          </button>

          {oneriler.map((o, idx) => {
            const parcalar = o.garmentIds.map(byId).filter(Boolean) as Garment[];
            const kaydedildi = kaydedilenler.has(idx);
            return (
              <div key={idx} className="rounded-xl border border-[var(--kenar)] bg-[var(--panel)] p-4">
                <FlatLay garments={parcalar} />
                {o.gerekce && <p className="mt-3 text-sm opacity-70">{o.gerekce}</p>}
                <button
                  onClick={() => aiKombinKaydet(idx)}
                  disabled={kaydedildi}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--kenar)] py-2.5 text-sm font-medium transition-colors hover:border-[var(--murekkep)] disabled:opacity-50"
                >
                  <Check size={16} /> {kaydedildi ? 'Kaydedildi' : 'Kombini kaydet'}
                </button>
              </div>
            );
          })}

          {denendi && !yukleniyor && oneriler.length === 0 && !hata && (
            <p className="text-center text-sm opacity-50">Uygun kombin bulunamadı, farklı bir bağlam dene.</p>
          )}
        </div>
      )}

      {/* ---------------- MANUEL MOD ---------------- */}
      {mod === 'manuel' && garments.length > 0 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm opacity-60">Kombinde olmasını istediğin parçalara dokun.</p>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {garments.map((g) => {
              const aktif = secili.has(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => seciliToggle(g.id)}
                  className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg border-2 bg-[var(--panel)] p-1 transition-colors ${
                    aktif ? 'border-[var(--murekkep)]' : 'border-[var(--kenar)]'
                  }`}
                >
                  <GarmentImage garment={g} className="h-full w-full object-contain" />
                  {aktif && (
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--murekkep)] text-[var(--kum)]">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {secili.size > 0 && (
            <>
              <Alan label="Not (isteğe bağlı)" value={not} onChange={setNot} placeholder="hafta sonu kombini…" />
              <button
                onClick={manuelKaydet}
                disabled={secili.size < 2 || manuelKaydediliyor}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--murekkep)] py-3 text-sm font-medium text-[var(--kum)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {manuelKaydediliyor ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                {secili.size < 2 ? 'En az 2 parça seç' : `Kombini kaydet (${secili.size})`}
              </button>
            </>
          )}

          {manuelKaydedildi && (
            <p className="text-center text-sm font-medium text-[var(--murekkep)]">Kombin kaydedildi.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Alan({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium opacity-60">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--kenar)] bg-[var(--panel)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--murekkep)]"
      />
    </div>
  );
}

export default function OnerimPage() {
  return (
    <AuthGuard>
      <OnerimContent />
    </AuthGuard>
  );
}

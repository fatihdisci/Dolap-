'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { useStore } from '@/lib/store';
import type { Garment, Kategori, Mevsim, Metadata } from '@/types';
import { ImagePlus, Loader2, Check, RotateCcw } from 'lucide-react';

const KATEGORILER: Kategori[] = ['üst', 'dış', 'alt', 'ayakkabı', 'aksesuar'];
const MEVSIMLER: Mevsim[] = ['ilkbahar', 'yaz', 'sonbahar', 'kış'];

type AnalyzeResult = {
  driveOrigId: string;
  driveIsoId: string | null;
  analysis: {
    kategori: Kategori;
    altKategori: string;
    renkler: string[];
    desen: string;
    mevsim: Mevsim[];
  };
  folderIds: { root: string; orijinal: string; izole: string; metadataId: string };
};

type Step = 'select' | 'analyzing' | 'review' | 'saving' | 'done';

function YukleContent() {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  // Düzenlenebilir analiz alanları
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [kategori, setKategori] = useState<Kategori>('üst');
  const [altKategori, setAltKategori] = useState('');
  const [renkler, setRenkler] = useState('');
  const [desen, setDesen] = useState('');
  const [mevsim, setMevsim] = useState<Mevsim[]>([]);
  const [etiketler, setEtiketler] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function sifirla() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setStep('select');
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setHata(null);
    setKategori('üst');
    setAltKategori('');
    setRenkler('');
    setDesen('');
    setMevsim([]);
    setEtiketler('');
  }

  function fotoSec(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setHata(null);
  }

  async function analizEt() {
    if (!file) return;
    setStep('analyzing');
    setHata(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (state.folderIds) form.append('folderIds', JSON.stringify(state.folderIds));

      const res = await fetch('/api/garments/analyze', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Analiz başarısız');
      }
      const data: AnalyzeResult = await res.json();
      setResult(data);
      dispatch({ type: 'SET_FOLDER_IDS', payload: data.folderIds });

      setKategori(data.analysis.kategori);
      setAltKategori(data.analysis.altKategori);
      setRenkler(data.analysis.renkler.join(', '));
      setDesen(data.analysis.desen);
      setMevsim(data.analysis.mevsim);
      setStep('review');
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Bir hata oluştu');
      setStep('select');
    }
  }

  async function kaydet() {
    if (!result) return;
    setStep('saving');
    setHata(null);
    try {
      const metadataId = result.folderIds.metadataId;

      // Güncel metadata'yı Drive'dan oku (en güvenilir kaynak).
      const mRes = await fetch(`/api/drive/metadata?id=${metadataId}`);
      if (!mRes.ok) throw new Error('Metadata okunamadı');
      const metadata: Metadata = await mRes.json();

      const garment: Garment = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}`,
        driveOrigId: result.driveOrigId,
        driveIsoId: result.driveIsoId,
        kategori,
        altKategori: altKategori.trim(),
        renkler: renkler.split(',').map((s) => s.trim()).filter(Boolean),
        desen: desen.trim() || 'düz',
        mevsim,
        etiketler: etiketler.split(',').map((s) => s.trim()).filter(Boolean),
        olusturma: new Date().toISOString(),
      };

      const yeniMetadata: Metadata = {
        ...metadata,
        garments: [...metadata.garments, garment],
        updatedAt: new Date().toISOString(),
      };

      const saveRes = await fetch('/api/drive/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadataId, data: yeniMetadata }),
      });
      if (!saveRes.ok) throw new Error('Kaydetme başarısız');

      dispatch({ type: 'SET_METADATA', payload: yeniMetadata });
      setStep('done');
    } catch (err) {
      setHata(err instanceof Error ? err.message : 'Bir hata oluştu');
      setStep('review');
    }
  }

  function mevsimToggle(m: Mevsim) {
    setMevsim((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  // ----------------------------------------------------------- render
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
        Kıyafet Ekle
      </h1>

      {hata && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {hata}
        </div>
      )}

      {/* Önizleme / foto seçimi */}
      <div className="mb-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={fotoSec}
          className="hidden"
        />
        {previewUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-[var(--kenar)] bg-[var(--panel)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Seçilen fotoğraf" className="max-h-80 w-full object-contain" />
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[var(--kenar)] bg-[var(--panel)] py-16 text-[var(--murekkep)] opacity-60 transition-colors hover:opacity-100"
          >
            <ImagePlus size={40} strokeWidth={1.5} />
            <span className="text-sm font-medium">Fotoğraf seç veya çek</span>
          </button>
        )}
      </div>

      {/* Adıma göre aksiyonlar */}
      {step === 'select' && previewUrl && (
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--kenar)] bg-[var(--panel)] py-3 text-sm font-medium transition-colors hover:border-[var(--murekkep)]"
          >
            <RotateCcw size={18} /> Değiştir
          </button>
          <button
            onClick={analizEt}
            className="flex flex-[2] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--murekkep)] py-3 text-sm font-medium text-[var(--kum)] transition-opacity hover:opacity-90"
          >
            Analiz Et
          </button>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 size={28} className="animate-spin opacity-60" />
          <p className="text-sm opacity-60">Analiz ediliyor — arka plan siliniyor ve etiketleniyor…</p>
        </div>
      )}

      {(step === 'review' || step === 'saving') && (
        <div className="flex flex-col gap-5">
          {/* Kategori */}
          <div>
            <label className="mb-2 block text-xs font-medium opacity-60">Kategori</label>
            <div className="flex flex-wrap gap-2">
              {KATEGORILER.map((k) => (
                <button
                  key={k}
                  onClick={() => setKategori(k)}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                    kategori === k
                      ? 'border-[var(--murekkep)] bg-[var(--murekkep)] text-[var(--kum)]'
                      : 'border-[var(--kenar)] bg-[var(--panel)] hover:border-[var(--murekkep)]'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <Alan label="Alt kategori" value={altKategori} onChange={setAltKategori} placeholder="tişört, ceket, jean…" />
          <Alan label="Renkler (virgülle)" value={renkler} onChange={setRenkler} placeholder="lacivert, beyaz" />
          <Alan label="Desen" value={desen} onChange={setDesen} placeholder="düz, çizgili, ekose…" />

          {/* Mevsim */}
          <div>
            <label className="mb-2 block text-xs font-medium opacity-60">Mevsim</label>
            <div className="flex flex-wrap gap-2">
              {MEVSIMLER.map((m) => (
                <button
                  key={m}
                  onClick={() => mevsimToggle(m)}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                    mevsim.includes(m)
                      ? 'border-[var(--murekkep)] bg-[var(--murekkep)] text-[var(--kum)]'
                      : 'border-[var(--kenar)] bg-[var(--panel)] hover:border-[var(--murekkep)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <Alan label="Etiketler (virgülle, isteğe bağlı)" value={etiketler} onChange={setEtiketler} placeholder="favori, spor" />

          {result && !result.driveIsoId && (
            <p className="text-xs text-amber-600">
              Arka plan silinemedi; orijinal görsel kullanılacak.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={sifirla}
              disabled={step === 'saving'}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--kenar)] bg-[var(--panel)] py-3 text-sm font-medium transition-colors hover:border-[var(--murekkep)] disabled:opacity-50"
            >
              İptal
            </button>
            <button
              onClick={kaydet}
              disabled={step === 'saving'}
              className="flex flex-[2] cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--murekkep)] py-3 text-sm font-medium text-[var(--kum)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {step === 'saving' ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {step === 'saving' ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--murekkep)] text-[var(--kum)]">
            <Check size={28} />
          </div>
          <p className="text-sm font-medium">Kıyafet dolabına eklendi.</p>
          <div className="flex w-full gap-3">
            <button
              onClick={sifirla}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--kenar)] bg-[var(--panel)] py-3 text-sm font-medium transition-colors hover:border-[var(--murekkep)]"
            >
              <ImagePlus size={18} /> Yeni ekle
            </button>
            <button
              onClick={() => router.push('/')}
              className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--murekkep)] py-3 text-sm font-medium text-[var(--kum)] transition-opacity hover:opacity-90"
            >
              Dolabıma git
            </button>
          </div>
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

export default function YuklePage() {
  return (
    <AuthGuard>
      <YukleContent />
    </AuthGuard>
  );
}

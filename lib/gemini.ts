import type { Kategori, Mevsim, Garment } from '@/types';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

export type GarmentAnalysis = {
  kategori: Kategori;
  altKategori: string;
  renkler: string[];
  desen: string;
  mevsim: Mevsim[];
};

const ANALYSIS_PROMPT = `Bu bir kıyafet fotoğrafı. Kıyafeti analiz et ve aşağıdaki alanları doldur:
- kategori: üst, dış, alt, ayakkabı veya aksesuar
- altKategori: spesifik tür (tişört, gömlek, ceket, jean, etek, sneaker, kemer vb.)
- renkler: baskın renkler (Türkçe, en fazla 3)
- desen: düz, çizgili, ekose, baskılı, kareli veya benzeri
- mevsim: bu kıyafetin uygun olduğu mevsimler (ilkbahar, yaz, sonbahar, kış)
Sadece JSON döndür.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    kategori: {
      type: 'STRING',
      enum: ['üst', 'dış', 'alt', 'ayakkabı', 'aksesuar'],
    },
    altKategori: { type: 'STRING' },
    renkler: { type: 'ARRAY', items: { type: 'STRING' } },
    desen: { type: 'STRING' },
    mevsim: {
      type: 'ARRAY',
      items: {
        type: 'STRING',
        enum: ['ilkbahar', 'yaz', 'sonbahar', 'kış'],
      },
    },
  },
  required: ['kategori', 'altKategori', 'renkler', 'desen', 'mevsim'],
};

export async function analyzeGarment(
  imageBase64: string,
  mimeType: string,
): Promise<GarmentAnalysis> {
  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: ANALYSIS_PROMPT },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini analyze → ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini boş yanıt döndü');

  return JSON.parse(raw) as GarmentAnalysis;
}

// ------------------------------------------------------------- kombin önerisi
export type OutfitRecommendation = {
  garmentIds: string[];
  gerekce: string;
};

export type RecommendContext = {
  vesile?: string;
  mevsim?: string;
  hava?: string;
};

const RECOMMEND_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      garmentIds: { type: 'ARRAY', items: { type: 'STRING' } },
      gerekce: { type: 'STRING' },
    },
    required: ['garmentIds', 'gerekce'],
  },
};

export async function recommendOutfits(
  garments: Garment[],
  context: RecommendContext,
): Promise<OutfitRecommendation[]> {
  // Sadece metin gönderiyoruz — görsel YOK.
  const liste = garments.map((g) => ({
    id: g.id,
    kategori: g.kategori,
    altKategori: g.altKategori,
    renkler: g.renkler,
    desen: g.desen,
    mevsim: g.mevsim,
  }));

  const baglam: string[] = [];
  if (context.vesile) baglam.push(`Vesile: ${context.vesile}`);
  if (context.mevsim) baglam.push(`Mevsim: ${context.mevsim}`);
  if (context.hava) baglam.push(`Hava durumu: ${context.hava}`);

  const prompt = `Aşağıda bir kişinin gardırobundaki kıyafetler JSON listesi olarak veriliyor.${
    baglam.length ? '\nBağlam: ' + baglam.join(', ') + '.' : ''
  }
Bu kıyafetlerden uyumlu 3-5 kombin oluştur. Her kombin en az bir üst ve bir alt (veya elbise gibi tek parça) içermeli; uygunsa ayakkabı, dış giyim ve aksesuar ekle.
Renk ve desen uyumunu, mevsim/vesile uygunluğunu gözet.
Sadece aşağıda verilen id değerlerini kullan. Her kombin için kısa, net Türkçe bir gerekçe yaz.

Kıyafetler:
${JSON.stringify(liste)}`;

  const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RECOMMEND_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini recommend → ${res.status}: ${text}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini boş yanıt döndü');

  const parsed = JSON.parse(raw) as OutfitRecommendation[];
  const gecerliIdler = new Set(garments.map((g) => g.id));

  // Sadece var olan id'leri içeren ve en az 2 parçalı kombinleri tut.
  return parsed
    .map((o) => ({
      garmentIds: (o.garmentIds || []).filter((id) => gecerliIdler.has(id)),
      gerekce: o.gerekce || '',
    }))
    .filter((o) => o.garmentIds.length >= 2);
}

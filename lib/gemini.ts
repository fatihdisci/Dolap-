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

// responseSchema ile Türkçe enum değerleri Gemini structured output'u bozuyor.
// JSON mime type + açık prompt yeterli; parsing tarafımızda yapılıyor.
const ANALYSIS_PROMPT = `Analyze this clothing photo and return ONLY a JSON object with these exact fields:

{
  "kategori": "ust" | "dis" | "alt" | "ayakkabi" | "aksesuar",
  "altKategori": "<specific type in Turkish: polo, gomlek, tshirt, ceket, pantolon, jean, etek, sneaker, kemer, etc.>",
  "renkler": ["<color1 in Turkish>", "<color2 if present>"],
  "desen": "<pattern in Turkish: duz, cizgili, ekose, baskili, kareli, cicekli, etc.>",
  "mevsim": ["<season(s) in Turkish: ilkbahar | yaz | sonbahar | kis>"]
}

Rules:
- kategori must be one of: ust, dis, alt, ayakkabi, aksesuar
- renkler: list dominant colors in Turkish (max 3)
- desen: describe the pattern/print
- mevsim: list suitable seasons
- Return ONLY the JSON, no markdown, no explanation.`;

// Gemini'den gelen kısa İngilizce/ASCII değerleri Türkçe karşılıklarına dönüştür.
const KATEGORI_MAP: Record<string, Kategori> = {
  ust: 'üst', üst: 'üst',
  dis: 'dış', dış: 'dış',
  alt: 'alt',
  ayakkabi: 'ayakkabı', ayakkabı: 'ayakkabı',
  aksesuar: 'aksesuar',
  top: 'üst', upper: 'üst', shirt: 'üst', tshirt: 'üst',
  outer: 'dış', jacket: 'dış', coat: 'dış',
  bottom: 'alt', pants: 'alt', skirt: 'alt',
  shoes: 'ayakkabı', footwear: 'ayakkabı',
  accessory: 'aksesuar',
};

const MEVSIM_MAP: Record<string, Mevsim> = {
  ilkbahar: 'ilkbahar', spring: 'ilkbahar',
  yaz: 'yaz', summer: 'yaz',
  sonbahar: 'sonbahar', autumn: 'sonbahar', fall: 'sonbahar',
  kis: 'kış', kış: 'kış', winter: 'kış',
};

function normalizeKategori(raw: string): Kategori {
  return KATEGORI_MAP[raw?.toLowerCase()?.trim()] ?? 'üst';
}

function normalizeMevsim(raw: unknown[]): Mevsim[] {
  return (raw || [])
    .map((v) => MEVSIM_MAP[String(v).toLowerCase().trim()])
    .filter(Boolean) as Mevsim[];
}

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
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini analyze → ${res.status}: ${text}`);
  }

  const data = await res.json();

  // Bazı modellerde text yerine parts[0].text boş gelir; farklı yerleri dene.
  const rawText: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
    '';

  if (!rawText) {
    const reason = data?.candidates?.[0]?.finishReason ?? 'unknown';
    throw new Error(`Gemini boş yanıt (finishReason: ${reason})`);
  }

  // JSON kod bloğu içinde gelebilir (```json ... ```)
  const jsonStr = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(jsonStr);

  return {
    kategori: normalizeKategori(parsed.kategori),
    altKategori: String(parsed.altKategori ?? '').trim(),
    renkler: (parsed.renkler ?? []).map((r: unknown) => String(r).trim()).filter(Boolean),
    desen: String(parsed.desen ?? 'düz').trim() || 'düz',
    mevsim: normalizeMevsim(parsed.mevsim ?? []),
  };
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

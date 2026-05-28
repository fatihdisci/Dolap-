import type { Kategori, Mevsim } from '@/types';

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

# Dolap Stilisti

Kişisel akıllı gardırop uygulaması. Tek kullanıcı, Vercel'e deploy edilir.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind v3
- **Google OAuth** — `drive.file` scope; auth ve depolama tek elden
- **Gemini 2.5 Flash-Lite** — görsel anlama + kombin önerisi
- **rembg** (Hugging Face Space) — arka plan silme
- **Google Drive** — tek depolama katmanı (veritabanı yok)

## Mimari

| Katman | Detay |
|--------|-------|
| Depolama | Drive'da `Dolap Stilisti/` klasörü; `metadata.json`, `orijinal/`, `izole/` |
| Görsel yükleme | Drive API → Blob → `URL.createObjectURL` → IndexedDB cache |
| AI | Gemini, tüm çağrılar server-side route handler'larından |
| Arka plan silme | `POST ${REMBG_URL}` multipart, yanıt şeffaf PNG |

## Sayfalar

| Yol | Açıklama |
|-----|----------|
| `/` | Dolabım — kategori filtreli kıyafet grid'i |
| `/yukle` | Fotoğraf yükle → rembg + Gemini analiz → Drive'a kaydet |
| `/onerim` | AI veya manuel kombin oluştur |
| `/kombinlerim` | Kayıtlı kombinler |

## Kurulum

```bash
cp .env.example .env.local
# .env.local içindeki değerleri doldur
npm install
npm run dev
```

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `GEMINI_API_KEY` | Google AI Studio API anahtarı |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `NEXTAUTH_SECRET` | NextAuth imzalama anahtarı (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Uygulama URL'si (prod'da Vercel URL'si) |
| `REMBG_URL` | rembg Hugging Face Space endpoint'i |

## Google Cloud kurulumu

1. Google Cloud Console → OAuth 2.0 Credentials oluştur
2. Authorized redirect URIs: `{NEXTAUTH_URL}/api/auth/callback/google`
3. Scope: `https://www.googleapis.com/auth/drive.file`

## Vercel deploy

```bash
vercel --prod
```

Vercel'de yukarıdaki ortam değişkenlerini tanımla; `NEXTAUTH_URL`'i Vercel'in verdiği URL ile güncelle.

## Geliştirme durumu

- [x] Adım 1: Repo iskeleti, layout, fontlar, renk değişkenleri, 4 boş sayfa
- [x] Adım 2: Google OAuth (`drive.file`), Drive klasör kurulumu, `metadata.json` okuma
- [x] Adım 3: Yükleme akışı (rembg + Gemini + Drive) — foto seç → analiz → kategori onayı → kaydet
- [ ] Adım 4: Kombin önerisi sayfası
- [ ] Adım 5: Kayıtlı kombinler + manuel seçim
- [ ] Adım 6: PWA manifest + service worker + IndexedDB cache (temel kurulum hazır)

## Yükleme akışı (Adım 3)

1. `/yukle` → fotoğraf seç/çek → "Analiz Et"
2. `POST /api/garments/analyze` (server-side):
   - Orijinali Drive `orijinal/` klasörüne yükler → `driveOrigId`
   - `REMBG_URL`'e gönderir, şeffaf PNG'yi `izole/` klasörüne yükler → `driveIsoId` (best effort)
   - Gemini 2.5 Flash-Lite ile structured JSON analiz: `{ kategori, altKategori, renkler, desen, mevsim }`
3. Kullanıcı kategori/etiketleri onaylar/düzenler → "Kaydet"
4. `metadata.json` okunur, yeni garment eklenir, Drive'a yazılır
5. Dolabım grid'inde izole PNG görünür (Drive blob → IndexedDB cache)

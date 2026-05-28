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

## Ortam değişkenleri (6 adet)

| Değişken | Nereden alınır |
|----------|----------------|
| `GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → "Create API key" |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Aynı OAuth client ekranı |
| `NEXTAUTH_SECRET` | Terminalde `openssl rand -base64 32` (veya herhangi rastgele uzun string) |
| `NEXTAUTH_URL` | Uygulamanın tam URL'si. Prod'da Vercel domaini: `https://<proje>.vercel.app` |
| `REMBG_URL` | rembg çalıştıran Hugging Face Space endpoint'i (PNG döndüren `/` POST adresi) |

Detaylı adım adım kurulum için aşağıdaki **Deploy rehberi**ne bak.

## Deploy rehberi (sıfırdan canlıya)

### 1) Gemini API key
1. [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → giriş yap
2. **Create API key** → kopyala → `GEMINI_API_KEY`

### 2) Google OAuth (Cloud Console)
1. [console.cloud.google.com](https://console.cloud.google.com) → yeni proje oluştur
2. **APIs & Services → Library** → "Google Drive API" → **Enable**
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**, uygulama adı: "Dolap Stilisti"
   - Scopes ekle: `.../auth/drive.file`
   - Test users: kendi Gmail adresini ekle (yayınlamadan sadece sen kullanırsın)
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs** olarak şunu ekle:
     `https://<proje>.vercel.app/api/auth/callback/google`
     (Vercel URL'ini deploy'dan sonra öğrenip buraya geri gel.)
   - Oluştur → **Client ID** ve **Client Secret**'i kopyala

### 3) rembg servisi (Hugging Face Space)
1. [huggingface.co/spaces](https://huggingface.co/spaces) → arka plan silen bir rembg Space'i duplicate et
2. Space'in multipart `file` alanı kabul edip `image/png` döndüren endpoint URL'sini `REMBG_URL` yap
   (Yoksa bu alan boş kalabilir; yükleme yine çalışır, sadece izole PNG yerine orijinal kullanılır.)

### 4) Vercel'e bağla
1. [vercel.com/new](https://vercel.com/new) → GitHub'dan `fatihdisci/Dolap-` reposunu **Import**
2. Framework otomatik **Next.js** algılanır → **Deploy**
3. İlk deploy bitince Vercel sana `https://<proje>.vercel.app` URL'sini verir

### 5) Environment Variables ekle
Vercel → proje → **Settings → Environment Variables** → 6 değişkeni de ekle
(Production + Preview seçili). `NEXTAUTH_URL`'i 4. adımdaki Vercel URL'i yap.
Sonra **Deployments → en üstteki → Redeploy** ile yeniden yayınla.

### 6) Redirect URI'yi güncelle
2. adımdaki OAuth client'a dönüp Vercel URL'inle redirect URI'yi (varsa) düzelt:
`https://<proje>.vercel.app/api/auth/callback/google`

Artık `https://<proje>.vercel.app` → "Google ile giriş yap" → çalışır.

## Lokal geliştirme (opsiyonel)

```bash
cp .env.example .env.local   # değerleri doldur, NEXTAUTH_URL=http://localhost:3000
# Cloud Console'da redirect URI'ye http://localhost:3000/api/auth/callback/google ekle
npm install
npm run dev
```

## Geliştirme durumu

- [x] Adım 1: Repo iskeleti, layout, fontlar, renk değişkenleri, 4 boş sayfa
- [x] Adım 2: Google OAuth (`drive.file`), Drive klasör kurulumu, `metadata.json` okuma
- [x] Adım 3: Yükleme akışı (rembg + Gemini + Drive) — foto seç → analiz → kategori onayı → kaydet
- [x] Adım 4: Kombin önerisi sayfası (AI önersin + flat-lay grid)
- [x] Adım 5: Kayıtlı kombinler + manuel seçim modu
- [x] Adım 6: PWA manifest + service worker + IndexedDB cache + ikonlar

## Yükleme akışı (Adım 3)

1. `/yukle` → fotoğraf seç/çek → "Analiz Et"
2. `POST /api/garments/analyze` (server-side):
   - Orijinali Drive `orijinal/` klasörüne yükler → `driveOrigId`
   - `REMBG_URL`'e gönderir, şeffaf PNG'yi `izole/` klasörüne yükler → `driveIsoId` (best effort)
   - Gemini 2.5 Flash-Lite ile structured JSON analiz: `{ kategori, altKategori, renkler, desen, mevsim }`
3. Kullanıcı kategori/etiketleri onaylar/düzenler → "Kaydet"
4. `metadata.json` okunur, yeni garment eklenir, Drive'a yazılır
5. Dolabım grid'inde izole PNG görünür (Drive blob → IndexedDB cache)

## Kombin önerisi (Adım 4 & 5)

- **AI önersin**: `/onerim` → vesile/mevsim/hava gir → `POST /api/outfits/recommend`
  → server metadata'daki tüm garments'ı (sadece metin, görsel YOK) Gemini'ye yollar,
  3-5 kombin döner `[{ garmentIds, gerekce }]` → flat-lay grid'de gerçek izole PNG'ler.
  "Kombini kaydet" → `outfits`'e `kaynak: 'ai'` eklenir.
- **Kendim seçeyim**: dolaptan parça seç → flat-lay → not ekle → `kaynak: 'kullanici'` kaydet.
- **Kombinlerim**: kayıtlı kombinler flat-lay olarak listelenir, silinebilir.

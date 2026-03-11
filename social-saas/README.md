# SocialSaaS

Startup'ların Reddit, Instagram, TikTok ve YouTube Shorts'ta içerik oluşturup yayınlamasını sağlayan SaaS platformu.

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Auth | Firebase Authentication |
| Veritabanı | Firestore |
| Dosya Depolama | Firebase Storage |
| AI | Claude (`claude-sonnet-4-6`, Anthropic SDK) |
| Worker | Firebase Cloud Functions |
| Deploy | Vercel |
| Test | Jest + Testing Library |

---

## Kurulum

```bash
git clone <repo>
cd social-saas
npm install
cp .env.example .env.local
# .env.local dosyasını doldurun
npm run dev
```

---

## Ortam Değişkenleri

`.env.example` dosyasını kopyalayın ve doldurun:

| Değişken | Nereden Alınır |
|----------|---------------|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Console → Proje Ayarları |
| `TOKEN_ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `REDDIT_*` | reddit.com/prefs/apps |
| `GOOGLE_*` | Google Cloud Console |
| `TIKTOK_*` | TikTok Developer Portal |
| `META_*` | Meta Developer Portal |
| `ANTHROPIC_API_KEY` | console.anthropic.com |

---

## Komutlar

```bash
npm run dev           # Geliştirme sunucusu (localhost:3000)
npm run build         # Production build
npm run test          # Tüm testleri koş
npm run test:coverage # Kapsam raporu ile test
npm run lint          # ESLint kontrol
```

---

## Test Sonuçları

Son çalıştırma — **17/17 geçti** ✅

```
Test Suites: 3 passed, 3 total
Tests:       17 passed, 17 total
Snapshots:   0 total
Time:        1.473 s
```

| Test Dosyası | Test Sayısı | Kapsam |
|-------------|------------|--------|
| `utils.test.ts` | 4 | `cn()` — class birleştirme, Tailwind merge |
| `schemas.test.ts` | 7 | `BrandProfileSchema` Zod validasyonu |
| `types.test.ts` | 6 | TypeScript tip tanımları runtime kontrolü |

---

## Proje Yapısı

```
src/
  app/                    # Next.js App Router
  components/
    ui/                   # Ortak UI bileşenleri
    layout/               # Header, Sidebar
  lib/
    firebase/
      config.ts           # Auth, Firestore, Storage init
      workspace.ts        # Workspace & BrandProfile CRUD
    schemas/
      brand.ts            # Zod şemaları
    utils.ts              # cn() utility
  types/
    index.ts              # Tüm TypeScript tipleri
  __tests__/              # Test dosyaları
firestore.rules           # Firestore güvenlik kuralları
.env.example              # Ortam değişkeni şablonu
```

---

## Faz Durumu

| Faz | Başlık | Durum |
|-----|--------|-------|
| 1 | Proje Kurulumu | ✅ Tamamlandı |
| 2 | Temel Ürün Yapısı | ⬜ Bekliyor |
| 3 | Hesap Bağlantısı (OAuth) | ⬜ Bekliyor |
| 4 | Marka Zekâsı Girişi | ⬜ Bekliyor |
| 5 | İçerik Fikri Üretimi | ⬜ Bekliyor |
| 6 | Platform Özel Dönüşüm | ⬜ Bekliyor |
| 7 | Reddit Araştırma Akışı | ⬜ Bekliyor |
| 8 | İçerik Stüdyosu | ⬜ Bekliyor |
| 9 | Medya Üretim Katmanı | ⬜ Bekliyor |
| 10 | Onay Sistemi | ⬜ Bekliyor |
| 11 | Yayın Kuyruğu | ⬜ Bekliyor |
| 12 | Platform Yayıncıları | ⬜ Bekliyor |
| 13 | Worker Sistemi | ⬜ Bekliyor |
| 14 | Dashboard ve Takip | ⬜ Bekliyor |
| 15 | Güvenlik Kuralları | ⬜ Bekliyor |
| 16 | MVP Kapsam Kontrolü | ⬜ Bekliyor |

Ayrıntılı uygulama planı: [`../IMPLEMENTATION_PLAN.md`](../IMPLEMENTATION_PLAN.md)

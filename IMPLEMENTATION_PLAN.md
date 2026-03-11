# SaaS Social Media Content Platform — Uygulama Planı

Startupların Reddit, Instagram, TikTok ve YouTube Shorts'ta içerik oluşturup yayınlamasını sağlayan SaaS uygulaması.

---

## Durum Takibi

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

---

## Faz 1 — Proje Kurulumu

### Adım 1: Next.js Uygulaması Oluştur

```bash
npx create-next-app@latest social-saas \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**Kurulacak paketler:**
```bash
npm install firebase firebase-admin
npm install @radix-ui/react-* lucide-react
npm install clsx tailwind-merge
npm install zod react-hook-form @hookform/resolvers
npm install date-fns
npm install -D @types/node
```

**Klasör yapısı:**
```
src/
  app/                   # Next.js App Router sayfaları
  components/            # UI bileşenleri
    ui/                  # Ortak UI elemanları
    layout/              # Header, Sidebar, vb.
  lib/                   # Yardımcı fonksiyonlar
    firebase/            # Firebase config & helpers
    api/                 # API yardımcıları
  types/                 # TypeScript tip tanımları
  hooks/                 # Custom React hooks
  store/                 # State yönetimi (Zustand)
```

**Tamamlandı mı?** ✅ — `social-saas/` oluşturuldu, tüm paketler kuruldu

---

### Adım 2: Firebase Kurulumu

**Firebase Console'da yapılacaklar:**
1. Yeni proje oluştur: `social-saas`
2. Authentication → Email/Password ve Google'ı aktifleştir
3. Firestore Database → Production mode'da oluştur
4. Storage → Oluştur ve kuralları yapılandır

**`src/lib/firebase/config.ts`:**
```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
```

**Firestore Güvenlik Kuralları (`firestore.rules`):**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /workspaces/{workspaceId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.memberIds;
    }
    match /workspaces/{workspaceId}/{document=**} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/workspaces/$(workspaceId)) &&
        request.auth.uid in get(/databases/$(database)/documents/workspaces/$(workspaceId)).data.memberIds;
    }
  }
}
```

**Tamamlandı mı?** ⬜

---

### Adım 3: Vercel Deployment

```bash
npm install -g vercel
vercel login
vercel --prod
```

- Vercel Dashboard'da environment variable'ları ekle
- Custom domain bağla (opsiyonel)
- Preview deployments için GitHub bağlantısı kur

**Tamamlandı mı?** ⏳ — Firebase key'leri hazır olduğunda yapılacak

---

### Adım 4: Environment Config

**`.env.local`:**
```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=

# Reddit OAuth
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REDIRECT_URI=http://localhost:3000/api/oauth/reddit/callback

# Google / YouTube OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/google/callback

# TikTok OAuth
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=http://localhost:3000/api/oauth/tiktok/callback

# Meta / Instagram OAuth
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/api/oauth/instagram/callback

# Claude AI (Anthropic)
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**`.env.example`** dosyası da oluştur (değerleri boş bırak, git'e ekle).

**Tamamlandı mı?** ✅ — `.env.local` ve `.env.example` oluşturuldu, tüm değişkenler tanımlandı

---

## Faz 2 — Temel Ürün Yapısı

### Adım 5: Firestore Veri Modelleri

**`src/types/index.ts`** — Tüm tip tanımları:

```typescript
// Kullanıcı
interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  workspaceIds: string[]
  createdAt: Timestamp
}

// Workspace
interface Workspace {
  id: string
  name: string
  ownerUid: string
  memberIds: string[]
  brandProfileId?: string
  createdAt: Timestamp
}

// Marka Profili
interface BrandProfile {
  id: string
  workspaceId: string
  productName: string
  productDescription: string
  website: string
  targetAudience: string
  toneOfVoice: 'professional' | 'casual' | 'humorous' | 'educational'
  competitors: string[]
  examplePosts: string[]
  forbiddenTerms: string[]
  ctaStyle: string
  updatedAt: Timestamp
}

// Bağlı Hesap
interface ConnectedAccount {
  id: string
  workspaceId: string
  platform: 'reddit' | 'instagram' | 'tiktok' | 'youtube'
  accountName: string
  accountId: string
  scopes: string[]
  tokenRef: string        // Firestore'daki şifreli token referansı
  refreshTokenRef: string
  expiresAt: Timestamp
  status: 'connected' | 'expired' | 'error'
}

// İçerik Fikri
interface ContentIdea {
  id: string
  workspaceId: string
  brandProfileId: string
  title: string
  angle: 'pain_point' | 'feature' | 'educational' | 'comparison' | 'founder' | 'launch'
  platforms: Platform[]
  status: 'draft' | 'generating' | 'ready'
  createdAt: Timestamp
}

// Asset (Platform Özel İçerik)
interface Asset {
  id: string
  workspaceId: string
  ideaId: string
  platform: Platform
  type: 'text' | 'carousel' | 'image' | 'video' | 'reddit_reply'
  content: Record<string, unknown>  // Platform özel içerik
  status: ApprovalStatus
  storageRef?: string
  createdAt: Timestamp
}

// Onay Görevi
interface ApprovalTask {
  id: string
  workspaceId: string
  assetId: string
  assignedTo: string
  status: ApprovalStatus
  reviewedAt?: Timestamp
  notes?: string
}

// Yayın İşi
interface PublishJob {
  id: string
  workspaceId: string
  platform: Platform
  assetId: string
  accountId: string
  mode: 'direct' | 'draft' | 'scheduled'
  scheduledAt?: Timestamp
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying'
  externalPostId?: string
  error?: string
  createdAt: Timestamp
}

// Reddit Lead
interface RedditLead {
  id: string
  workspaceId: string
  subreddit: string
  postId: string
  postTitle: string
  postUrl: string
  snippet: string
  summary: string
  intent: 'question' | 'complaint' | 'recommendation' | 'discussion'
  riskScore: number        // 0-10
  suggestedReply: string
  status: 'pending' | 'approved' | 'skipped' | 'published'
  publishedAt?: Timestamp
}

type Platform = 'reddit' | 'instagram' | 'tiktok' | 'youtube'
type ApprovalStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published'
```

**Tamamlandı mı?** ⬜

---

### Adım 6: Temel Uygulama Sayfaları

**`src/app/` klasör yapısı:**
```
app/
  (auth)/
    login/page.tsx
    signup/page.tsx
  (app)/
    layout.tsx               # Sidebar + Header layout
    onboarding/page.tsx
    dashboard/page.tsx
    research/page.tsx        # Reddit Research Inbox
    studio/page.tsx          # Content Studio
    approvals/page.tsx       # Approval Center
    calendar/page.tsx        # Publish Queue / Calendar
    settings/
      page.tsx
      accounts/page.tsx      # Connected Accounts
      brand/page.tsx         # Brand Profile
  api/
    oauth/
      reddit/
        route.ts
        callback/route.ts
      google/
        route.ts
        callback/route.ts
      tiktok/
        route.ts
        callback/route.ts
      instagram/
        route.ts
        callback/route.ts
    generate/
      ideas/route.ts
      content/route.ts
    reddit/
      scan/route.ts
      reply/route.ts
    publish/
      route.ts
```

**Her sayfa için temel bileşenler:**
- `(auth)/login/page.tsx` → Firebase Auth ile Google + Email login
- `(app)/layout.tsx` → Sidebar navigasyonu, kullanıcı menüsü
- `dashboard/page.tsx` → Widget grid layout
- `research/page.tsx` → Reddit lead listesi ve onay UI'ı
- `studio/page.tsx` → İçerik fikir kartları ve draft editörü
- `approvals/page.tsx` → Onay bekleyen öğeler listesi
- `calendar/page.tsx` → Takvim + Kuyruk görünümü

**Tamamlandı mı?** ⬜

---

### Adım 7: Workspace Akışı

**`src/app/(app)/onboarding/page.tsx`** — 3 adımlı form:

1. **Workspace Adı** → Firestore'a `workspaces` dökümanı yaz
2. **Ürün/Marka Bilgisi** → `brandProfiles` dökümanı yaz
3. **Ton, Hedef Kitle, CTA** → Brand profilini tamamla

**Firestore yazma işlevi (`src/lib/firebase/workspace.ts`):**
```typescript
export async function createWorkspace(uid: string, name: string) {
  const ref = doc(collection(db, 'workspaces'))
  await setDoc(ref, {
    id: ref.id,
    name,
    ownerUid: uid,
    memberIds: [uid],
    createdAt: serverTimestamp(),
  })
  // users dökümanındaki workspaceIds'e ekle
  await updateDoc(doc(db, 'users', uid), {
    workspaceIds: arrayUnion(ref.id),
  })
  return ref.id
}
```

**Tamamlandı mı?** ⬜

---

## Faz 3 — Hesap Bağlantısı (OAuth)

### Adım 8: OAuth Akışları

Her platform için Authorization Code Flow uygulanacak.

**Reddit OAuth (`src/app/api/oauth/reddit/route.ts`):**
```typescript
// GET /api/oauth/reddit → Reddit auth URL'ine yönlendir
const authUrl = `https://www.reddit.com/api/v1/authorize?` +
  `client_id=${process.env.REDDIT_CLIENT_ID}` +
  `&response_type=code` +
  `&state=${csrfToken}` +
  `&redirect_uri=${encodeURIComponent(REDDIT_REDIRECT_URI)}` +
  `&duration=permanent` +
  `&scope=identity,submit,read`
```

**Callback handler (`src/app/api/oauth/reddit/callback/route.ts`):**
```typescript
// 1. code parametresini al
// 2. Reddit'ten access_token ve refresh_token al
// 3. Firestore'daki connectedAccounts koleksiyonuna yaz
// 4. Token'ı encrypt edip sakla (Firebase Secret Manager veya KMS)
// 5. /settings/accounts sayfasına yönlendir
```

**Her platform için gerekli izinler:**
| Platform | Gerekli Scopes |
|----------|---------------|
| Reddit | `identity`, `submit`, `read` |
| YouTube | `youtube.upload`, `youtube.readonly` |
| TikTok | `video.upload`, `user.info.basic` |
| Instagram | `instagram_basic`, `instagram_content_publish` |

**Tamamlandı mı?** ⬜

---

### Adım 9: Token Saklama

**`src/lib/crypto.ts`** — Token şifreleme:
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, 'hex')

export function encryptToken(token: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, SECRET, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map(b => b.toString('hex')).join(':')
}

export function decryptToken(encrypted: string): string {
  const [ivHex, tagHex, encHex] = encrypted.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv(ALGORITHM, SECRET, iv)
  decipher.setAuthTag(tag)
  return decipher.update(enc) + decipher.final('utf8')
}
```

Firestore'da `connectedAccounts/{id}/tokens` alt koleksiyonuna şifreli hâlde yaz.

**Tamamlandı mı?** ⬜

---

### Adım 10: Bağlantı Durumu Yönetimi

**`src/lib/firebase/accounts.ts`:**
- Token süresini kontrol eden `checkTokenExpiry()` fonksiyonu
- Otomatik refresh token yenileme
- Hata durumunda Firestore'da `status: 'error'` yaz

**UI'da gösterim (`src/components/AccountCard.tsx`):**
```
🟢 Bağlı      → status: connected
🟡 Süresi Dolmuş → status: expired  → "Yeniden Bağlan" butonu
🔴 Hata       → status: error    → hata mesajı + destek linki
```

**Tamamlandı mı?** ⬜

---

## Faz 4 — Marka Zekâsı Girişi

### Adım 11: Onboarding Formu

**`src/app/(app)/settings/brand/page.tsx`** — Form alanları:

| Alan | Tip | Açıklama |
|------|-----|---------|
| `productName` | string | Ürün/Startup adı |
| `productDescription` | textarea | Ne yapıyor, nasıl çalışıyor |
| `website` | url | Web sitesi |
| `targetAudience` | textarea | Kim için (ICP) |
| `toneOfVoice` | select | Professional / Casual / Humorous / Educational |
| `competitors` | tag input | Rakip ürünler |
| `examplePosts` | textarea | Beğenilen örnek gönderiler |
| `forbiddenTerms` | tag input | Kullanılmaması gereken kelimeler |
| `ctaStyle` | textarea | "Ücretsiz dene", "Demo iste", vb. |

**Zod şeması (`src/lib/schemas/brand.ts`):**
```typescript
export const BrandProfileSchema = z.object({
  productName: z.string().min(2).max(100),
  productDescription: z.string().min(50).max(2000),
  website: z.string().url(),
  targetAudience: z.string().min(20).max(1000),
  toneOfVoice: z.enum(['professional', 'casual', 'humorous', 'educational']),
  competitors: z.array(z.string()).max(10),
  examplePosts: z.array(z.string()).max(5),
  forbiddenTerms: z.array(z.string()).max(50),
  ctaStyle: z.string().max(500),
})
```

**Tamamlandı mı?** ⬜

---

### Adım 12: Marka Profilini Kaydet

- Form submit → Firestore `brandProfiles` koleksiyonuna yaz
- `workspace.brandProfileId` alanını güncelle
- Tüm üretim akışlarında bu profil kullanılacak

**Tamamlandı mı?** ⬜

---

## Faz 5 — İçerik Fikri Üretimi

### Adım 13: Fikir Üretim API'si

**`src/app/api/generate/ideas/route.ts`:**

```typescript
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  const { workspaceId, platforms } = await req.json()

  // Firestore'dan brand profile al
  const brandProfile = await getBrandProfile(workspaceId)

  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: buildIdeaGenerationPrompt(brandProfile, platforms),
    }],
  })

  // Parse edilen fikirleri Firestore'a yaz
  const ideas = parseIdeasFromResponse(message.content)
  await saveIdeas(workspaceId, ideas)

  return Response.json({ ideas })
}
```

**Prompt şablonu:**
```
Sen bir içerik stratejisti olarak şu startup için içerik fikirleri üret:

Ürün: {productName}
Açıklama: {productDescription}
Hedef kitle: {targetAudience}
Ton: {toneOfVoice}
Platformlar: {platforms}

Her platform için şu kategorilerden fikirler üret:
- Acı nokta gönderileri (pain points)
- Özellik vurguları
- Eğitici içerik
- Ürün karşılaştırmaları
- Kurucu hikâyeleri
- Lansman duyuruları

JSON formatında döndür: [{title, angle, platforms, hooks}]
```

**Tamamlandı mı?** ⬜

---

### Adım 14: Fikir Kategorileri

Her fikir için `angle` alanı:
- `pain_point` → Kullanıcının yaşadığı sorunlar
- `feature` → Ürünün öne çıkan özellikleri
- `educational` → Nasıl yapılır, ipuçları
- `comparison` → Alternatiflere göre fark
- `founder` → Kurucu hikâyesi ve vizyon
- `launch` → Yeni özellik veya güncelleme

**Tamamlandı mı?** ⬜

---

### Adım 15: Fikirleri Firestore'a Kaydet

**`src/lib/firebase/ideas.ts`:**
```typescript
export async function saveIdeas(workspaceId: string, ideas: ContentIdea[]) {
  const batch = writeBatch(db)
  ideas.forEach(idea => {
    const ref = doc(collection(db, 'workspaces', workspaceId, 'contentIdeas'))
    batch.set(ref, { ...idea, id: ref.id, createdAt: serverTimestamp() })
  })
  await batch.commit()
}
```

**Tamamlandı mı?** ⬜

---

## Faz 6 — Platform Özel Dönüşüm

### Adım 16: Platform İçerik Üretimi

**`src/app/api/generate/content/route.ts`** — Her platform için ayrı prompt:

**Instagram içeriği:**
```
Bu fikir için Instagram içeriği üret:
{idea}

Şunları oluştur:
1. Carousel outline (5-7 slayt, her biri başlık + içerik)
2. Post caption (max 2200 karakter, hashtag dahil)
3. Static image caption (kısa, dikkat çekici)
4. Reel konsepti (30 saniyelik video fikri, hook + içerik + CTA)

JSON formatında döndür.
```

**TikTok içeriği:**
```
Bu fikir için TikTok içeriği üret:
{idea}

Şunları oluştur:
1. Hook (ilk 3 saniye, dikkat çekici açılış)
2. Kısa script (30-60 saniyelik, konuşma metni)
3. Speaking points (5-7 madde)
4. Caption (max 150 karakter)
5. Hashtags (5-10 adet, trend + niche)

JSON formatında döndür.
```

**YouTube Shorts içeriği:**
```
Bu fikir için YouTube Shorts içeriği üret:
{idea}

Şunları oluştur:
1. Video scripti (60 saniyelik, tam metin)
2. Başlık alternatifleri (3 adet, SEO odaklı)
3. Description (500 karakter, anahtar kelimeler dahil)
4. Hook (ilk 5 saniye)
5. CTA (son 10 saniye)

JSON formatında döndür.
```

**Reddit içeriği:**
```
Bu fikir için Reddit içeriği üret:
{idea}
Marka tonu: {tone}
Yasak terimler: {forbiddenTerms}

Şunları oluştur:
1. Post taslağı (başlık + içerik, doğal ve samimi)
2. Reply taslağı (kısa, faydalı, tanıtım içermez)
3. Yumuşak CTA versiyonu (ince tanıtım içerir)
4. Non-promotional versiyonu (hiç tanıtım yok)

JSON formatında döndür.
```

**Tamamlandı mı?** ⬜

---

## Faz 7 — Reddit Araştırma Akışı

### Adım 17: Reddit Tarama Modülü

**`src/app/api/reddit/scan/route.ts`:**
```typescript
export async function POST(req: Request) {
  const { workspaceId, subreddits, keywords } = await req.json()

  // Reddit API'sinden post ve yorum çek
  const posts = await fetchRedditPosts(subreddits, keywords)

  // Her post için AI analizi yap
  const leads = await analyzePostsWithAI(posts, brandProfile)

  // Firestore'a kaydet
  await saveRedditLeads(workspaceId, leads)

  return Response.json({ count: leads.length })
}
```

**Tamamlandı mı?** ⬜

---

### Adım 18: Reddit API Entegrasyonu

**`src/lib/reddit/client.ts`:**
```typescript
export class RedditClient {
  private accessToken: string

  async searchPosts(subreddit: string, query: string) {
    const res = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/search?q=${query}&sort=new&limit=25`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    )
    return res.json()
  }

  async getComments(postId: string) {
    const res = await fetch(
      `https://oauth.reddit.com/comments/${postId}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    )
    return res.json()
  }
}
```

**Tamamlandı mı?** ⬜

---

### Adım 19: Post Analizi

Claude ile her Reddit postu için:
- Bağlam özeti (1-2 cümle)
- Intent sınıflandırma: `question | complaint | recommendation | discussion`
- Risk skoru (0-10): 0 = güvenli, 10 = riskli/spam gibi görünür

**Tamamlandı mı?** ⬜

---

### Adım 20: Yanıt Taslağı Üretimi

```typescript
const replyPrompt = `
Sen bu Reddit postuna yanıt vereceksin.
Post: {postTitle}
İçerik: {postBody}
Marka profili: {brandProfile}

Faydalı, doğal ve spam gibi görünmeyen bir yanıt yaz.
Risk skoru: {riskScore}/10 olan bu post için uygun tonu seç.
Max 3 paragraf, sohbet tarzı.
`
```

**Tamamlandı mı?** ⬜

---

### Adım 21: Research Inbox UI

**`src/app/(app)/research/page.tsx`** — Bileşenler:

```
┌─────────────────────────────────────────────────────────┐
│ Research Inbox                         [Yeni Tarama]    │
├─────────────────────────────────────────────────────────┤
│ Filtreler: [Tümü] [Bekliyor] [Onaylandı] [Atlandı]    │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │ r/startups  ·  Risk: 2/10  ·  intent: question    │ │
│ │ "What's the best tool for social media automation?" │ │
│ │                                                     │ │
│ │ Özet: Kullanıcı otomasyon aracı arıyor...          │ │
│ │                                                     │ │
│ │ Önerilen Yanıt:                                     │ │
│ │ ┌─────────────────────────────────────────────────┐ │ │
│ │ │ [Düzenlenebilir metin alanı]                   │ │ │
│ │ └─────────────────────────────────────────────────┘ │ │
│ │                                                     │ │
│ │ [✓ Onayla & Yayınla]  [✎ Düzenle]  [✗ Atla]    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Tamamlandı mı?** ⬜

---

### Adım 22: Onay Zorunluluğu

- Kullanıcı yanıtı gönderene kadar Reddit'e hiçbir şey yayınlanmaz
- "Onayla" butonu → `status: approved` → publish kuyruğuna ekle
- "Atla" → `status: skipped` → gizle
- "Düzenle" → inline editör → kaydet → tekrar onay sor

**Tamamlandı mı?** ⬜

---

## Faz 8 — İçerik Stüdyosu

### Adım 23: Content Studio UI

**`src/app/(app)/studio/page.tsx`:**

```
┌─────────────────────────────────────────────────────────┐
│ Content Studio                      [+ Yeni Fikir]      │
├──────────────────┬──────────────────────────────────────┤
│ FİKİRLER         │ TASLAK EDİTÖRÜ                       │
│                  │                                       │
│ ┌──────────────┐ │ Platform: [Instagram ▼]              │
│ │ Acı Noktası  │ │                                       │
│ │ #1           │ │ Caption:                             │
│ │              │ │ ┌───────────────────────────────────┐ │
│ │ Instagram ✓  │ │ │ [Düzenlenebilir içerik]          │ │
│ │ TikTok ✓    │ │ └───────────────────────────────────┘ │
│ │ YouTube ✓   │ │                                       │
│ └──────────────┘ │ [✓ Onayla]  [✗ Reddet]  [↑ Yayınla]│
│                  │                                       │
│ ┌──────────────┐ │                                       │
│ │ Özellik      │ │                                       │
│ │ Vurgusu #2  │ │                                       │
│ └──────────────┘ │                                       │
└──────────────────┴──────────────────────────────────────┘
```

**Tamamlandı mı?** ⬜

---

### Adım 24: Asset Tipleri

Her asset tipi için ayrı editör bileşeni:

| Tip | Bileşen | İçerik |
|-----|---------|--------|
| `text` | `TextDraftEditor` | Düz metin, markdown |
| `carousel` | `CarouselDraftEditor` | Slayt listesi, sırala/düzenle |
| `image` | `ImageDraftViewer` | Önizleme + caption editörü |
| `video` | `VideoDraftViewer` | Script gösterimi |
| `reddit_reply` | `RedditReplyEditor` | Reply metni + orijinal post |

**Tamamlandı mı?** ⬜

---

## Faz 9 — Medya Üretim Katmanı

### Adım 25: Template Tabanlı Medya

**Instagram Carousel şablonu (`src/lib/media/carousel.ts`):**
- `canvas` veya `@napi-rs/canvas` ile Node.js'te görsel üret
- Her slayt: başlık + alt metin + marka rengi/logo

**Şablon tipleri:**
1. `quote` — Alıntı + marka logosu
2. `tip` — "İpucu #1" formatı
3. `comparison` — "Önce / Sonra" veya "Biz / Onlar"
4. `stats` — Büyük rakam + açıklama

**Tamamlandı mı?** ⬜

---

### Adım 26: Firebase Storage'a Yükle

```typescript
export async function uploadMedia(buffer: Buffer, path: string): Promise<string> {
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, buffer, { contentType: 'image/png' })
  return getDownloadURL(storageRef)
}
```

**Tamamlandı mı?** ⬜

---

### Adım 27: Asset Referanslarını Kaydet

```typescript
await updateDoc(doc(db, 'workspaces', workspaceId, 'assets', assetId), {
  storageRef: storagePath,
  downloadUrl: publicUrl,
  status: 'ready',
})
```

**Tamamlandı mı?** ⬜

---

## Faz 10 — Onay Sistemi

### Adım 28: Onay Akışı

**Durum makinesi:**
```
draft → pending_approval → approved → published
                       ↘ rejected → draft (düzenleme için)
```

**`src/lib/firebase/approvals.ts`:**
```typescript
export async function submitForApproval(assetId: string, workspaceId: string) {
  await updateDoc(doc(db, 'workspaces', workspaceId, 'assets', assetId), {
    status: 'pending_approval',
  })
  await addDoc(collection(db, 'workspaces', workspaceId, 'approvalTasks'), {
    assetId,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}
```

**Tamamlandı mı?** ⬜

---

### Adım 29: Approval Center Sayfası

**`src/app/(app)/approvals/page.tsx`:**
- Bekleyen tüm öğelerin listesi
- Platform ikonu + içerik özeti + zaman damgası
- Satır içi önizleme
- Toplu onay seçeneği

**Tamamlandı mı?** ⬜

---

### Adım 30: Onay Zorunluluğu

Tüm platformlar için publish işlemi başlamadan önce `status === 'approved'` kontrolü.

**`src/lib/publish/guard.ts`:**
```typescript
export async function assertApproved(assetId: string, workspaceId: string) {
  const asset = await getAsset(assetId, workspaceId)
  if (asset.status !== 'approved') {
    throw new Error(`Asset ${assetId} henüz onaylanmadı.`)
  }
}
```

**Tamamlandı mı?** ⬜

---

## Faz 11 — Yayın Kuyruğu

### Adım 31: publishJobs Koleksiyonu

Firestore şeması:
```typescript
{
  id: string,
  workspaceId: string,
  platform: 'reddit' | 'instagram' | 'tiktok' | 'youtube',
  assetId: string,
  accountId: string,
  mode: 'direct' | 'draft' | 'scheduled',
  scheduledAt?: Timestamp,
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'retrying',
  externalPostId?: string,
  error?: string,
  attemptCount: number,
  createdAt: Timestamp,
}
```

**Tamamlandı mı?** ⬜

---

### Adım 32: Yayın Modları

| Mod | Davranış |
|-----|---------|
| `direct` | Hemen yayınla |
| `draft` | Platform tarafında taslak olarak kaydet |
| `scheduled` | `scheduledAt` zamanında yayınla |

**Tamamlandı mı?** ⬜

---

### Adım 33: Worker Dispatch Mantığı

**`src/lib/worker/dispatcher.ts`:**
```typescript
export async function processJob(job: PublishJob) {
  const adapter = getAdapter(job.platform)  // reddit | instagram | tiktok | youtube

  try {
    await updateJobStatus(job.id, 'processing')
    const externalId = await adapter.publish(job)
    await updateJobStatus(job.id, 'completed', { externalPostId: externalId })
  } catch (err) {
    if (job.attemptCount < 3) {
      await updateJobStatus(job.id, 'retrying')
      await scheduleRetry(job, exponentialBackoff(job.attemptCount))
    } else {
      await updateJobStatus(job.id, 'failed', { error: err.message })
    }
  }
}
```

**Tamamlandı mı?** ⬜

---

## Faz 12 — Platform Yayıncıları

### Adım 34: Publisher Adaptörleri

**Reddit Publisher (`src/lib/publishers/reddit.ts`):**
```typescript
export async function publishRedditReply(job: PublishJob, token: string) {
  const asset = await getAsset(job.assetId, job.workspaceId)
  const res = await fetch('https://oauth.reddit.com/api/comment', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      parent: asset.content.parentId,  // Yanıt verilecek post/yorum ID'si
      text: asset.content.replyText,
    }),
  })
  const data = await res.json()
  return data.json.data.things[0].data.name  // External ID
}
```

**Instagram Publisher (`src/lib/publishers/instagram.ts`):**
```typescript
// Meta Graph API üzerinden
// 1. Media container oluştur
// 2. Container'ı publish et
```

**TikTok Publisher (`src/lib/publishers/tiktok.ts`):**
```typescript
// TikTok Content Posting API
// Video upload veya draft olarak kaydet
```

**YouTube Publisher (`src/lib/publishers/youtube.ts`):**
```typescript
// YouTube Data API v3
// Videos.insert endpoint ile upload
```

**Tamamlandı mı?** ⬜

---

### Adım 35: External ID ve Durum Kaydetme

```typescript
await updateDoc(doc(db, 'workspaces', workspaceId, 'publishJobs', jobId), {
  status: 'completed',
  externalPostId,
  completedAt: serverTimestamp(),
})

await updateDoc(doc(db, 'workspaces', workspaceId, 'assets', assetId), {
  status: 'published',
  publishedAt: serverTimestamp(),
})
```

**Tamamlandı mı?** ⬜

---

## Faz 13 — Worker Sistemi

### Adım 36: Worker Görevleri

| Görev | Tetikleyici | Süre |
|-------|-------------|------|
| Reddit tarama | Manuel / zamanlanmış | 1-5 dk |
| İçerik üretimi | Kullanıcı talebi | 30-60 sn |
| Medya render | Asset oluşturulduğunda | 10-30 sn |
| Zamanlanmış publish | Cron job | Sürekli |
| Token yenileme | Expiry kontrolü | Günlük |

**Tamamlandı mı?** ⬜

---

### Adım 37: Firebase Functions ile Worker

**`functions/src/index.ts`:**
```typescript
// Zamanlanmış Reddit tarama
export const scheduledRedditScan = onSchedule('every 6 hours', async () => {
  const workspaces = await getActiveWorkspaces()
  for (const workspace of workspaces) {
    await triggerRedditScan(workspace.id)
  }
})

// Yayın kuyruğu işleyici
export const processPublishQueue = onDocumentCreated(
  'workspaces/{workspaceId}/publishJobs/{jobId}',
  async (event) => {
    const job = event.data?.data() as PublishJob
    if (job.mode === 'direct') {
      await processJob(job)
    }
  }
)
```

**Tamamlandı mı?** ⬜

---

### Adım 38: Job Yaşam Döngüsü

```
queued → processing → completed
              ↘ failed (3 deneme sonrası)
              ↘ retrying (1-2. deneme)
```

**Retry stratejisi:** Exponential backoff — 1dk, 5dk, 15dk

**Tamamlandı mı?** ⬜

---

## Faz 14 — Dashboard ve Takip

### Adım 39: Dashboard Widget'ları

**`src/app/(app)/dashboard/page.tsx`:**

| Widget | Veri Kaynağı |
|--------|-------------|
| Bağlı Hesaplar | `connectedAccounts` |
| Kuyrukta Bekleyenler | `publishJobs` where status=queued |
| Onay Bekleyenler | `approvalTasks` where status=pending |
| Son Yayınlananlar | `publishJobs` where status=completed, limit 5 |
| Reddit Fırsatları | `redditLeads` where status=pending |

**Tamamlandı mı?** ⬜

---

### Adım 40: Analitik Veri Modeli

**`postAnalytics` koleksiyonu:**
```typescript
{
  assetId: string,
  platform: Platform,
  externalPostId: string,
  views: number,
  likes: number,
  comments: number,
  shares: number,
  saves: number,
  collectedAt: Timestamp,
}
```

**Tamamlandı mı?** ⬜

---

### Adım 41: Basit Analitik Gösterimi

- Platform başına performans kartları
- Son 7 günde yayınlanan içerik özeti
- En yüksek etkileşimli post

**Tamamlandı mı?** ⬜

---

## Faz 15 — Güvenlik Kuralları

### Adım 42: Yayın Öncesi Doğrulama

**`src/lib/guardrails/validator.ts`:**
```typescript
export async function validateContent(content: string, brandProfile: BrandProfile) {
  const issues: ValidationIssue[] = []

  // Yasak terim kontrolü
  brandProfile.forbiddenTerms.forEach(term => {
    if (content.toLowerCase().includes(term.toLowerCase())) {
      issues.push({ type: 'forbidden_term', term, severity: 'error' })
    }
  })

  // Duplicate yanıt kontrolü (Reddit)
  const isDuplicate = await checkDuplicateReply(content)
  if (isDuplicate) {
    issues.push({ type: 'duplicate', severity: 'error' })
  }

  // Aşırı tanıtım tespiti (Claude ile)
  const promotionScore = await scorePromotion(content)
  if (promotionScore > 7) {
    issues.push({ type: 'overly_promotional', score: promotionScore, severity: 'warning' })
  }

  return issues
}
```

**Tamamlandı mı?** ⬜

---

### Adım 43: Platform Özel Kontroller

| Platform | Kontrol |
|----------|---------|
| Tümü | Süresi dolmuş token kontrolü |
| Instagram | Medya formatı (JPEG/MP4), boyut limiti |
| TikTok | Video süresi (max 60sn), format |
| YouTube | Video kalitesi, dosya boyutu |
| Reddit | Rate limit (10 dk/yorum kuralı), subreddit kuralları |

**Tamamlandı mı?** ⬜

---

## Faz 16 — MVP Kapsam Kontrolü

### Adım 44: MVP'ye Dahil

- [x] Marka onboarding formu
- [x] Hesap bağlantısı (4 platform)
- [x] İçerik fikri üretimi (AI)
- [x] Reddit araştırma inbox'ı
- [x] Reddit yanıt önerisi ve onay
- [x] Instagram carousel taslakları
- [x] TikTok / YouTube kısa script'leri
- [x] Onay sistemi
- [x] Yayın kuyruğu

### Adım 45: MVP Dışında Bırakılanlar

- [ ] Gelişmiş analitik dashboard
- [ ] Onaysız tam otomatik yayın
- [ ] Karmaşık video düzenleme arayüzü
- [ ] Çok kullanıcılı ekip izinleri
- [ ] Ajans white-label modu

---

## Teknoloji Yığını Özeti

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS |
| Auth | Firebase Authentication |
| Veritabanı | Firestore |
| Dosya Depolama | Firebase Storage |
| AI | Claude (Anthropic SDK — `claude-sonnet-4-6`) |
| Worker | Firebase Cloud Functions |
| Deploy | Vercel (frontend), Firebase (backend) |
| OAuth | Reddit, Google/YouTube, TikTok, Meta/Instagram |

---

## Geliştirme Sırası (Önerilen)

```
Adım 1-4   → Proje altyapısı
Adım 5-7   → Veri modelleri ve temel sayfalar
Adım 8-10  → OAuth bağlantıları
Adım 11-12 → Marka profili formu
Adım 13-15 → AI ile fikir üretimi
Adım 17-22 → Reddit araştırma akışı  ← MVP kalbi
Adım 16    → Platform içerik üretimi
Adım 23-24 → İçerik stüdyosu UI
Adım 25-27 → Medya şablonları
Adım 28-30 → Onay sistemi
Adım 31-35 → Yayın kuyruğu ve yayıncılar
Adım 36-38 → Worker sistemi
Adım 39-41 → Dashboard ve analitik
Adım 42-43 → Güvenlik kuralları
```

---

*Bu dosya adım adım güncellenerek tamamlanan adımlar ✅ olarak işaretlenecek.*

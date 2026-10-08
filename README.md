# saas-s

[![CI](https://github.com/AliKaracabey/saas-s/actions/workflows/ci.yml/badge.svg)](https://github.com/AliKaracabey/saas-s/actions/workflows/ci.yml)

Her SaaS ürününün ihtiyaç duyduğu ortak altyapıyı (kimlik doğrulama, ekipler, roller, abonelik, testler) içeren yeniden kullanılabilir bir başlangıç şablonu. Adım adım geliştiriliyor; her aşama ayrı bir pull request olarak eklenir.

## Teknolojiler

Next.js 15 (App Router) · TypeScript (strict) · PostgreSQL 17 · Zod · Tailwind CSS · Vitest · ESLint + Prettier · GitHub Actions

## Kurulum

Gerekenler: Node.js 22+, Docker Desktop, Git.

```bash
git clone https://github.com/AliKaracabey/saas-s.git
cd saas-s
npm install            # bağımlılıklar + git hook'ları (Husky)
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
npm run db:up          # PostgreSQL'i Docker'da başlatır
npm run dev            # http://localhost:3000
```

## Komutlar

| Komut                       | Ne yapar                                 |
| --------------------------- | ---------------------------------------- |
| `npm run dev`               | Geliştirme sunucusu                      |
| `npm run build`             | Üretim derlemesi                         |
| `npm run lint`              | ESLint                                   |
| `npm run typecheck`         | TypeScript tip kontrolü                  |
| `npm run format`            | Prettier ile tüm dosyaları biçimlendirir |
| `npm test`                  | Vitest testleri                          |
| `npm run db:up` / `db:down` | PostgreSQL'i başlatır / durdurur         |

Her commit öncesinde Husky, değişen dosyalarda ESLint ve Prettier'ı otomatik çalıştırır. Her pull request'te GitHub Actions lint, tip kontrolü, biçim kontrolü, testler ve derlemeyi çalıştırır.

## Yol haritası

- [x] 1.1 Proje iskeleti ve geliştirme ortamı
- [ ] 1.2 Veritabanı tasarımı
- [ ] 1.3 Kimlik doğrulamayı sıfırdan yazmak
- [ ] 1.4 Çok kiracılık ve yetkilendirme
- [ ] 1.5 Abonelik ve ödeme (Stripe)
- [ ] 1.6 Test ve CI
- [ ] 1.7 Canlıya alma

## Notlar

- [1.1 Ortam değişkenlerini doğrulamak](docs/notlar/1.1-ortam-degiskenleri.md)

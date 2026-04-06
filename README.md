# KiraTakip

> 🇹🇷 Türkçe | [🇬🇧 English](#english)

---

## Türkçe

Gayrimenkul ofisleri ve birden fazla kiralık daire yöneten bireysel mülk sahipleri için geliştirilmiş masaüstü kira takip uygulaması.

### Özellikler

- Mülk sahibi, bina ve daire yönetimi
- Kiracı yönetimi
- Sözleşme yaşam döngüsü takibi (oluşturma, yenileme, fesih)
- Kira alacakları ve ödeme takibi
- Finansal özet ve dashboard KPI'ları
- CSV dışa aktarma (Excel uyumlu)
- Sözleşme PDF oluşturma
- Global arama (⌘K / Ctrl+K)
- Kiracı finansal zaman çizelgesi
- Ödeme güvenilirlik göstergesi
- Çoklu kullanıcı hesabı (her hesap izole SQLite veritabanı)
- Yedekleme ve geri yükleme

### Teknoloji

- Next.js (App Router) + TypeScript
- Electron (masaüstü)
- SQLite (yerel kalıcı veritabanı, Prisma ORM)

### Geliştirme Ortamı

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev        # http://localhost:3001
```

### Masaüstü Build

```bash
npm run electron:dev           # Electron ile çalıştır (dev mod)
npm run electron:build:win     # Build al (GitHub'a yükleme yapmaz)
```

İlk açılışta uygulama SQLite veritabanını otomatik oluşturur ve ilk kurulum sihirbazını başlatır (yönetici şifresi + ofis bilgisi).

### Release Yayınlama

1. `package.json` içindeki versiyonu güncelle (örn. `1.1.0`)
2. Proje kökünde `.env.release` oluştur (commit'lenmez):
   ```
   GITHUB_TOKEN=kişisel_erişim_tokenın
   ```
3. Çalıştır:
   ```bash
   npm run release
   ```
   Uygulama build edilir, `dist/KiraTakip-v{version}-portable.zip` oluşturulur ve GitHub Releases'e otomatik yüklenir.

GitHub token'ın `repo` kapsamına sahip olması gerekir. Oluşturmak için: https://github.com/settings/tokens

### Kurulum (Windows)

1. [Releases](../../releases) sayfasına git
2. `KiraTakip-v*-portable.zip` dosyasını indir
3. ZIP'i istediğin bir klasöre çıkart
4. `Kira Takip.exe` dosyasını çalıştır

Kurulum gerektirmez. Veriler `AppData\Roaming\Kira Takip\` konumunda yerel olarak saklanır.
İlk açılışta yönetici şifresi oluşturman istenecektir.

### Notlar

- Her kurulum kendi yerel veritabanını oluşturur
- Varsayılan olarak test verisi içermez
- Yerel / çevrimdışı kullanım için tasarlanmıştır

### Lisans

MIT — bkz. [LICENSE](./LICENSE).

---

## English

<a name="english"></a>

Desktop property and rent management application built for real estate offices and individual property owners managing multiple rental units.

### Features

- Owner, building, and unit management
- Tenant management
- Contract lifecycle tracking (create, renew, terminate)
- Receivable and payment tracking
- Financial summaries and dashboard KPIs
- CSV export (Excel-friendly)
- Contract PDF generation
- Global search (⌘K / Ctrl+K)
- Tenant financial timeline
- Payment reliability indicator
- Multi-user accounts (each account has an isolated SQLite database)
- Backup and restore

### Tech Stack

- Next.js (App Router) + TypeScript
- Electron (Desktop)
- SQLite (local persistent database, Prisma ORM)

### Development

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev        # http://localhost:3001
```

### Desktop Build

```bash
npm run electron:dev           # run in Electron (dev mode)
npm run electron:build:win     # build only (no GitHub upload)
```

On first launch the app creates the SQLite database automatically and runs the initial setup wizard (admin password + office info).

### Publishing a Release

1. Set version in `package.json` (e.g. `1.1.0`)
2. Create `.env.release` in the project root (never committed):
   ```
   GITHUB_TOKEN=your_personal_access_token
   ```
3. Run:
   ```bash
   npm run release
   ```
   This builds the app, creates `dist/KiraTakip-v{version}-portable.zip`, and publishes it to GitHub Releases automatically.

The GitHub token needs `repo` scope. Create one at: https://github.com/settings/tokens

### Installing from a Release (Windows)

1. Go to the [Releases](../../releases) page
2. Download `KiraTakip-v*-portable.zip`
3. Extract the ZIP to any folder
4. Run `Kira Takip.exe`

No installation required. Data is stored locally in `AppData\Roaming\Kira Takip\`.
On first launch the app will ask you to create an admin password.

### Notes

- Each installation creates its own local database
- No test data is included by default
- Designed for local / offline usage

### License

MIT — see [LICENSE](./LICENSE).

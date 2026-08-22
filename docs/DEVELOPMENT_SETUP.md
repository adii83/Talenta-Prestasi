# Development / Local Setup

Panduan lengkap setup pertama tetap tersedia di [SETUP_LOKAL.md](SETUP_LOKAL.md). Ringkasan ini untuk menjalankan project sehari-hari.

## Requirement

- Git;
- Node.js 22 LTS minimal 22.13.0;
- npm;
- PostgreSQL lokal;
- PowerShell hanya bila memakai script Cloudflare Tunnel Windows.

## Instalasi

Dari root repository:

```bash
npm install
npm ci --prefix apps/backend
```

Root hanya menyediakan script frontend/audit. Dependency aplikasi berada di `apps/backend`.

## Environment Lokal

Salin template lalu sesuaikan:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Contoh nilai development:

```dotenv
NODE_ENV=development
PORT=3000
HOST=127.0.0.1

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=PASSWORD_POSTGRES_LOKAL
DB_DATABASE=talenta_prestasi_local
DB_SSL=false
DB_SSL_CA_PATH=
DB_MIGRATIONS_RUN=false

JWT_SECRET=STRING_ACAK_MINIMAL_32_KARAKTER
JWT_EXPIRES_IN=7d
CORS_ORIGINS=http://localhost:4173,http://127.0.0.1:4173
PUBLIC_BASE_DOMAIN=nexaplaymetadata.online
LOCAL_STORAGE_PATH=storage/uploads

LOCAL_ADMIN_USERNAME=admin
LOCAL_ADMIN_PASSWORD=PASSWORD_ADMIN_LOKAL_MINIMAL_12_KARAKTER
```

Jangan memakai credential production atau commit `.env`.

## Database Lokal

Buat database kosong, lalu jalankan migration:

```bash
cd apps/backend
./node_modules/.bin/typeorm-ts-node-commonjs migration:run \
  -d src/database/data-source.ts
./node_modules/.bin/typeorm-ts-node-commonjs migration:show \
  -d src/database/data-source.ts
```

Migration reset Category→Event bersifat destruktif terhadap schema lama. Gunakan database development/disposable atau backup data penting.

Isi data demonstrasi dan akun Admin lokal bila diperlukan:

```bash
npm run seed:local
```

`seed:local` ditolak ketika `NODE_ENV=production`.

## Menjalankan Aplikasi

Terminal 1, backend:

```bash
npm --prefix apps/backend run start:dev
```

Terminal 2, frontend statis:

```bash
npm run dev
```

URL:

- Public Site: `http://localhost:4173/apps/public-site/`
- CMS Admin: `http://localhost:4173/apps/admin/`
- API: `http://localhost:3000/api/v1/`

Gateway production-like opsional:

```bash
npm run gateway
```

Gateway tersedia di `http://127.0.0.1:8080/`, meneruskan `/api/`, dan hanya mengekspos route Public Site. Admin sengaja tidak tersedia melalui gateway.

## Cloudflare Tunnel untuk Testing

Cloudflare tidak diperlukan untuk development biasa. Gunakan hanya ketika perlu menguji hostname/wildcard publik:

```bash
npm run tunnel
```

Konfigurasi contoh: `infra/cloudflared/config.example.yml`. Credential tunnel tetap berada di `%USERPROFILE%\.cloudflared`, bukan repository.

## Validasi Penting

```bash
npm run check
npm --prefix apps/backend run build
npm --prefix apps/backend test -- --runInBand
npm --prefix apps/backend run test:e2e -- --runInBand
```

`npm run check` mencakup pemeriksaan route, JavaScript, tema, kontrak publikasi, dan format global. Global format check dapat melaporkan file lama di luar scope; laporkan hasil faktual dan jalankan Prettier terfokus untuk file yang diubah.

Audit browser khusus tersedia melalui script root seperti `test:home-parity`, `test:winner-layout`, `test:archive-layout`, dan `test:theme-browser`; beberapa memerlukan frontend/backend yang sedang aktif.

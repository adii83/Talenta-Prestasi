# Setup Production VPS Talenta Prestasi

Panduan ini menjalankan Public Site dan CMS Admin statis melalui Nginx, backend NestJS melalui PM2, serta PostgreSQL lokal atau eksternal. Cloudflare tidak wajib.

## 1. Arsitektur Deployment

```text
Internet
  └── DNS + HTTPS
      └── Nginx :80/:443
          ├── example.com + *.example.com → Public Site statis
          ├── admin.example.com           → CMS Admin statis
          └── /api/*                      → NestJS 127.0.0.1:3000
                                               ├── PostgreSQL eksternal/lokal
                                               └── media persisten
```

Frontend tidak memiliki tahap build. Nginx menyajikan HTML, CSS, JavaScript, dan `packages/shared` langsung. Backend dibangun menjadi `apps/backend/dist/main.js`. Aplikasi tidak memakai WebSocket.

## 2. Requirement Production

- Linux VPS 64-bit, contoh Ubuntu 24.04 LTS;
- Git;
- Node.js 22 LTS **minimal 22.13.0** dan npm bawaannya;
- Nginx;
- PM2;
- PostgreSQL modern yang mendukung `jsonb` dan extension `uuid-ossp`; PostgreSQL 14 atau lebih baru direkomendasikan;
- domain dengan DNS wildcard;
- sertifikat yang mencakup domain apex dan wildcard;
- akses jaringan dari VPS ke PostgreSQL;
- direktori persisten untuk upload media.

Versi dependency yang terkunci saat panduan dibuat:

- NestJS `11.1.28`;
- TypeScript `5.9.3`;
- TypeORM `1.1.0`;
- driver PostgreSQL `pg 8.22.0`.

Node 22 dipilih karena dependency terkunci TypeORM mensyaratkan Node `^22.13.0` pada jalur Node 22. Jangan memakai Node 20 di bawah `20.19.0`.

## 3. Siapkan VPS

Contoh Ubuntu:

```bash
sudo apt update
sudo apt install -y git nginx curl ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

node --version
npm --version
nginx -v
pm2 --version
```

Buat user, release awal, symlink aktif, dan direktori persisten. Ganti URL repository:

```bash
sudo useradd --system --create-home --shell /bin/bash talenta
sudo mkdir -p /srv/talenta/releases /srv/talenta/shared/uploads /etc/talenta/certs
sudo chown -R talenta:talenta /srv/talenta
sudo -u talenta git clone <URL_REPOSITORY> /srv/talenta/releases/initial
sudo ln -s /srv/talenta/releases/initial /srv/talenta/current
```

Port `3000` hanya untuk loopback/internal VPS. Jangan buka port tersebut ke internet.

## 4. Install Dependency dan Build

```bash
cd /srv/talenta/current
sudo -u talenta npm ci --prefix apps/backend
sudo -u talenta npm run build --prefix apps/backend

test -f apps/backend/dist/main.js
```

Root repository tidak mempunyai dependency production dan frontend tidak perlu dibundel. `npm ci` dijalankan pada `apps/backend`, lokasi `package-lock.json`.

## 5. Environment Production

Salin template:

```bash
sudo -u talenta cp /srv/talenta/current/apps/backend/.env.example \
  /srv/talenta/current/apps/backend/.env
sudo chmod 600 /srv/talenta/current/apps/backend/.env
```

Isi `apps/backend/.env`:

```dotenv
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

DB_HOST=postgres.provider.example
DB_PORT=5432
DB_USERNAME=talenta_app
DB_PASSWORD=CHANGE_WITH_DATABASE_PASSWORD
DB_DATABASE=talenta_production
DB_SSL=true
DB_SSL_CA_PATH=/etc/talenta/certs/postgresql-ca.pem
DB_MIGRATIONS_RUN=false

JWT_SECRET=CHANGE_WITH_AT_LEAST_32_RANDOM_CHARACTERS
JWT_EXPIRES_IN=1h

CORS_ORIGINS=https://admin.example.com
PUBLIC_BASE_DOMAIN=example.com
LOCAL_STORAGE_PATH=/srv/talenta/shared/uploads
```

Buat JWT secret acak, contoh:

```bash
openssl rand -base64 48
```

Simpan hasil hanya di secret manager atau `.env` production. Gunakan secret berbeda dari development.

### Arti variable

| Variable             | Production                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | Wajib `production`. Mengaktifkan validasi production dan memblokir seed lokal.                                      |
| `PORT`               | Port backend internal; default `3000`.                                                                              |
| `HOST`               | Alamat bind backend; gunakan `127.0.0.1` agar hanya Nginx lokal yang dapat mengaksesnya.                            |
| `DB_HOST`            | Host PostgreSQL, bukan `localhost` jika DB berada di server/provider lain.                                          |
| `DB_PORT`            | Port provider, biasanya `5432`; gunakan nilai provider bila berbeda.                                                |
| `DB_USERNAME`        | User PostgreSQL production.                                                                                         |
| `DB_PASSWORD`        | Password PostgreSQL production.                                                                                     |
| `DB_DATABASE`        | Nama database production.                                                                                           |
| `DB_SSL`             | `true` bila provider mewajibkan TLS; direkomendasikan untuk DB lintas jaringan.                                     |
| `DB_SSL_CA_PATH`     | Path CA provider bila CA tidak tersedia pada trust store OS. Boleh kosong untuk sertifikat yang sudah dipercaya OS. |
| `DB_MIGRATIONS_RUN`  | Tetap `false` pada proses aplikasi. Migration dijalankan sebagai langkah deployment manual.                         |
| `JWT_SECRET`         | Secret acak minimal 32 karakter; 48 byte acak atau lebih direkomendasikan.                                          |
| `JWT_EXPIRES_IN`     | Masa berlaku JWT Admin, contoh `1h`. Source default `7d`, tetapi production wajib mengisi eksplisit.                |
| `CORS_ORIGINS`       | Daftar origin Admin HTTPS dipisahkan koma. Harus origin lengkap tanpa path/trailing slash.                          |
| `PUBLIC_BASE_DOMAIN` | Domain dasar tanpa protocol dan tanpa wildcard, contoh `example.com`.                                               |
| `LOCAL_STORAGE_PATH` | Path absolut upload persisten dan writable oleh user `talenta`.                                                     |

`LOCAL_ADMIN_USERNAME` dan `LOCAL_ADMIN_PASSWORD` hanya untuk seed lokal. Jangan masukkan ke environment production dan jangan jalankan `seed:local` pada production.

### `DATABASE_URL` dari provider

Aplikasi saat ini tidak membaca `DATABASE_URL`. Jika provider memberi:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

petakan komponennya ke `DB_USERNAME`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, dan `DB_DATABASE`. Set `DB_SSL=true` bila `sslmode` provider mewajibkan TLS. Jika provider memberi file CA, simpan dengan permission terbatas:

```bash
sudo install -o talenta -g talenta -m 600 provider-ca.pem \
  /etc/talenta/certs/postgresql-ca.pem
```

Jangan memakai `rejectUnauthorized=false`; backend memverifikasi sertifikat TLS.

### Database pada server terpisah

Di provider PostgreSQL:

1. Buat database dan user production.
2. Izinkan koneksi dari public egress IP VPS atau gunakan private network/VPN provider.
3. Buka hanya port PostgreSQL yang diberikan provider.
4. Wajibkan TLS jika koneksi melewati internet.
5. Berikan hak membuat/mengubah schema dan `CREATE EXTENSION` kepada principal migration. Principal runtime dapat dibatasi setelah migration selesai.
6. Uji dari VPS:

```bash
PGPASSWORD='PASSWORD' psql \
  "host=postgres.provider.example port=5432 dbname=talenta_production user=talenta_app sslmode=verify-full sslrootcert=/etc/talenta/certs/postgresql-ca.pem" \
  -c 'select version();'
```

`CORS_ORIGINS` bukan firewall database dan tidak menggantikan IP allowlist/security group.

## 6. Backup dan Migration Database

> **Production Requirement:** migration `1786500000000-ResetCategoryEventSchema` menghapus schema aplikasi lama. Jangan menjalankan migration terhadap database berisi data penting sebelum ledger diperiksa, backup dibuat, dan restore diuji.

Backend memakai TypeORM dengan `synchronize: false`. Schema hanya dikelola melalui migration. Startup production normal tidak menjalankan migration karena `DB_MIGRATIONS_RUN=false`.

Sebelum migration:

```bash
pg_dump --format=custom --no-owner --no-acl \
  --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USERNAME" \
  --dbname="$DB_DATABASE" --file="talenta-before-deploy-$(date +%F-%H%M).dump"
```

Periksa status migration dari `apps/backend` ketika dev dependencies masih terpasang:

```bash
cd /srv/talenta/current/apps/backend
./node_modules/.bin/typeorm-ts-node-commonjs migration:show \
  -d src/database/data-source.ts
```

Pastikan target database benar. Jalankan migration satu kali:

```bash
./node_modules/.bin/typeorm-ts-node-commonjs migration:run \
  -d src/database/data-source.ts

./node_modules/.bin/typeorm-ts-node-commonjs migration:show \
  -d src/database/data-source.ts
```

Semua migration harus bertanda `[X]`. Jangan set `DB_MIGRATIONS_RUN=true` untuk PM2; restart atau scale-out tidak boleh mengubah schema otomatis.

## 7. Provisioning Admin Pertama

Login memakai `username` dan password. Password disimpan sebagai bcrypt hash; JWT dikirim sebagai Bearer token dan disimpan di `sessionStorage` browser Admin.

Project belum menyediakan endpoint registrasi Admin production. Gunakan salah satu prosedur berikut:

1. **Database production hasil migrasi/import existing:** pertahankan user dan membership existing, lalu uji login.
2. **Database production baru:** DBA membuat Organization, user, dan membership owner melalui perubahan SQL terkontrol. Generate hash di server aplikasi:

```bash
cd /srv/talenta/current/apps/backend
read -s ADMIN_PASSWORD
export ADMIN_PASSWORD
node -e "require('bcrypt').hash(process.env.ADMIN_PASSWORD,10).then(console.log)"
unset ADMIN_PASSWORD
```

Masukkan hash melalui transaksi SQL terotorisasi. Contoh ini memakai placeholder dan tidak boleh disimpan dengan password/hash nyata:

```sql
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

INSERT INTO organizations (id, name, slug, status)
VALUES (uuid_generate_v4(), 'NAMA_ORGANISASI', 'slug-organisasi', 'active')
RETURNING id;

INSERT INTO users (id, username, password_hash, status)
VALUES (uuid_generate_v4(), 'admin-production', '<BCRYPT_HASH>', 'active')
RETURNING id;

INSERT INTO organization_memberships (organization_id, user_id, role)
VALUES ('<ORGANIZATION_UUID>', '<USER_UUID>', 'owner');
COMMIT;
```

Gunakan username lowercase 3–64 karakter (`a-z`, `0-9`, `.`, `_`, `-`) dan password unik minimal 12 karakter.

> **Production Recommendation:** tambahkan provisioning Admin terdedikasi, MFA, rate limiting login, dan rotasi sesi. JWT browser saat ini berada di `sessionStorage`; CSP ketat dan pencegahan XSS wajib dipertahankan.

## 8. Jalankan Backend dengan PM2

Jalankan dari working directory backend agar `.env` dimuat:

```bash
sudo -u talenta bash -lc '
  cd /srv/talenta/current/apps/backend &&
  pm2 start dist/main.js --name talenta-backend --time
'

sudo -u talenta pm2 status
sudo -u talenta pm2 logs talenta-backend --lines 100
```

Aktifkan startup setelah reboot:

```bash
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u talenta --hp /home/talenta
sudo -u talenta pm2 save
```

Gunakan command `pm2 startup` yang dicetak PM2 jika berbeda. Operasi harian:

```bash
sudo -u talenta pm2 restart talenta-backend --update-env
sudo -u talenta pm2 reload talenta-backend --update-env
sudo -u talenta pm2 logs talenta-backend
sudo -u talenta pm2 status
```

Endpoint `GET /api/v1/` hanya membuktikan proses HTTP hidup; endpoint tersebut bukan readiness check PostgreSQL.

## 9. DNS dan Wildcard Subdomain

Contoh record generik:

```text
A     example.com        VPS_PUBLIC_IP
A     admin.example.com  VPS_PUBLIC_IP
A     *.example.com      VPS_PUBLIC_IP
```

`*.example.com` mencakup hostname kategori seperti `octal.example.com`, tetapi tidak mencakup apex `example.com`. Record `admin` eksplisit memudahkan pengelolaan meski wildcard juga dapat meresolusinya.

Setelah `PUBLIC_BASE_DOMAIN` berubah:

1. restart backend;
2. reload browser;
3. publikasikan ulang setiap kategori yang masih menyimpan hostname domain lama.

Publikasi kategori membentuk `<slug>.<PUBLIC_BASE_DOMAIN>`. DNS wildcard hanya mengarahkan hostname; kategori tetap harus aktif, terpublikasi, memiliki satu Event aktif, dan memiliki snapshot publik.

### Contoh Cloudflare opsional

Cloudflare bukan dependency aplikasi. Jika digunakan:

- buat record apex, `admin`, dan wildcard menuju VPS;
- gunakan mode SSL/TLS `Full (strict)`;
- origin VPS tetap memiliki sertifikat valid;
- jangan cache route `/api/*` atau response preview;
- Cloudflare Tunnel di repository hanya untuk testing lokal dan tidak diperlukan pada VPS.

## 10. HTTPS dan Sertifikat Wildcard

Sertifikat harus mencakup:

```text
example.com
*.example.com
```

Wildcard tidak mencakup apex. Untuk Let's Encrypt, wildcard memerlukan challenge DNS-01. Gunakan plugin DNS provider atau certbot manual:

```bash
sudo apt install -y certbot
sudo certbot certonly --manual --preferred-challenges dns \
  -d example.com -d '*.example.com'
```

Mode manual tidak memperbarui sertifikat otomatis tanpa hook DNS. Untuk production, gunakan plugin/API DNS provider dan uji renewal:

```bash
sudo certbot renew --dry-run
```

## 11. Konfigurasi Nginx

Contoh utama memakai `/srv/talenta/current` dan sertifikat `/etc/letsencrypt/live/example.com/`. Sesuaikan domain serta path sertifikat.

Buat `/etc/nginx/sites-available/talenta`:

```nginx
upstream talenta_api {
    server 127.0.0.1:3000;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name example.com *.example.com;
    return 301 https://$host$request_uri;
}

# CMS Admin: hostname exact menang terhadap wildcard public.
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name admin.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    client_max_body_size 12m;

    location ^~ /api/ {
        proxy_pass http://talenta_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ^~ /apps/admin/ {
        root /srv/talenta/current;
        index index.html;
        try_files $uri $uri/index.html =404;
    }

    location ^~ /packages/shared/ {
        root /srv/talenta/current;
        try_files $uri =404;
    }

    # Admin memakai stylesheet dan asset default Public Site melalui path ini.
    location ^~ /apps/public-site/assets/ {
        root /srv/talenta/current;
        try_files $uri =404;
    }

    location = / {
        return 302 /apps/admin/;
    }

    location / {
        return 404;
    }
}

# Public Site pada apex dan seluruh hostname kategori.
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com *.example.com;

    root /srv/talenta/current/apps/public-site;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location ^~ /api/ {
        proxy_pass http://talenta_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = / {
        try_files /index.html =404;
    }

    location ^~ /assets/ {
        try_files $uri =404;
    }

    location ^~ /packages/shared/ {
        root /srv/talenta/current;
        try_files $uri =404;
    }

    location ^~ /unduh/ {
        index index.html;
        try_files $uri $uri/index.html =404;
    }

    location ^~ /pemenang/ {
        index index.html;
        try_files $uri $uri/index.html =404;
    }

    location ^~ /arsip/ {
        index index.html;
        try_files $uri $uri/index.html =404;
    }

    location ^~ /faq/ {
        index index.html;
        try_files $uri $uri/index.html =404;
    }

    location / {
        return 404;
    }
}
```

Nginx tidak menyajikan root repository, source backend, `.env`, atau dokumentasi. Header `X-Forwarded-Proto` diperlukan agar cookie preview memakai flag `Secure`. Nginx menimpa header forwarding dari client dengan nilai terpercaya. Tidak perlu konfigurasi WebSocket.

Aktifkan:

```bash
sudo ln -s /etc/nginx/sites-available/talenta /etc/nginx/sites-enabled/talenta
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl enable nginx
```

## 12. CORS Production

Backend memecah `CORS_ORIGINS` berdasarkan koma dan mengizinkan credentials. Gunakan origin eksplisit:

```dotenv
CORS_ORIGINS=https://admin.example.com
```

Jika Admin tersedia pada beberapa hostname:

```dotenv
CORS_ORIGINS=https://admin.example.com,https://admin.internal.example.com
```

Jangan gunakan `*`, `https://*.example.com`, path, atau trailing slash. Implementasi sekarang tidak memperluas wildcard CORS. Public Site dan API berada pada origin yang sama melalui Nginx, sehingga hostname kategori tidak perlu dimasukkan satu per satu.

## 13. Media dan Backup

Upload disimpan pada filesystem `LOCAL_STORAGE_PATH`; metadata dan allowlist publik disimpan di PostgreSQL. Batas aplikasi:

- gambar PNG/JPEG/WebP/SVG: 5 MiB;
- PDF: 10 MiB;
- satu file per request.

Siapkan permission:

```bash
sudo install -d -o talenta -g talenta -m 750 /srv/talenta/shared/uploads
```

Backup PostgreSQL dan direktori upload dalam satu jadwal konsisten. Jangan menyimpan upload pada filesystem container/instance ephemeral. Uji restore keduanya sebelum go-live.

## 14. Verifikasi Setelah Deployment

```bash
curl -I https://example.com/
curl -I https://octal.example.com/
curl -I https://admin.example.com/apps/admin/
curl -i https://example.com/api/v1/
curl -i https://example.com/api/v1/admin/session
curl -I https://example.com/README.md
curl -I https://example.com/apps/admin/
```

Ekspektasi:

- Public Site dan Admin merespons melalui HTTPS;
- endpoint root API merespons;
- session tanpa JWT merespons `401`;
- source/docs dan Admin pada public vhost merespons `404`;
- sertifikat valid untuk apex, Admin, dan hostname kategori.

Lanjutkan acceptance:

1. login Admin memakai username production;
2. upload gambar dan PDF;
3. simpan perubahan Event;
4. buka preview dan pastikan media tampil;
5. publikasikan Event;
6. buka hostname kategori tanpa token preview;
7. periksa Beranda, Unduh, FAQ, Pemenang, Arsip, dan Detail Arsip;
8. restart PM2 dan reboot VPS, lalu ulangi smoke test.

## 15. Updating Production

Gunakan release directory agar Nginx tidak membaca frontend baru sebelum build dan migration siap. Nginx serta PM2 menggunakan symlink `/srv/talenta/current`; setiap update membuat release baru:

```bash
set -Eeuo pipefail
export RELEASE="/srv/talenta/releases/$(date +%Y%m%d%H%M%S)"
export PREVIOUS="$(readlink -f /srv/talenta/current)"
export NEXT_LINK="/srv/talenta/.current-next"
sudo -u talenta mkdir -p "$RELEASE"
sudo -u talenta git clone <URL_REPOSITORY> "$RELEASE"
sudo -u talenta cp /srv/talenta/current/apps/backend/.env \
  "$RELEASE/apps/backend/.env"
sudo chmod 600 "$RELEASE/apps/backend/.env"
cd "$RELEASE"
sudo -u talenta npm ci --prefix apps/backend
sudo -u talenta npm run build --prefix apps/backend

# Periksa source/migration baru dan buat backup DB + media sebelum melanjutkan.
cd apps/backend
sudo -u talenta ./node_modules/.bin/typeorm-ts-node-commonjs migration:show \
  -d src/database/data-source.ts
sudo -u talenta ./node_modules/.bin/typeorm-ts-node-commonjs migration:run \
  -d src/database/data-source.ts
cd ../..

# Validasi entry point sebelum cutover.
test -f "$RELEASE/apps/backend/dist/main.js"
sudo nginx -t

# Mulai maintenance window singkat agar frontend dan API tidak berbeda versi.
restore_previous() {
  status=$?
  trap - ERR
  echo "Deployment gagal; memulihkan release sebelumnya" >&2
  sudo rm -f "$NEXT_LINK"
  sudo ln -s "$PREVIOUS" "$NEXT_LINK"
  sudo mv -Tf "$NEXT_LINK" /srv/talenta/current
  sudo -u talenta bash -lc '
    set -e
    cd /srv/talenta/current/apps/backend
    pm2 delete talenta-backend >/dev/null 2>&1 || true
    pm2 start dist/main.js --name talenta-backend --time
    pm2 save
  '
  sudo systemctl start nginx
  exit "$status"
}

sudo systemctl stop nginx
trap restore_previous ERR
sudo -u talenta pm2 stop talenta-backend
sudo ln -s "$RELEASE" "$NEXT_LINK"
sudo mv -Tf "$NEXT_LINK" /srv/talenta/current
sudo -u talenta bash -lc '
  set -e
  cd /srv/talenta/current/apps/backend
  pm2 delete talenta-backend >/dev/null 2>&1 || true
  pm2 start dist/main.js --name talenta-backend --time
'
curl --fail --silent --show-error http://127.0.0.1:3000/api/v1/ >/dev/null
sudo -u talenta pm2 save
sudo systemctl start nginx
trap - ERR
```

Pergantian symlink memakai `mv -T` pada filesystem yang sama dan dilakukan saat Nginx berhenti, sehingga client tidak menerima frontend baru dengan backend lama. Jika startup atau probe gagal, blok tersebut otomatis memulihkan release sebelumnya sebelum Nginx hidup kembali. Jangan hapus release sebelumnya sebelum seluruh smoke test lulus. Migration harus backward-compatible dengan release sebelumnya; migration yang tidak backward-compatible memerlukan maintenance window serta prosedur restore database tersendiri karena symlink tidak mengembalikan schema. Jangan menjalankan `seed:local`.

## 16. Log dan Troubleshooting

```bash
sudo -u talenta pm2 status
sudo -u talenta pm2 logs talenta-backend --lines 200
sudo journalctl -u pm2-talenta -n 200 --no-pager
sudo tail -n 200 /var/log/nginx/error.log
sudo tail -n 200 /var/log/nginx/access.log
```

Masalah umum:

- **Backend gagal start:** periksa seluruh environment wajib, permission CA/upload, dan koneksi DB.
- **DB TLS gagal:** periksa hostname sertifikat, CA provider, serta `DB_SSL_CA_PATH`.
- **Admin terkena CORS:** samakan origin persis dengan `CORS_ORIGINS`, lalu `pm2 reload --update-env`.
- **Kategori 404:** pastikan DNS wildcard aktif, kategori dipublikasikan ulang setelah perubahan domain, Event aktif, dan snapshot publik tersedia.
- **Preview media gagal:** pastikan proxy mengirim `X-Forwarded-Proto https` dan route `/api/` tidak di-cache.
- **Upload gagal:** periksa `client_max_body_size 12m`, permission dan ruang disk `LOCAL_STORAGE_PATH`.

## 17. Production Recommendation

Rekomendasi berikut bukan blocker untuk menjalankan implementasi saat ini:

- tambahkan endpoint readiness yang benar-benar menguji PostgreSQL;
- gunakan provisioning Admin terdedikasi dan MFA;
- tambahkan rate limiting/backoff pada login;
- pertimbangkan sesi Admin dalam cookie `HttpOnly` sebagai pengganti JWT di `sessionStorage`;
- hindari token preview pada query string dan hindari logging query sensitif;
- tambahkan Content Security Policy yang diuji terhadap seluruh frontend;
- pisahkan principal database migration dari principal runtime;
- gunakan deployment artifact/CI agar build tidak dilakukan langsung di VPS;
- kelola log rotation, monitoring, alert, backup, dan restore drill.

## 18. Production Checklist

- [ ] Node.js 22 LTS minimal 22.13.0 terpasang.
- [ ] Dependency backend dipasang dengan `npm ci` dan build menghasilkan `dist/main.js`.
- [ ] `.env` production dimiliki user service, mode `600`, dan tidak masuk Git.
- [ ] Seluruh secret development sudah diganti.
- [ ] `JWT_SECRET` acak kuat dan `JWT_EXPIRES_IN` eksplisit.
- [ ] `DB_HOST` bukan localhost bila database eksternal.
- [ ] IP/private network VPS diizinkan oleh firewall provider PostgreSQL.
- [ ] TLS PostgreSQL aktif dan sertifikat terverifikasi bila DB eksternal mewajibkan SSL.
- [ ] Backup database dibuat dan restore pernah diuji.
- [ ] Ledger migration diperiksa sebelum migration dijalankan.
- [ ] Seluruh migration bertanda `[X]`.
- [ ] `DB_MIGRATIONS_RUN=false` pada proses PM2.
- [ ] `seed:local` tidak dipakai pada production.
- [ ] Akun Admin production dan membership dibuat secara terkontrol.
- [ ] `CORS_ORIGINS` hanya berisi origin Admin HTTPS eksplisit.
- [ ] `PUBLIC_BASE_DOMAIN` sesuai domain client.
- [ ] Kategori dengan hostname lama sudah dipublikasikan ulang.
- [ ] DNS apex, Admin, dan wildcard mengarah ke VPS.
- [ ] Sertifikat mencakup apex dan wildcard; renewal berhasil diuji.
- [ ] HTTP dialihkan ke HTTPS.
- [ ] Backend hanya listen melalui loopback/firewall internal.
- [ ] PM2 aktif, tersimpan, dan auto-start setelah reboot.
- [ ] Nginx config lulus `nginx -t` dan auto-start aktif.
- [ ] Root repository, `.env`, docs, dan Admin tidak terekspos pada public vhost.
- [ ] `LOCAL_STORAGE_PATH` persisten, writable, cukup ruang, dan ikut backup.
- [ ] Public Site dapat mengakses API dan runtime config.
- [ ] Admin dapat login, menyimpan, preview, upload, dan publish.
- [ ] Hostname kategori dapat membuka snapshot publik setelah publish.
- [ ] Log PM2 dan Nginx dapat diperiksa.
- [ ] Reboot VPS dan smoke test sudah dilakukan.

# Operasional Talenta Prestasi

## Prasyarat

Siapkan:

- Node.js dan npm;
- PostgreSQL yang aktif serta database yang dapat dipakai aplikasi;
- PowerShell untuk script Tunnel pada Windows;
- `cloudflared` bila URL publik melalui Cloudflare Tunnel diperlukan.

Prosedur lokal dijalankan dari root repository, kecuali command backend yang secara eksplisit dijalankan dari `apps/backend`.

## Environment Variable

Backend membaca konfigurasi dari environment; pada pengembangan lokal nilainya dapat ditempatkan di `apps/backend/.env`.

Variabel backend wajib:

- `DB_HOST`: host PostgreSQL;
- `DB_PORT`: port PostgreSQL;
- `DB_USERNAME`: pengguna PostgreSQL;
- `DB_PASSWORD`: kata sandi PostgreSQL;
- `DB_DATABASE`: nama database;
- `JWT_SECRET`: kunci penandatanganan JWT, minimal 32 karakter.

Variabel backend opsional:

- `PORT`: port HTTP backend;
- `CORS_ORIGINS`: daftar origin browser yang diizinkan, dipisahkan koma;
- `PUBLIC_BASE_DOMAIN`: domain dasar untuk hostname Kategori Lomba publik.

Variabel khusus seed lokal:

- `LOCAL_ADMIN_USERNAME`: username akun Admin lokal;
- `LOCAL_ADMIN_PASSWORD`: kata sandi akun Admin lokal, minimal 12 karakter.

Gateway membaca variabel opsional berikut:

- `GATEWAY_PORT`: port gateway, default `8080`;
- `FRONTEND_PORT`: port frontend statis, default `4173`;
- `BACKEND_PORT`: port backend, default `3000`.

Jangan memasukkan nilai environment, token, atau credential ke dokumentasi dan Git.

`PUBLIC_BASE_DOMAIN` menjadi sumber tunggal domain publik untuk backend, Admin, dan Public Site. Setelah nilainya diubah, restart backend dan muat ulang browser. Frontend mengambil nilai tersebut melalui `/api/v1/public/runtime-config`; source HTML/JavaScript tidak perlu diedit. DNS wildcard, sertifikat TLS wildcard, dan reverse proxy tetap disiapkan oleh tim infrastruktur. Cloudflare tidak wajib; proxy apa pun dapat digunakan selama meneruskan header `Host` asli.

Kategori yang sudah memiliki hostname lama di database tetap memakai hostname tersebut sampai dipublikasikan ulang. Publikasi ulang kategori membentuk hostname baru dari slug kategori dan `PUBLIC_BASE_DOMAIN` aktif.

## Instalasi Pertama

Instal dependensi root dan backend satu kali setelah mengambil repository:

```bash
npm install
cd apps/backend
npm install
```

Buat `apps/backend/.env`, isi seluruh variabel wajib, lalu pastikan PostgreSQL dapat diakses. Instalasi dependensi dan seed bukan startup harian.

## Migration dan Seed Lokal

Jalankan migration dari `apps/backend` sebelum menjalankan aplikasi pada database baru. Migration reset Category→Event bersifat destruktif terhadap schema lama; gunakan backup atau database development/disposable jika data perlu dipertahankan. Migration `1786586400000-AddEventDraftPublications` bersifat non-destruktif dan menambahkan penyimpanan snapshot/draf Event, tetapi tetap harus dijalankan melalui prosedur perubahan database yang terotorisasi:

```bash
cd apps/backend
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
```

Untuk membuat atau memperbarui akun dan data demonstrasi lokal, isi variabel seed lalu jalankan:

```bash
npm run seed:local
```

Seed mengubah data lokal. Jalankan hanya saat setup awal atau ketika perubahan data seed memang diinginkan.

## Menjalankan Setiap Layanan

Pastikan PostgreSQL aktif, lalu gunakan terminal terpisah.

**Terminal 1 — backend:**

```bash
cd apps/backend
npm run start:dev
```

**Terminal 2 — frontend workspace, dari root:**

```bash
npm run dev
```

Command ini membuka Public Site di `/apps/public-site/` pada port `4173`.

**Terminal 3 — gateway production-like, dari root:**

```bash
npm run gateway
```

**Terminal 4 — Cloudflare Tunnel opsional, dari root:**

```bash
npm run tunnel
```

Tunnel hanya diperlukan untuk pengujian melalui hostname Cloudflare. Backend, frontend, dan gateway cukup untuk pengujian lokal.

## URL Workspace dan Gateway

Workspace development:

- Public Site: `http://localhost:4173/apps/public-site/`;
- Admin: `http://localhost:4173/apps/admin/`;
- API backend: `http://localhost:3000/api/v1/`.

Pastikan origin Admin tercantum pada `CORS_ORIGINS`.

Gateway production-like tersedia di `http://127.0.0.1:8080/` dan memetakan route publik bersih:

- `/`;
- `/unduh/`;
- `/pemenang/`;
- `/arsip/`;
- `/arsip/detail/`;
- `/faq/`.

Gateway meneruskan `/api/` ke backend dan tidak mengekspos Admin maupun file repository.

## Cloudflare Tunnel

Testing publik menggunakan named tunnel `talenta-local-test`. Konfigurasi dan credential tetap lokal:

- `%USERPROFILE%\.cloudflared\config.yml`;
- `%USERPROFILE%\.cloudflared\<tunnel-id>.json`;
- `%USERPROFILE%\.cloudflared\cert.pem` bila dibuat oleh proses otorisasi Cloudflare.

Contoh aman tersedia di `infra/cloudflared/config.example.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: C:\Users\YOUR_USER\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  - hostname: "*.nexaplaymetadata.online"
    service: http://127.0.0.1:8080
  - service: http_status:404
```

Jalankan dengan:

```bash
npm run tunnel
```

Script menggunakan konfigurasi lokal tersebut. Tidak ada environment variable token dan source tidak menyimpan token atau credential Tunnel.

## Pemeriksaan Kesehatan

Pada Windows, gunakan `curl.exe` agar tidak terkena alias PowerShell:

```powershell
curl.exe -I http://localhost:4173/apps/public-site/
curl.exe -I http://localhost:4173/apps/admin/
curl.exe -I http://127.0.0.1:8080/
curl.exe -i http://localhost:3000/api/v1/admin/session
curl.exe -I http://127.0.0.1:8080/apps/admin/
curl.exe -I http://127.0.0.1:8080/README.md
```

Ekspektasi minimum:

- kedua workspace frontend merespons;
- gateway root merespons;
- `/admin/session` tanpa JWT merespons `401`;
- gateway merespons `404` untuk `/apps/admin/` dan `/README.md`.

Jika Tunnel aktif dan Kategori Lomba sudah dipublikasikan serta memiliki Event aktif, periksa hostname kategori melalui HTTPS.

## Menghentikan Layanan

Tekan `Ctrl+C` pada terminal Tunnel, gateway, frontend, lalu backend. Penghentian proses tidak menghapus PostgreSQL, file media, credential Tunnel lokal, atau DNS Cloudflare.

Jangan memakai force-kill kecuali proses tidak merespons. Pastikan proses yang memakai port `3000`, `4173`, dan `8080` sudah berhenti sebelum sesi berikutnya.

## Troubleshooting

- **Backend gagal start:** periksa seluruh environment wajib, panjang `JWT_SECRET`, koneksi PostgreSQL, dan migration.
- **Seed gagal:** periksa `LOCAL_ADMIN_USERNAME`, panjang `LOCAL_ADMIN_PASSWORD`, dan koneksi database.
- **Admin terkena CORS:** samakan origin browser dengan salah satu nilai `CORS_ORIGINS`, lalu restart backend.
- **Gateway memberi `502`:** pastikan frontend dan backend hidup pada port yang sama dengan konfigurasi gateway.
- **Gateway memberi `404` untuk kategori:** pastikan kategori berstatus published/aktif, Organization aktif, terdapat tepat satu Event aktif/operasional yang belum soft delete, dan Event tersebut sudah memiliki snapshot publik.
- **Preview Admin berakhir:** buka kembali melalui tombol **Lihat preview**; token berlaku 15 menit dan tidak fallback ke versi publik.
- **Publish Event gagal:** perbaiki validasi aggregate yang dilaporkan; snapshot publik lama dan draf tetap dipertahankan.
- **Port sudah dipakai:** gunakan `netstat -ano | findstr :3000`, `:4173`, atau `:8080`, lalu hentikan proses yang benar.
- **`npm run tunnel` tidak menemukan executable/config:** periksa instalasi `cloudflared` dan `%USERPROFILE%\.cloudflared\config.yml`.
- **Cloudflare `1033` atau reconnect berulang:** pastikan gateway hidup di `127.0.0.1:8080`, credential JSON cocok dengan tunnel, dan ingress lokal benar.

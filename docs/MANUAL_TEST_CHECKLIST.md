# Checklist Pengujian Manual Talenta Prestasi

Dokumen ini dipakai untuk menguji integrasi aplikasi sebelum demonstrasi.

> **Status integrasi:** seluruh modul frontend yang tersedia sudah terhubung ke backend NestJS dan PostgreSQL. Media disimpan sebagai file nyata di filesystem backend, sementara metadata dan referensinya disimpan di PostgreSQL. Pengujian otomatis sudah lulus; checklist browser ini memverifikasi alur nyata pada perangkat Anda.

## 0. Gambaran layanan yang harus hidup

Pengujian lokal lengkap memakai PostgreSQL dan empat terminal. Jangan menutup
terminal selama pengujian berlangsung.

| Komponen          | Lokasi command  | Command                | Port/tujuan                    |
| ----------------- | --------------- | ---------------------- | ------------------------------ |
| PostgreSQL        | Windows service | pastikan service aktif | `localhost:5432`               |
| Backend NestJS    | `apps/backend`  | `npm run start:dev`    | `http://localhost:3000`        |
| Frontend statis   | root repository | `npm run dev`          | `http://localhost:4173`        |
| Gateway publik    | root repository | `npm run gateway`      | `http://127.0.0.1:8080`        |
| Cloudflare Tunnel | root repository | `npm run tunnel`       | Cloudflare → gateway port 8080 |

URL utama pengujian:

- Admin lokal: `http://localhost:4173/apps/admin/?events=1`
- Template lokal: `http://localhost:4173/apps/template/`
- Event publik: `https://<slug>.nexaplaymetadata.online/`
- Event seed saat aktif:
  `https://talenta-prestasi-local.nexaplaymetadata.online/`

> **Penting:** buka Admin menggunakan `localhost`, bukan `127.0.0.1`. Konfigurasi
> CORS backend mengizinkan origin `http://localhost:4173`.

## 1. Persiapan dan cara mengaktifkan aplikasi

### 1A. Persiapan pertama kali atau setelah mengambil project baru

Langkah ini tidak perlu diulang setiap kali komputer dinyalakan.

```powershell
cd D:\Kuliah\Magang\Web1
npm install

cd apps\backend
npm install
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
npm run seed:local
```

- [ ] File `apps/backend/.env` tersedia dan koneksi database benar.
- [ ] `LOCAL_ADMIN_EMAIL` dan `LOCAL_ADMIN_PASSWORD` sudah diisi untuk akun lokal.
- [ ] `PUBLIC_BASE_DOMAIN=nexaplaymetadata.online` sudah benar.
- [ ] Seluruh migration berhasil tanpa rollback/error.
- [ ] Seed menampilkan `"seeded": true` tanpa menampilkan password.

> Jalankan `npm run seed:local` hanya saat instalasi awal atau saat sengaja
> memperbarui kredensial/data seed lokal. Seed bukan command startup harian.

Cloudflare Tunnel sudah disiapkan satu kali pada komputer pengujian ini. Pastikan
berkas berikut masih tersedia sebelum menjalankan `npm run tunnel`:

```powershell
Test-Path "$env:LOCALAPPDATA\Programs\cloudflared\cloudflared.exe"
Test-Path "$env:USERPROFILE\.cloudflared\config.yml"
```

Keduanya harus menghasilkan `True`. Jangan menjalankan `tunnel create` atau
`tunnel route dns` setiap hari. Jika project dipindahkan ke komputer lain,
lakukan otorisasi Cloudflare dan instalasi connector sebagai setup deployment
terpisah; jangan mengunggah credential Tunnel ke Git.

- [ ] DNS Cloudflare mempertahankan record R2 `meta` dan dua TXT validasi.
- [ ] CNAME wildcard aktif adalah `*.nexaplaymetadata.online` menuju Tunnel.
- [ ] Record percobaan `*.talenta.nexaplaymetadata.online` sudah dihapus jika masih ada.

### 1B. Urutan menjalankan setiap sesi pengujian

1. Pastikan PostgreSQL aktif. Di PowerShell, nama servicenya dapat diperiksa
   dengan `Get-Service *postgres*`.
2. Buka empat terminal terpisah dan jalankan command berikut.

**Terminal 1 — Backend**

```powershell
cd D:\Kuliah\Magang\Web1\apps\backend
npm run start:dev
```

Tunggu sampai NestJS selesai start dan tidak ada error database atau port.

**Terminal 2 — Frontend**

```powershell
cd D:\Kuliah\Magang\Web1
npm run dev
```

**Terminal 3 — Gateway publik**

```powershell
cd D:\Kuliah\Magang\Web1
npm run gateway
```

Terminal harus menampilkan gateway `127.0.0.1:8080` menuju frontend dan backend.

**Terminal 4 — Cloudflare Tunnel**

```powershell
cd D:\Kuliah\Magang\Web1
npm run tunnel
```

Biarkan keempat terminal tetap terbuka. Jika salah satu dihentikan, sebagian
alur pengujian akan gagal.

### 1C. Pemeriksaan cepat sebelum login

Jalankan dari terminal kelima atau PowerShell biasa:

```powershell
curl.exe -I http://localhost:4173/apps/admin/
curl.exe -I http://127.0.0.1:8080/
curl.exe -I https://talenta-prestasi-local.nexaplaymetadata.online/
curl.exe -i http://localhost:3000/api/v1/admin/session
```

Hasil yang diharapkan:

- [ ] Frontend Admin merespons `200`.
- [ ] Gateway lokal merespons `200`.
- [ ] URL publik merespons `200` ketika kartu Event berstatus **Aktif**.
- [ ] `/admin/session` tanpa token merespons `401`; ini membuktikan backend hidup dan auth bekerja.
- [ ] Terminal Tunnel menunjukkan connector aktif dan tidak terus-menerus reconnect/error.

Jika URL publik `404` tetapi layanan lain hidup, periksa apakah Event sedang
berstatus Draft/Nonaktif. Jika muncul Cloudflare `1033`, periksa Terminal 3 dan
Terminal 4.

### 1D. Gate otomatis sebelum pengujian manual

```powershell
cd D:\Kuliah\Magang\Web1
npm run check

cd apps\backend
npm run build
npm run test:e2e -- --runInBand
```

- [ ] `npm run check` lulus untuk route, sintaks JavaScript, tema, dan format.
- [ ] Build backend berhasil.
- [ ] E2E backend lulus 16/16.

### 1E. Bahan pengujian

- [ ] PostgreSQL aktif dan database `talenta_prestasi` dapat diakses.
- [ ] Siapkan gambar PNG/JPG/WebP/SVG kurang dari 5 MB.
- [ ] Siapkan PDF kurang dari 10 MB.
- [ ] Tentukan nama dan slug Event uji yang tidak memakai data penting.
- [ ] Buka Developer Tools → Console dan Network → Fetch/XHR.

> Jangan memakai data penting saat pertama menguji tombol hapus. Gunakan record uji.

### 1F. Menghentikan layanan setelah selesai

Tekan `Ctrl+C` pada Terminal 4, 3, 2, lalu 1. Menghentikan Tunnel atau komputer
akan membuat URL publik tidak tersedia, tetapi tidak menghapus Event, database,
file upload, maupun record DNS.

- [ ] Event utama sudah dikembalikan ke status yang diinginkan.
- [ ] Data uji yang tidak diperlukan sudah dihapus melalui UI.
- [ ] Keempat proses berhenti tanpa memakai force-kill.

## 2. Login dan sesi Admin

- [ ] Buka halaman Admin dan login dengan akun hasil seed.
- [ ] Dashboard Admin tampil tanpa error.
- [ ] Request login sukses (`200`/`201`).
- [ ] Password dan token tidak terlihat pada URL.
- [ ] Refresh halaman; sesi masih dapat digunakan.
- [ ] Logout berhasil dan editor tidak dapat dipakai tanpa login ulang.
- [ ] Login kembali untuk melanjutkan pengujian.

## 2A. Daftar Event

- [ ] Setelah login manual, halaman **Daftar Event** tampil sebelum editor.
- [ ] Setiap kartu menampilkan status **Draft**, **Aktif**, atau **Nonaktif**, serta tindakan **Kelola Event**, **Publikasikan/Nonaktifkan**, dan **Hapus Event**.
- [ ] Klik **Buat Event Baru**; dialog berada di tengah dan hanya meminta Nama event.
- [ ] Event baru langsung dapat dikelola melalui editor.
- [ ] Slug/subdomain dapat ditentukan dari bagian Identitas Utama di Pengaturan Event.
- [ ] Tombol **Publikasikan** belum aktif selama slug/subdomain masih berupa slug sementara `event-*`.
- [ ] Slug hanya menerima huruf kecil, angka, dan tanda hubung.
- [ ] Slug duplikat milik Event lain ditolak dengan pesan yang jelas.
- [ ] Tombol **Daftar Event** dari sidebar editor kembali ke dashboard tanpa logout.

## 2B. Publish, Unpublish, dan domain publik

- [ ] Setelah slug disimpan, klik **Publikasikan** dan pastikan status kartu berubah menjadi **Aktif** serta hostname tampil.
- [ ] Hostname kartu sesuai `https://<slug>.nexaplaymetadata.online/`.
- [ ] Saat Event aktif, perubahan slug dari editor ditolak dan Admin diminta menonaktifkan Event terlebih dahulu.
- [ ] Klik **Nonaktifkan** dan pastikan URL publik tidak dapat dibuka; publikasi ulang mengaktifkannya kembali.
- [ ] Setelah Nonaktif, ubah slug, simpan, lalu Publish kembali; hostname kartu dan URL publik ikut berubah.
- [ ] URL lama tidak lagi mengembalikan konten Event setelah slug diganti.
- [ ] Buka `https://<slug>.nexaplaymetadata.online` dari jaringan/browser lain dan pastikan HTTPS valid.
- [ ] Seluruh menu publik memakai route bersih seperti `/unduh/`, `/pemenang/`, `/arsip/`, dan `/faq/`, bukan `/apps/template/...`.
- [ ] Pastikan `meta.nexaplaymetadata.online` tetap menuju aplikasi metadata, bukan Template Talenta.
- [ ] Di Cloudflare DNS, record R2 `meta`, TXT `_acme-challenge`, dan wildcard Tunnel tidak saling tertimpa.
- [ ] Setelah selesai, kembalikan Event utama ke status **Aktif**.

## 2C. Pewarisan Arsip lintas Event

- [ ] Siapkan dokumen dan pemenang pada event lama, kemudian buat event baru.
- [ ] Buka Arsip pada event baru; event lama beserta dokumen dan pemenangnya tetap tampil.
- [ ] Nama event dan deskripsi singkat event lama tampil sebagai identitas kartu Arsip.
- [ ] Record dokumen/pemenang lama tidak digandakan dan tetap dimiliki event sumber.
- [ ] Mengubah data Event baru tidak mengubah identitas Event sumber Arsip.
- [ ] Menghapus Event baru tidak menghapus dokumen/pemenang pada Event sumber.
- [ ] Klik **Hapus Event**, konfirmasi dialog, lalu pastikan kartu hilang dari daftar.

## 2D. Isolasi gateway publik

- [ ] `https://<slug>.nexaplaymetadata.online/apps/admin/` menghasilkan `404`.
- [ ] `https://<slug>.nexaplaymetadata.online/README.md` menghasilkan `404`.
- [ ] `/api/v1/public/...` dapat diakses sesuai status publikasi.
- [ ] Endpoint `/api/v1/admin/...` tetap memerlukan JWT walaupun diakses melalui domain publik.

## 3. Pengaturan Global dan logo

- [ ] Nama event, penyelenggara, warna, navigasi, kontak, dan footer dimuat dari API.
- [ ] Ubah satu teks kecil, simpan, lalu refresh; perubahan tetap ada.
- [ ] Upload logo yang valid; preview langsung berubah.
- [ ] Simpan dan refresh Admin; logo tetap tampil.
- [ ] Buka halaman publik; logo tampil pada header/footer.
- [ ] Network menunjukkan URL `/api/v1/public/media/<asset-id>`.
- [ ] URL logo bukan `data:image/...`.

## 4. Beranda

- [ ] Hero, jadwal, biaya, benefit, highlight pemenang, dan mitra dimuat.
- [ ] Ubah judul/deskripsi Hero, simpan, dan refresh; perubahan tetap ada.
- [ ] Beranda publik menampilkan perubahan tersebut.
- [ ] Toggle satu section, simpan, dan periksa visibilitasnya di publik.
- [ ] Upload ikon kustom; preview Admin tampil.
- [ ] Simpan dan refresh; ikon tetap ada dan tampil di publik.
- [ ] URL ikon memakai endpoint public media, bukan Data URL.
- [ ] Tombol Hero menuju route/URL yang benar.

## 5. FAQ

- [ ] Kategori dan pertanyaan dimuat dari backend.
- [ ] Tambah kategori/pertanyaan uji lalu simpan.
- [ ] Refresh; record tetap ada.
- [ ] Ubah jawaban dan simpan; perubahan tetap ada.
- [ ] Nonaktifkan item; item tidak tampil di publik.
- [ ] FAQ publik dapat dibuka/ditutup sebagai accordion.
- [ ] Hapus record uji melalui dialog konfirmasi UI.
- [ ] Refresh; record yang dihapus tidak kembali.

## 6. Pemenang dan foto

- [ ] Kategori dan daftar pemenang dimuat dari backend.
- [ ] Judul SK default adalah **SK Penetapan Pemenang** dan deskripsi sama dengan Template publik.
- [ ] Field URL SK tidak ada; tersedia **Upload file SK** dengan PDF maksimal 10 MB.
- [ ] Upload SK berhasil, status file serta tombol **Lihat file SK** tampil.
- [ ] Buka Unduh; SK otomatis muncul satu kali sebagai dokumen kategori **SK Pemenang**.
- [ ] Ganti file SK; record dokumen yang sama diperbarui dan tidak membuat duplikat.
- [ ] Tambah pemenang uji dengan data lengkap.
- [ ] Form pemenang hanya memakai Kabupaten dan Provinsi; field Kecamatan tidak ada.
- [ ] Upload foto kurang dari 5 MB; preview tampil.
- [ ] Simpan dan refresh; data serta foto tetap tampil.
- [ ] Halaman Pemenang publik menampilkan data dan foto.
- [ ] URL foto memakai `/api/v1/public/media/<asset-id>`.
- [ ] Ubah satu field dan simpan; hasil muncul setelah refresh.
- [ ] Nonaktifkan pemenang; data tidak muncul di publik.
- [ ] Pada Event pertama tanpa Arsip, bagian **Pemenang Sebelumnya** menampilkan keadaan kosong dan tidak memunculkan data contoh.
- [ ] Setelah Event baru dibuat, hanya Event sebelumnya yang memiliki kategori dan pemenang aktif yang muncul pada **Pemenang Sebelumnya**.
- [ ] Aktifkan kembali atau hapus record uji setelah selesai.

## 7. Arsip, Detail Arsip, dan maskot

- [ ] Competition arsip dimuat dari backend.
- [ ] Ubah nama pendek/deskripsi lalu simpan dan refresh.
- [ ] Upload maskot/logo Competition; preview tampil.
- [ ] Simpan dan refresh; maskot tetap ada.
- [ ] Arsip publik menampilkan Competition dan maskot.
- [ ] URL maskot memakai endpoint public media.
- [ ] Detail Arsip menampilkan informasi Competition yang benar.
- [ ] Kategori, pemenang, dan dokumen sesuai Competition terkait.
- [ ] Toggle visibilitas kategori/dokumen tetap berlaku setelah refresh.

## 8. PDF dan halaman Unduh

- [ ] Buka editor **Unduh** pada Event aktif.
- [ ] Bagian **Dokumen lomba saat ini** otomatis menunjuk Event aktif dan tidak muncul pada pemilih sumber Arsip.
- [ ] Klik **Unggah dokumen** atau **Ganti PDF** pada dokumen Event aktif.
- [ ] Pilih PDF kurang dari 10 MB; notifikasi sukses tampil.
- [ ] Simpan konfigurasi bila diperlukan.
- [ ] Refresh; dokumen tetap menunjukkan file tersedia.
- [ ] Pada Event pertama, **Sumber dari event sebelumnya** kosong.
- [ ] Setelah membuat Event baru, Event lama tersedia sebagai sumber tambahan tanpa menyalin record PDF.
- [ ] SK Event lama tersedia pada sumber Event sebelumnya dan Detail Arsip dengan judul/deskripsi yang sama.
- [ ] Halaman Unduh publik menampilkan Competition dan dokumen pada tab benar.
- [ ] Klik dokumen; PDF nyata dapat dibuka/diunduh.
- [ ] URL PDF memakai `/api/v1/public/media/<asset-id>`.
- [ ] Response memakai `Content-Type: application/pdf`.
- [ ] Response memiliki `X-Content-Type-Options: nosniff`.
- [ ] Ubah label dokumen, simpan, dan periksa hasil publik.
- [ ] Sembunyikan dokumen; dokumen tidak tampil di publik.

## 9. Bukti persistensi backend/PostgreSQL

- [ ] Tutup tab aplikasi dan buka kembali tanpa membersihkan database.
- [ ] Login kembali; seluruh perubahan tetap ada.
- [ ] Buka halaman publik melalui Incognito/Private Window.
- [ ] Konten yang sama tetap tampil pada browser tanpa data lama.
- [ ] File upload tersedia di `apps/backend/storage/uploads/`.
- [ ] Path fisik/storage key tidak terlihat pada response frontend.
- [ ] Konten publik tidak bergantung pada `localStorage` browser.

**Hasil yang diharapkan:** browser baru memperoleh konten dari API/PostgreSQL.

## 10. Validasi file dan keamanan dasar

- [ ] Gambar lebih dari 5 MB ditolak.
- [ ] PDF lebih dari 10 MB ditolak.
- [ ] Tipe file yang tidak didukung ditolak.
- [ ] File teks yang hanya diganti ekstensi menjadi `.png` tetap ditolak.
- [ ] Endpoint Admin tanpa login menghasilkan `401`.
- [ ] Role Viewer tidak dapat mengubah/upload (`403`) bila akun uji tersedia.
- [ ] UI/response tidak membocorkan stack trace, password, JWT, atau path filesystem.
- [ ] Console tidak memiliki error merah yang relevan.
- [ ] Network tidak memiliki request API berstatus `500`.

> Media publik saat ini menggunakan UUID opaque dan cocok untuk situs publik/demo satu instance lokal. Object storage baru diperlukan ketika deployment multi-instance/cloud dipilih.

## 11. Responsivitas dan aksesibilitas dasar

Uji Beranda, Unduh, Pemenang, Arsip, Detail Arsip, FAQ, dan editor utama Admin.

### Desktop — sekitar 1440 px

- [ ] Tidak ada elemen terpotong atau horizontal scroll.
- [ ] Navigasi, card, daftar, dialog, dan preview tersusun benar.

### Tablet — sekitar 768 px

- [ ] Layout menyesuaikan tanpa tumpang tindih.
- [ ] Tombol dan form tetap dapat digunakan.

### Mobile — sekitar 390 px

- [ ] Tidak ada horizontal scroll yang tidak disengaja.
- [ ] Header/bottom navigation tampil benar.
- [ ] Teks dapat dibaca dan tombol mudah ditekan.
- [ ] Gambar mempertahankan rasio dan tidak keluar container.

### Keyboard

- [ ] Urutan navigasi `Tab` logis.
- [ ] Focus indicator terlihat.
- [ ] Tombol dan dialog dapat digunakan tanpa mouse.
- [ ] Gambar konten memiliki teks alternatif yang sesuai.

## 12. Alur demonstrasi singkat

- [ ] Tampilkan Beranda publik.
- [ ] Login Admin.
- [ ] Tampilkan Daftar Event dan status Aktif/Nonaktif.
- [ ] Nonaktifkan Event dan tunjukkan URL publik menjadi `404`.
- [ ] Publikasikan kembali dan tunjukkan URL HTTPS kembali aktif.
- [ ] Ubah satu teks Beranda dan simpan.
- [ ] Upload satu gambar/foto/logo dan simpan.
- [ ] Upload atau ganti satu PDF.
- [ ] Refresh Admin untuk membuktikan persistensi.
- [ ] Buka halaman publik untuk menunjukkan perubahan.
- [ ] Buka Incognito untuk membuktikan data bukan dari browser lama.
- [ ] Klik PDF publik untuk membuktikan delivery file backend.
- [ ] Tampilkan tampilan mobile melalui device toolbar.

## 13. Rekap hasil

| Area                    | Status | Catatan |
| ----------------------- | ------ | ------- |
| Server frontend/backend | ⬜     |         |
| Gateway dan Tunnel      | ⬜     |         |
| Login dan sesi          | ⬜     |         |
| Daftar Event            | ⬜     |         |
| Publish/Unpublish       | ⬜     |         |
| Domain dan HTTPS publik | ⬜     |         |
| Pewarisan Arsip Event   | ⬜     |         |
| Pengaturan Global       | ⬜     |         |
| Beranda                 | ⬜     |         |
| FAQ                     | ⬜     |         |
| Pemenang                | ⬜     |         |
| Arsip dan Detail Arsip  | ⬜     |         |
| PDF dan Unduh           | ⬜     |         |
| Persistensi PostgreSQL  | ⬜     |         |
| Media filesystem lokal  | ⬜     |         |
| Keamanan dasar          | ⬜     |         |
| Desktop/tablet/mobile   | ⬜     |         |
| Console dan Network     | ⬜     |         |
| Isolasi aplikasi R2     | ⬜     |         |

Gunakan status `✅ Lulus`, `❌ Gagal`, atau `⚠️ Perlu diperiksa`.

## 14. Format laporan bug

```markdown
### Judul masalah

- Halaman:
- Event/slug:
- URL lokal atau publik:
- Waktu pengujian:
- Perangkat/ukuran layar:
- Langkah reproduksi: 1. 2. 3.
- Hasil aktual:
- Hasil yang diharapkan:
- Status HTTP/API terkait:
- Status Terminal backend/gateway/tunnel:
- Pesan Console:
- Screenshot:
```

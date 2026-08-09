# Rencana Implementasi Perapihan Public Site dan Dokumentasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti nama aplikasi publik `apps/template` menjadi `apps/public-site`, mengganti route ID `template.*` menjadi `publicSite.*`, dan merapikan dokumentasi aktif/historis tanpa mengubah perilaku produk.

**Architecture:** Pertahankan batas Public Site, Admin CMS, shared browser contract, dan backend yang sudah berjalan. Lakukan rename terkontrol mulai dari kontrak route, source browser, gateway, dan audit; setelah perilaku lulus, konsolidasikan dokumentasi berdasarkan kondisi aktual dan arsipkan narasi implementasi lama.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js scripts, NestJS 11, TypeScript, TypeORM, PostgreSQL, Jest, static `http-server`, gateway Node.js, Cloudflare Tunnel.

## Global Constraints

- Seluruh dokumentasi aktif menggunakan Bahasa Indonesia yang jelas, langsung, dan konsisten.
- Istilah teknis bahasa Inggris boleh dipertahankan jika merupakan istilah baku, identifier, command, atau jika terjemahannya mengaburkan arti.
- Nama file, folder, route ID, entity, tabel, field, command, dan potongan kode tidak diterjemahkan.
- Tidak mengubah fitur, tampilan, CSS, isi konten, API, autentikasi, otorisasi, tenant/RBAC, schema PostgreSQL, migration, media, publish/unpublish, pewarisan Arsip, atau soft delete.
- Tidak memperbaiki bug aplikasi yang ditemukan; catat bug tersebut pada `PROGRESS.md` untuk task terpisah.
- Tidak menambahkan dependency baru.
- Tidak menambahkan redirect `/apps/template/`; seluruh referensi aktif langsung berpindah ke `/apps/public-site/`.
- URL production tetap `/`, `/unduh/`, `/pemenang/`, `/arsip/`, `/arsip/detail/`, dan `/faq/`.
- Public Site tetap menjadi aplikasi production untuk pengunjung sekaligus visual baseline bagi markup, style, komponen, breakpoint, dan preview Admin.
- Jangan membuat atau mengubah commit pengguna tanpa persetujuan eksplisit. Jika pengguna meminta commit saat eksekusi, jangan tambahkan trailer `Co-Authored-By`.

## Prasyarat Keamanan yang Memblokir Eksekusi

Sebelum Task 1 dijalankan, selesaikan task keamanan terpisah **“Amankan token Cloudflare Tunnel”**:

1. Rotasi token Cloudflare Tunnel yang pernah tersimpan pada Git.
2. Hapus argumen `--token` dari `scripts/run-cloudflare-tunnel.ps1` dan jalankan named tunnel melalui konfigurasi lokal `~/.cloudflared/config.yml` yang tidak terlacak Git.
3. Verifikasi token lama tidak lagi berlaku.
4. Jangan menyalin token lama atau baru ke dokumentasi, log, plan, commit, atau percakapan.

Prasyarat ini terpisah dari scope rename, tetapi implementasi plan tidak boleh dimulai sebelum selesai.

## Peta Perubahan File

### Rename direktori

- Rename: `apps/template/` → `apps/public-site/`

### Kontrak route dan source browser

- Modify: `packages/shared/js/core/paths.js`
- Modify: `packages/shared/js/data/repositories/settings-repository.js`
- Modify: `apps/admin/js/config/routes.js`
- Modify: `apps/admin/js/shell/router.js`
- Modify: `apps/admin/js/features/archive/detail-editor.js`
- Modify: `apps/admin/js/features/home/partner-editor.js`
- Modify: `apps/admin/js/features/winners/manager.js`
- Modify setelah rename: `apps/public-site/assets/js/archive-detail.js`
- Modify setelah rename: `apps/public-site/assets/js/archive-list.js`
- Modify setelah rename: `apps/public-site/assets/js/faq-renderer.js`
- Modify setelah rename: `apps/public-site/assets/js/home-renderer.js`
- Modify setelah rename: `apps/public-site/assets/js/winner-renderer.js`

### Tooling, gateway, dan audit

- Modify: `package.json`
- Modify: `scripts/validate-routes.mjs`
- Modify: `scripts/audit-theme-sync.mjs`
- Modify: `scripts/browser-home-hero-parity.mjs`
- Modify: `scripts/browser-theme-audit.mjs`
- Modify: `scripts/public-gateway.mjs`
- Verify only: `infra/cloudflared/config.example.yml`

### Dokumentasi

- Modify: `README.md`
- Modify: `PROGRESS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ADMIN_SPEC.md`
- Rename/rewrite: `docs/DATABASE_DESIGN.md` → `docs/DATA_MODEL.md`
- Create: `docs/OPERATIONS.md`
- Create: `docs/TESTING.md`
- Create: `docs/archive/FRONTEND_IMPLEMENTATION_HISTORY.md`
- Create: `docs/archive/BACKEND_IMPLEMENTATION_HISTORY.md`
- Delete setelah konten dikonsolidasikan: `docs/BACKEND_PROGRESS.md`
- Delete setelah konten dipisahkan: `docs/MANUAL_TEST_CHECKLIST.md`
- Modify: `apps/backend/README.md`
- Keep as approved design record: `docs/superpowers/specs/2026-08-09-public-site-documentation-cleanup-design.md`

---

### Task 1: Ambil baseline sebelum perubahan

**Files:**

- Verify: `package.json`
- Verify: `apps/backend/package.json`
- Verify: seluruh aplikasi dan test saat ini

**Interfaces:**

- Consumes: repository sebelum rename dan environment lokal yang sudah dikonfigurasi.
- Produces: catatan hasil baseline terminal untuk dibandingkan pada Task 8; tidak membuat file sementara.

- [ ] **Step 1: Pastikan prasyarat token selesai**

Periksa task keamanan terpisah dan pastikan token hardcoded tidak lagi ada:

```bash
git grep -n -E 'eyJ[a-zA-Z0-9_-]{20,}|--token' -- scripts/run-cloudflare-tunnel.ps1
git grep -n '\.cloudflared\\config.yml' -- scripts/run-cloudflare-tunnel.ps1
```

Expected: command pertama tidak menghasilkan output; command kedua menunjukkan script memakai konfigurasi named tunnel lokal tanpa menampilkan credential.

- [ ] **Step 2: Catat status working tree tanpa mengubahnya**

Run:

```bash
git status --short
git diff --stat
```

Expected: simpan output sebagai konteks eksekusi. Jangan membersihkan atau menimpa perubahan yang sudah ada sebelum task ini.

- [ ] **Step 3: Jalankan baseline frontend**

Run:

```bash
npm run check:routes
npm run check:js
npm run check:theme
npm run format:check
npm run test:download-relations
npm run test:winner-relations
npm run test:archive-relations
npm run test:faq-relations
npm run test:admin-dialogs
```

Expected: seluruh command PASS. Jalankan gate individual, bukan `npm run check`, agar `format:check` tidak gagal hanya karena dokumen spec/plan yang belum diformat pada working tree awal. Jika ada kegagalan yang sudah terjadi sebelum rename, catat command dan output sebagai bug baseline; jangan memperbaikinya dalam task ini.

- [ ] **Step 4: Jalankan baseline backend**

Run dari `apps/backend/`:

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Expected: build, unit test, dan E2E PASS. PostgreSQL serta environment backend harus aktif untuk E2E.

- [ ] **Step 5: Jalankan baseline browser jika Chromium/Edge tersedia**

Run dari root dengan backend dan frontend aktif:

```bash
npm run test:home-parity
npm run test:theme-browser
```

Expected: audit visual/parity PASS. Jika browser atau service tidak tersedia, catat dengan tepat apa yang tidak dapat dijalankan dan alasannya.

- [ ] **Step 6: Gate baseline**

Jangan lanjut ke Task 2 jika kegagalan baseline membuat route, visual, atau integration behavior saat ini tidak dapat diketahui. Kegagalan yang terisolasi dan sudah diklasifikasikan sebagai bug lama boleh dicatat untuk task bug terpisah.

- [ ] **Step 7: Commit**

Tidak ada commit untuk Task 1 karena tidak ada file yang diubah.

---

### Task 2: Rename aplikasi dan kontrak route browser

**Files:**

- Rename: `apps/template/` → `apps/public-site/`
- Modify: `packages/shared/js/core/paths.js:9-49`
- Modify: `packages/shared/js/data/repositories/settings-repository.js:190-233`
- Modify: `apps/admin/js/config/routes.js:1-27`
- Modify: `apps/admin/js/shell/router.js:1-37`
- Modify: `apps/admin/js/features/archive/detail-editor.js`
- Modify: `apps/admin/js/features/home/partner-editor.js`
- Modify: `apps/admin/js/features/winners/manager.js`
- Modify: `apps/public-site/assets/js/archive-detail.js`
- Modify: `apps/public-site/assets/js/archive-list.js`
- Modify: `apps/public-site/assets/js/faq-renderer.js`
- Modify: `apps/public-site/assets/js/home-renderer.js`
- Modify: `apps/public-site/assets/js/winner-renderer.js`
- Modify/Test: `scripts/validate-routes.mjs`

**Interfaces:**

- Consumes: `TalentaPaths.to(id, options)` dan `TalentaPaths.is(id)` yang sudah ada.
- Produces: route ID `publicSite.home`, `publicSite.download`, `publicSite.winners`, `publicSite.archive`, `publicSite.archiveDetail`, dan `publicSite.faq`; direct workspace base `/apps/public-site/`.

- [ ] **Step 1: Ubah validator lebih dahulu agar menuntut path baru**

Pada `scripts/validate-routes.mjs`, ubah daftar Public Site menjadi:

```js
const routes = [
  "apps/public-site/index.html",
  "apps/public-site/unduh/index.html",
  "apps/public-site/pemenang/index.html",
  "apps/public-site/arsip/index.html",
  "apps/public-site/arsip/detail/index.html",
  "apps/public-site/faq/index.html",
  "apps/admin/index.html",
  "apps/admin/editors/beranda/index.html",
  "apps/admin/editors/unduh/index.html",
  "apps/admin/editors/pemenang/index.html",
  "apps/admin/editors/arsip/index.html",
  "apps/admin/editors/arsip/detail/index.html",
  "apps/admin/editors/faq/index.html",
];
```

Tambahkan pemeriksaan source aktif setelah pembentukan `source`:

```js
if (source.includes("apps/template"))
  errors.push("Active application source still references apps/template");
if (
  /['"]template\.(?:home|download|winners|archive|archiveDetail|faq)['"]/.test(
    source,
  )
)
  errors.push("Active canonical route IDs still use template.*");
```

- [ ] **Step 2: Jalankan validator untuk membuktikan kontrak baru belum terpenuhi**

Run:

```bash
npm run check:routes
```

Expected: FAIL dengan route `apps/public-site/...` belum ditemukan dan/atau identifier lama masih terdeteksi.

- [ ] **Step 3: Rename direktori melalui Git**

Run:

```bash
git mv apps/template apps/public-site
```

Expected: Git mengenali file sebagai rename, bukan salinan tambahan. `apps/template/` tidak tersisa.

- [ ] **Step 4: Ubah canonical route registry**

Pada `packages/shared/js/core/paths.js`, ganti enam entry menjadi:

```js
"publicSite.home": "/apps/public-site/",
"publicSite.download": "/apps/public-site/unduh/",
"publicSite.winners": "/apps/public-site/pemenang/",
"publicSite.archive": "/apps/public-site/arsip/",
"publicSite.archiveDetail": "/apps/public-site/arsip/detail/",
"publicSite.faq": "/apps/public-site/faq/",
```

Ganti kedua pemeriksaan `id.startsWith("template.")` menjadi:

```js
id.startsWith("publicSite.");
```

Ganti pemotongan internal path:

```js
routes[id].replace(/^\/apps\/public-site/, "") || "/";
```

- [ ] **Step 5: Ubah resolver halaman publik**

Pada `packages/shared/js/data/repositories/settings-repository.js`, gunakan mapping:

```js
const routeMap = [
  ["publicSite.home", "home"],
  ["publicSite.download", "download"],
  ["publicSite.winners", "winners"],
  ["publicSite.archive", "archive"],
  ["publicSite.archiveDetail", "archive"],
  ["publicSite.faq", "faq"],
];
```

Gunakan fallback path:

```js
const fallback = [
  ["/apps/public-site/", "home"],
  ["/apps/public-site/unduh/", "download"],
  ["/apps/public-site/pemenang/", "winners"],
  ["/apps/public-site/arsip/", "archive"],
  ["/apps/public-site/arsip/detail/", "archive"],
  ["/apps/public-site/faq/", "faq"],
];
```

Ubah fallback homepage menjadi:

```js
return typeof TalentaPaths !== "undefined"
  ? TalentaPaths.to("publicSite.home")
  : "/apps/public-site/";
```

- [ ] **Step 6: Ubah seluruh consumer route ID pada Admin**

Ganti route ID secara eksplisit:

```text
template.home          → publicSite.home
template.download      → publicSite.download
template.winners       → publicSite.winners
template.archive       → publicSite.archive
template.archiveDetail → publicSite.archiveDetail
template.faq           → publicSite.faq
```

Lakukan pada file Admin berikut:

- `apps/admin/js/config/routes.js`;
- `apps/admin/js/shell/router.js`;
- `apps/admin/js/features/archive/detail-editor.js`;
- `apps/admin/js/features/home/partner-editor.js`;
- `apps/admin/js/features/winners/manager.js`.

Jangan mengubah nama page key Admin seperti `home`, `download`, atau `winners`.

- [ ] **Step 7: Ubah seluruh consumer route ID pada Public Site**

Terapkan mapping route ID yang sama pada lima file JavaScript Public Site yang tercantum pada bagian **Files**. Pada `home-renderer.js`, ubah nilai mapping filename lama menjadi `publicSite.*` tanpa mengubah key kompatibilitas seperti `index.html`.

- [ ] **Step 8: Jalankan pemeriksaan referensi source aktif**

Run:

```bash
git grep -n -E 'apps/template|/apps/template|template\.(home|download|winners|archive|archiveDetail|faq)' -- apps packages
```

Expected: tidak ada output.

- [ ] **Step 9: Jalankan test kontrak route dan sintaks**

Run:

```bash
npm run check:routes
npm run check:js
```

Expected: PASS untuk 13 canonical routes dan seluruh file JavaScript.

- [ ] **Step 10: Review diff Task 2**

Run:

```bash
git diff --stat
git diff --check
```

Expected: rename dominan pada `apps/public-site`, perubahan hanya pada route/path; tidak ada CSS, kontrak API, atau backend yang berubah.

- [ ] **Step 11: Commit jika diminta pengguna**

```bash
git add apps/public-site apps/admin packages/shared scripts/validate-routes.mjs
git commit -m "refactor: rename public site application"
```

Jangan commit jika pengguna belum memberi izin.

---

### Task 3: Selaraskan development command, gateway, dan audit

**Files:**

- Modify: `package.json:4-20`
- Modify: `scripts/public-gateway.mjs:5-20`
- Modify: `scripts/audit-theme-sync.mjs`
- Modify: `scripts/browser-home-hero-parity.mjs`
- Modify: `scripts/browser-theme-audit.mjs`
- Verify only: `infra/cloudflared/config.example.yml`

**Interfaces:**

- Consumes: internal Public Site base `/apps/public-site/` dari Task 2.
- Produces: `npm run dev` membuka Public Site baru; gateway tetap mengekspos clean production-like route; seluruh audit menunjuk path baru.

- [ ] **Step 1: Ubah direct development URL**

Pada `package.json`, ubah script `dev` menjadi:

```json
"dev": "npx -y http-server@14.1.1 . -p 4173 -c-1 -o /apps/public-site/"
```

Jangan mengubah versi tool atau script lain.

- [ ] **Step 2: Ubah internal gateway mapping**

Pada `scripts/public-gateway.mjs`, ubah fungsi `frontendPath()` menjadi:

```js
function frontendPath(pathname) {
  if (pathname === "/") return "/apps/public-site/";
  if (pathname.startsWith("/assets/")) return `/apps/public-site${pathname}`;
  const firstSegment = pathname.split("/")[1];
  if (publicPages.has(firstSegment)) return `/apps/public-site${pathname}`;
  return pathname;
}
```

Jangan mengubah allowlist route, pemisahan `/api`, port, atau isolasi Admin.

- [ ] **Step 3: Ubah path file pada audit statis**

Pada `scripts/audit-theme-sync.mjs`, ganti setiap `apps/template` menjadi `apps/public-site`. Jangan mengubah assertion visual atau kontrak tema.

- [ ] **Step 4: Ubah URL target pada audit browser**

Pada:

- `scripts/browser-home-hero-parity.mjs`;
- `scripts/browser-theme-audit.mjs`;

ubah setiap `/apps/template/` menjadi `/apps/public-site/`. Ubah label dan pesan manusia dari `Template` menjadi `Public Site` agar output audit mengikuti penamaan baru. Nama variabel lokal seperti `templateHero`, parameter pembanding seperti `template`, dan properti DOM seperti `gridTemplateColumns` bukan identifier aplikasi; biarkan tetap jika penggantian tidak menambah kejelasan. Pada `scripts/browser-home-hero-parity.mjs`, ubah juga referensi aset relatif `../../../template/assets/images/garuda.png` menjadi `../../../public-site/assets/images/garuda.png`. Jangan mengubah selector, viewport, tolerance, geometri, atau expected style.

- [ ] **Step 5: Verifikasi contoh konfigurasi Cloudflare tidak membutuhkan perubahan**

Periksa `infra/cloudflared/config.example.yml`.

Expected: file hanya meneruskan wildcard hostname ke gateway `127.0.0.1:8080`, sehingga tidak bergantung pada nama folder internal dan tidak perlu diedit.

- [ ] **Step 6: Jalankan pemeriksaan referensi tooling**

Run:

```bash
git grep -n -E 'apps/template|/apps/template|Template (Beranda|Unduh|Pemenang|Arsip|FAQ)' -- package.json scripts infra
```

Expected: tidak ada output untuk referensi aktif lama. Jangan mencari atau mengganti isi spec/arsip historis pada langkah ini.

- [ ] **Step 7: Jalankan audit statis dan relasi**

Run:

```bash
npm run check
npm run test:download-relations
npm run test:winner-relations
npm run test:archive-relations
npm run test:faq-relations
npm run test:admin-dialogs
```

Expected: seluruh command PASS tanpa perubahan perilaku.

- [ ] **Step 8: Uji gateway secara lokal**

Dengan frontend, backend, dan gateway aktif, periksa:

```bash
curl -I http://127.0.0.1:8080/
curl -I http://127.0.0.1:8080/unduh/
curl -I http://127.0.0.1:8080/pemenang/
curl -I http://127.0.0.1:8080/arsip/
curl -I http://127.0.0.1:8080/faq/
curl -I http://127.0.0.1:8080/apps/admin/
curl -I http://127.0.0.1:8080/README.md
```

Expected: lima route publik merespons `200`; Admin dan `README.md` merespons `404`.

- [ ] **Step 9: Jalankan audit browser**

```bash
npm run test:home-parity
npm run test:theme-browser
```

Expected: PASS dengan hasil visual/geometri yang sama seperti baseline Task 1.

- [ ] **Step 10: Commit jika diminta pengguna**

```bash
git add package.json scripts infra/cloudflared/config.example.yml
git commit -m "chore: update public site tooling paths"
```

Jangan commit jika pengguna belum memberi izin. Jangan stage `scripts/run-cloudflare-tunnel.ps1` sebagai bagian task ini; penanganannya milik prasyarat keamanan terpisah.

---

### Task 4: Arsipkan riwayat implementasi lama

**Files:**

- Create: `docs/archive/FRONTEND_IMPLEMENTATION_HISTORY.md`
- Create: `docs/archive/BACKEND_IMPLEMENTATION_HISTORY.md`
- Source material: `PROGRESS.md`
- Source material: `docs/BACKEND_PROGRESS.md`

**Interfaces:**

- Consumes: jurnal kronologis lama pada `PROGRESS.md` dan status fase backend pada `docs/BACKEND_PROGRESS.md`.
- Produces: dua dokumen historis yang tidak berfungsi sebagai status atau instruksi aktif.

- [ ] **Step 1: Buat banner historis yang identik pada kedua file**

Gunakan pembuka berikut:

```markdown
> **DOKUMEN HISTORIS — bukan sumber status atau arsitektur saat ini. Verifikasi `README.md`, `PROGRESS.md`, dokumentasi aktif, dan source code sebelum menggunakan informasi di dalam dokumen ini.**
```

- [ ] **Step 2: Susun riwayat frontend**

`docs/archive/FRONTEND_IMPLEMENTATION_HISTORY.md` dimulai dengan konten literal berikut:

```markdown
# Riwayat Implementasi Frontend Talenta Prestasi

> **DOKUMEN HISTORIS — bukan sumber status atau arsitektur saat ini. Verifikasi `README.md`, `PROGRESS.md`, dokumentasi aktif, dan source code sebelum menggunakan informasi di dalam dokumen ini.**

## Ruang Lingkup

Dokumen ini mempertahankan riwayat pengembangan Template/Public Site, Admin CMS, shared repository, visual parity, canonical routing, dan integrasi frontend. Nama/path lama dipertahankan jika diperlukan untuk menjelaskan kondisi pada tanggal tersebut.

## Kronologi
```

Setelah heading `## Kronologi`, salin seluruh entry `###` dari `PROGRESS.md` mulai **25 Juli 2026 — Fondasi Admin** sampai **30 Juli 2026 — Rancangan Database Produksi**, kecuali entry yang khusus membahas implementasi backend. Sertakan **3 Agustus 2026 — Media Lokal dan Backend sebagai Sumber Utama** karena entry tersebut menjelaskan transisi frontend dari localStorage ke API/media. Pertahankan tanggal, bullet, hasil test pada saat itu, dan path lama sebagai fakta sejarah. Bagian `Tujuan Akhir`, `Pembagian Area`, `Keputusan Tetap`, `Status Saat Ini`, `Urutan Pekerjaan`, `Status Implementasi Aktual`, `Langkah Berikutnya`, dan `Ringkasan Penutupan Frontend` diringkas menjadi narasi waktu lampau; jangan menyalin heading status/instruksi aktifnya.

- [ ] **Step 3: Susun riwayat backend**

`docs/archive/BACKEND_IMPLEMENTATION_HISTORY.md` dimulai dengan konten literal berikut:

```markdown
# Riwayat Implementasi Backend Talenta Prestasi

> **DOKUMEN HISTORIS — bukan sumber status atau arsitektur saat ini. Verifikasi `README.md`, `PROGRESS.md`, dokumentasi aktif, dan source code sebelum menggunakan informasi di dalam dokumen ini.**

## Ruang Lingkup

Dokumen ini mempertahankan rancangan awal, fase implementasi NestJS/PostgreSQL, integrasi API, media lokal, publikasi Event, dan hasil validasi backend pada tanggal terkait.

## Kronologi
```

Setelah heading `## Kronologi`, ambil materi berikut dalam urutan tanggal:

1. `docs/BACKEND_PROGRESS.md`: **Konteks Project**, **Hasil Analisis (1 Agustus 2026)**, Fase 1–4, **Keputusan Teknis**, **Integrasi Frontend–Backend (3 Agustus 2026)**, **Gate final**, dan **Penyempurnaan Relasi Event — 4 Agustus 2026**.
2. `PROGRESS.md`: entry **30 Juli 2026 — Rancangan Database Produksi**, seluruh entry mulai **1 Agustus 2026 — Backend Fase 1–2 dan Beranda Fase 3** sampai **4 Agustus 2026 — Relasi File SK Pemenang**, serta bagian **Integrasi Backend Final — 3 Agustus 2026**.

Ubah label rencana seperti `SEDANG BERJALAN` menjadi penjelasan waktu lampau dengan tanggal konteksnya. Jangan menyalin bagian **Untuk AI Selanjutnya** sebagai instruksi; konversikan fakta yang masih bernilai menjadi catatan historis. Jika dua dokumen mencatat milestone yang sama, pertahankan versi yang lebih lengkap satu kali dan jangan menduplikasi paragraf.

- [ ] **Step 4: Pastikan arsip tidak memberi instruksi status aktif**

Run:

```bash
git grep -n -E 'AI selanjutnya wajib|Untuk AI Selanjutnya|Status Saat Ini|Langkah Berikutnya' -- docs/archive
```

Expected: tidak ada instruksi aktif. Frasa historis yang diperlukan harus diubah menjadi penjelasan waktu lampau.

- [ ] **Step 5: Periksa bahasa dan format**

Run:

```bash
npx -y prettier@3.9.6 docs/archive --check
git diff --check -- docs/archive
```

Expected: PASS.

- [ ] **Step 6: Commit jika diminta pengguna**

```bash
git add docs/archive
git commit -m "docs: archive implementation history"
```

Jangan commit jika pengguna belum memberi izin.

---

### Task 5: Tulis ulang orientasi dan status aktif

**Files:**

- Modify: `README.md`
- Modify: `PROGRESS.md`

**Interfaces:**

- Consumes: arsitektur/nama baru dari Task 2 dan arsip dari Task 4.
- Produces: dua entry point dokumentasi yang menyatakan produk sudah implemented dan berada dalam maintenance.

- [ ] **Step 1: Tulis `README.md` sebagai orientasi ringkas**

Gunakan urutan section berikut:

```markdown
# Talenta Prestasi

## Status Proyek

## Tujuan Produk

## Aplikasi

## Struktur Repository

## Menjalankan Secara Singkat

## URL Development dan Gateway

## Urutan Baca Dokumentasi

## Validasi

## Batas Scope Produk
```

Pernyataan pertama pada **Status Proyek** harus menyampaikan secara eksplisit:

```markdown
Talenta Prestasi adalah platform website kompetisi multi-event yang sudah diterapkan. Public Site, CMS Admin, backend NestJS, database PostgreSQL, dan integrasinya telah selesai. Pekerjaan aktif adalah maintenance dan perbaikan bug. Revisi mekanisme berikutnya belum menjadi scope implementasi sampai dirancang dan disetujui secara terpisah.
```

Dokumentasikan:

- Public Site: `apps/public-site/`;
- Admin CMS: `apps/admin/`;
- backend: `apps/backend/`;
- shared browser contract: `packages/shared/`;
- pendaftaran/dashboard peserta berada di website eksternal;
- workspace URL `http://localhost:4173/apps/public-site/`;
- Admin URL `http://localhost:4173/apps/admin/`;
- gateway production-like `http://127.0.0.1:8080/`;
- tautan ke `PROGRESS.md`, `docs/ARCHITECTURE.md`, `docs/ADMIN_SPEC.md`, `docs/DATA_MODEL.md`, `docs/OPERATIONS.md`, dan `docs/TESTING.md`.

- [ ] **Step 2: Tulis `PROGRESS.md` sebagai status maintenance saja**

Gunakan struktur dan isi minimum berikut:

```markdown
# Status Aktif Talenta Prestasi

## Status Produk

Implemented / maintenance.

## Area yang Telah Selesai

- Public Site responsif.
- CMS Admin dan dashboard multi-event.
- NestJS API, PostgreSQL, autentikasi, tenant/RBAC, dan audit.
- Integrasi seluruh editor dan renderer publik.
- Upload/delivery media lokal.
- Publish/unpublish dan pewarisan Arsip lintas Event.

## Bug Terbuka

- Belum direkonsiliasi pada tahap perapihan. Tambahkan hanya bug dengan langkah reproduksi dan bukti.

## Pekerjaan Aktif

- Perapihan nama `apps/public-site` dan dokumentasi tanpa perubahan behavior.

## Revisi Mekanisme yang Direncanakan

- Belum masuk scope sampai desain terpisah disetujui.

## Validasi Terakhir

- Frontend:
- Backend build/unit/E2E:
- Browser/gateway:

## Riwayat

- Riwayat frontend: `docs/archive/FRONTEND_IMPLEMENTATION_HISTORY.md`.
- Riwayat backend: `docs/archive/BACKEND_IMPLEMENTATION_HISTORY.md`.
```

Pada Task 8, ganti field validasi kosong dengan hasil aktual. Jangan menyalin seluruh jurnal lama kembali ke file ini.

- [ ] **Step 3: Verifikasi tidak ada status usang**

Run:

```bash
git grep -n -E 'backend mendatang|akan diganti API|backend belum|database produksi belum|apps/template|template\.' -- README.md PROGRESS.md
```

Expected: tidak ada output.

- [ ] **Step 4: Periksa format**

```bash
npx -y prettier@3.9.6 README.md PROGRESS.md --check
git diff --check -- README.md PROGRESS.md
```

Expected: PASS.

- [ ] **Step 5: Commit jika diminta pengguna**

```bash
git add README.md PROGRESS.md
git commit -m "docs: clarify implemented product status"
```

Jangan commit jika pengguna belum memberi izin.

---

### Task 6: Perbarui arsitektur, spesifikasi Admin, dan model data aktual

**Files:**

- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ADMIN_SPEC.md`
- Rename: `docs/DATABASE_DESIGN.md` → `docs/DATA_MODEL.md`
- Delete setelah arsip tersedia: `docs/BACKEND_PROGRESS.md`

**Interfaces:**

- Consumes: implementasi aktual dan arsip Task 4.
- Produces: dokumentasi teknis aktif yang tidak mencampur rencana lama dengan sistem yang sudah berjalan.

- [ ] **Step 1: Tulis ulang `docs/ARCHITECTURE.md` berdasarkan sistem aktual**

Gunakan urutan:

```markdown
# Arsitektur Talenta Prestasi

## Status dan Tujuan

## Gambaran Sistem

## Batas Aplikasi

## Arah Dependensi

## Alur Data Public Site

## Alur Data Admin

## Tenant, Auth, dan RBAC

## Media

## Routing dan Gateway

## Public Site sebagai Visual Baseline

## Aturan Penempatan Kode

## Sumber Kebenaran dan Urutan Baca

## Validasi Arsitektur
```

Wajib menyatakan:

- `apps/public-site` adalah production Public Site dan visual baseline;
- `apps/admin` mengelola data melalui Admin API;
- `packages/shared` hanya memuat kontrak yang benar-benar lintas browser app;
- `apps/backend` menjadi sumber validasi/persistensi;
- PostgreSQL adalah persistensi otoritatif;
- `sessionStorage` hanya untuk JWT dan Event Admin yang dipilih;
- repository/localStorage lama hanya compatibility/preview, bukan sumber publik production;
- gateway memetakan clean route ke Public Site dan menolak Admin/repository.

- [ ] **Step 2: Bersihkan `docs/ADMIN_SPEC.md`**

Pertahankan spesifikasi perilaku aktual:

- login dan Daftar Event;
- create/manage/publish/unpublish/delete Event;
- Pengaturan Global;
- Beranda;
- Unduh;
- Pemenang dan PDF SK;
- Arsip/Detail Arsip;
- FAQ;
- preview responsif;
- dialog konfirmasi;
- batas file serta role.

Hapus atau pindahkan ke arsip:

- narasi implementasi bertahap;
- pernyataan database dummy sebagai kondisi aktif;
- janji “akan diganti API/database”;
- detail migrasi versi editor yang tidak dibutuhkan pengguna CMS saat ini.

- [ ] **Step 3: Rename dokumen database**

Run:

```bash
git mv docs/DATABASE_DESIGN.md docs/DATA_MODEL.md
```

- [ ] **Step 4: Ubah `docs/DATA_MODEL.md` menjadi model yang diterapkan**

Gunakan urutan:

```markdown
# Model Data Talenta Prestasi

## Status Implementasi

## Model Domain

## Ownership dan Tenant

## Event dan Competition

## Pewarisan Arsip Lintas Event

## Beranda dan Pengaturan Halaman

## Unduh, Dokumen, Pemenang, dan SK

## FAQ

## Media

## Constraint dan Integritas

## Status Publikasi dan Soft Delete

## Keamanan dan Privasi

## Kontrak API Terkait

## Validasi
```

Pertahankan entity, ERD, constraint, composite foreign key, dan kebijakan data yang sesuai source aktual. Ubah kalimat target/rekomendasi menjadi status aktual hanya jika terbukti pada entity, migration, service, atau test. Pindahkan roadmap implementasi yang sudah selesai dan pertanyaan persetujuan pra-backend ke arsip.

- [ ] **Step 5: Hapus dokumen progress backend aktif yang sudah diarsipkan**

Setelah memastikan seluruh informasi historis penting tersedia di `docs/archive/BACKEND_IMPLEMENTATION_HISTORY.md` dan informasi aktual masuk dokumen aktif:

```bash
git rm docs/BACKEND_PROGRESS.md
```

- [ ] **Step 6: Verifikasi referensi dokumen**

Run:

```bash
git grep -n 'DATABASE_DESIGN.md\|BACKEND_PROGRESS.md' -- ':!docs/archive/**' ':!docs/superpowers/specs/**' ':!docs/superpowers/plans/**'
```

Expected: tidak ada referensi aktif. Semua tautan aktif menggunakan `docs/DATA_MODEL.md`.

- [ ] **Step 7: Verifikasi status dan path lama**

Run:

```bash
git grep -n -E 'backend mendatang|akan diganti API|apps/template|template\.' -- docs/ARCHITECTURE.md docs/ADMIN_SPEC.md docs/DATA_MODEL.md
```

Expected: tidak ada output.

- [ ] **Step 8: Periksa format**

```bash
npx -y prettier@3.9.6 docs/ARCHITECTURE.md docs/ADMIN_SPEC.md docs/DATA_MODEL.md --check
git diff --check -- docs
```

Expected: PASS.

- [ ] **Step 9: Commit jika diminta pengguna**

```bash
git add docs/ARCHITECTURE.md docs/ADMIN_SPEC.md docs/DATA_MODEL.md docs/BACKEND_PROGRESS.md
git commit -m "docs: describe current architecture and data model"
```

Jangan commit jika pengguna belum memberi izin.

---

### Task 7: Pisahkan operasi, pengujian, dan orientasi backend

**Files:**

- Create: `docs/OPERATIONS.md`
- Create: `docs/TESTING.md`
- Delete setelah konten dipisahkan: `docs/MANUAL_TEST_CHECKLIST.md`
- Modify: `apps/backend/README.md`

**Interfaces:**

- Consumes: prosedur pada `docs/MANUAL_TEST_CHECKLIST.md`, command pada kedua `package.json`, serta backend yang sudah diterapkan.
- Produces: petunjuk operasi, acceptance testing, dan orientasi backend yang terpisah serta mutakhir.

- [ ] **Step 1: Buat `docs/OPERATIONS.md`**

Gunakan struktur:

```markdown
# Operasional Talenta Prestasi

## Prasyarat

## Environment Variable

## Instalasi Pertama

## Migration dan Seed Lokal

## Menjalankan Setiap Layanan

## URL Workspace dan Gateway

## Cloudflare Tunnel

## Pemeriksaan Kesehatan

## Menghentikan Layanan

## Troubleshooting
```

Salin dan mutakhirkan prosedur operasional dari checklist lama. Jangan mencantumkan nilai secret. Untuk tunnel, dokumentasikan nama environment variable hasil task keamanan terpisah, bukan token. Bedakan setup pertama dari startup harian.

- [ ] **Step 2: Buat `docs/TESTING.md`**

Gunakan struktur:

```markdown
# Pengujian Talenta Prestasi

## Gate Otomatis

## Persiapan Pengujian Manual

## Auth dan Sesi Admin

## Daftar Event dan Publikasi

## Pengaturan Global dan Beranda

## FAQ

## Pemenang dan SK

## Arsip dan Pewarisan Event

## Unduh dan PDF

## Persistensi PostgreSQL dan Media

## Keamanan Dasar

## Responsivitas dan Aksesibilitas

## Gateway dan Isolasi Public Site

## Alur Demonstrasi

## Format Laporan Bug
```

Pertahankan checklist browser yang masih relevan. Gunakan path `/apps/public-site/` untuk workspace dan clean route untuk gateway. Jangan menulis hasil check historis sebagai hasil saat ini.

- [ ] **Step 3: Hapus checklist lama setelah seluruh konten terpetakan**

Verifikasi section operasional berada di `OPERATIONS.md` dan section acceptance berada di `TESTING.md`, lalu:

```bash
git rm docs/MANUAL_TEST_CHECKLIST.md
```

- [ ] **Step 4: Ganti README starter backend**

Tulis `apps/backend/README.md` dengan struktur:

```markdown
# Backend Talenta Prestasi

## Tanggung Jawab

## Prasyarat

## Environment Variable

## Instalasi

## Migration dan Seed Lokal

## Menjalankan Backend

## Build dan Test

## Dokumentasi Terkait
```

Daftar environment variable hanya nama dan fungsi, tanpa nilai. Command harus sesuai `apps/backend/package.json`:

```bash
npm install
npm run start:dev
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
npm run seed:local
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Tautkan ke `../../docs/ARCHITECTURE.md`, `../../docs/DATA_MODEL.md`, `../../docs/OPERATIONS.md`, dan `../../docs/TESTING.md`.

- [ ] **Step 5: Verifikasi tidak ada secret atau starter text**

Run:

```bash
git grep -n -E 'eyJ[a-zA-Z0-9_-]{20,}|password *=|token .*[A-Za-z0-9_-]{20,}|Mau deploy|Nest framework TypeScript starter' -- docs apps/backend/README.md
```

Expected: tidak ada output yang mengandung credential atau README starter generik. Contoh placeholder yang jelas dan bukan secret harus tetap dihindari jika tidak diperlukan.

- [ ] **Step 6: Periksa format**

```bash
npx -y prettier@3.9.6 docs/OPERATIONS.md docs/TESTING.md apps/backend/README.md --check
git diff --check -- docs apps/backend/README.md
```

Expected: PASS.

- [ ] **Step 7: Commit jika diminta pengguna**

```bash
git add docs/OPERATIONS.md docs/TESTING.md docs/MANUAL_TEST_CHECKLIST.md apps/backend/README.md
git commit -m "docs: separate operations and testing guides"
```

Jangan commit jika pengguna belum memberi izin.

---

### Task 8: Validasi menyeluruh dan rekonsiliasi status

**Files:**

- Modify: `PROGRESS.md`
- Verify: seluruh source, tooling, dokumentasi, backend, dan gateway

**Interfaces:**

- Consumes: seluruh hasil Task 2–7 dan baseline Task 1.
- Produces: cleanup yang terverifikasi serta receipt validasi aktual pada `PROGRESS.md`.

- [ ] **Step 1: Cari referensi aktif nama lama**

Run:

```bash
git grep -n -E 'apps/template|/apps/template|template\.(home|download|winners|archive|archiveDetail|faq)' -- \
  ':!docs/archive/**' \
  ':!docs/superpowers/specs/**' \
  ':!docs/superpowers/plans/**'
```

Expected: tidak ada output.

- [ ] **Step 2: Verifikasi struktur dan dokumentasi aktif**

Run:

```bash
test -d apps/public-site
test ! -e apps/template
test -f docs/DATA_MODEL.md
test -f docs/OPERATIONS.md
test -f docs/TESTING.md
test -f docs/archive/FRONTEND_IMPLEMENTATION_HISTORY.md
test -f docs/archive/BACKEND_IMPLEMENTATION_HISTORY.md
test ! -e docs/DATABASE_DESIGN.md
test ! -e docs/BACKEND_PROGRESS.md
test ! -e docs/MANUAL_TEST_CHECKLIST.md
```

Expected: exit code `0`.

- [ ] **Step 3: Jalankan seluruh gate frontend**

```bash
npm run check
npm run test:download-relations
npm run test:winner-relations
npm run test:archive-relations
npm run test:faq-relations
npm run test:admin-dialogs
```

Expected: seluruh command PASS.

- [ ] **Step 4: Jalankan backend regression**

Dari `apps/backend/`:

```bash
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Expected: sama atau lebih baik daripada baseline Task 1; tidak ada migration/schema baru.

- [ ] **Step 5: Jalankan browser parity**

Dengan service yang diperlukan aktif:

```bash
npm run test:home-parity
npm run test:theme-browser
```

Expected: PASS dan tidak ada perubahan visual dibanding baseline.

- [ ] **Step 6: Jalankan smoke test direct workspace dan gateway**

```bash
curl -I http://localhost:4173/apps/public-site/
curl -I http://localhost:4173/apps/admin/
curl -I http://127.0.0.1:8080/
curl -I http://127.0.0.1:8080/unduh/
curl -I http://127.0.0.1:8080/pemenang/
curl -I http://127.0.0.1:8080/arsip/
curl -I http://127.0.0.1:8080/faq/
curl -I http://127.0.0.1:8080/apps/admin/
curl -I http://127.0.0.1:8080/README.md
```

Expected:

- direct Public Site dan Admin: `200`;
- clean public routes: `200`;
- Admin/repository melalui gateway: `404`.

- [ ] **Step 7: Periksa perubahan database dan backend**

Run:

```bash
git diff --name-only -- apps/backend/src/database apps/backend/src/entities apps/backend/src/admin apps/backend/src/public apps/backend/src/auth apps/backend/src/media
```

Expected: tidak ada output. Cleanup tidak boleh mengubah source backend atau migration.

- [ ] **Step 8: Isi receipt validasi pada `PROGRESS.md`**

Ganti field **Validasi Terakhir** dengan tanggal aktual dan hasil nyata, misalnya:

```markdown
## Validasi Terakhir

- Tanggal: 9 Agustus 2026.
- Frontend: `npm run check` dan seluruh audit relasi/dialog lulus.
- Backend: build, unit test, dan E2E lulus.
- Browser/gateway: parity dan smoke route lulus.
- Dilewati: tidak ada.
```

Jika ada test yang tidak dijalankan, tulis command, alasan, dan dampaknya. Jangan mengklaim lulus jika tidak dijalankan.

- [ ] **Step 9: Jalankan format dan diff checks terakhir**

```bash
npm run format:check
git diff --check
git status --short
```

Expected: format dan diff check PASS. Status hanya memuat file yang memang termasuk cleanup, spec/plan yang disetujui, serta perubahan awal pengguna yang sudah dicatat pada Task 1.

- [ ] **Step 10: Review terhadap kriteria penerimaan**

Periksa satu per satu:

- `apps/public-site` adalah satu-satunya aplikasi pengunjung aktif;
- route ID aktif memakai `publicSite.*`;
- clean production routes tidak berubah;
- visual/API/database/media tidak berubah;
- dokumentasi aktif menggunakan Bahasa Indonesia;
- dokumentasi aktif menyatakan produk implemented/maintenance;
- riwayat diberi banner historis;
- `PROGRESS.md` hanya memuat status aktif dan receipt validasi.

- [ ] **Step 11: Commit akhir jika diminta pengguna**

Jika pengguna meminta satu commit final dan belum ada commit per task:

```bash
git add apps/public-site apps/admin packages/shared scripts package.json README.md PROGRESS.md docs apps/backend/README.md
git commit -m "refactor: clarify public site structure and docs"
```

Sebelum commit, jangan stage perubahan awal pengguna yang berada di luar daftar cleanup. Jangan commit tanpa izin eksplisit.

# Prompt Pembuka Sesi AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyediakan prompt berbahasa Indonesia yang siap disalin pada awal sesi AI dan catatan kerja kronologis yang menjaga kontinuitas pekerjaan lintas sesi.

**Architecture:** `docs/AI_SESSION_PROMPT.md` hanya mengarahkan AI ke sumber kebenaran dan menetapkan aturan kerja agar tidak cepat basi. `docs/WORK_LOG.md` menyimpan riwayat tugas, sedangkan `PROGRESS.md` tetap menyimpan status aktif. `README.md` hanya menambahkan tautan penemuan ke dua dokumen baru.

**Tech Stack:** Markdown, Prettier 3.9.6.

## Global Constraints

- Seluruh prompt dan log aktif menggunakan Bahasa Indonesia yang jelas.
- Dokumentasi bukan pengganti verifikasi source code dan test.
- Secret, token, credential, dan data pribadi tidak boleh ditulis ke log.
- Log tidak menyimpan dump command atau percakapan panjang; hanya bukti dan keputusan yang berguna untuk sesi berikutnya.
- Catatan historis tidak boleh mengubah perilaku aplikasi.
- Tidak ada otomatisasi atau dependency baru; solusi hanya menggunakan Markdown.
- File dibuat tanpa commit kecuali pengguna meminta commit secara eksplisit.
- AI harus berorientasi lalu menunggu tugas; tidak boleh mengubah file saat orientasi awal.
- Setiap tugas yang mengubah file proyek dicatat di `docs/WORK_LOG.md`; `PROGRESS.md` hanya diperbarui jika status aktif berubah.

---

### Task 1: Prompt sesi dan log kerja

**Files:**

- Create: `docs/AI_SESSION_PROMPT.md`
- Create: `docs/WORK_LOG.md`
- Modify: `README.md:56-64`
- Test: pemeriksaan referensi dan format Markdown melalui command root.

**Interfaces:**

- Consumes: hierarki sumber kebenaran dan urutan baca dari `README.md`, `PROGRESS.md`, dan `docs/ARCHITECTURE.md`.
- Produces: prompt siap salin serta format entri log lintas sesi yang dirujuk oleh README.

- [ ] **Step 1: Pastikan file target belum ada dan tentukan acceptance**

Run:

```bash
test ! -e docs/AI_SESSION_PROMPT.md
test ! -e docs/WORK_LOG.md
```

Expected: kedua command exit `0` sebelum implementasi.

- [ ] **Step 2: Buat prompt siap salin**

Buat `docs/AI_SESSION_PROMPT.md` dengan satu blok prompt Bahasa Indonesia yang mewajibkan AI:

- memastikan repository/working directory;
- membaca `README.md`, `PROGRESS.md`, `docs/ARCHITECTURE.md`, `docs/ADMIN_SPEC.md`, `docs/DATA_MODEL.md`, `docs/OPERATIONS.md`, `docs/TESTING.md`, dan `docs/WORK_LOG.md`;
- membaca `docs/archive/` hanya saat membutuhkan riwayat;
- memeriksa Git dan menjaga perubahan yang telah ada;
- memprioritaskan implementasi/test, keputusan terbaru, dokumentasi aktif, lalu arsip;
- merangkum orientasi dan menunggu tugas tanpa mengubah file;
- memvalidasi pekerjaan setelah menerima tugas;
- mencatat setiap tugas yang mengubah file di `docs/WORK_LOG.md`;
- memperbarui `PROGRESS.md` hanya ketika status aktif berubah;
- tidak mencatat secret dan tidak melakukan tindakan outward-facing/sulit dibalik tanpa instruksi tegas.

Prompt harus merujuk status aktual ke dokumentasi aktif, bukan menyalin hitungan test atau bug.

- [ ] **Step 3: Buat log kerja awal**

Buat `docs/WORK_LOG.md` dengan:

- penjelasan fungsi log dan perbedaannya dari `PROGRESS.md`;
- aturan pencatatan faktual dan larangan secret;
- format entri tetap: tanggal/judul, permintaan, proses/keputusan, file, validasi, kendala, tindak lanjut;
- entri awal 9 Agustus 2026 yang mencatat pembuatan prompt sesi dan sistem work log ini, tanpa mengulang seluruh histori cleanup.

- [ ] **Step 4: Tambahkan pointer README**

Pada bagian `Urutan Baca Dokumentasi`, tambahkan:

- `docs/AI_SESSION_PROMPT.md` sebagai prompt orientasi sesi baru;
- `docs/WORK_LOG.md` sebagai riwayat pekerjaan lintas sesi.

Pertahankan urutan dokumentasi arsitektur/operasi/pengujian yang sudah ada.

- [ ] **Step 5: Validasi isi dan referensi**

Run:

```bash
node -e "const fs=require('fs'); const p=fs.readFileSync('docs/AI_SESSION_PROMPT.md','utf8'); for (const s of ['README.md','PROGRESS.md','docs/ARCHITECTURE.md','docs/ADMIN_SPEC.md','docs/DATA_MODEL.md','docs/OPERATIONS.md','docs/TESTING.md','docs/WORK_LOG.md']) if (!p.includes(s)) throw new Error('Referensi hilang: '+s); if (!p.includes('menunggu')) throw new Error('Instruksi menunggu hilang');"
node -e "const fs=require('fs'); const p=fs.readFileSync('docs/WORK_LOG.md','utf8'); for (const s of ['Permintaan','Proses','File','Validasi','Kendala','Tindak lanjut']) if (!p.includes(s)) throw new Error('Bagian log hilang: '+s);"
```

Expected: kedua command exit `0` tanpa output.

- [ ] **Step 6: Validasi format dan scope**

Run:

```bash
npx -y prettier@3.9.6 --check README.md docs/AI_SESSION_PROMPT.md docs/WORK_LOG.md docs/superpowers/specs/2026-08-09-ai-session-prompt-design.md docs/superpowers/plans/2026-08-09-ai-session-prompt.md
git diff --check
git diff --name-only -- README.md docs/AI_SESSION_PROMPT.md docs/WORK_LOG.md docs/superpowers/specs/2026-08-09-ai-session-prompt-design.md docs/superpowers/plans/2026-08-09-ai-session-prompt.md
```

Expected: Prettier dan `git diff --check` exit `0`; daftar scope hanya memuat dokumentasi yang direncanakan.

- [ ] **Step 7: Jangan commit**

Biarkan seluruh perubahan uncommitted dan laporkan file yang dibuat/diubah serta hasil validasi kepada pengguna.

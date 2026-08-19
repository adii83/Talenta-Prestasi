# Prompt Sesi AI

File ini berisi prompt orientasi standar Bahasa Indonesia yang wajib digunakan untuk memulai atau mengorientasikan ulang sesi pengembangan AI pada repository Talenta Prestasi.

## Prompt Orientasi Sesi

```markdown
Anda adalah asisten AI yang bertugas melanjutkan pengembangan dan maintenance repository Talenta Prestasi.

Tujuan utama Anda adalah memahami kondisi repository saat ini, mempertahankan pekerjaan yang sudah ada, dan melanjutkan pengembangan secara aman tanpa merusak perubahan existing.

**==================================================**

## A. ATURAN ORIENTASI AWAL

**==================================================**

Sebelum melakukan perubahan apa pun, lakukan orientasi repository secara READ-ONLY.

Selama tahap orientasi:

* Jangan mengubah file apa pun.
* Jangan membuat file baru.
* Jangan menghapus file.
* Jangan menjalankan migration.
* Jangan menjalankan init/re-init project.
* Jangan install/uninstall package.
* Jangan melakukan restore, reset, clean, checkout, stash, atau operasi Git destruktif.
* Jangan mengubah konfigurasi Claude Code, MCP, atau environment variable.
* Jangan melakukan tindakan outward-facing seperti push, deploy, release, atau publish.

Lakukan orientasi langsung di MAIN SESSION Claude Code.

KHUSUS tahap orientasi awal:

* Jangan spawn Explore agent.
* Jangan spawn Task agent.
* Jangan menggunakan subagent/background agent.
* Jangan mendelegasikan orientasi repository ke agent lain.

Orientasi repository cukup dilakukan langsung oleh main Claude Code session.

**==================================================**

## B. VERIFIKASI WORKSPACE

**==================================================**

1. Pastikan repository dan working directory aktif adalah workspace proyek Talenta Prestasi.

2. Pastikan Anda tidak sedang berada di repository/project lain sebelum melanjutkan.

3. Jika workspace ternyata bukan Talenta Prestasi:

   * jangan melakukan perubahan apa pun,
   * laporkan kondisi tersebut,
   * tunggu instruksi pengguna.

**==================================================**

## C. BACA DOKUMENTASI UTAMA

**==================================================**

Baca dokumentasi aktif berikut secara berurutan:

1. `README.md`
2. `PROGRESS.md`
3. `docs/ARCHITECTURE.md`
4. `docs/ADMIN_SPEC.md`
5. `docs/DATA_MODEL.md`
6. `docs/OPERATIONS.md`
7. `docs/TESTING.md`
8. `docs/WORK_LOG.md`

Jangan membaca seluruh `docs/archive/` secara otomatis.

Baca file di `docs/archive/` HANYA jika:

* dokumentasi aktif merujuk kepadanya,
* diperlukan untuk memahami keputusan lama,
* terdapat konflik informasi yang membutuhkan konteks historis,
* atau tugas pengguna secara eksplisit membutuhkan riwayat keputusan.

Dokumen archive bukan source of truth utama.

**==================================================**

## D. PERIKSA KONDISI GIT

**==================================================**

Periksa kondisi repository menggunakan setidaknya:

* `git status`
* `git diff`
* `git diff --staged`

Tujuan pemeriksaan Git adalah memahami pekerjaan yang sedang berlangsung.

WAJIB:

* Pertahankan seluruh perubahan existing.
* Jangan menganggap perubahan yang belum di-commit sebagai sampah.
* Jangan menghapus atau overwrite pekerjaan sebelumnya.
* Jangan menjalankan `git reset`.
* Jangan menjalankan `git clean`.
* Jangan menjalankan `git restore`.
* Jangan menjalankan `git checkout -- <file>`.
* Jangan melakukan stash tanpa instruksi pengguna.

Jika ada perubahan existing:

* pahami terlebih dahulu,
* anggap perubahan tersebut sebagai pekerjaan yang harus dilanjutkan,
* jangan membatalkannya hanya karena berbeda dari dokumentasi.

**==================================================**

## E. SOURCE OF TRUTH

**==================================================**

Gunakan hierarki sumber kebenaran berikut:

### PRIORITAS 1

* Kode implementasi yang saat ini berfungsi.
* Test suite aktif.
* Perilaku aplikasi yang dapat diverifikasi.

### PRIORITAS 2

* Keputusan arsitektur terbaru.
* Spesifikasi terbaru yang masih aktif.

### PRIORITAS 3

* Dokumentasi aktif:

  * `README.md`
  * `PROGRESS.md`
  * `docs/ARCHITECTURE.md`
  * `docs/ADMIN_SPEC.md`
  * `docs/DATA_MODEL.md`
  * `docs/OPERATIONS.md`
  * `docs/TESTING.md`
  * `docs/WORK_LOG.md`
  * dokumentasi aktif lain di `docs/`

### PRIORITAS 4

* `docs/archive/*`

Jika terjadi konflik:

* jangan langsung mengubah kode agar sesuai dokumentasi lama,
* prioritaskan implementasi aktif + test + keputusan terbaru,
* laporkan konflik jika relevan terhadap tugas.

**==================================================**

## F. HASIL ORIENTASI

**==================================================**

Setelah orientasi selesai, jangan langsung mulai coding.

Berikan rangkuman singkat dengan struktur:

### STATUS REPOSITORY

* Workspace/repository aktif
* Branch aktif
* Kondisi working tree
* Apakah ada perubahan unstaged/staged

### STATUS IMPLEMENTASI

* Bagian utama aplikasi yang sudah berjalan
* Pekerjaan yang sedang aktif
* Area yang terlihat belum selesai jika memang jelas dari repository

### ARSITEKTUR

* Ringkasan arsitektur utama
* Backend/frontend/database utama
* Relasi penting antar komponen

### TESTING

* Test suite yang tersedia
* Cara validasi utama berdasarkan dokumentasi/repository

### PERUBAHAN EXISTING

* Ringkasan perubahan yang saat ini belum di-commit jika ada
* Jangan mengubahnya

### HAL PENTING

* Risiko, constraint, TODO aktif, atau informasi penting untuk tugas berikutnya

Setelah memberikan rangkuman:

TUNGGU instruksi tugas berikutnya.

Jangan mengubah file apa pun selama proses orientasi.

**==================================================**

## G. SETELAH MENERIMA TUGAS PENGEMBANGAN

**==================================================**

Setelah pengguna memberikan tugas:

1. Pahami terlebih dahulu area kode yang relevan.

2. Pertahankan perubahan existing.

3. Jangan melakukan refactor besar yang tidak diperlukan oleh tugas.

4. Jangan mengubah file di luar scope tugas tanpa alasan teknis yang jelas.

5. Jika menemukan perubahan existing yang berpotensi konflik dengan tugas:

   * jangan hapus,
   * jangan overwrite secara diam-diam,
   * pahami dan integrasikan,
   * jika tidak aman, laporkan kepada pengguna terlebih dahulu.

6. Gunakan agent/subagent hanya jika memang bermanfaat dan diperlukan SETELAH tahap orientasi selesai.

7. Jika menggunakan agent/subagent:

   * berikan scope yang jelas,
   * jangan gunakan agent hanya untuk pekerjaan sederhana yang bisa dilakukan main session,
   * jangan memberikan scope yang lebih luas daripada tugas pengguna,
   * jangan mengizinkan agent melakukan perubahan destruktif atau outward-facing tanpa instruksi eksplisit pengguna.

**==================================================**

## H. TESTING DAN VALIDASI

**==================================================**

Setelah perubahan kode selesai:

1. Jalankan test yang relevan dengan perubahan.

2. Jalankan validasi tambahan jika diperlukan:

   * lint
   * typecheck
   * build
   * integration test
   * browser test
   * API test
   * atau validasi lain sesuai dokumentasi project.

3. Jangan mengklaim perubahan berhasil jika test yang relevan belum dijalankan, kecuali test memang tidak tersedia.

4. Jika test gagal:

   * tentukan apakah kegagalan disebabkan perubahan Anda atau sudah existing,
   * jangan menyembunyikan kegagalan,
   * laporkan secara jelas.

**==================================================**

## I. WORK LOG DAN PROGRESS

**==================================================**

Setiap tugas yang MENGUBAH FILE harus dicatat di:

`docs/WORK_LOG.md`

Catatan harus ringkas tetapi cukup menjelaskan:

* apa yang dikerjakan,
* file/area utama yang berubah,
* validasi/test yang dilakukan,
* hasilnya.

Perbarui:

`PROGRESS.md`

HANYA jika status aktif project benar-benar berubah, misalnya:

* fitur utama selesai,
* milestone berubah,
* blocker baru ditemukan,
* status pekerjaan berubah secara signifikan.

Jangan memperbarui `PROGRESS.md` hanya karena perubahan kecil atau maintenance rutin.

**==================================================**

## J. KEAMANAN

**==================================================**

Jangan pernah menulis ke repository atau dokumentasi:

* API key
* access token
* refresh token
* password
* cookie
* private key
* database credential
* secret
* credential lain

Jika menemukan secret existing:

* jangan menyalinnya ke `WORK_LOG`,
* jangan menampilkannya secara penuh,
* jangan memindahkannya ke dokumentasi.

**==================================================**

## K. GIT DAN TINDAKAN BERDAMPAK KELUAR

**==================================================**

Tanpa instruksi eksplisit pengguna, JANGAN melakukan:

* `git push`
* force push
* merge branch
* delete branch
* release
* publish
* production deployment
* production migration
* delete database
* reset database
* destructive migration
* menghapus data pengguna
* mengubah DNS/domain/subdomain production
* mengubah credential
* mengirim email/message eksternal
* tindakan outward-facing lain
* tindakan yang sulit atau tidak dapat dibalik

Commit lokal juga jangan dilakukan kecuali pengguna meminta commit atau workflow project secara eksplisit mengharuskannya.

**==================================================**

## L. PRINSIP KERJA

**==================================================**

Selalu:

* pahami sebelum mengubah,
* lakukan perubahan sekecil dan setepat mungkin,
* pertahankan pekerjaan sebelumnya,
* gunakan source of truth sesuai prioritas,
* verifikasi perubahan,
* dokumentasikan pekerjaan,
* jangan melakukan tindakan destruktif tanpa izin,
* jangan mencoba "memperbaiki" konfigurasi yang memang disengaja.

Jangan pernah mengaudit atau melebar dari konteks yang diminta oleh user.

Hanya fokus pada hal yang diminta.

Jika menemukan potensi bug atau kesalahan di luar scope tugas, cukup beri tahu pengguna tanpa langsung memperluas perubahan ke area tersebut.

Jangan pernah memperluas scope secara signifikan terhadap sesuatu yang tidak diminta pengguna.

Jika ada ketidakpastian yang dapat menyebabkan kehilangan data atau perubahan existing:

**BERHENTI dan laporkan terlebih dahulu.**

```

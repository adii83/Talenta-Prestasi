# Prompt Sesi AI

File ini berisi prompt orientasi standar Bahasa Indonesia yang wajib digunakan untuk memulai atau mengorientasikan ulang sesi pengembangan AI pada repository Talenta Prestasi.

## Prompt Orientasi Sesi

```markdown
Anda adalah asisten AI yang bertugas melanjutkan pengembangan dan maintenance repository Talenta Prestasi.

Sebelum melakukan perubahan apa pun, lakukan langkah orientasi berikut:

1. Pastikan repository dan working directory aktif adalah workspace proyek Talenta Prestasi.
2. Baca dokumentasi utama secara berurutan:
   - `README.md`
   - `PROGRESS.md`
   - `docs/ARCHITECTURE.md`
   - `docs/ADMIN_SPEC.md`
   - `docs/DATA_MODEL.md`
   - `docs/OPERATIONS.md`
   - `docs/TESTING.md`
   - `docs/WORK_LOG.md`
3. Baca berkas di `docs/archive/` HANYA jika memerlukan konteks riwayat histori atau keputusan lampau.
4. Periksa status Git (`git status`, `git diff`) dan pastikan menjaga serta melanjutkan perubahan yang telah ada tanpa menghapusnya secara tidak sengaja.
5. Pahami hierarki sumber kebenaran (source of truth):
   - Prioritas 1: Kode implementasi yang berfungsi dan test suite aktif.
   - Prioritas 2: Keputusan dan spesifikasi arsitektur terbaru.
   - Prioritas 3: Dokumentasi aktif (`README.md`, `PROGRESS.md`, `docs/*`).
   - Prioritas 4: Berkas arsip (`docs/archive/*`).
6. Setelah selesai melakukan orientasi, berikan rangkuman singkat mengenai status repository terkini dan menunggu instruksi tugas berikutnya tanpa mengubah berkas apa pun.

Setelah menerima tugas:

1. Jalankan pengujian atau validasi yang relevan setelah menyelesaikan perubahan.
2. Catat setiap aktivitas/tugas yang mengubah berkas ke dalam `docs/WORK_LOG.md`.
3. Perbarui `PROGRESS.md` HANYA ketika status aktif berubah.
4. Jaga keamanan repository: jangan pernah mencatat secret, API key, atau kredensial dalam log/dokumentasi.
5. Jangan pernah melakukan tindakan yang berdampak keluar (outward-facing) atau sulit dibalik (hard-to-reverse action), seperti push, release, hapus branch/database, tanpa instruksi tegas dari pengguna.
```

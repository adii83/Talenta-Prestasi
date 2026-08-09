# Desain Prompt Pembuka Sesi AI

## Tujuan

Menyediakan satu prompt berbahasa Indonesia yang dapat disalin pengguna pada awal sesi AI baru agar AI memahami proyek Talenta Prestasi, membaca sumber kebenaran terbaru, menjaga perubahan pengguna, dan tidak mulai mengubah file sebelum menerima tugas khusus.

Prompt juga mewajibkan pencatatan setiap pekerjaan agar sesi berikutnya dapat mengetahui pekerjaan terakhir, proses penting, hasil validasi, kendala, dan tindak lanjut.

## File

### `docs/AI_SESSION_PROMPT.md`

Berisi blok prompt siap salin. Prompt mengarahkan AI untuk:

1. memastikan working directory dan repository yang sedang dibuka;
2. membaca `README.md`, `PROGRESS.md`, `docs/ARCHITECTURE.md`, `docs/ADMIN_SPEC.md`, `docs/DATA_MODEL.md`, `docs/OPERATIONS.md`, `docs/TESTING.md`, dan `docs/WORK_LOG.md`;
3. memakai implementasi dan executable test sebagai sumber kebenaran tertinggi;
4. memperlakukan `docs/archive/` sebagai riwayat, bukan instruksi aktif;
5. memeriksa status Git dan tidak menimpa perubahan yang sudah ada;
6. merangkum pemahaman singkat lalu menunggu tugas pengguna tanpa mengubah file;
7. setelah mengerjakan tugas, menjalankan validasi yang relevan dan memperbarui catatan proyek secara jujur;
8. tidak melakukan commit, push, deployment, publikasi, perubahan schema, atau tindakan sulit dibalik tanpa perintah tegas pengguna.

Prompt tidak menduplikasi status pengujian, daftar bug, atau rincian implementasi yang mudah basi. Informasi tersebut tetap dibaca dari dokumentasi aktif dan source code.

### `docs/WORK_LOG.md`

Berisi catatan kronologis pekerjaan lintas sesi. Setiap entri menggunakan struktur tetap:

- tanggal dan judul tugas;
- permintaan pengguna;
- proses atau keputusan penting;
- file yang diubah;
- validasi yang dijalankan beserta hasilnya;
- kendala atau pekerjaan yang belum selesai;
- tindak lanjut.

Catatan harus faktual dan ringkas. AI tidak boleh menulis bahwa pekerjaan selesai bila validasi gagal atau implementasi masih parsial. Detail percakapan yang tidak memengaruhi proyek tidak perlu dicatat.

### `PROGRESS.md`

Tetap menjadi ringkasan kondisi aktif, bukan log kronologis. AI memperbaruinya hanya jika tugas mengubah salah satu hal berikut:

- status produk atau fitur;
- pekerjaan aktif;
- bug terbuka;
- revisi mekanisme yang telah disetujui;
- receipt validasi terakhir.

Setiap tugas yang mengubah file proyek tetap dicatat di `docs/WORK_LOG.md`, meskipun tidak mengubah status tingkat produk di `PROGRESS.md`.

## Alur Sesi Baru

1. Pengguna menyalin isi prompt dari `docs/AI_SESSION_PROMPT.md`.
2. AI membaca dokumentasi aktif dan status Git.
3. AI menyampaikan pemahaman singkat, perubahan yang sudah ada, dan constraint yang terdeteksi.
4. AI menunggu tugas khusus tanpa melakukan perubahan.
5. Setelah menerima dan menyelesaikan tugas, AI memvalidasi hasil.
6. AI memperbarui `docs/WORK_LOG.md` dan, bila status aktif berubah, `PROGRESS.md`.
7. AI melaporkan file yang diubah, hasil validasi, failure, dan pekerjaan tersisa.

## Batasan

- Seluruh prompt dan log aktif menggunakan Bahasa Indonesia yang jelas.
- Dokumentasi bukan pengganti verifikasi source code dan test.
- Secret, token, credential, dan data pribadi tidak boleh ditulis ke log.
- Log tidak menyimpan dump command atau percakapan panjang; hanya bukti dan keputusan yang berguna untuk sesi berikutnya.
- Catatan historis tidak boleh mengubah perilaku aplikasi.
- Tidak ada otomatisasi atau dependency baru; solusi hanya menggunakan Markdown.
- File dibuat tanpa commit kecuali pengguna meminta commit secara eksplisit.

## Pemeriksaan

- Pastikan prompt dapat langsung disalin tanpa perlu diedit.
- Pastikan seluruh referensi file aktif benar.
- Pastikan `docs/WORK_LOG.md` memiliki contoh/entri awal yang mengikuti format.
- Jalankan pemeriksaan format Markdown pada ketiga file yang disentuh.
- Pastikan tidak ada credential atau status pengujian yang disalin secara statis ke prompt.

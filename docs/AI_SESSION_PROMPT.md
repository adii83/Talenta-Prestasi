# Prompt Sesi AI

File ini berisi prompt orientasi standar Bahasa Indonesia yang wajib digunakan untuk memulai atau mengorientasikan ulang sesi pengembangan AI pada repository Talenta Prestasi.

## Prompt Orientasi Sesi

```markdown
Anda sedang bekerja di repository/project yang aktif saat ini.

## Orientasi Awal

Sebelum mengerjakan apa pun:

1. Pahami konteks project terlebih dahulu.
2. Gunakan **Graphify sebagai jalur utama untuk memahami codebase**:

   * gunakan `graphify query "<pertanyaan>"` untuk mencari konteks yang relevan,
   * gunakan `graphify explain "<konsep>"` untuk memahami komponen tertentu,
   * gunakan `graphify path "<A>" "<B>"` jika perlu memahami hubungan antarbagian.
3. Hindari membaca atau melakukan grep ke seluruh repository jika informasi yang dibutuhkan sudah bisa diperoleh melalui Graphify.
4. Ikuti seluruh aturan yang terdapat di `CLAUDE.md`.
5. Jika tersedia dan relevan, baca dokumentasi status/project seperti:

   * `README.md`
   * `PROGRESS.md`
   * `docs/WORK_LOG.md`
   * dokumentasi arsitektur atau spesifikasi lain yang relevan.
6. Jangan membaca seluruh dokumentasi tanpa kebutuhan.
7. Pada tahap orientasi, jangan melakukan perubahan apa pun sampai saya memberikan tugas.

Setelah memahami kondisi project, berikan rangkuman singkat mengenai:

* tujuan project,
* arsitektur utama,
* bagian penting yang relevan,
* progres/status terakhir jika tersedia,
* dan konteks penting untuk melanjutkan pekerjaan.

Setelah itu **berhenti dan tunggu instruksi saya**.

## Saat Saya Memberikan Tugas

Setelah saya memberikan tugas:

* fokus hanya pada scope yang saya minta,
* pahami area yang relevan sebelum mengubah kode,
* jangan melakukan audit repository secara menyeluruh kecuali diminta,
* jangan melakukan refactor atau perubahan tambahan yang tidak diperlukan,
* pertahankan seluruh pekerjaan existing,
* jangan commit, push, deploy, atau melakukan tindakan destruktif kecuali saya memintanya,
* baca hanya file yang memang diperlukan,
* lakukan perubahan sekecil dan setepat mungkin.

Jika tugas mengubah beberapa file yang masih merupakan satu pekerjaan yang sama, selesaikan seluruh perubahan tersebut terlebih dahulu. **Jangan menjalankan Graphify update setelah setiap file.**

## Validasi

Jika melakukan perubahan kode:

1. Jalankan test, build, lint, typecheck, atau validasi lain yang relevan dengan perubahan.
2. Jangan mengklaim berhasil jika validasi yang relevan belum dilakukan.
3. Jika terdapat kegagalan yang bukan disebabkan oleh perubahan baru, jelaskan dengan jelas.

## Update Graphify

Setelah **satu tugas/perubahan kode selesai seluruhnya**, dan setelah validasi yang relevan dilakukan, jalankan:

```bash
graphify update .
```

Jalankan hanya sekali setelah logical batch pekerjaan selesai, bukan setelah setiap file.

Jika `graphify update .` gagal:

* jangan menyembunyikan kegagalannya,
* jangan mengulang secara agresif tanpa memahami penyebabnya,
* laporkan kepada saya bahwa graph belum berhasil diperbarui.

Jika tidak ada perubahan kode atau tidak ada perubahan yang memengaruhi knowledge graph, tidak perlu menjalankan update yang tidak diperlukan.

## Prinsip Utama

**PAHAMI PROJECT → TUNGGU TUGAS → FOKUS PADA SCOPE → IMPLEMENTASI → VALIDASI → UPDATE GRAPHIFY → LAPORKAN HASIL.**


```

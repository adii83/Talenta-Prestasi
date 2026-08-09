# Desain Gitignore Artifact Lokal

## Tujuan

Menjaga artifact lokal AI/tooling, environment rahasia, serta database/cache lokal agar tidak ikut di-commit ke GitHub tanpa mengabaikan dokumentasi atau contoh konfigurasi yang memang dibutuhkan proyek.

## Perubahan

Tambahkan kelompok berikut ke `.gitignore`:

```gitignore
# Local AI/tooling
.claude/
.claude-flow/
.swarm/
.mcp.json

# Local environment
.env
.env.*
!.env.example
!**/.env.example

# Local database/cache
*.db
*.db-shm
*.db-wal
```

`ruvector.db` tercakup oleh pola `*.db`, sehingga tidak perlu baris duplikat.

## File yang Tetap Dapat Di-commit

- `CLAUDE.md` tetap tersedia bagi programmer dan AI berikutnya.
- `.env.example` pada root maupun subdirektori tetap dapat di-commit.
- Dokumentasi aktif, termasuk `docs/AI_SESSION_PROMPT.md` dan `docs/WORK_LOG.md`, tidak terpengaruh.
- Konfigurasi proyek lain seperti `.editorconfig` dan `.prettierrc` tidak terpengaruh.

## Batasan

- Tidak menghapus file lokal.
- Tidak menjalankan `git rm --cached` atau mengubah tracking file yang sudah di-commit.
- Tidak mengabaikan seluruh pola `*.json`, `*.md`, atau direktori `docs/`.
- Tidak memasukkan nama credential atau nilai secret ke dokumentasi/log.
- Perubahan tetap uncommitted kecuali pengguna meminta commit secara eksplisit.

## Validasi

1. Jalankan `git check-ignore -v` terhadap `.claude/`, `.claude-flow/`, `.swarm/`, `.mcp.json`, `ruvector.db`, `.env`, file `.env.*`, `*.db-shm`, dan `*.db-wal`; semuanya harus diabaikan.
2. Jalankan `git check-ignore -v --no-index` pada `.env.example` dan `apps/backend/.env.example`; keduanya tidak boleh berakhir pada aturan ignore setelah pengecualian diterapkan.
3. Pastikan `CLAUDE.md` tidak diabaikan.
4. Jalankan `git diff --check` dan Prettier pada dokumentasi yang disentuh.
5. Tambahkan entri faktual ke `docs/WORK_LOG.md` setelah perubahan tervalidasi.

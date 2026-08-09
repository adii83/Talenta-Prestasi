# Gitignore Artifact Lokal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengabaikan artifact lokal AI/tooling, environment, dan database/cache tanpa menyembunyikan `CLAUDE.md` atau `.env.example`.

**Architecture:** Tambahkan pola exact pada `.gitignore`; jangan menghapus atau mengubah tracking file. Catat hasil faktual sebagai satu entri baru di `docs/WORK_LOG.md`.

**Tech Stack:** Git ignore patterns, Markdown, Prettier 3.9.6.

## Global Constraints

- Tidak menghapus file lokal.
- Tidak menjalankan `git rm --cached` atau mengubah tracking file yang sudah di-commit.
- `CLAUDE.md` tetap dapat di-commit.
- `.env.example` pada root dan subdirektori tetap dapat di-commit.
- `ruvector.db` dicakup oleh `*.db`; jangan menambah baris duplikat.
- Jangan mengabaikan pola luas seperti `*.json`, `*.md`, atau `docs/`.
- Perubahan hanya `.gitignore`, `docs/WORK_LOG.md`, spec, dan plan ini.
- Jangan commit.

---

### Task 1: Abaikan artifact lokal

**Files:**

- Modify: `.gitignore`
- Modify: `docs/WORK_LOG.md`
- Test: `git check-ignore`, Prettier, dan `git diff --check`.

**Interfaces:**

- Consumes: daftar pola exact dari `docs/superpowers/specs/2026-08-09-local-artifacts-gitignore-design.md`.
- Produces: status Git yang tidak lagi menampilkan artifact lokal, tanpa menyembunyikan file konfigurasi bersama.

- [ ] **Step 1: Tambahkan pola exact**

Tambahkan blok berikut setelah aturan yang sudah ada, tanpa menghapus aturan lama:

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

- [ ] **Step 2: Catat perubahan**

Tambahkan satu entri bertanggal 2026-08-09 ke `docs/WORK_LOG.md` dengan field `Tanggal/Judul`, `Permintaan`, `Proses/Keputusan`, `File`, `Validasi`, `Kendala`, dan `Tindak lanjut`. Jangan mencatat secret atau mengklaim command yang belum dijalankan.

- [ ] **Step 3: Validasi pola yang harus diabaikan**

Run:

```bash
git check-ignore -v --no-index .claude/probe .claude-flow/probe .swarm/probe .mcp.json ruvector.db local.db-shm local.db-wal .env .env.local
```

Expected: setiap path menghasilkan aturan `.gitignore` yang sesuai.

- [ ] **Step 4: Validasi pengecualian**

Run:

```bash
test -z "$(git check-ignore --no-index .env.example)"
test -z "$(git check-ignore --no-index apps/backend/.env.example)"
test -z "$(git check-ignore --no-index CLAUDE.md)"
```

Expected: ketiganya exit `0`, berarti tidak diabaikan.

- [ ] **Step 5: Validasi dokumentasi dan diff**

Run:

```bash
npx -y prettier@3.9.6 --check docs/WORK_LOG.md docs/superpowers/specs/2026-08-09-local-artifacts-gitignore-design.md docs/superpowers/plans/2026-08-09-local-artifacts-gitignore.md
git diff --check
git status --short
```

Expected: Prettier dan `git diff --check` lulus; artifact lokal tidak lagi tampil sebagai untracked; tidak ada file yang dihapus atau di-untrack.

- [ ] **Step 6: Jangan commit**

Biarkan perubahan uncommitted dan laporkan hasil validasi secara jujur.

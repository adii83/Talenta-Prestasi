# ðŸ† Template Website Ajang Talenta (Platform Kompetisi Terpadu)

Proyek ini adalah fondasi antarmuka (*frontend template*) untuk platform pendaftaran, informasi, dan pengumuman ajang talenta/kompetisi akademik skala nasional. 

Sistem ini didesain secara modular, bersih, dan sangat responsif agar ke depannya dapat diintegrasikan dengan **Sistem Manajemen Konten (CMS)** dan arsitektur *Multi-Tenant* (Subdomain).

---

## ðŸŽ¯ Visi & Konsep Arsitektur (Menuju CMS & Subdomain)

Sesuai permintaan klien, sistem ini dibangun agar **"sekali buat, bisa dipakai berulang kali untuk lomba-lomba berikutnya"**. Berikut adalah konsep bagaimana antarmuka HTML statis ini nantinya bekerja secara dinamis melalui *backend*:

### 1. Arsitektur Multi-Tenant (Konsep Subdomain)
Klien ingin agar setiap ada lomba baru (misal: Olimpiade Matematika 2026, Cerdas Cermat 2027), sistem tidak perlu dibuat dari nol. 
- **Konsep:** Backend (CMS) akan mengelola basis data terpusat. Ketika admin membuat "Event Baru" di panel CMS, **Admin berhak menentukan sendiri nama tautannya** (mengisi kolom *slug* / *subdomain*). Misalnya Admin mengetik `matematika2026`, maka alamat websitenya akan diaktifkan menjadi `matematika2026.talentaprestasi.id`. Hal ini memberi kontrol penuh kepada Admin agar tidak ada kesalahan penamaan dan bisa diedit sesuai kebutuhan.
- **Templating:** Subdomain tersebut akan secara otomatis memanggil struktur HTML/CSS dari template ini. Namun, kontennya (teks, logo, warna tema, dokumen juknis) ditarik dari *database* event tersebut. Backend hanya satu (berbagi resource), namun "wajah" (frontend) yang tampil menyesuaikan dengan event yang sedang diakses.

### 2. Cara Kerja CMS (Admin Panel)
Nantinya, Admin hanya perlu melakukan input data melalui antarmuka CMS tanpa menyentuh baris kode (coding) sama sekali:
- **Pengaturan Tema:** Admin mengganti *Color Picker* untuk warna utama. Di sistem backend, ini akan menimpa variabel CSS secara otomatis pada bagian header HTML: `:root { --c-primary: #WarnaBaru; }`.
- **Manajemen Konten Utama:** Admin mengunggah logo baru, lalu sistem mengganti file gambar lama. Admin juga mengganti teks "Beranda", "Benefit", dan "Jadwal" lewat Form di CMS.
- **Sistem Fitur Modular (On/Off):** Di template ini sudah disediakan arsitektur *class* `section--disabled`. Melalui CMS, Admin bisa menggeser *toggle* "Sembunyikan Pemenang" saat lomba masih tahap pendaftaran. Sistem otomatis menambahkan class `section--disabled` pada blok Pemenang sehingga tidak tampil di publik.
- **Unggah Dokumen:** Fitur tab di `unduh.html` didesain dinamis dengan model kapsul (*pill wrap*). CMS akan me-looping otomatis nama tahun kompetisi ke dalam tab, dan mendaftar file PDF di panel bawahnya.
- **Pengumuman Juara:** Data juara (Nama, Asal Sekolah, Daerah, No Ujian) diinput ke CMS melalui form lengkap dengan unggah foto pemenang (tanpa impor Excel). Lalu data itu akan di-render otomatis ke dalam komponen `champion-card` yang sudah didesain rapi (lengkap dengan medali emas dan detail spesifiknya).

---

## ðŸŒŸ Fitur Utama Frontend Saat Ini

1. **Desain Modern & Responsif:** Kompatibel penuh dari layar *smartphone* kecil (Mobile First) hingga monitor lebar (Desktop). Menggunakan Flexbox & CSS Grid modern secara komprehensif.
2. **Tab Sistem Kapsul (Pills):** Navigasi dokumen unduhan yang bisa *wrap* otomatis ke baris bawah saat jumlah kategori banyak. Sangat jelas bagi "orang awam" pengguna *smartphone* tanpa perlu menebak ada *hidden scroll*.
3. **Champion Cards Eksklusif:** Desain kartu pemenang yang *aesthetic* dengan gradasi emas, inisial foto bulat, nama lengkap, **asal sekolah**, dan struktur metadata yang tersusun vertikal rapi (menggantikan sistem tabel yang kaku).
4. **Bottom Navigation (Mobile):** Navigasi di bagian bawah layar bergaya aplikasi mobile (*app-like*) khusus untuk interaksi layar sentuh yang lebih nyaman.
5. **Floating WhatsApp:** Tombol askes cepat terpasang di pojok kanan bawah agar pengguna (guru pembimbing/peserta) mudah menghubungi panitia.

---

## ðŸ“ Struktur Direktori Dasar (Siap Integrasi)

```text
ðŸ“¦ Template-Lomba
 â”£ ðŸ“‚ css/
 â”ƒ â”— ðŸ“œ style.css           # Sistem desain utama & variabel tema (Design Tokens)
 â”£ ðŸ“‚ img/                  # Aset gambar (logo, banner)
 â”£ ðŸ“‚ js/
 â”ƒ â”— ðŸ“œ script.js           # Logika interaksi UI (Navigasi aktif, Tabs, dll)
 â”£ ðŸ“œ index.html            # Beranda (Hero, Jadwal, Highlight Pemenang)
 â”£ ðŸ“œ unduh.html            # Halaman Dokumen & Materi (Tab dinamis tipe kapsul)
 â”£ ðŸ“œ pemenang.html         # Halaman Daftar Lengkap Pemenang & Asal Sekolah
 â”£ ðŸ“œ arsip.html            # Daftar Event/Lomba Terdahulu (Grid)
 â”£ ðŸ“œ arsip-detail.html     # Detail pemenang dari event spesifik masa lalu
 â”£ ðŸ“œ faq.html              # Pertanyaan yang sering diajukan (Accordion)
 â”£ ðŸ“œ login.html            # Halaman Masuk Kontingen/Sekolah
 â”— ðŸ“œ dashboard.html        # Dashboard Manajemen (Setelah Login)
```

---

## ðŸ› ï¸ Panduan Eksekusi (Bagi Developer Backend & Fullstack)

Saat tim *Backend* mulai menginjeksi framework (seperti Laravel, Next.js, Django, atau CodeIgniter) ke template statis ini, ikuti pakem arsitektur berikut:

1. **Injeksi Tema Dinamis:**
   Buat *helper* atau langsung sisipkan kode di tag `<head>` untuk *override* CSS Token dari database:
   ```html
   <style>
     :root {
       --c-primary: <?php echo $event->primary_color; ?>;
       --c-accent: <?php echo $event->accent_color; ?>;
     }
   </style>
   ```
2. **Handle Navigasi Aktif (Active Class):** 
   Logika pewarnaan menu yang sedang aktif (warna biru) saat ini diatur lewat Vanilla JS di `script.js`. Jika menggunakan sistem *Router* dari Backend, pastikan untuk menghapus logika JS terkait navigasi dan menggantinya dengan logika Blade/Twig/JSX (contoh: `class="navbar__link {{ request()->is('unduh') ? 'navbar__link--active' : '' }}"`).
3. **Looping `champion-card`:**
   Komponen kartu pemenang telah difinalisasi HTML/CSS-nya. Saat menarik data dari *database*, Anda cukup melakukan *looping* blok HTML `<div class="champion-card">...</div>` dengan mengisi variabel data yang relevan (Nama, Sekolah, Daerah). Struktur CSS sudah otomatis menata posisi komponen tersebut menggunakan Grid.


---

## 📌 Dokumentasi Progres

Sebelum melanjutkan pengembangan, AI/developer wajib membaca `README.md` dan `PROGRESS.md`. Panel admin dipisahkan dari dashboard kontingen. Spesifikasi admin terdapat di `ADMIN_SPEC.md` dan setiap perubahan wajib dicatat di `PROGRESS.md`.


/* State mandiri FAQ — baseline mengikuti konten template faq.html. */
const FAQ_STATE_KEY = "talenta_faq_manager_v1";
const FAQ_BASELINE = {
  version: 1,
  page: {
    active: true,
    eyebrow: "Bantuan",
    title: "Pertanyaan Umum",
    description:
      "Temukan jawaban atas pertanyaan yang sering diajukan seputar Olimpiade Sains Nusantara.",
    alignment: "center",
  },
  categories: [
    {
      id: "pendaftaran",
      active: true,
      title: "Seputar Pendaftaran",
      questions: [
        {
          id: "faq-peserta",
          active: true,
          question: "Siapa saja yang bisa mendaftar Olimpiade Sains Nusantara?",
          answer:
            "Olimpiade Sains Nusantara terbuka untuk seluruh siswa jenjang SD/MI, SMP/MTs, dan SMA/MA/SMK di seluruh Indonesia. Pendaftaran dilakukan melalui sekolah (kontingen), bukan secara individu. Setiap sekolah mendaftarkan satu atau lebih peserta melalui satu akun kontingen.",
        },
        {
          id: "faq-cara-daftar",
          active: true,
          question: "Bagaimana cara mendaftar?",
          answer:
            "Pendaftaran dilakukan melalui 4 langkah: (1) Transfer biaya pendaftaran, (2) Konfirmasi via WhatsApp, (3) Verifikasi akun oleh panitia, dan (4) Registrasi peserta melalui dashboard. Panduan lengkap tersedia di halaman Beranda.",
        },
        {
          id: "faq-biaya",
          active: true,
          question: "Berapa biaya pendaftaran per peserta?",
          answer:
            "Biaya pendaftaran adalah Rp150.000 per peserta untuk semua jenjang. Biaya ini sudah termasuk sertifikat digital, akses materi persiapan, dan ID Card peserta.",
        },
        {
          id: "faq-verifikasi",
          active: true,
          question: "Berapa lama proses verifikasi akun?",
          answer:
            "Proses verifikasi dilakukan maksimal 1×24 jam setelah konfirmasi pembayaran diterima. Akun login akan dikirimkan langsung melalui WhatsApp penanggung jawab yang terdaftar.",
        },
        {
          id: "faq-individu",
          active: true,
          question:
            "Apakah bisa mendaftar secara individu tanpa melalui sekolah?",
          answer:
            "Saat ini pendaftaran hanya dapat dilakukan melalui kontingen sekolah. Setiap sekolah menunjuk satu penanggung jawab untuk mendaftarkan seluruh peserta. Jika Anda ingin mendaftar secara individu, silakan hubungi pihak sekolah Anda terlebih dahulu.",
        },
      ],
    },
    {
      id: "penilaian",
      active: true,
      title: "Seputar Penilaian & Peringkat",
      questions: [
        {
          id: "faq-sistem-nilai",
          active: true,
          question: "Bagaimana sistem penilaian ajang talenta?",
          answer:
            "Penilaian dilakukan berdasarkan jawaban benar pada soal pilihan ganda dan uraian. Bobot penilaian disesuaikan dengan tingkat kesulitan soal. Detail kisi-kisi dan rubrik penilaian tersedia di halaman Unduh.",
        },
        {
          id: "faq-pengumuman",
          active: true,
          question: "Kapan hasil peringkat diumumkan?",
          answer:
            "Peringkat diperbarui secara berkala setelah pelaksanaan ujian dan dapat dilihat di halaman Pemenang. Pengumuman resmi pemenang akan diterbitkan melalui SK Penetapan Pemenang yang tersedia di halaman Unduh.",
        },
        {
          id: "faq-wilayah",
          active: true,
          question: "Apakah ada peringkat per wilayah?",
          answer:
            "Ya, peringkat tersedia dalam tiga tingkat: se-Kabupaten/Kota, se-Provinsi, dan se-Indonesia. Peserta dapat melihat posisinya di masing-masing tingkat melalui halaman Pemenang.",
        },
      ],
    },
    {
      id: "sertifikat",
      active: true,
      title: "Seputar Sertifikat",
      questions: [
        {
          id: "faq-semua-sertifikat",
          active: true,
          question: "Apakah semua peserta mendapatkan sertifikat?",
          answer:
            "Ya, setiap peserta yang mengikuti ujian hingga selesai akan mendapatkan sertifikat partisipasi digital. Peserta yang meraih peringkat tertentu akan mendapatkan sertifikat penghargaan tambahan.",
        },
        {
          id: "faq-unduh-sertifikat",
          active: true,
          question: "Bagaimana cara mengunduh sertifikat?",
          answer:
            "Sertifikat dapat diunduh melalui dashboard kontingen setelah seluruh proses penilaian selesai. Penanggung jawab sekolah dapat mengunduh sertifikat untuk semua peserta yang terdaftar dalam kontingen tersebut.",
        },
        {
          id: "faq-resmi",
          active: true,
          question: "Apakah sertifikat berlaku resmi untuk portofolio?",
          answer:
            "Sertifikat Olimpiade Sains Nusantara diterbitkan secara resmi oleh panitia penyelenggara dan dapat digunakan sebagai portofolio akademik, termasuk untuk keperluan pendaftaran sekolah lanjutan atau ajang talenta lainnya. Setiap sertifikat dilengkapi dengan nomor seri unik yang dapat diverifikasi.",
        },
      ],
    },
  ],
};
function faqClone(v) {
  return JSON.parse(JSON.stringify(v));
}
function faqRead() {
  try {
    return JSON.parse(localStorage.getItem(FAQ_STATE_KEY) || "null");
  } catch (e) {
    console.warn("State FAQ rusak; baseline digunakan.", e);
    return null;
  }
}
function faqUid(prefix = "faq") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function normalizeFaqState(source) {
  const s = { ...faqClone(FAQ_BASELINE), ...(source || {}) };
  s.page = { ...FAQ_BASELINE.page, ...(source?.page || {}) };
  const used = new Set();
  s.categories = (s.categories || []).filter(Boolean).map((cat, i) => {
    let id = cat.id || faqUid("category");
    while (used.has(id)) id = faqUid("category");
    used.add(id);
    return {
      ...cat,
      id,
      title: cat.title || `Kategori ${i + 1}`,
      active: cat.active !== false,
      questions: (cat.questions || []).filter(Boolean).map((q) => {
        let qid = q.id || faqUid("question");
        while (used.has(qid)) qid = faqUid("question");
        used.add(qid);
        return {
          ...q,
          id: qid,
          active: q.active !== false,
          question: q.question || "",
          answer: q.answer || "",
        };
      }),
    };
  });
  return s;
}
function getFaqAdminState() {
  return normalizeFaqState(faqRead() || FAQ_BASELINE);
}
function getPublicFaqState() {
  const s = getFaqAdminState();
  return {
    ...s,
    categories: s.categories
      .filter((c) => c.active !== false)
      .map((c) => ({
        ...c,
        questions: c.questions.filter(
          (q) => q.active !== false && q.question.trim() && q.answer.trim(),
        ),
      }))
      .filter((c) => c.questions.length),
  };
}
function saveFaqAdminState(state) {
  localStorage.setItem(FAQ_STATE_KEY, JSON.stringify(normalizeFaqState(state)));
}
function resetFaqAdminState() {
  localStorage.removeItem(FAQ_STATE_KEY);
  return getFaqAdminState();
}

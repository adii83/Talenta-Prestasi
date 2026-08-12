/* State mandiri FAQ — baseline mengikuti konten template faq.html. */
const FAQ_STATE_KEY = "talenta_faq_manager_v1";
const FAQ_BASELINE = {
  version: 2,
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
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function faqString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}
function faqEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function faqSafeId(value, fallback, used) {
  const str = faqString(value).trim();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    used.add(str);
    return str;
  }
  const base =
    str
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    fallback ||
    "faq";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}
function normalizeFaqState(source) {
  const raw = source && typeof source === "object" ? source : {};
  const rawPage =
    raw.page && typeof raw.page === "object" ? raw.page : FAQ_BASELINE.page;
  const used = new Set();
  const categories = Array.isArray(raw.categories) ? raw.categories : [];
  return {
    version: 2,
    page: {
      active: rawPage.active !== false,
      eyebrow: faqString(rawPage.eyebrow, FAQ_BASELINE.page.eyebrow),
      title: faqString(rawPage.title, FAQ_BASELINE.page.title),
      description: faqString(
        rawPage.description,
        FAQ_BASELINE.page.description,
      ),
      alignment: rawPage.alignment === "left" ? "left" : "center",
    },
    categories: categories
      .filter((category) => category && typeof category === "object")
      .map((category, categoryIndex) => {
        const id = faqSafeId(
          category.id,
          `category-${categoryIndex + 1}`,
          used,
        );
        const questions = Array.isArray(category.questions)
          ? category.questions
          : [];
        return {
          id,
          active: category.active !== false,
          title:
            faqString(category.title).trim() || `Kategori ${categoryIndex + 1}`,
          questions: questions
            .filter((question) => question && typeof question === "object")
            .map((question, questionIndex) => ({
              id: faqSafeId(
                question.id,
                `question-${categoryIndex + 1}-${questionIndex + 1}`,
                used,
              ),
              categoryId: id,
              active: question.active !== false,
              question: faqString(question.question),
              answer: faqString(question.answer),
            })),
        };
      }),
  };
}
function getFaqAdminState() {
  return normalizeFaqState(faqRead() || FAQ_BASELINE);
}
function getPublicFaqStateFromSource(source) {
  const s = normalizeFaqState(source);
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
function getPublicFaqState() {
  return getPublicFaqStateFromSource(getFaqAdminState());
}
function buildFaqAccordionMarkup(categories, options = {}) {
  const idPrefix = faqSafeId(options.idPrefix, "faq", new Set());
  return categories
    .map(
      (category) =>
        `<section class="faq-category" data-faq-category-id="${faqEscape(category.id)}"><h2 class="faq-category__title">${faqEscape(category.title)}</h2><div class="accordion">${category.questions
          .map((question) => {
            const panelId = `${idPrefix}-${question.id}`;
            const triggerId = `${panelId}-trigger`;
            return `<div class="accordion__item" data-faq-question-id="${faqEscape(question.id)}"><button class="accordion__trigger" id="${faqEscape(triggerId)}" type="button" aria-expanded="false" aria-controls="${faqEscape(panelId)}"><span>${faqEscape(question.question)}</span><svg class="accordion__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="accordion__content" id="${faqEscape(panelId)}" role="region" aria-labelledby="${faqEscape(triggerId)}"><div class="accordion__body">${faqEscape(question.answer).replace(/\r?\n/g, "<br>")}</div></div></div>`;
          })
          .join("")}</div></section>`,
    )
    .join("");
}
function buildFaqPageMarkup(state, options = {}) {
  const normalized = normalizeFaqState(state);
  const page = normalized.page;
  if (!page.active) {
    const homeHref = faqEscape(options.homeHref || "../");
    return `<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="eye-off"></i><h1 class="t-h2">FAQ tidak tersedia</h1><p>Halaman bantuan sedang dinonaktifkan.</p><a class="btn btn--outline" href="${homeHref}">Kembali ke Beranda</a></div></div></section>`;
  }
  const categories = normalized.categories
    .filter((category) => category.active)
    .map((category) => ({
      ...category,
      questions: category.questions.filter(
        (question) =>
          question.active && question.question.trim() && question.answer.trim(),
      ),
    }))
    .filter((category) => category.questions.length);
  return `<section class="section"><div class="container"><div class="section__header${page.alignment === "left" ? " section__header--left" : ""}"><p class="t-eyebrow">${faqEscape(page.eyebrow)}</p><h1 class="t-h1">${faqEscape(page.title)}</h1><p>${faqEscape(page.description)}</p></div>${
    categories.length
      ? buildFaqAccordionMarkup(categories, options)
      : '<div class="public-empty-state public-empty-state--compact"><p>Belum ada pertanyaan yang dipublikasikan.</p></div>'
  }</div></section>`;
}
function bindFaqAccordion(root = document) {
  root.querySelectorAll(".accordion__trigger").forEach((trigger) => {
    if (trigger.dataset.accordionBound === "1") return;
    trigger.dataset.accordionBound = "1";
    trigger.addEventListener("click", () => {
      const item = trigger.closest(".accordion__item");
      const content = item.querySelector(".accordion__content");
      const isOpen = item.classList.contains("accordion__item--open");
      item
        .closest(".accordion")
        .querySelectorAll(".accordion__item")
        .forEach((other) => {
          other.classList.remove("accordion__item--open");
          other
            .querySelector(".accordion__trigger")
            ?.setAttribute("aria-expanded", "false");
          const otherContent = other.querySelector(".accordion__content");
          if (otherContent) otherContent.style.maxHeight = "0";
        });
      if (!isOpen) {
        item.classList.add("accordion__item--open");
        trigger.setAttribute("aria-expanded", "true");
        content.style.maxHeight = `${content.scrollHeight}px`;
      }
    });
  });
}
function saveFaqAdminState(state) {
  const normalized = normalizeFaqState(state);
  localStorage.setItem(FAQ_STATE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent("talenta:faq", { detail: faqClone(normalized) }),
  );
  return faqClone(normalized);
}
function resetFaqAdminState() {
  localStorage.removeItem(FAQ_STATE_KEY);
  const baseline = getFaqAdminState();
  window.dispatchEvent(
    new CustomEvent("talenta:faq", { detail: faqClone(baseline) }),
  );
  return baseline;
}

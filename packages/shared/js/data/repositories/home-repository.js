/* State Beranda bersama untuk editor Admin dan renderer Template publik. */
const HOME_STATE_KEY = "talenta_home_editor_v1";
const HOME_STATE_EVENT = "talenta:home";
const HOME_WINNER_MANAGER_KEY = "talenta_winner_manager_v1";
const HOME_WINNER_PAGE_KEY = "talenta_winner_page_v1";

/* Markup Hero dipakai bersama oleh Template publik dan preview Admin.
   Template tetap menjadi acuan class, urutan elemen, dan komponen visual. */
function buildHomeHeroMarkup(hero, options = {}) {
  const escape = (value = "") =>
    String(value).replace(
      /[&<>"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
    );
  const resolveAsset = options.resolveAsset || ((value) => value || "");
  const resolveUrl = options.resolveUrl || ((value) => value || "#");
  const renderIcon = options.renderIcon || (() => "");
  const linkAttributes = options.linkAttributes || (() => "");
  const badges = (hero.badges || []).filter((item) => item.active !== false);
  const buttons = (hero.buttons || []).filter((item) => item.active !== false);
  const image = resolveAsset(hero.image, "assets/images/garuda.png");
  const imageMarkup = (modifier) =>
    `<div class="hero__image hero__image--${modifier}"><img src="${escape(image)}" alt="${escape(hero.imageAlt || "")}" /></div>`;

  return `<div class="container hero__layout"><div class="hero__inner"><p class="t-eyebrow">${escape(hero.eyebrow)}</p><h1 class="t-h1">${escape(hero.title)}</h1>${imageMarkup("mobile")}<p class="hero__subtitle">${escape(hero.description)}</p><div class="hero__badges">${badges.map((item) => `<span class="hero__badge">${escape(item.label)}</span>`).join("")}</div><div class="hero__buttons">${buttons.map((item) => `<a href="${escape(resolveUrl(item.url))}" class="btn ${item.style === "outline" ? "btn--outline" : "btn--white"} btn--lg"${item.style === "outline" ? ' style="color:var(--c-white);border-color:rgba(255,255,255,.4)"' : ""}${linkAttributes(item)}>${escape(item.label)} ${renderIcon(item, 18)}</a>`).join("")}</div></div>${imageMarkup("desktop")}</div>`;
}

/* Markup Highlight Pemenang juga dipakai bersama. Dengan begitu preview Admin
   tidak mempunyai versi kartu, header, atau empty-state yang berbeda dari Template. */
function buildHomeWinnerMarkup(winner, categories, display, options = {}) {
  const escape = (value = "") =>
    String(value).replace(
      /[&<>"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
    );
  const resolveAsset = options.resolveAsset || ((value) => value || "");
  const initials = (name = "") =>
    String(name || "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase();
  const meta = (item) =>
    [
      display.showExam && item.exam
        ? `<span><span class="meta-label">No. Ujian:</span> ${escape(item.exam)}</span>`
        : "",
      display.showDistrict && item.district
        ? `<span><span class="meta-label">Kecamatan:</span> ${escape(item.district)}</span>`
        : "",
      display.showRegency && item.regency
        ? `<span><span class="meta-label">Kabupaten:</span> ${escape(item.regency)}</span>`
        : "",
      display.showProvince && item.province
        ? `<span><span class="meta-label">Provinsi:</span> ${escape(item.province)}</span>`
        : "",
    ].join("");
  const headerClass =
    winner.alignment === "left" ? " section__header--left" : "";
  const groups = categories.length
    ? categories
        .map(
          (category) =>
            `<section class="home-winner-group"><h3 class="winner-group__title"><i data-lucide="${escape(category.icon || "trophy")}"></i>${escape(category.name)}<span class="badge badge--gold">${category.winners.length} Pemenang</span></h3><div class="champion-grid">${category.winners.map((item) => `<article class="champion-card">${display.showPhoto ? `<div class="champion-card__photo">${item.photo ? `<img src="${escape(resolveAsset(item.photo))}" alt="Foto ${escape(item.name)}" />` : escape(initials(item.name))}</div>` : ""}<p class="champion-card__rank t-mono">${escape(item.rank)}</p><p class="champion-card__name">${escape(item.name)}</p>${display.showSchool ? `<p class="champion-card__school">${escape(item.school)}</p>` : ""}<div class="champion-card__meta">${meta(item)}</div></article>`).join("")}</div></section>`,
        )
        .join("")
    : '<div class="public-empty-state home-winner-empty"><i data-lucide="trophy"></i><p>Belum ada data pemenang aktif.</p></div>';

  return `<div class="container"><div class="section__header${headerClass}"><p class="t-eyebrow">${escape(winner.eyebrow)}</p><h2 class="t-h2">${escape(winner.title)}</h2><p>${escape(winner.description)}</p></div>${groups}</div>`;
}

function buildHomeScheduleMarkup(schedule, options = {}) {
  const escape = (value = "") =>
    String(value).replace(
      /[&<>"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
    );
  const renderIcon = options.renderIcon || (() => "");
  const cards = (schedule.cards || []).filter((item) => item.active !== false);
  return `<div class="container"><div class="section__header"><p class="t-eyebrow">${escape(schedule.eyebrow)}</p><h2 class="t-h2">${escape(schedule.title)}</h2><p>${escape(schedule.description)}</p></div><div class="grid home-grid" style="--home-columns:${Math.min(Math.max(cards.length, 1), 4)}">${cards.map((item) => `<div class="schedule-card"><div class="schedule-card__icon">${renderIcon(item, 22)}</div><p class="schedule-card__label">${escape(item.label)}</p><p class="schedule-card__date t-mono">${escape(item.date)}</p>${item.description ? `<p class="schedule-card__desc">${escape(item.description)}</p>` : ""}</div>`).join("")}</div></div>`;
}

function buildHomePricingMarkup(pricing) {
  const escape = (value = "") =>
    String(value).replace(
      /[&<>"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
    );
  const packages = (pricing.packages || []).filter(
    (item) => item.active !== false,
  );
  const features = (pricing.features || []).filter(
    (item) => item.active !== false,
  );
  const renderPackage = (item) => {
    const showName =
      pricing.variant !== "single" || item.name !== "Semua Jenjang";
    const facilityList = features.filter((feature) => feature.label).length
      ? `<div class="home-pricing-features" aria-label="Fasilitas termasuk">${features
          .filter((feature) => feature.label)
          .map(
            (feature) =>
              `<span><i data-lucide="check" aria-hidden="true"></i>${escape(feature.label)}</span>`,
          )
          .join("")}</div>`
      : "";
    return `<article class="pricing-section home-pricing-card${item.featured ? " home-pricing-card--featured" : ""}${pricing.ornament === false ? " home-pricing-card--plain" : ""}"><p class="t-eyebrow">${escape(pricing.eyebrow)}</p>${showName ? `<h3 class="home-pricing-name">${escape(item.name)}</h3>` : ""}<p class="pricing__amount">${escape(item.price)}</p><p class="pricing__per">${escape(item.unit)}</p>${facilityList}</article>`;
  };
  return `<div class="container"><div class="home-pricing-grid${pricing.variant === "single" ? " home-pricing-grid--single" : ""}">${packages.map(renderPackage).join("")}</div></div>`;
}

function buildHomeBenefitMarkup(benefit, options = {}) {
  const escape = (value = "") =>
    String(value).replace(
      /[&<>"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
    );
  const renderIcon = options.renderIcon || (() => "");
  const resolveUrl = options.resolveUrl || ((value) => value || "#");
  const linkAttributes = options.linkAttributes || (() => "");
  const cards = (benefit.cards || []).filter((item) => item.active !== false);
  const headerClass =
    benefit.alignment === "left" ? " section__header--left" : "";
  return `<div class="container"><div class="section__header${headerClass}"><p class="t-eyebrow">${escape(benefit.eyebrow)}</p><h2 class="t-h2">${escape(benefit.title)}</h2><p>${escape(benefit.description)}</p></div><div class="grid home-grid home-benefit--${escape(benefit.variant)}" style="--home-columns:${Math.min(Math.max(cards.length, 1), 4)}">${cards
    .map((item) => {
      const tag = item.url ? "a" : "article";
      return `<${tag}${item.url ? ` href="${escape(resolveUrl(item.url))}"${linkAttributes(item)}` : ""} class="feature-card"><div class="feature-card__icon">${renderIcon(item, 24)}</div><h3 class="feature-card__title">${escape(item.title)}</h3><p class="feature-card__desc">${escape(item.description)}</p>${item.url ? '<span class="feature-card__link">Pelajari lebih lanjut <i data-lucide="arrow-right"></i></span>' : ""}</${tag}>`;
    })
    .join("")}</div></div>`;
}

function buildHomePartnerMarkup(partners, options = {}) {
  const escape = (value = "") =>
    String(value).replace(
      /[&<>"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
    );
  const resolveAsset = options.resolveAsset || ((value) => value || "");
  const resolveUrl = options.resolveUrl || ((value) => value || "#");
  const linkAttributes = options.linkAttributes || (() => "");
  const items = (partners.items || []).filter((item) => item.active !== false);
  const logo = (item) => {
    const content = item.logo
      ? `<img loading="lazy" decoding="async" src="${escape(resolveAsset(item.logo))}" alt="${escape(item.alt || item.name)}" />`
      : `<strong>${escape(item.name)}</strong>`;
    const inner = `${content}${partners.variant === "card" && item.name ? `<small>${escape(item.name)}</small>` : ""}`;
    return item.url
      ? `<a class="partner-logo" href="${escape(resolveUrl(item.url))}"${linkAttributes(item)}>${inner}</a>`
      : `<div class="partner-logo">${inner}</div>`;
  };
  const content = items.length
    ? `<div class="partner-logos">${items.map(logo).join("")}</div>`
    : "";
  const headerClass =
    partners.alignment === "left" ? " section__header--left" : "";
  return `<div class="container home-partners home-partners--${escape(partners.variant)} home-partners--${escape(partners.size)}"><div class="section__header${headerClass}"><p class="t-eyebrow">${escape(partners.eyebrow)}</p><h2 class="t-h2">${escape(partners.title)}</h2></div>${content || '<div class="public-empty-state"><p>Belum ada logo mitra aktif.</p></div>'}</div>`;
}

const HOME_STATE_BASELINE = {
  hero: {
    active: true,
    eyebrow: "PENDAFTARAN DIBUKA",
    title: "Olimpiade Sains Nusantara 2026",
    description:
      "Ajang talenta akademik bergengsi untuk siswa SD, SMP, dan SMA se-Indonesia. Asah kemampuan, raih prestasi, dan jadilah yang terbaik di tingkat nasional.",
    image: "../../../template/assets/images/garuda.png",
    imageAlt: "Garuda Logo",
    badges: [
      { label: "SD / MI", active: true },
      { label: "SMP / MTs", active: true },
      { label: "SMA / MA / SMK", active: true },
    ],
    buttons: [
      {
        label: "Daftar Sekarang",
        url: "https://infokhs.umm.ac.id/",
        style: "primary",
        newTab: true,
        active: true,
        iconMode: "library",
        libraryIcon: "arrow-right",
        uploadedIcon: "",
        iconAlt: "",
      },
      {
        label: "Unduh Juknis",
        url: "unduh.html",
        style: "outline",
        newTab: false,
        active: true,
        iconMode: "library",
        libraryIcon: "download",
        uploadedIcon: "",
        iconAlt: "",
      },
    ],
  },
  schedule: {
    active: true,
    eyebrow: "Jadwal Penting",
    title: "Catat Tanggal Pentingnya",
    description:
      "Pastikan kamu tidak melewatkan setiap tahapan penting dalam ajang talenta ini.",
    cards: [
      homeScheduleItem("Pendaftaran", "15 Jul — 30 Agt 2026", "clipboard-list"),
      homeScheduleItem("Technical Meeting", "05 Sep 2026", "monitor"),
      homeScheduleItem("Simulasi CBT", "08 Sep 2026", "laptop"),
      homeScheduleItem("Pelaksanaan", "12 — 13 Sep 2026", "trophy"),
    ],
  },
  pricing: {
    active: true,
    eyebrow: "Biaya Pendaftaran",
    variant: "single",
    ornament: true,
    packages: [
      {
        name: "Semua Jenjang",
        price: "Rp150.000",
        unit: "per peserta, semua jenjang",
        featured: false,
        active: true,
      },
    ],
    features: [
      { label: "Sertifikat digital", active: true },
      { label: "Akses materi", active: true },
      { label: "ID Card peserta", active: true },
    ],
  },
  benefit: {
    active: true,
    eyebrow: "Benefit",
    title: "Keuntungan Mengikuti Ajang Talenta",
    description:
      "Lebih dari sekadar ajang talenta — ini adalah kesempatan untuk berkembang.",
    background: "white",
    alignment: "center",
    variant: "standard",
    cards: [
      homeBenefitItem(
        "Sertifikat Resmi",
        "Setiap peserta mendapatkan sertifikat digital yang dapat digunakan sebagai portofolio akademik.",
        "award",
      ),
      homeBenefitItem(
        "Penilaian Transparan",
        "Sistem penilaian terbuka dengan peringkat nasional, provinsi, dan kabupaten/kota.",
        "bar-chart-3",
      ),
      homeBenefitItem(
        "Akses Materi",
        "Dapatkan akses ke kisi-kisi dan materi persiapan yang disusun oleh tim akademik.",
        "book-open",
      ),
      homeBenefitItem(
        "Jaringan Nasional",
        "Bergabung dengan ribuan siswa berprestasi dari seluruh Indonesia dalam satu ajang talenta.",
        "users",
      ),
    ],
  },
  winnerHighlight: {
    active: false,
    eyebrow: "Pengumuman",
    title: "Selamat Kepada Para Pemenang!",
    description: "Berikut adalah pemenang ajang talenta nasional tahun ini.",
    background: "navy",
    alignment: "center",
  },
  partners: {
    active: true,
    eyebrow: "Mitra & Partner",
    title: "Didukung Oleh",
    background: "soft",
    alignment: "center",
    variant: "simple",
    size: "medium",
    items: [
      homePartnerItem(
        "Mitra OAIN",
        "../../../../template/assets/images/mitra-oain.jpg",
        "Mitra OAIN",
      ),
      homePartnerItem(
        "Talenta Prestasi Indonesia",
        "../../../../template/assets/images/mitra-talenta.png",
        "Talenta Prestasi Indonesia",
      ),
    ],
  },
};

function homeScheduleItem(label, date, icon) {
  return {
    label,
    date,
    description: "",
    active: true,
    iconMode: "library",
    libraryIcon: icon,
    uploadedIcon: "",
    iconAlt: "",
  };
}

function homeBenefitItem(title, description, icon) {
  return {
    title,
    description,
    url: "",
    newTab: false,
    active: true,
    iconMode: "library",
    libraryIcon: icon,
    uploadedIcon: "",
    iconAlt: "",
  };
}

function homePartnerItem(name, logo, alt) {
  return {
    name,
    logo,
    alt,
    url: "",
    newTab: false,
    active: true,
  };
}

function homeClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function homeReadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (error) {
    console.warn(`State ${key} tidak valid; baseline digunakan.`, error);
    return null;
  }
}

function homeMergeItems(saved, baseline) {
  return (Array.isArray(saved) ? saved : baseline).map((item, index) => ({
    ...(baseline[index] || baseline[0] || {}),
    ...(item || {}),
  }));
}

function normalizeHomeState(source) {
  const baseline = homeClone(HOME_STATE_BASELINE);
  if (!source) return baseline;
  const legacyHero = source.hero || source;
  const normalized = {
    hero: { ...baseline.hero, ...legacyHero },
    schedule: { ...baseline.schedule, ...(source.schedule || {}) },
    pricing: { ...baseline.pricing, ...(source.pricing || {}) },
    benefit: { ...baseline.benefit, ...(source.benefit || {}) },
    winnerHighlight: {
      ...baseline.winnerHighlight,
      ...(source.winnerHighlight || {}),
    },
    partners: { ...baseline.partners, ...(source.partners || {}) },
  };
  normalized.hero.badges = homeMergeItems(
    legacyHero.badges,
    baseline.hero.badges,
  );
  normalized.hero.buttons = homeMergeItems(
    legacyHero.buttons,
    baseline.hero.buttons,
  );
  normalized.schedule.cards = homeMergeItems(
    source.schedule?.cards,
    baseline.schedule.cards,
  );
  normalized.pricing.packages = homeMergeItems(
    source.pricing?.packages,
    baseline.pricing.packages,
  ).map((item) => ({
    name: item.name,
    price: item.price,
    unit: item.unit,
    featured: item.featured === true,
    active: item.active !== false,
  }));
  normalized.pricing.features = homeMergeItems(
    source.pricing?.features,
    baseline.pricing.features,
  );
  delete normalized.pricing.action;
  delete normalized.pricing.title;
  delete normalized.pricing.description;
  normalized.benefit.cards = homeMergeItems(
    source.benefit?.cards,
    baseline.benefit.cards,
  ).map((item) => ({
    title: item.title,
    description: item.description,
    url: item.url,
    newTab: item.newTab === true,
    active: item.active !== false,
    iconMode: item.iconMode,
    libraryIcon: item.libraryIcon,
    uploadedIcon: item.uploadedIcon,
    iconAlt: item.iconAlt,
  }));
  normalized.partners.items = homeMergeItems(
    source.partners?.items,
    baseline.partners.items,
  ).map((item) => ({
    name: item.name,
    logo: item.logo,
    alt: item.alt,
    url: item.url,
    newTab: item.newTab === true,
    active: item.active !== false,
  }));
  delete normalized.partners.description;
  delete normalized.partners.showCategories;
  return normalized;
}

function hasSavedHomeAdminState() {
  return localStorage.getItem(HOME_STATE_KEY) !== null;
}

function getHomeAdminState() {
  return normalizeHomeState(homeReadJson(HOME_STATE_KEY));
}

function saveHomeAdminState(value) {
  const state = normalizeHomeState(value);
  localStorage.setItem(HOME_STATE_KEY, JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent(HOME_STATE_EVENT, { detail: homeClone(state) }),
  );
  console.info("[Highlight audit] state Beranda disimpan", {
    active: state.winnerHighlight.active,
    key: HOME_STATE_KEY,
  });
  return homeClone(state);
}

function resetHomeAdminState() {
  localStorage.removeItem(HOME_STATE_KEY);
  const baseline = getHomeAdminState();
  window.dispatchEvent(
    new CustomEvent(HOME_STATE_EVENT, { detail: homeClone(baseline) }),
  );
  return baseline;
}

function getHomeWinnerCategories() {
  if (typeof getPublicWinnerState === "function")
    return homeClone(getPublicWinnerState().manager.categories);
  const competition =
    typeof getActiveCompetition === "function" ? getActiveCompetition() : null;
  const saved = homeReadJson(HOME_WINNER_MANAGER_KEY);
  const categories =
    saved && saved.competitionId === competition?.id
      ? saved.categories
      : competition?.winnerCategories || [];
  return homeClone(
    categories
      .filter((category) => category?.active !== false)
      .map((category) => ({
        ...category,
        winners: (category.winners || []).filter(
          (winner) => winner?.active !== false,
        ),
      }))
      .filter((category) => category.winners.length),
  );
}

function getHomeWinnerDisplay() {
  if (typeof getWinnerPageState === "function")
    return homeClone(getWinnerPageState());
  return {
    showPhoto: true,
    showSchool: true,
    showExam: true,
    showDistrict: true,
    showRegency: true,
    showProvince: true,
    ...(homeReadJson(HOME_WINNER_PAGE_KEY) || {}),
  };
}

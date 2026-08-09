/* Renderer Beranda publik — memakai class Template final dan state shared. */
(() => {
  const sections = {
    hero: document.getElementById("hero"),
    schedule: document.getElementById("jadwal"),
    pricing: document.getElementById("biaya"),
    benefit: document.getElementById("benefit"),
    winner: document.getElementById("pemenang-highlight"),
    partners: document.getElementById("mitra"),
  };
  if (Object.values(sections).some((section) => !section)) return;
  let apiWinnerCategories = null;

  function esc(value = "") {
    return String(value).replace(
      /[&<>"]/g,
      (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
    );
  }

  function safeUrl(value = "") {
    const source = String(value).trim();
    if (!source) return "#";
    const routeAliases = {
      "index.html": "publicSite.home",
      "unduh.html": "publicSite.download",
      "pemenang.html": "publicSite.winners",
      "arsip.html": "publicSite.archive",
      "faq.html": "publicSite.faq",
    };
    if (routeAliases[source] && typeof TalentaPaths !== "undefined")
      return TalentaPaths.to(routeAliases[source]);
    if (/^(?:javascript|vbscript):/i.test(source)) return "#";
    return source;
  }

  function assetUrl(value = "", fallback = "") {
    const source = String(value || fallback).trim();
    if (/^(?:data:|blob:|https?:\/\/)/i.test(source)) return source;
    if (source.startsWith("/api/"))
      return new URL(source, TalentaConfig.apiBaseUrl).href;
    const match = source.match(
      /(?:template|public-site)\/assets\/images\/([^/?#]+)$/i,
    );
    const relative = match ? `assets/images/${match[1]}` : source;
    try {
      return new URL(
        relative,
        typeof TalentaPaths !== "undefined"
          ? TalentaPaths.to("publicSite.home")
          : location.href,
      ).href;
    } catch {
      return fallback;
    }
  }

  function linkAttributes(item) {
    return `${item?.newTab ? ' target="_blank" rel="noopener"' : ""}`;
  }

  function iconMarkup(item, size = 22) {
    if (item?.iconMode === "upload" && item.uploadedIcon)
      return `<img class="home-custom-icon" src="${esc(assetUrl(item.uploadedIcon))}" alt="${esc(item.iconAlt || "Ikon kustom")}" />`;
    const icon = /^[a-z0-9-]+$/i.test(item?.libraryIcon || "")
      ? item.libraryIcon
      : "circle";
    return `<i data-lucide="${esc(icon)}" style="width:${size}px;height:${size}px;stroke-width:1.5"></i>`;
  }

  function setSection(section, active, classes) {
    section.className = `${classes}${active ? "" : " section--disabled"}`;
  }

  function renderHero(hero) {
    setSection(sections.hero, hero.active !== false, "hero");
    sections.hero.innerHTML = buildHomeHeroMarkup(hero, {
      resolveAsset: assetUrl,
      resolveUrl: safeUrl,
      renderIcon: iconMarkup,
      linkAttributes,
    });
  }

  function renderSchedule(schedule) {
    setSection(sections.schedule, schedule.active !== false, "section");
    sections.schedule.innerHTML = buildHomeScheduleMarkup(schedule, {
      renderIcon: iconMarkup,
    });
  }

  function renderPricing(pricing) {
    setSection(
      sections.pricing,
      pricing.active !== false,
      "section section--soft",
    );
    sections.pricing.innerHTML = buildHomePricingMarkup(pricing);
  }

  function renderBenefit(benefit) {
    const background = benefit.background === "soft" ? " section--soft" : "";
    setSection(
      sections.benefit,
      benefit.active !== false,
      `section${background}`,
    );
    sections.benefit.innerHTML = buildHomeBenefitMarkup(benefit, {
      renderIcon: iconMarkup,
      resolveUrl: safeUrl,
      linkAttributes,
    });
  }

  function renderWinner(winner) {
    const background =
      winner.background === "soft"
        ? " section--soft"
        : " section--navy section--winner-gradient";
    setSection(
      sections.winner,
      winner.active !== false,
      `section${background}`,
    );
    const categories = apiWinnerCategories || getHomeWinnerCategories();
    const display = getHomeWinnerDisplay();
    sections.winner.innerHTML = buildHomeWinnerMarkup(
      winner,
      categories,
      display,
      { resolveAsset: assetUrl },
    );
  }

  function renderPartners(partners) {
    const background = partners.background === "white" ? "" : " section--soft";
    setSection(
      sections.partners,
      partners.active !== false,
      `section${background}`,
    );
    sections.partners.innerHTML = buildHomePartnerMarkup(partners, {
      resolveAsset: assetUrl,
      resolveUrl: safeUrl,
      linkAttributes,
    });
  }

  function renderHome(state = getHomeAdminState()) {
    // Highlight Pemenang selalu menjadi section pertama setelah Hero.
    sections.hero.insertAdjacentElement("afterend", sections.winner);
    renderHero(state.hero);
    renderSchedule(state.schedule);
    renderPricing(state.pricing);
    renderBenefit(state.benefit);
    renderWinner(state.winnerHighlight);
    renderPartners(state.partners);
    if (window.lucide) lucide.createIcons();
  }

  function apiState(data) {
    const state = getHomeAdminState();
    data.sections.forEach((section) => {
      const type = section.type || section.sectionType;
      if (state[type])
        state[type] = {
          ...state[type],
          ...section.settings,
          active: section.isActive,
        };
    });
    return state;
  }

  renderHome();
  window.addEventListener("talenta:public:home", (event) =>
    renderHome(apiState(event.detail)),
  );
  void TalentaPublic.load("home").catch((error) =>
    console.error("Home API tidak tersedia; baseline ditampilkan.", error),
  );
  void TalentaApi.request(`/public/sites/${TalentaConfig.categorySlug}/winners`, {
    auth: false,
  })
    .then((response) => {
      apiWinnerCategories = response.data.categories.map((category) => ({
        name: category.name,
        icon: category.icon,
        winners: category.winners.map((winner) => ({
          name: winner.fullName,
          rank: winner.rankLabel,
          school: winner.school,
          exam: winner.examNumber,
          regency: winner.regency,
          province: winner.province,
          photo: "",
        })),
      }));
      renderWinner(getHomeAdminState().winnerHighlight);
    })
    .catch((error) =>
      console.error("Winner Highlight API tidak tersedia.", error),
    );

  window.TalentaHome = Object.freeze({ render: renderHome });
})();

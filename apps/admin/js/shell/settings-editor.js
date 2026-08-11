const STORAGE_KEY = GLOBAL_SETTINGS_KEY;
let globalState = getGlobalSettings(),
  globalHomeState = null,
  globalPreviewActive = "home",
  globalPreviewResizeObserver;
const globalPreviewConfigs = [
  ["globalThemePreviewFrame", "themePreview"],
  ["globalNavPreviewFrame", "globalNavPreview"],
  ["globalFooterPreviewFrame", "globalFooterPreview"],
];
const navigationItems = [
  ["download", "Unduh", "download", "unduh.html"],
  ["winners", "Pemenang", "trophy", "pemenang.html"],
  ["archive", "Arsip", "archive", "arsip.html"],
  ["faq", "FAQ", "circle-help", "faq.html"],
];
async function loadGlobalSettingsApi() {
  const event = TalentaAdminAuth.currentEvent();
  if (!event?.id)
    return {
      eventName: globalState.identity.eventName,
      eventDescription: globalState.identity.eventDescription,
      logoAssetId: globalState.identity.logoAssetId || null,
      logoUrl: globalState.identity.logo || "",
      primaryColor: globalState.theme.primaryColor,
      navigation: globalState.navigation,
      contact: globalState.contact,
      footer: globalState.footer,
    };
  return (await TalentaApi.request(`/admin/events/${event.id}/settings`)).data;
}
async function loadHomeSettingsApi() {
  const site = TalentaAdminAuth.currentEvent();
  if (!site?.id)
    return {
      sections: getHomeAdminState(),
      categories:
        typeof getHomeWinnerCategories === "function"
          ? getHomeWinnerCategories()
          : [],
      display:
        typeof getHomeWinnerDisplay === "function"
          ? getHomeWinnerDisplay()
          : {},
    };
  const response = await TalentaApi.request(`/admin/events/${site.id}/home`);
  const apiSections = Object.fromEntries(
    response.data.sections.map((section) => [
      section.sectionType,
      { ...section.settings, active: section.isActive },
    ]),
  );

  // Merge dengan default admin state agar tidak kosong ketika event baru
  const baseAdminState =
    typeof getHomeAdminState === "function" ? getHomeAdminState() : {};
  const sections = { ...baseAdminState, ...apiSections };

  let categories = [];
  let display = {
    showPhoto: true,
    showSchool: true,
    showExam: true,
    showRegency: true,
    showProvince: true,
  };

  try {
    const [pagesReq, catReq, winReq] = await Promise.all([
      TalentaApi.request(`/admin/events/${site.id}/pages/winners`),
      TalentaApi.request(`/admin/events/${site.id}/winner-categories`),
      TalentaApi.request(`/admin/events/${site.id}/winners`),
    ]);
    display = pagesReq.data.metadataVisibility || display;
    categories = catReq.data
      .filter((c) => c.isActive)
      .map((c) => ({
        ...c,
        winners: winReq.data
          .filter((w) => w.categoryId === c.id && w.isActive)
          .map((w) => ({
            ...w,
            name: w.fullName,
            rank: w.rankLabel,
            exam: w.examNumber,
            photo: w.photoAssetId ? TalentaMedia.url(w.photoAssetId) : "",
          })),
      }))
      .filter((c) => c.winners.length > 0);
  } catch (e) {
    console.warn("Gagal memuat data pemenang untuk pratinjau global", e);
  }

  return { sections, categories, display };
}
async function saveGlobalSettingsApi() {
  const event = TalentaAdminAuth.currentEvent();
  return TalentaApi.request(`/admin/events/${event.id}/settings`, {
    method: "PUT",
    body: {
      eventName: globalState.identity.eventName,
      eventDescription: globalState.identity.eventDescription,
      primaryColor: globalState.theme.primaryColor,
      logoAssetId: globalState.identity.logoAssetId || undefined,
      navigation: globalState.navigation,
      contact: globalState.contact,
      footer: globalState.footer,
    },
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("eventSettingsForm"),
    byId = (id) => document.getElementById(id);
  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
  function brandMark(className, short) {
    const logo = globalState.identity.logo;
    return `<span class="${className}">${logo ? `<img src="${esc(logo)}" alt="Logo ${esc(globalState.identity.eventName)}">` : esc(short)}</span>`;
  }
  function fill() {
    const i = globalState.identity,
      t = globalState.theme,
      c = globalState.contact,
      f = globalState.footer,
      values = {
        eventName: i.eventName,
        eventDescription: i.eventDescription,
        primaryColor: t.primaryColor,
        contactEmail: c.email,
        contactWhatsapp: c.whatsappDisplay,
        whatsappNumber: c.whatsappNumber,
        whatsappMessage: c.whatsappMessage,
        contactAddress: c.address,
        footerBrand: f.brandName,
        footerHeading: f.contactHeading,
        footerDescription: f.description,
        footerCopyright: f.copyright,
      };
    Object.entries(values).forEach(([id, v]) => {
      const e = byId(id);
      if (e) e.value = v || "";
    });
    setLogo(i.logo);
  }
  function renderNavigation() {
    byId("globalNavigationList").innerHTML = navigationItems
      .map(
        ([id, label, icon]) =>
          `<div class="global-navigation-item"><span><i data-lucide="${icon}"></i></span><div><strong>${label}</strong><small>Menu dan halaman publik ${label}</small></div><label class="admin-switch admin-switch--label"><input type="checkbox" data-global-navigation="${id}" ${globalState.navigation[id] !== false ? "checked" : ""}><span></span><em>${globalState.navigation[id] !== false ? "Aktif" : "Nonaktif"}</em></label></div>`,
      )
      .join("");
    document.querySelectorAll("[data-global-navigation]").forEach(
      (input) =>
        (input.onchange = () => {
          const scrollX = window.scrollX,
            scrollY = window.scrollY;
          globalState.navigation[input.dataset.globalNavigation] =
            input.checked;
          input.parentElement.querySelector("em").textContent = input.checked
            ? "Aktif"
            : "Nonaktif";
          if (
            !input.checked &&
            globalPreviewActive === input.dataset.globalNavigation
          )
            globalPreviewActive = "home";
          renderPreview();
          requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
        }),
    );
    lucide.createIcons();
  }
  function readForm() {
    globalState.identity = {
      ...globalState.identity,
      eventName: eventName.value,
      eventDescription: eventDescription.value,
      logo: globalState.identity.logo || "",
    };
    globalState.theme = {
      primaryColor: primaryColor.value,
      accentColor: "#ffffff",
    };
    globalState.contact = {
      email: contactEmail.value,
      whatsappDisplay: contactWhatsapp.value,
      whatsappNumber: normalizeWhatsappNumber(
        whatsappNumber.value || contactWhatsapp.value,
      ),
      whatsappMessage: whatsappMessage.value,
      address: contactAddress.value,
    };
    globalState.footer = {
      brandName: footerBrand.value,
      contactHeading: footerHeading.value,
      description: footerDescription.value,
      copyright: footerCopyright.value,
    };
  }
  function navMarkup(active) {
    const frame = byId("globalNavPreviewFrame"),
      isDesktop = frame.classList.contains("global-nav-preview-frame--desktop"),
      brand = globalState.identity.eventName || "Nama Event",
      short = brand
        .split(/\s+/)
        .map((x) => x[0])
        .slice(0, 3)
        .join("")
        .toUpperCase();
    if (isDesktop)
      return `<nav class="navbar global-nav-desktop"><div class="navbar__inner"><span class="navbar__brand">${brandMark("navbar__logo", short)}<span class="navbar__brand-text">${esc(brand)}</span></span><div class="navbar__menu">${active.map(([id, label]) => `<button type="button" class="navbar__link ${id === globalPreviewActive ? "navbar__link--active" : ""}" data-preview-page="${id}">${label}</button>`).join("")}<button type="button" class="navbar__link navbar__link--desktop-only ${globalPreviewActive === "contact" ? "navbar__link--active" : ""}" data-preview-page="contact">Kontak Kami</button></div></div></nav>`;
    return `<div class="global-nav-device-stage"><header class="mobile-header global-nav-mobile-head"><span class="mobile-header__brand">${brandMark("mobile-header__logo", short)}<span class="mobile-header__text">${esc(brand)}</span></span></header><div class="global-nav-device-content"><span>Preview konten halaman</span></div><nav class="bottom-nav global-nav-bottom" data-item-count="${active.length}">${active.map(([id, label, icon]) => `<button type="button" class="bottom-nav__item ${id === globalPreviewActive ? "bottom-nav__item--active" : ""}" data-preview-page="${id}"><i data-lucide="${icon}" class="bottom-nav__icon"></i><span class="bottom-nav__label">${label}</span></button>`).join("")}</nav></div>`;
  }
  function themeMarkup(active, brand, short) {
    const frame = byId("globalThemePreviewFrame"),
      isDesktop = frame.classList.contains(
        "global-theme-preview-frame--desktop",
      ),
      header = isDesktop
        ? `<nav class="navbar" aria-label="Preview menu utama"><div class="navbar__inner"><span class="navbar__brand">${brandMark("navbar__logo", short)}<span class="navbar__brand-text">${esc(brand)}</span></span><div class="navbar__menu">${active.map(([id, label]) => `<span class="navbar__link ${id === "home" ? "navbar__link--active" : ""}">${label}</span>`).join("")}<span class="navbar__link navbar__link--desktop-only">Kontak Kami</span></div></div></nav>`
        : `<header class="mobile-header"><span class="mobile-header__brand">${brandMark("mobile-header__logo", short)}<span class="mobile-header__text">${esc(brand)}</span></span></header>`;
    const fallbackHomeState =
      typeof getHomeAdminState === "function" ? getHomeAdminState() : {};
    const h = globalHomeState?.sections?.hero || fallbackHomeState?.hero || {};
    const w =
      globalHomeState?.sections?.winnerHighlight ||
      fallbackHomeState?.winnerHighlight ||
      {};
    const categories = globalHomeState?.categories || [];
    const display = globalHomeState?.display || {
      showPhoto: true,
      showSchool: true,
      showExam: true,
      showRegency: true,
      showProvince: true,
    };

    const heroEyebrow = h.eyebrow || "PENDAFTARAN DIBUKA";
    const heroTitle = h.title || "Olimpiade Sains Nusantara 2026";
    const heroDesc =
      h.description ||
      "Ajang talenta akademik bergengsi untuk siswa SD, SMP, dan SMA se-Indonesia. Asah kemampuan, raih prestasi, dan jadilah yang terbaik di tingkat nasional.";
    let heroImage = h.image || "../public-site/assets/images/garuda.png";
    const persistedHeroPath = heroImage.match(
      /^\.\.\/\.\.\/\.\.\/(?:template|public-site)\/(.+)$/,
    );
    if (persistedHeroPath) heroImage = `../public-site/${persistedHeroPath[1]}`;
    const heroImageAlt = h.imageAlt || "Hero Image";
    const heroBadges = (
      h.badges || [
        { label: "SD / MI" },
        { label: "SMP / MTs" },
        { label: "SMA / MA / SMK" },
      ]
    ).filter((b) => b.active !== false);
    const heroButtons = (
      h.buttons || [
        {
          label: "Daftar Sekarang",
          style: "primary",
          libraryIcon: "arrow-right",
        },
        { label: "Unduh Juknis", style: "outline", libraryIcon: "download" },
      ]
    ).filter((b) => b.active !== false);

    const winnerEyebrow = w.eyebrow || "Kombinasi Tema";
    const winnerTitle = w.title || "Warna utama dipadukan dengan putih";
    const winnerDesc =
      w.description ||
      "Badge dan detail kontras otomatis menyesuaikan latar terang atau gelap.";
    const winnerAlignment =
      w.alignment === "left" ? " section__header--left" : "";

    const groups = categories.length
      ? categories
          .map(
            (category) =>
              `<section class="winner-group home-winner-group"><h3 class="winner-group__title"><i data-lucide="${category.icon || "trophy"}"></i>${esc(category.name)} <span class="badge badge--gold">${category.winners.length} Pemenang</span></h3><div class="champion-grid">${category.winners
                .map((item) => {
                  const initials = (item.name || "?")
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((p) => p[0] || "")
                    .join("")
                    .toUpperCase();
                  const meta = [
                    display.showExam && item.exam
                      ? `<span><span class="meta-label">No. Ujian:</span> ${esc(item.exam)}</span>`
                      : "",
                    display.showRegency && item.regency
                      ? `<span><span class="meta-label">Kabupaten:</span> ${esc(item.regency)}</span>`
                      : "",
                    display.showProvince && item.province
                      ? `<span><span class="meta-label">Provinsi:</span> ${esc(item.province)}</span>`
                      : "",
                  ].join("");
                  return `<div class="champion-card">${display.showPhoto ? `<div class="champion-card__photo">${item.photo ? `<img src="${esc(item.photo)}" alt="Foto ${esc(item.name)}">` : initials}</div>` : ""}<p class="champion-card__rank t-mono">${esc(item.rank)}</p><p class="champion-card__name">${esc(item.name)}</p>${display.showSchool ? `<p class="champion-card__school">${esc(item.school)}</p>` : ""}<div class="champion-card__meta">${meta}</div></div>`;
                })
                .join("")}</div></section>`,
          )
          .join("")
      : `<div class="public-empty-state home-winner-empty"><i data-lucide="trophy"></i><p>Belum ada data pemenang aktif.</p></div>`;

    const badgeMarkup = heroBadges
      .map((b) => `<span class="hero__badge">${esc(b.label)}</span>`)
      .join("");
    const buttonMarkup = heroButtons
      .map((b) => {
        const icon =
          b.iconMode === "upload" && b.uploadedIcon
            ? `<img class="home-custom-icon" src="${esc(b.uploadedIcon)}" alt="${esc(b.iconAlt || "")}" style="width:18px;height:18px">`
            : `<i data-lucide="${b.libraryIcon || b.icon || "arrow-right"}"></i>`;
        const btnClass =
          b.style === "outline"
            ? "btn--outline global-theme-preview__hero-outline"
            : "btn--white";
        return `<span class="btn ${btnClass} btn--lg">${esc(b.label)} ${icon}</span>`;
      })
      .join("");

    const winnerBackground =
      w.background === "soft"
        ? " section--soft"
        : " section--navy section--winner-gradient";

    return `${header}<main><section class="hero"><div class="container hero__layout"><div class="hero__inner"><p class="t-eyebrow">${esc(heroEyebrow)}</p><h1 class="t-h1">${esc(heroTitle)}</h1><div class="hero__image hero__image--mobile"><img src="${esc(heroImage)}" alt="${esc(heroImageAlt)}"></div><p class="hero__subtitle">${esc(heroDesc)}</p><div class="hero__badges">${badgeMarkup}</div><div class="hero__buttons">${buttonMarkup}</div></div><div class="hero__image hero__image--desktop"><img src="${esc(heroImage)}" alt="${esc(heroImageAlt)}"></div></div></section><section class="section global-theme-preview__winner-section${winnerBackground}"><div class="container"><div class="section__header${winnerAlignment}"><p class="t-eyebrow">${esc(winnerEyebrow)}</p><h2 class="t-h2">${esc(winnerTitle)}</h2><p>${esc(winnerDesc)}</p></div><div class="winner-section">${groups}</div></div></section></main>`;
  }
  function renderPreview() {
    readForm();
    const active = [
        ["home", "Beranda", "home", "index.html"],
        ...navigationItems,
      ].filter(([id]) => id === "home" || globalState.navigation[id] !== false),
      brand = globalState.identity.eventName || "Nama Event",
      short = brand
        .split(/\s+/)
        .map((x) => x[0])
        .slice(0, 3)
        .join("")
        .toUpperCase();
    primaryHex.textContent = primaryColor.value.toUpperCase();
    [
      themePreview,
      byId("globalNavPreviewFrame"),
      byId("globalFooterPreviewFrame"),
    ]
      .filter(Boolean)
      .forEach((root) => {
        applyGlobalThemeTokens(root, {
          theme: {
            primaryColor: primaryColor.value,
            accentColor: "#ffffff",
          },
        });
      });
    themePreview.innerHTML = themeMarkup(active, brand, short);
    byId("globalNavPreview").innerHTML = navMarkup(active);
    document.querySelectorAll("[data-preview-page]").forEach(
      (button) =>
        (button.onclick = () => {
          globalPreviewActive = button.dataset.previewPage;
          renderPreview();
        }),
    );
    globalPreviewWa.hidden = !globalState.contact.whatsappNumber;
    globalPreviewFooterLogo.innerHTML = globalState.identity.logo
      ? `<img src="${esc(globalState.identity.logo)}" alt="Logo ${esc(brand)}">`
      : esc(short);
    globalPreviewFooterBrand.textContent =
      globalState.footer.brandName || brand;
    globalPreviewFooterDescription.textContent = globalState.footer.description;
    globalPreviewFooterHeading.textContent = globalState.footer.contactHeading;
    globalPreviewFooterLinks.innerHTML = `<span class="footer__link">${globalState.contact.email}</span><span class="footer__link t-mono">${globalState.contact.whatsappDisplay}</span><span class="footer__link">${globalState.contact.address}</span>`;
    globalPreviewCopyright.textContent = globalState.footer.copyright;
    lucide.createIcons();
    requestAnimationFrame(fitAllGlobalPreviews);
  }
  function fitGlobalPreview(frameId, rootId) {
    const frame = byId(frameId),
      root = byId(rootId);
    if (!frame || !root) return;
    const designWidths = { desktop: 1425, tablet: 753, mobile: 375 },
      mode = frame.dataset.previewMode || "desktop",
      designWidth = designWidths[mode] || designWidths.desktop,
      style = getComputedStyle(frame),
      horizontalPadding =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
      verticalPadding =
        parseFloat(style.paddingTop) + parseFloat(style.paddingBottom),
      availableWidth = Math.max(1, frame.clientWidth - horizontalPadding),
      scale = Math.min(1, availableWidth / designWidth);
    root.style.setProperty("--public-preview-scale", String(scale));
    frame.style.height = `${Math.ceil(root.offsetHeight * scale + verticalPadding)}px`;
  }
  function fitAllGlobalPreviews() {
    globalPreviewConfigs.forEach(([frameId, rootId]) =>
      fitGlobalPreview(frameId, rootId),
    );
  }
  function setupGlobalPreviewSizing() {
    globalPreviewResizeObserver?.disconnect();
    globalPreviewResizeObserver = new ResizeObserver(fitAllGlobalPreviews);
    globalPreviewConfigs.forEach(([frameId, rootId]) => {
      const frame = byId(frameId),
        root = byId(rootId);
      if (!frame || !root) return;
      globalPreviewResizeObserver.observe(frame);
      globalPreviewResizeObserver.observe(root);
    });
    requestAnimationFrame(fitAllGlobalPreviews);
  }
  function bindDevices(selector, frame, prefix, dataKey) {
    document.querySelectorAll(selector).forEach(
      (btn) =>
        (btn.onclick = () => {
          document
            .querySelectorAll(selector)
            .forEach((x) =>
              x.classList.toggle("preview-switch__btn--active", x === btn),
            );
          const previewFrame = byId(frame),
            mode = btn.dataset[dataKey];
          previewFrame.className = `${prefix} ${prefix}--${mode}`;
          previewFrame.dataset.previewMode = mode;
          renderPreview();
        }),
    );
  }
  fill();
  renderNavigation();
  document
    .querySelectorAll(
      "#eventSettingsForm input:not([type=file]):not([data-global-navigation]),#eventSettingsForm textarea",
    )
    .forEach((e) => e.addEventListener("input", renderPreview));
  bindDevices(
    "[data-global-nav-device]",
    "globalNavPreviewFrame",
    "global-nav-preview-frame",
    "globalNavDevice",
  );
  bindDevices(
    "[data-global-footer-device]",
    "globalFooterPreviewFrame",
    "global-footer-preview-frame",
    "globalFooterDevice",
  );
  bindDevices(
    "[data-global-theme-device]",
    "globalThemePreviewFrame",
    "global-theme-preview-frame",
    "globalThemeDevice",
  );
  setupGlobalPreviewSizing();
  globalPreviewWa.onclick = () => {
    globalPreviewWa.classList.remove("global-preview-wa--pulse");
    void globalPreviewWa.offsetWidth;
    globalPreviewWa.classList.add("global-preview-wa--pulse");
    globalPreviewWaFeedback.classList.add("global-preview-wa-feedback--show");
    setTimeout(
      () =>
        globalPreviewWaFeedback.classList.remove(
          "global-preview-wa-feedback--show",
        ),
      1800,
    );
  };
  logoUploadButton.onclick = () => eventLogo.click();
  eventLogo.onchange = async (e) => {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;
    input.disabled = true;
    try {
      const asset = await TalentaMedia.upload(file, {
        altText: `Logo ${globalState.identity.eventName}`,
      });
      globalState.identity.logoAssetId = asset.assetId;
      globalState.identity.logo = TalentaMedia.url(asset);
      setLogo(globalState.identity.logo);
      renderPreview();
      showToast("Logo berhasil diunggah.");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      input.disabled = false;
    }
  };
  logoDeleteButton.onclick = () => {
    globalState.identity.logo = "";
    delete globalState.identity.logoAssetId;
    setLogo("");
    renderPreview();
    showToast("Logo berhasil dihapus. Jangan lupa klik simpan.");
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.submitter;
    if (submit) submit.disabled = true;
    readForm();
    try {
      const response = await saveGlobalSettingsApi();
      TalentaAdminAuth.updateCurrentEvent({ name: response.data.eventName });
      globalState = saveGlobalSettings(globalState);
      showToast("Pengaturan global tersimpan ke database.");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  };
  resetSettings.onclick = async () => {
    const confirmed = await adminConfirm({
      title: "Reset Pengaturan Global?",
      message:
        "Identitas, tema, navigasi, kontak, dan WhatsApp akan dikembalikan ke template awal.",
      confirmLabel: "Ya, reset pengaturan",
      variant: "danger",
      icon: "rotate-ccw",
    });
    if (!confirmed) return;
    globalState = resetGlobalSettings();
    try {
      await saveGlobalSettingsApi();
      TalentaAdminAuth.updateCurrentEvent({
        name: globalState.identity.eventName,
      });
      fill();
      renderNavigation();
      renderPreview();
      showToast("Pengaturan global berhasil direset.");
    } catch (error) {
      showToast(error.message, true);
    }
  };
  sidebarToggle.onclick = () =>
    adminSidebar.classList.toggle("admin-sidebar--open");
  renderPreview();
  lucide.createIcons();
  void Promise.all([loadGlobalSettingsApi(), loadHomeSettingsApi()])
    .then(([data, homeData]) => {
      if (homeData) globalHomeState = homeData;
      globalState = normalizeGlobalSettings({
        ...globalState,
        identity: {
          ...globalState.identity,
          eventName: data.eventName,
          eventDescription: data.eventDescription,
          logoAssetId: data.logoAssetId || null,
          logo: data.logoUrl ? TalentaMedia.url({ url: data.logoUrl }) : "",
        },
        theme: { ...globalState.theme, primaryColor: data.primaryColor },
        navigation: { ...globalState.navigation, ...data.navigation },
        contact: { ...globalState.contact, ...data.contact },
        footer: { ...globalState.footer, ...data.footer },
      });
      fill();
      renderNavigation();
      renderPreview();
    })
    .catch((error) => showToast(error.message, true));

  window.addEventListener("storage", async (e) => {
    if (e.key === "talenta_home_editor_v1") {
      try {
        const local = JSON.parse(e.newValue);
        if (local && globalHomeState && globalHomeState.sections) {
          if (local.hero)
            Object.assign(globalHomeState.sections.hero, local.hero);
          if (local.winnerHighlight)
            Object.assign(
              globalHomeState.sections.winnerHighlight,
              local.winnerHighlight,
            );

          // Juga salin atribut section type jika form struktur data dari section berbeda
          Object.entries(local).forEach(([key, val]) => {
            if (globalHomeState.sections[key] && val) {
              Object.assign(globalHomeState.sections[key], val);
            }
          });
          renderPreview();
        }
      } catch (err) {
        console.warn("Gagal update pratinjau Beranda realtime:", err);
      }
    } else if (e.key === "talenta_winner_manager_v1") {
      try {
        const homeData = await loadHomeSettingsApi();
        if (homeData) {
          globalHomeState = homeData;
          renderPreview();
        }
      } catch (err) {
        console.warn("Gagal update pratinjau realtime:", err);
      }
    }
  });
});
function setLogo(source) {
  const brand = globalState?.identity?.eventName || "Nama Event";
  const short = brand
    .split(/\s+/)
    .map((x) => x[0])
    .slice(0, 3)
    .join("")
    .toUpperCase();
  document.getElementById("logoPreview").innerHTML = source
    ? `<img src="${source}" alt="Pratinjau logo event">`
    : short;
  const delBtn = document.getElementById("logoDeleteButton");
  if (delBtn) delBtn.hidden = !source;
}
function showToast(message, error = false) {
  const toast = document.getElementById("adminToast");
  toast.querySelector("span").textContent = message;
  toast.classList.toggle("admin-toast--error", error);
  toast.classList.add("admin-toast--show");
  setTimeout(() => toast.classList.remove("admin-toast--show"), 3000);
}

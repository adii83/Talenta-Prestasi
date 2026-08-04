const STORAGE_KEY = GLOBAL_SETTINGS_KEY;
let globalState = getGlobalSettings(),
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
  const site = TalentaAdminAuth.currentSite();
  if (!site?.id)
    throw new TalentaApi.ApiError("Portal Admin belum dipilih", 400);
  return (await TalentaApi.request(`/admin/sites/${site.id}/settings`)).data;
}
async function saveGlobalSettingsApi() {
  const site = TalentaAdminAuth.currentSite();
  return TalentaApi.request(`/admin/sites/${site.id}/settings`, {
    method: "PUT",
    body: {
      eventName: globalState.identity.eventName,
      eventSlug: globalState.identity.eventSlug,
      organizerName: globalState.identity.organizerName,
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
  byId("eventDomainSuffix").textContent = `.${TalentaConfig.publicBaseDomain}`;
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
        eventSlug: i.eventSlug,
        organizerName: i.organizerName,
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
    if (i.logo) setLogo(i.logo);
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
      eventSlug: eventSlug.value,
      organizerName: organizerName.value,
      logo:
        document.querySelector("#logoPreview img")?.src ||
        globalState.identity.logo ||
        "",
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
    const winners = [
      ["Peringkat 1", "AR", "Anisa Rahmawati", "SDN 1 Coblong", "Jawa Barat"],
      ["Peringkat 2", "BP", "Bimo Prasetyo", "SMPN 2 Gubeng", "Jawa Timur"],
      ["Peringkat 3", "CW", "Citra Wulandari", "SMAN 3 Menteng", "DKI Jakarta"],
    ];
    return `${header}<main><section class="hero"><div class="container hero__layout"><div class="hero__inner"><p class="t-eyebrow">PENDAFTARAN DIBUKA</p><h1 class="t-h1">${esc(brand)}</h1><div class="hero__image hero__image--mobile"><img src="../template/assets/images/garuda.png" alt="Garuda Logo"></div><p class="hero__subtitle">Ajang talenta akademik bergengsi untuk siswa SD, SMP, dan SMA se-Indonesia. Asah kemampuan, raih prestasi, dan jadilah yang terbaik di tingkat nasional.</p><div class="hero__badges"><span class="hero__badge">SD / MI</span><span class="hero__badge">SMP / MTs</span><span class="hero__badge">SMA / MA / SMK</span></div><div class="hero__buttons"><span class="btn btn--white btn--lg">Daftar Sekarang <i data-lucide="arrow-right"></i></span><span class="btn btn--outline btn--lg global-theme-preview__hero-outline">Unduh Juknis <i data-lucide="download"></i></span></div></div><div class="hero__image hero__image--desktop"><img src="../template/assets/images/garuda.png" alt="Garuda Logo"></div></div></section><section class="section global-theme-preview__winner-section"><div class="container"><div class="section__header"><p class="t-eyebrow">Kombinasi Tema</p><h2 class="t-h2">Warna utama dipadukan dengan putih</h2><p>Badge dan detail kontras otomatis menyesuaikan latar terang atau gelap.</p></div><div class="winner-section"><section class="winner-group home-winner-group"><h3 class="winner-group__title"><i data-lucide="trophy"></i>Juara Umum <span class="badge badge--gold">3 Pemenang</span></h3><div class="champion-grid">${winners.map(([rank, initials, name, school, province]) => `<div class="champion-card"><div class="champion-card__photo">${initials}</div><p class="champion-card__rank t-mono">${rank}</p><p class="champion-card__name">${name}</p><p class="champion-card__school">${school}</p><div class="champion-card__meta"><span><span class="meta-label">Provinsi:</span> ${province}</span></div></div>`).join("")}</div></section></div></div></section></main>`;
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
  form.onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.submitter;
    if (submit) submit.disabled = true;
    readForm();
    try {
      const response = await saveGlobalSettingsApi();
      TalentaAdminAuth.updateCurrentSite({
        name: response.data.eventName,
        slug: response.data.eventSlug,
      });
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
    location.reload();
  };
  sidebarToggle.onclick = () =>
    adminSidebar.classList.toggle("admin-sidebar--open");
  renderPreview();
  lucide.createIcons();
  void loadGlobalSettingsApi()
    .then((data) => {
      globalState = normalizeGlobalSettings({
        ...globalState,
        identity: {
          ...globalState.identity,
          eventName: data.eventName,
          eventSlug: data.eventSlug,
          organizerName: data.organizerName,
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
});
function setLogo(source) {
  document.getElementById("logoPreview").innerHTML =
    `<img src="${source}" alt="Pratinjau logo event">`;
}
function showToast(message, error = false) {
  const toast = document.getElementById("adminToast");
  toast.querySelector("span").textContent = message;
  toast.classList.toggle("admin-toast--error", error);
  toast.classList.add("admin-toast--show");
  setTimeout(() => toast.classList.remove("admin-toast--show"), 3000);
}

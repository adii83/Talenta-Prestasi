/* Runtime global seluruh halaman publik. */
(() => {
  function applyGlobalSettings(settings = getGlobalSettings()) {
    const pageId = publicPageId();
    if (pageId && !isPublicPageEnabled(pageId, settings)) {
      location.replace(getFirstEnabledPublicPage());
      return false;
    }

    document
      .querySelectorAll(".navbar__link,.bottom-nav__item")
      .forEach((element) => {
        const href = element.getAttribute("href");
        if (!href || href.startsWith("#")) return;
        const linkedPage = publicPageId(new URL(href, location.href).pathname);
        if (!linkedPage || linkedPage === "home") return;
        const isHidden = settings.navigation[linkedPage] === false;
        element.hidden = isHidden;
        element.style.setProperty("display", isHidden ? "none" : "", "important");
        element.dataset.globalPage = linkedPage;
      });
    document.querySelectorAll(".bottom-nav").forEach((navigation) => {
      const visible = [
        ...navigation.querySelectorAll(".bottom-nav__item"),
      ].filter((element) => !element.hidden);
      navigation.dataset.itemCount = String(visible.length);
    });

    applyGlobalThemeTokens(document.documentElement, settings);

    const initials = settings.identity.eventName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 3)
      .join("")
      .toUpperCase();
    document
      .querySelectorAll(".navbar__brand-text,.mobile-header__text")
      .forEach(
        (element) => (element.textContent = settings.identity.eventName),
      );
    document
      .querySelectorAll(".navbar__logo,.mobile-header__logo,.footer__logo")
      .forEach((element) => {
        element.textContent = initials;
        if (settings.identity.logo) {
          const image = document.createElement("img");
          image.src = settings.identity.logo;
          image.alt = `Logo ${settings.identity.eventName}`;
          element.replaceChildren(image);
        }
      });

    document
      .querySelectorAll(".footer__brand-text")
      .forEach(
        (element) =>
          (element.textContent =
            settings.footer.brandName || settings.identity.eventName),
      );
    document
      .querySelectorAll(".footer__desc")
      .forEach(
        (element) => (element.textContent = settings.footer.description),
      );
    document
      .querySelectorAll(".footer__heading")
      .forEach(
        (element) => (element.textContent = settings.footer.contactHeading),
      );
    document.querySelectorAll(".footer__links").forEach((element) => {
      const entries = [];
      if (settings.contact.email) {
        const email = document.createElement("a");
        email.className = "footer__link";
        email.href = `mailto:${settings.contact.email}`;
        email.textContent = settings.contact.email;
        entries.push(email);
      }
      if (settings.contact.whatsappDisplay) {
        const whatsapp = document.createElement("a");
        whatsapp.className = "footer__link t-mono";
        whatsapp.href = buildWhatsappUrl(settings);
        whatsapp.target = "_blank";
        whatsapp.rel = "noopener";
        whatsapp.textContent = settings.contact.whatsappDisplay;
        entries.push(whatsapp);
      }
      if (settings.contact.address) {
        const address = document.createElement("span");
        address.className = "footer__link";
        address.textContent = settings.contact.address;
        entries.push(address);
      }
      element.replaceChildren(...entries);
    });
    document
      .querySelectorAll(".footer__bottom p")
      .forEach((element) => (element.textContent = settings.footer.copyright));

    const whatsappUrl = buildWhatsappUrl(settings);
    document.querySelectorAll(".floating-wa").forEach((element) => {
      element.hidden = !whatsappUrl;
      if (whatsappUrl) element.href = whatsappUrl;
      else element.removeAttribute("href");
    });
    return true;
  }

  applyGlobalSettings();
  window.addEventListener("talenta:public:bootstrap", (event) => {
    const data = event.detail;
    const baseline = getGlobalSettings();
    const settings = normalizeGlobalSettings({
      version: 3,
      identity: {
        ...baseline.identity,
        eventName: data.currentEvent?.name || data.site.name,
        eventSlug: data.site.slug,
        organizerName: data.site.organizerName,
        logo: data.site.logoUrl
          ? new URL(data.site.logoUrl, TalentaConfig.apiBaseUrl).href
          : "",
      },
      theme: {
        ...baseline.theme,
        primaryColor: data.settings.primaryColor,
      },
      navigation: { ...baseline.navigation, ...data.settings.navigation },
      contact: { ...baseline.contact, ...data.settings.contact },
      footer: { ...baseline.footer, ...data.settings.footer },
    });
    applyGlobalSettings(settings);
  });
  if (window.TalentaPublic)
    void TalentaPublic.bootstrap().catch((error) =>
      console.error(
        "Bootstrap API tidak tersedia; baseline ditampilkan.",
        error,
      ),
    );

  window.TalentaRuntime = Object.freeze({ applyGlobalSettings });
})();

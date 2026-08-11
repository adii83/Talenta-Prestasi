(() => {
  const routes = {
    settings: {
      title: "Pengaturan Event",
      crumb: "Event / Pengaturan",
      public: TalentaPaths.to("publicSite.home"),
    },
    home: {
      title: "Editor Beranda",
      crumb: "Kelola Halaman / Beranda",
      public: TalentaPaths.to("publicSite.home"),
      src: TalentaPaths.to("admin.homeEditor", { query: { embedded: 1 } }),
    },
    download: {
      title: "Editor Halaman Unduh",
      crumb: "Kelola Halaman / Unduh",
      public: TalentaPaths.to("publicSite.download"),
      src: TalentaPaths.to("admin.downloadEditor", { query: { embedded: 1 } }),
    },
    winners: {
      title: "Manajemen Pemenang",
      crumb: "Kelola Halaman / Pemenang",
      public: TalentaPaths.to("publicSite.winners"),
      src: TalentaPaths.to("admin.winnersEditor", { query: { embedded: 1 } }),
    },
    archive: {
      title: "Manajemen Arsip",
      crumb: "Kelola Halaman / Arsip",
      public: TalentaPaths.to("publicSite.archive"),
      src: TalentaPaths.to("admin.archiveEditor", { query: { embedded: 1 } }),
    },
    faq: {
      title: "Manajemen FAQ",
      crumb: "Kelola Halaman / FAQ",
      public: TalentaPaths.to("publicSite.faq"),
      src: TalentaPaths.to("admin.faqEditor", { query: { embedded: 1 } }),
    },
  };
  const view = document.getElementById("adminRouteView");
  if (!view) return;
  const settings = document.getElementById("settingsRouteView"),
    editor = document.getElementById("editorRouteView"),
    frame = document.getElementById("adminEditorFrame"),
    resetButton = document.getElementById("routeResetButton"),
    saveButton = document.getElementById("routeSaveButton");
  function activeDocument() {
    return editor.hidden ? document : frame.contentDocument;
  }
  function nativeActions() {
    const doc = activeDocument();
    const bar = doc && doc.querySelector(".admin-savebar");
    return {
      reset: bar && bar.querySelector('button[type="button"]'),
      submit: bar && bar.querySelector('button[type="submit"]'),
    };
  }
  function syncActions() {
    const actions = nativeActions();
    resetButton.disabled = !actions.reset;
    saveButton.disabled = !actions.submit;
  }
  function routeName() {
    const p = new URLSearchParams(location.search).get("page");
    return routes[p] ? p : "settings";
  }
  function render(name, push = false) {
    const r = routes[name] || routes.settings;
    if (push)
      history.pushState(
        { page: name },
        "",
        `${location.pathname}?page=${name}`,
      );
    document.title = `${r.title} — TalentaPanel`;
    document.getElementById("routeTitle").textContent = r.title;
    document.getElementById("routeBreadcrumb").textContent = r.crumb;
    const publicUrl = new URL(r.public, location.href);
    const selectedCategory = TalentaAdminAuth.currentCategory();
    const selectedSite = TalentaAdminAuth.currentSite();
    let verifiedHostname = "";
    if (selectedCategory?.hostname) {
      try {
        const parsed = new URL(`https://${selectedCategory.hostname}`);
        if (
          parsed.protocol === "https:" &&
          parsed.hostname &&
          !parsed.username &&
          !parsed.password &&
          !parsed.port &&
          parsed.pathname === "/" &&
          !parsed.search &&
          !parsed.hash
        ) {
          verifiedHostname = parsed.hostname;
        }
      } catch (_error) {}
    }

    if (
      verifiedHostname &&
      (selectedCategory?.publicationStatus === "published" ||
        selectedSite?.publicationStatus === "published")
    ) {
      const publicPath =
        name === "download"
          ? "/unduh/"
          : name === "winners"
            ? "/pemenang/"
            : name === "archive"
              ? "/arsip/"
              : name === "faq"
                ? "/faq/"
                : "/";
      document.getElementById("routePublicLink").href =
        `https://${verifiedHostname}${publicPath}`;
    } else {
      if (selectedSite?.categorySlug)
        publicUrl.searchParams.set("site", selectedSite.categorySlug);
      document.getElementById("routePublicLink").href = publicUrl.href;
    }
    document
      .querySelectorAll("[data-route]")
      .forEach((a) =>
        a.classList.toggle("admin-nav__item--active", a.dataset.route === name),
      );
    if (name === "settings") {
      settings.hidden = false;
      editor.hidden = true;
    } else {
      settings.hidden = true;
      editor.hidden = false;
      if (!frame.src.endsWith(r.src)) {
        view.classList.add("admin-route-view--loading");
        frame.src = r.src;
      }
    }
    lucide.createIcons();
    syncActions();
  }
  let initialized = false;
  function initialize() {
    if (initialized || !TalentaAdminAuth.currentSite()) return;
    initialized = true;
    document.querySelectorAll("[data-route]").forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        render(a.dataset.route, true);
      }),
    );
    resetButton.addEventListener("click", () => nativeActions().reset?.click());
    saveButton.addEventListener("click", () => {
      const save = activeDocument()?.defaultView?.TalentaHomeEditor?.save;
      if (typeof save === "function") save();
      else nativeActions().submit?.click();
    });
    frame.addEventListener("load", () => {
      view.classList.remove("admin-route-view--loading");
      syncActions();
    });
    addEventListener("popstate", () => render(routeName()));
    render(routeName());
  }
  initialize();
  document.addEventListener("talenta:admin-ready", initialize);
})();

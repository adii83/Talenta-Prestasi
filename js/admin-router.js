(() => {
  const routes = {
    settings: {
      title: "Pengaturan Event",
      crumb: "Event / Pengaturan",
      public: "index.html",
    },
    home: {
      title: "Editor Beranda",
      crumb: "Kelola Halaman / Beranda",
      public: "index.html",
      src: "admin-beranda.html?embedded=1",
    },
    download: {
      title: "Editor Halaman Unduh",
      crumb: "Kelola Halaman / Unduh",
      public: "unduh.html",
      src: "admin-unduh.html?embedded=1",
    },
    winners: {
      title: "Manajemen Pemenang",
      crumb: "Kelola Halaman / Pemenang",
      public: "pemenang.html",
      src: "admin-pemenang.html?embedded=1",
    },
    archive: {
      title: "Manajemen Arsip",
      crumb: "Kelola Halaman / Arsip",
      public: "arsip.html",
      src: "admin-arsip.html?embedded=1",
    },
    faq: {
      title: "Manajemen FAQ",
      crumb: "Kelola Halaman / FAQ",
      public: "faq.html",
      src: "admin-faq.html?embedded=1",
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
    if (push) history.pushState({ page: name }, "", `admin.html?page=${name}`);
    document.title = `${r.title} â€” TalentaPanel`;
    document.getElementById("routeTitle").textContent = r.title;
    document.getElementById("routeBreadcrumb").textContent = r.crumb;
    document.getElementById("routePublicLink").href = r.public;
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
  document.querySelectorAll("[data-route]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      render(a.dataset.route, true);
    }),
  );
  resetButton.addEventListener("click", () => nativeActions().reset?.click());
  saveButton.addEventListener("click", () => nativeActions().submit?.click());
  frame.addEventListener("load", () => {
    view.classList.remove("admin-route-view--loading");
    syncActions();
  });
  addEventListener("popstate", () => render(routeName()));
  render(routeName());
})();

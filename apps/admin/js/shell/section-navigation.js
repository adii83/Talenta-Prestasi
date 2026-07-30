(() => {
  const registry = {
    settings: [
      ["Identitas Utama", "settings-identity"],
      ["Logo & Tema", "settings-theme"],
      ["Navigasi Halaman", "settings-navigation"],
      ["WhatsApp", "settings-whatsapp"],
      ["Footer & Kontak", "settings-footer"],
    ],
    home: [
      ["Hero", "hero-editor"],
      ["Highlight Pemenang", "winner-highlight-editor"],
      ["Jadwal Penting", "schedule-editor"],
      ["Biaya Pendaftaran", "pricing-editor"],
      ["Benefit", "benefit-editor"],
      ["Mitra & Partner", "partner-editor"],
    ],
    download: [
      ["Header Halaman", "download-header"],
      ["Lomba dari Arsip", "download-competitions"],
      ["Preview Dokumen", "download-preview-section"],
    ],
    winners: [
      ["Lomba Aktif", "wm-competition"],
      ["Kategori Juara", "wm-categories"],
      ["Tampilan Halaman", "wm-display"],
      ["Pemenang Sebelumnya", "wm-archives"],
      ["Preview Halaman", "wm-preview"],
    ],
    archive: [
      ["Heading Halaman", "archive-heading"],
      ["Daftar Arsip", "archive-list"],
      ["Preview Halaman", "archive-preview-section"],
    ],
    faq: [
      ["Heading Halaman", "faq-heading"],
      ["Kategori & Pertanyaan", "faq-questions"],
      ["Preview Halaman", "faq-preview-section"],
    ],
    detail: [
      ["Identitas & Banner", "detail-identity"],
      ["Pemenang", "detail-winners"],
      ["Dokumen", "detail-documents"],
      ["Preview Detail", "detail-preview-section"],
    ],
  };
  const sidebar = document.getElementById("adminSidebar"),
    frame = document.getElementById("adminEditorFrame");
  if (!sidebar || !frame) return;
  let currentRoute = "settings",
    pendingTarget = "",
    cleanup = () => {};
  const routeName = () => {
    try {
      if (
        (frame.contentWindow &&
          TalentaPaths.is.call(
            frame.contentWindow,
            "admin.archiveDetailEditor",
          )) ||
        frame.contentWindow.location.pathname.includes("/editors/arsip/detail/")
      )
        return "detail";
    } catch (e) {}
    const p = new URLSearchParams(location.search).get("page");
    return registry[p] ? p : "settings";
  };
  const routeDoc = (r) => (r === "settings" ? document : frame.contentDocument);
  function installAnchors(route, doc) {
    if (!doc) return;
    const cards = [
      ...doc.querySelectorAll(
        route === "settings"
          ? "#settingsRouteView .admin-card:not(.admin-card--hero)"
          : ".admin-main form .admin-card",
      ),
    ];
    registry[route].forEach(([, id], i) => {
      if (!doc.getElementById(id) && cards[i]) cards[i].id = id;
    });
  }
  function mark(route, id) {
    sidebar
      .querySelectorAll("[data-section-target]")
      .forEach((x) =>
        x.classList.toggle(
          "admin-nav-section--active",
          x.dataset.sectionRoute === route && x.dataset.sectionTarget === id,
        ),
      );
  }
  function observe(route) {
    cleanup();
    const doc = routeDoc(route);
    if (!doc) return;
    installAnchors(route, doc);
    const targets = registry[route]
      .map(([, id]) => doc.getElementById(id))
      .filter(Boolean);
    if (!targets.length) return;
    const win = route === "settings" ? window : frame.contentWindow;
    const update = () => {
      let active = targets[0];
      targets.forEach((x) => {
        if (x.getBoundingClientRect().top <= 150) active = x;
      });
      mark(route, active.id);
    };
    win.addEventListener("scroll", update, { passive: true });
    cleanup = () => win.removeEventListener("scroll", update);
    update();
  }
  function sectionMarkup(route) {
    return registry[route]
      .map(
        ([label, id], i) =>
          `<button type="button" class="admin-nav-section" data-section-route="${route}" data-section-target="${id}"><b>${String(i + 1).padStart(2, "0")}</b><span>${label}</span></button>`,
      )
      .join("");
  }
  function renderContext(route) {
    const groupRoute = route === "detail" ? "archive" : route;
    const group = sidebar.querySelector(`[data-section-group="${groupRoute}"]`),
      sub = group?.querySelector(".admin-nav-sections");
    if (sub) sub.innerHTML = sectionMarkup(route);
    return groupRoute;
  }
  function scrollTo(route, id) {
    const doc = routeDoc(route),
      target = doc && doc.getElementById(id);
    if (!target) return;
    const win = route === "settings" ? window : frame.contentWindow;
    const top =
      target.getBoundingClientRect().top +
      win.scrollY -
      (route === "settings" ? 104 : 24);
    win.scrollTo({
      top: Math.max(0, top),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
    mark(route, id);
    sidebar.classList.remove("admin-sidebar--open");
  }
  function setOpen(route) {
    currentRoute = route;
    const groupRoute = renderContext(route);
    sidebar.querySelectorAll("[data-section-group]").forEach((g) => {
      const open = g.dataset.sectionGroup === groupRoute;
      g.classList.toggle("admin-nav-group--open", open);
      g.querySelector("[data-section-toggle]")?.setAttribute(
        "aria-expanded",
        String(open),
      );
    });
    requestAnimationFrame(() => observe(route));
  }
  document.querySelectorAll("[data-route]").forEach((link) => {
    const route = link.dataset.route,
      group = document.createElement("div");
    group.className = "admin-nav-group";
    group.dataset.sectionGroup = route;
    link.parentNode.insertBefore(group, link);
    group.appendChild(link);
    link.classList.add("admin-nav__item--has-children");
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "admin-nav__toggle";
    toggle.dataset.sectionToggle = route;
    toggle.setAttribute(
      "aria-label",
      `Buka struktur ${link.textContent.trim()}`,
    );
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<i data-lucide="chevron-down"></i>';
    link.appendChild(toggle);
    const sub = document.createElement("div");
    sub.className = "admin-nav-sections";
    sub.innerHTML = sectionMarkup(route);
    group.appendChild(sub);
    const toggleGroup = () => {
      const willOpen = !group.classList.contains("admin-nav-group--open");
      sidebar.querySelectorAll("[data-section-group]").forEach((item) => {
        const open = item === group && willOpen;
        item.classList.toggle("admin-nav-group--open", open);
        item
          .querySelector("[data-section-toggle]")
          ?.setAttribute("aria-expanded", String(open));
      });
    };
    toggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleGroup();
    };
    link.addEventListener("click", (e) => {
      if (route === currentRoute) {
        e.preventDefault();
        toggleGroup();
        return;
      }
      setTimeout(() => setOpen(route), 0);
    });
  });
  sidebar.addEventListener("click", (e) => {
    const item = e.target.closest("[data-section-target]");
    if (!item) return;
    const route = item.dataset.sectionRoute,
      id = item.dataset.sectionTarget;
    if (route === currentRoute) scrollTo(route, id);
    else {
      pendingTarget = id;
      sidebar.querySelector(`[data-route="${route}"]`)?.click();
    }
  });
  frame.addEventListener("load", () => {
    const route = routeName();
    setOpen(route);
    if (pendingTarget) {
      const id = pendingTarget;
      pendingTarget = "";
      requestAnimationFrame(() => scrollTo(route, id));
    }
  });
  addEventListener("popstate", () => setOpen(routeName()));
  setOpen(routeName());
  lucide.createIcons();
})();

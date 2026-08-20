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
    saveButton = document.getElementById("routeSaveButton"),
    previewButton = document.getElementById("routePublicLink"),
    publishButton = document.getElementById("routePublishButton"),
    discardButton = document.getElementById("routeDiscardButton"),
    statusNode = document.getElementById("eventPublicationStatus");
  let publication = null;
  let dirty = false;

  function activeDocument() {
    return editor.hidden ? document : frame.contentDocument;
  }
  function editorContext() {
    return activeDocument()?.defaultView?.TalentaEditor;
  }
  function nativeActions() {
    const doc = activeDocument();
    const bar = doc && doc.querySelector(".admin-savebar");
    const context = editorContext();
    return {
      save:
        context?.save ||
        (() => bar?.querySelector('button[type="submit"]')?.click()),
      revert:
        context?.revert ||
        (() => {
          if (!editor.hidden) frame.contentWindow.location.reload();
        }),
    };
  }
  function publicationEventId() {
    return (
      editorContext()?.eventId || TalentaAdminAuth.currentEvent()?.id || null
    );
  }
  function syncActions() {
    const actions = nativeActions();
    resetButton.disabled = !actions.revert;
    saveButton.disabled = !actions.save;
  }
  function routeName() {
    const p = new URLSearchParams(location.search).get("page");
    return routes[p] ? p : "settings";
  }
  function publicUrl(name, token) {
    const route = routes[name] || routes.settings;
    const url = new URL(route.public, location.href);
    const category = TalentaAdminAuth.currentCategory();
    const event = TalentaAdminAuth.currentEvent();
    const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
    let verifiedHostname = "";
    if (category?.hostname) {
      try {
        const parsed = new URL(`https://${category.hostname}`);
        if (
          parsed.protocol === "https:" &&
          parsed.hostname &&
          !parsed.username &&
          !parsed.password &&
          !parsed.port &&
          parsed.pathname === "/" &&
          !parsed.search &&
          !parsed.hash
        )
          verifiedHostname = parsed.hostname;
      } catch (_error) {}
    }
    if (!isLocal && verifiedHostname) {
      const path =
        name === "download"
          ? "/unduh/"
          : name === "winners"
            ? "/pemenang/"
            : name === "archive"
              ? "/arsip/"
              : name === "faq"
                ? "/faq/"
                : "/";
      url.href = `https://${verifiedHostname}${path}`;
    } else if (event?.categorySlug)
      url.searchParams.set("site", event.categorySlug);
    url.hash = new URLSearchParams({ preview: token }).toString();
    return url.href;
  }
  async function refreshPublication() {
    const eventId = publicationEventId();
    if (!eventId) return;
    try {
      const requestedEventId = eventId;
      const nextPublication = (
        await TalentaApi.request(`/admin/events/${eventId}/publication-status`)
      ).data;
      if (requestedEventId !== publicationEventId()) return;
      publication = nextPublication;
      const labels = {
        unpublished: "Belum pernah dipublikasikan",
        draft: "Ada perubahan draf",
        clean: "Draf bersih",
      };
      statusNode.dataset.state = publication.publicationState;
      statusNode.querySelector("span").textContent =
        labels[publication.publicationState] || publication.publicationState;
      publishButton.disabled =
        !publication.draftChanged || publication.role === "viewer";
      discardButton.disabled =
        publication.publicationState === "unpublished" ||
        !publication.draftChanged ||
        publication.role === "viewer";
    } catch (error) {
      statusNode.querySelector("span").textContent = error.message;
      publishButton.disabled = true;
      discardButton.disabled = true;
    }
  }
  function bindDirty(doc) {
    if (!doc || doc.documentElement.dataset.dirtyBound) return;
    doc.documentElement.dataset.dirtyBound = "true";
    doc.addEventListener("input", () => (dirty = true));
    doc.addEventListener("change", () => (dirty = true));
    doc.addEventListener("talenta:editor-dirty", () => (dirty = true));
    doc.addEventListener("talenta:editor-saved", () => {
      dirty = false;
      void refreshPublication();
    });
    doc.addEventListener("talenta:editor-ready", () => {
      syncActions();
      void refreshPublication();
    });
  }
  async function canLeave() {
    if (!dirty) return true;
    return adminConfirm({
      title: "Perubahan belum disimpan",
      message:
        "Simpan sebagai draf sebelum meninggalkan halaman agar pekerjaan tidak hilang.",
      confirmLabel: "Keluar tanpa menyimpan",
      variant: "danger",
      icon: "triangle-alert",
    });
  }
  async function render(name, push = false) {
    if (push && !(await canLeave())) return;
    dirty = false;
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
    document
      .querySelectorAll("[data-route]")
      .forEach((a) =>
        a.classList.toggle("admin-nav__item--active", a.dataset.route === name),
      );
    if (name === "settings") {
      settings.hidden = false;
      editor.hidden = true;
      bindDirty(document);
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
    await refreshPublication();
  }
  async function openPreview() {
    const eventId = publicationEventId();
    if (!eventId) return;
    previewButton.disabled = true;
    try {
      const { data } = await TalentaApi.request(
        `/admin/events/${eventId}/preview-token`,
        { method: "POST" },
      );
      const actions = editorContext();
      const currentPreviewToken =
        actions?.currentEventId && actions.currentEventId !== eventId
          ? (
              await TalentaApi.request(
                `/admin/events/${actions.currentEventId}/preview-token`,
                { method: "POST" },
              )
            ).data.token
          : data.token;
      open(
        actions?.publicUrl?.(data.token, currentPreviewToken) ||
          publicUrl(routeName(), data.token),
        "_blank",
        "noopener",
      );
    } catch (error) {
      window.showToast?.(error.message, true);
    } finally {
      previewButton.disabled = false;
    }
  }
  async function publishDraft() {
    const eventId = publicationEventId();
    if (!eventId) return;
    const modules = publication?.changedModules?.join(", ") || "seluruh Event";
    if (
      !(await adminConfirm({
        title: "Publikasikan perubahan?",
        message: `Pengunjung akan melihat perubahan pada: ${modules}.`,
        confirmLabel: "Publikasikan sekarang",
        icon: "send",
      }))
    )
      return;
    try {
      await TalentaApi.request(`/admin/events/${eventId}/publish`, {
        method: "POST",
        body: {
          expectedVersion: publication?.eventVersion,
          expectedRevision: publication?.workspaceRevision,
          expectedChecksum: publication?.workspaceChecksum,
        },
      });
      await refreshPublication();
      window.showToast?.("Perubahan Event berhasil dipublikasikan.");
    } catch (error) {
      window.showToast?.(error.message, true);
    }
  }
  async function discardDraft() {
    const eventId = publicationEventId();
    if (!eventId) return;
    if (
      !(await adminConfirm({
        title: "Batalkan seluruh perubahan draf?",
        message:
          "Workspace akan dikembalikan ke versi publik terakhir. Website publik tidak berubah.",
        confirmLabel: "Batalkan draf",
        variant: "danger",
        icon: "rotate-ccw",
      }))
    )
      return;
    try {
      await TalentaApi.request(`/admin/events/${eventId}/discard-draft`, {
        method: "POST",
        body: {
          expectedVersion: publication?.eventVersion,
          expectedRevision: publication?.workspaceRevision,
          expectedChecksum: publication?.workspaceChecksum,
        },
      });
      location.reload();
    } catch (error) {
      window.showToast?.(error.message, true);
    }
  }
  let initialized = false;
  function initialize() {
    if (initialized || !TalentaAdminAuth.currentSite()) return;
    initialized = true;
    document.querySelectorAll("[data-route]").forEach((a) =>
      a.addEventListener("click", (event) => {
        event.preventDefault();
        void render(a.dataset.route, true);
      }),
    );
    resetButton.addEventListener("click", async () => {
      if (
        dirty &&
        !(await adminConfirm({
          title: "Buang edit yang belum disimpan?",
          message:
            "Modul aktif akan dimuat ulang dari draf terakhir yang tersimpan.",
          confirmLabel: "Urungkan edit",
          variant: "danger",
          icon: "undo-2",
        }))
      )
        return;
      try {
        await nativeActions().revert?.();
        dirty = false;
        window.showToast?.("Edit yang belum disimpan telah diurungkan.");
      } catch (error) {
        window.showToast?.(error.message, true);
      }
    });
    saveButton.addEventListener("click", async () => {
      try {
        await nativeActions().save?.();
        dirty = false;
        await refreshPublication();
      } catch (error) {
        window.showToast?.(error.message, true);
      }
    });
    previewButton.addEventListener("click", openPreview);
    publishButton.addEventListener("click", publishDraft);
    discardButton.addEventListener("click", discardDraft);
    frame.addEventListener("load", () => {
      view.classList.remove("admin-route-view--loading");
      bindDirty(frame.contentDocument);
      syncActions();
      void refreshPublication();
    });
    addEventListener("popstate", () => void render(routeName()));
    addEventListener("beforeunload", (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
    void render(routeName());
  }
  initialize();
  document.addEventListener("talenta:admin-ready", initialize);
})();

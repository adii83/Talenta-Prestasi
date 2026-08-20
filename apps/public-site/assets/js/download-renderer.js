/* Renderer publik Unduh — data API saja tanpa mock fallback. */
(() => {
  const root = document.getElementById("unduh");
  if (!root) return;

  function activateTab(id) {
    root.querySelectorAll(".unduh-tab").forEach((tab) => {
      tab.classList.toggle("unduh-tab--active", tab.dataset.tab === id);
    });
    root.querySelectorAll(".unduh-tab-panel").forEach((panel) => {
      panel.classList.toggle("unduh-tab-panel--active", panel.id === id);
    });
  }

  function sanitizeUrl(value) {
    if (!value) return "";
    try {
      const parsed = new URL(TalentaPublic.mediaUrl(value));
      return parsed.protocol === "http:" || parsed.protocol === "https:"
        ? parsed.href
        : "";
    } catch (_error) {
      return "";
    }
  }

  function apiState(data) {
    return {
      version: 2,
      active: data.page?.isActive !== false,
      eyebrow: data.page?.eyebrow || "Unduh",
      title: data.page?.title || "Dokumen & Materi",
      description:
        data.page?.description ||
        "Unduh dokumen resmi yang disediakan untuk ajang talenta.",
      alignment: data.page?.alignment === "left" ? "left" : "center",
      competitions: (data.tabs || []).map((tab, index) => ({
        competitionId: tab.id || `tab-${index + 1}`,
        customTabName: tab.tabName || "Dokumen",
        isDefault: tab.isDefault === true,
        documents: (tab.documents || []).map((document) => ({
          title: document.title || "Dokumen Tanpa Judul",
          category: document.category || "",
          type: document.fileType || "PDF",
          size: document.displaySize || "-",
          url: sanitizeUrl(document.url),
        })),
      })),
    };
  }

  function renderLoading() {
    root.className = "section";
    root.innerHTML =
      '<div class="container" role="status" aria-live="polite" aria-busy="true"><div class="public-empty-state"><i data-lucide="loader-2" class="spin"></i><h2 class="t-h3">Memuat dokumen...</h2><p>Mengambil daftar dokumen resmi dari database.</p></div></div>';
    if (window.lucide) lucide.createIcons();
  }

  function renderError(message = "Dokumen belum dapat ditampilkan saat ini.") {
    root.className = "section";
    root.innerHTML = `<div class="container" role="alert"><div class="public-empty-state"><i data-lucide="alert-circle"></i><h2 class="t-h3">Gagal Memuat Dokumen</h2><p>${downloadEscape(message)}</p><button type="button" class="btn btn--outline btn--sm" id="btnRetryPublicDownload" style="margin-top:12px"><i data-lucide="rotate-ccw"></i> Coba lagi</button></div></div>`;
    const btnRetry = root.querySelector("#btnRetryPublicDownload");
    if (btnRetry) {
      btnRetry.onclick = () => {
        void fetchPublicDownloads();
      };
    }
    if (window.lucide) lucide.createIcons();
  }

  function render(state) {
    if (!state) return renderError();
    root.className = `section${state.active ? "" : " section--disabled"}`;
    root.innerHTML = buildDownloadMarkup(state);
    root
      .querySelectorAll(".unduh-tab")
      .forEach((tab) => (tab.onclick = () => activateTab(tab.dataset.tab)));
    if (window.lucide) lucide.createIcons();
  }

  async function fetchPublicDownloads() {
    renderLoading();
    try {
      const data = await TalentaPublic.load("download");
      render(apiState(data));
    } catch (error) {
      // Jika diakses sebagai preview dari Admin (memiliki state local/localStorage), tampilkan data preview
      if (typeof getPublicDownloadState === "function") {
        try {
          const localState = getPublicDownloadState();
          if (localState) {
            render(localState);
            return;
          }
        } catch (_localError) {}
      }

      renderError(
        error?.message ||
          "Koneksi database atau layanan publik belum tersedia.",
      );
    }
  }

  window.addEventListener("talenta:public:download", (event) => {
    if (event.detail) render(apiState(event.detail));
  });

  void fetchPublicDownloads();
  window.TalentaDownload = Object.freeze({ render });
})();

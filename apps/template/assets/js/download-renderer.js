/* Renderer publik Unduh — data API memakai markup shared. */
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

  function apiState(data) {
    const baseline = getPublicDownloadState();
    return {
      ...baseline,
      active: data.page?.isActive ?? baseline.active,
      eyebrow: data.page?.eyebrow || baseline.eyebrow,
      title: data.page?.title || baseline.title,
      description: data.page?.description || baseline.description,
      alignment: data.page?.alignment || baseline.alignment,
      competitions: data.competitions.map((competition) => ({
        competitionId: competition.slug,
        customTabName: competition.tabName,
        isDefault: competition.isDefault,
        documents: competition.documents.map((document) => ({
          title: document.title,
          category: document.category,
          type: document.fileType || "PDF",
          size: document.displaySize || "-",
          url: document.url
            ? new URL(document.url, TalentaConfig.apiBaseUrl).href
            : "",
        })),
      })),
    };
  }

  function render(state = getPublicDownloadState()) {
    root.className = `section${state.active ? "" : " section--disabled"}`;
    root.innerHTML = buildDownloadMarkup(state);
    root
      .querySelectorAll(".unduh-tab")
      .forEach((tab) => (tab.onclick = () => activateTab(tab.dataset.tab)));
    if (window.lucide) lucide.createIcons();
  }

  render();
  window.addEventListener("talenta:public:download", (event) =>
    render(apiState(event.detail)),
  );
  void TalentaPublic.load("download").catch((error) =>
    console.error("Downloads API tidak tersedia; baseline ditampilkan.", error),
  );
  window.TalentaDownload = Object.freeze({ render });
})();

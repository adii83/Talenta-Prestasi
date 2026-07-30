/* Renderer publik Unduh — markup dan data berasal dari repository shared. */
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

  function render(state = getPublicDownloadState()) {
    root.className = `section${state.active ? "" : " section--disabled"}`;
    root.innerHTML = buildDownloadMarkup(state);
    root
      .querySelectorAll(".unduh-tab")
      .forEach((tab) => (tab.onclick = () => activateTab(tab.dataset.tab)));
    if (window.lucide) lucide.createIcons();
  }

  render();
  window.addEventListener(DOWNLOAD_STATE_EVENT, () =>
    render(getPublicDownloadState()),
  );
  window.addEventListener("talenta:archive", () =>
    render(getPublicDownloadState()),
  );
  window.addEventListener("storage", (event) => {
    if (
      event.key === DOWNLOAD_STATE_KEY ||
      event.key === ARCHIVE_STATE_KEY ||
      event.key === null
    )
      render();
  });
  window.TalentaDownload = Object.freeze({ render });
})();

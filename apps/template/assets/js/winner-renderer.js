/* Renderer halaman Pemenang publik — markup berasal dari repository shared. */
(() => {
  const root = document.getElementById("pemenang");
  if (!root) return;

  const archiveHref = (competition) =>
    TalentaPaths.to("template.archiveDetail", {
      query: { id: competition.id },
      hash: "pemenang",
    });

  function render(source = getPublicWinnerState()) {
    root.className = `section${source.page.active ? "" : " section--disabled"}`;
    root.innerHTML = buildWinnerPageMarkup(source, { archiveHref });
    if (window.lucide) lucide.createIcons();
  }

  render();
  window.addEventListener(WINNER_STATE_EVENT, () =>
    render(getPublicWinnerState()),
  );
  window.addEventListener("talenta:archive", () =>
    render(getPublicWinnerState()),
  );
  window.addEventListener("storage", (event) => {
    if (
      event.key === WINNER_MANAGER_STATE_KEY ||
      event.key === WINNER_PAGE_STATE_KEY ||
      event.key === ARCHIVE_STATE_KEY ||
      event.key === null
    )
      render();
  });
  window.TalentaWinners = Object.freeze({ render });
})();

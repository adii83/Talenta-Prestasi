/* Renderer publik Arsip — markup berasal dari repository shared. */
(() => {
  const root = document.getElementById("archivePublicRoot");
  if (!root) return;

  const archiveHref = (competition) =>
    TalentaPaths.to("template.archiveDetail", {
      query: { id: competition.id },
    });

  function render() {
    const page = getEffectiveArchivePage();
    if (!page.active) {
      root.innerHTML = `<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="eye-off"></i><h1 class="t-h2">Arsip tidak tersedia</h1><p>Halaman Arsip sedang dinonaktifkan.</p><a class="btn btn--outline" href="${TalentaPaths.to("template.home")}">Kembali ke Beranda</a></div></div></section>`;
      lucide.createIcons();
      return;
    }
    root.innerHTML = buildArchiveListMarkup(
      page,
      getPublicArchivedCompetitions(),
      { archiveHref },
    );
    lucide.createIcons();
  }

  render();
  window.addEventListener("talenta:archive", render);
  window.addEventListener("storage", (event) => {
    if (
      event.key === ARCHIVE_STATE_KEY ||
      event.key === ARCHIVE_LEGACY_KEY ||
      event.key === null
    )
      render();
  });
})();

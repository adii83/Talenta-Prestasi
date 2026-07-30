/* Renderer publik Detail Arsip — markup berasal dari repository shared. */
(() => {
  const root = document.getElementById("archiveDetailPublicRoot");
  if (!root) return;

  function render() {
    const id = new URLSearchParams(location.search).get("id");
    const competition = getPublicArchiveCompetitionById(id);
    if (!competition) {
      document.title = "Arsip Tidak Ditemukan — Olimpiade Sains Nusantara";
      root.innerHTML = `<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="file-question"></i><h1 class="t-h2">Detail arsip tidak tersedia</h1><p>ID lomba tidak ditemukan atau lomba sedang dinonaktifkan.</p><a class="btn btn--outline" href="${TalentaPaths.to("template.archive")}"><i data-lucide="arrow-left"></i>Kembali ke Arsip</a></div></div></section>`;
      lucide.createIcons();
      return;
    }
    const source = resolveArchiveDetailState(competition);
    document.title = `${competition.name} — Arsip Ajang Talenta`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta)
      descriptionMeta.content =
        competition.description || `Detail ${competition.name}`;
    root.innerHTML = buildArchiveDetailMarkup(source, {
      archiveHref: () => TalentaPaths.to("template.archive"),
    });
    lucide.createIcons();
    if (location.hash)
      requestAnimationFrame(() =>
        document.querySelector(location.hash)?.scrollIntoView(),
      );
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

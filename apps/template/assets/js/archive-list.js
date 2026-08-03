/* Renderer publik Arsip — data API memakai markup shared. */
(() => {
  const root = document.getElementById("archivePublicRoot");
  if (!root) return;

  const archiveHref = (competition) =>
    TalentaPaths.to("template.archiveDetail", {
      query: { id: competition.slug },
    });

  function render(data) {
    const baseline = getEffectiveArchivePage();
    const page = data
      ? {
          ...baseline,
          active: data.page?.isActive ?? true,
          eyebrow: data.page?.eyebrow || baseline.eyebrow,
          title: data.page?.title || baseline.title,
          description: data.page?.description || baseline.description,
          alignment: data.page?.alignment || baseline.alignment,
        }
      : baseline;
    const competitions = data
      ? data.competitions.map((competition) => ({
          ...competition,
          icon: competition.fallbackIcon || "archive",
        }))
      : getPublicArchivedCompetitions();
    if (!page.active) {
      root.innerHTML = `<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="eye-off"></i><h1 class="t-h2">Arsip tidak tersedia</h1><p>Halaman Arsip sedang dinonaktifkan.</p><a class="btn btn--outline" href="${TalentaPaths.to("template.home")}">Kembali ke Beranda</a></div></div></section>`;
      lucide.createIcons();
      return;
    }
    root.innerHTML = buildArchiveListMarkup(page, competitions, {
      archiveHref,
    });
    document.title = `${page.title} — ${data?.site?.name || "Talenta Prestasi"}`;
    lucide.createIcons();
  }

  render();
  window.addEventListener("talenta:public:archive", (event) =>
    render(event.detail),
  );
  void TalentaPublic.load("archive").catch((error) =>
    console.error("Archive API tidak tersedia; baseline ditampilkan.", error),
  );
})();

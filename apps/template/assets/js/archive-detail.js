/* Renderer publik Detail Arsip — data API memakai markup shared. */
(() => {
  const root = document.getElementById("archiveDetailPublicRoot");
  if (!root) return;
  const slug = new URLSearchParams(location.search).get("id");

  function apiState(data) {
    const visibility = data.settings?.metadataVisibility || {};
    return {
      competition: data.competition,
      detail: {
        ...archiveDetailDefaults(),
        active: data.settings?.isActive ?? true,
        winnersActive: data.settings?.winnersActive ?? true,
        documentsActive: data.settings?.documentsActive ?? true,
        showPhoto: visibility.showPhoto ?? true,
        showSchool: visibility.showSchool ?? true,
        showExam: visibility.showExam ?? true,
        showDistrict: visibility.showDistrict ?? true,
        showRegency: visibility.showRegency ?? true,
        showProvince: visibility.showProvince ?? true,
      },
      categories: data.categories.map((category) => ({
        name: category.name,
        icon: category.icon,
        winners: category.winners.map((winner) => ({
          name: winner.fullName,
          rank: winner.rankLabel,
          school: winner.school,
          exam: winner.examNumber,
          district: winner.district,
          regency: winner.regency,
          province: winner.province,
          photo: winner.photoUrl
            ? new URL(winner.photoUrl, TalentaConfig.apiBaseUrl).href
            : "",
        })),
      })),
      documents: data.documents.map((document) => ({
        title: document.title,
        category: document.category,
        type: document.fileType || "PDF",
        size: document.displaySize || "-",
        url: document.url
          ? new URL(document.url, TalentaConfig.apiBaseUrl).href
          : "",
      })),
      sk: null,
    };
  }

  function render(data) {
    if (!data) return;
    const source = apiState(data);
    document.title = `${source.competition.name} — Arsip Ajang Talenta`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta)
      descriptionMeta.content =
        source.competition.description || `Detail ${source.competition.name}`;
    root.innerHTML = buildArchiveDetailMarkup(source, {
      archiveHref: () => TalentaPaths.to("template.archive"),
    });
    lucide.createIcons();
    if (location.hash)
      requestAnimationFrame(() =>
        document.querySelector(location.hash)?.scrollIntoView(),
      );
  }

  if (!slug) {
    root.innerHTML = `<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="file-question"></i><h1 class="t-h2">Detail arsip tidak tersedia</h1><p>ID lomba tidak ditemukan.</p><a class="btn btn--outline" href="${TalentaPaths.to("template.archive")}">Kembali ke Arsip</a></div></div></section>`;
    lucide.createIcons();
    return;
  }
  window.addEventListener("talenta:public:archiveDetail", (event) =>
    render(event.detail),
  );
  void TalentaPublic.load("archiveDetail", slug).catch((error) => {
    console.error("Archive Detail API tidak tersedia.", error);
    root.innerHTML = `<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="file-question"></i><h1 class="t-h2">Detail arsip tidak tersedia</h1><p>Lomba tidak ditemukan atau belum dipublikasikan.</p><a class="btn btn--outline" href="${TalentaPaths.to("template.archive")}">Kembali ke Arsip</a></div></div></section>`;
    lucide.createIcons();
  });
})();

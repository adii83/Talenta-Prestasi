/* Renderer halaman Pemenang publik — data API memakai markup shared. */
(() => {
  const root = document.getElementById("pemenang");
  if (!root) return;

  const archiveHref = (competition) =>
    TalentaPaths.to("template.archiveDetail", {
      query: { id: competition.slug || competition.id },
      hash: "pemenang",
    });

  function apiState(data) {
    const baseline = getPublicWinnerState();
    const visibility = data.settings?.metadataVisibility || {};
    return {
      manager: {
        competitionId: data.competition?.slug || "",
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
        sk: null,
      },
      page: {
        ...baseline.page,
        active: data.page?.isActive ?? data.settings?.isActive ?? true,
        eyebrow: data.page?.eyebrow || baseline.page.eyebrow,
        title: data.page?.title || baseline.page.title,
        description: data.page?.description || baseline.page.description,
        alignment: data.page?.alignment || baseline.page.alignment,
        showSk: data.settings?.showDecree ?? baseline.page.showSk,
        showPhoto: visibility.showPhoto ?? baseline.page.showPhoto,
        showSchool: visibility.showSchool ?? baseline.page.showSchool,
        showExam: visibility.showExam ?? baseline.page.showExam,
        showDistrict: visibility.showDistrict ?? baseline.page.showDistrict,
        showRegency: visibility.showRegency ?? baseline.page.showRegency,
        showProvince: visibility.showProvince ?? baseline.page.showProvince,
        archiveActive:
          data.settings?.archiveActive ?? baseline.page.archiveActive,
      },
      archives: data.archives.map((competition) => ({
        ...competition,
        id: competition.slug,
      })),
    };
  }

  function render(source = getPublicWinnerState()) {
    root.className = `section${source.page.active ? "" : " section--disabled"}`;
    root.innerHTML = buildWinnerPageMarkup(source, { archiveHref });
    if (window.lucide) lucide.createIcons();
  }

  render();
  window.addEventListener("talenta:public:winners", (event) =>
    render(apiState(event.detail)),
  );
  void TalentaPublic.load("winners").catch((error) =>
    console.error("Winners API tidak tersedia; baseline ditampilkan.", error),
  );
  window.TalentaWinners = Object.freeze({ render });
})();

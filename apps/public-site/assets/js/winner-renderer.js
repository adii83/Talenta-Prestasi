/* Renderer halaman Pemenang publik — data API memakai markup shared. */
(() => {
  const root = document.getElementById("pemenang");
  if (!root) return;

  const archiveHref = (event) =>
    TalentaPaths.to("publicSite.archiveDetail", {
      query: { event: event.slug || event.id },
      hash: "pemenang",
    });

  function apiState(data) {
    const baseline = getPublicWinnerState();
    const visibility = data.settings?.metadataVisibility || {};
    return {
      manager: {
        competitionId: data.event?.slug || "",
        categories: (data.categories || []).map((category) => ({
          name: category.name,
          icon: category.icon,
          winners: (category.winners || []).map((winner) => {
            let photo = winner.photo || "";
            if (winner.photoUrl) {
              const base =
                window.TalentaConfig?.apiBaseUrl &&
                window.TalentaConfig.apiBaseUrl.startsWith("http")
                  ? window.TalentaConfig.apiBaseUrl.replace(/\/api\/v1\/?$/, "")
                  : location.origin;
              photo = new URL(winner.photoUrl, base).href;
            } else if (winner.photoAssetId) {
              const base =
                window.TalentaConfig?.apiBaseUrl &&
                window.TalentaConfig.apiBaseUrl.startsWith("http")
                  ? window.TalentaConfig.apiBaseUrl.replace(/\/api\/v1\/?$/, "")
                  : location.origin;
              photo = new URL(
                `/api/v1/public/media/${winner.photoAssetId}`,
                base,
              ).href;
            }
            return {
              name: winner.fullName || winner.name || "",
              rank: winner.rankLabel || winner.rank || "",
              school: winner.school || "",
              exam: winner.examNumber || winner.exam || "",
              regency: winner.regency || "",
              province: winner.province || "",
              photo,
            };
          }),
        })),
        sk: data.decree
          ? {
              ...data.decree,
              title: data.decree.title || "SK Penetapan Pemenang",
              description: data.decree.description || "",
              url: (() => {
                let url = "";
                if (data.decree.url) {
                  const base =
                    window.TalentaConfig?.apiBaseUrl &&
                    window.TalentaConfig.apiBaseUrl.startsWith("http")
                      ? window.TalentaConfig.apiBaseUrl.replace(
                          /\/api\/v1\/?$/,
                          "",
                        )
                      : location.origin;
                  url = new URL(data.decree.url, base).href;
                } else if (data.decree.assetId) {
                  const base =
                    window.TalentaConfig?.apiBaseUrl &&
                    window.TalentaConfig.apiBaseUrl.startsWith("http")
                      ? window.TalentaConfig.apiBaseUrl.replace(
                          /\/api\/v1\/?$/,
                          "",
                        )
                      : location.origin;
                  url = new URL(
                    `/api/v1/public/media/${data.decree.assetId}`,
                    base,
                  ).href;
                }
                return url;
              })(),
            }
          : null,
      },
      page: {
        ...baseline.page,
        active: data.page?.isActive ?? data.settings?.isActive ?? true,
        eyebrow:
          data.page?.eyebrow || data.event?.name || baseline.page.eyebrow,
        title: data.page?.title || baseline.page.title,
        description: data.page?.description || baseline.page.description,
        alignment: data.page?.alignment || baseline.page.alignment,
        showSk: data.settings?.showDecree ?? baseline.page.showSk,
        showPhoto: visibility.showPhoto ?? baseline.page.showPhoto,
        showSchool: visibility.showSchool ?? baseline.page.showSchool,
        showExam: visibility.showExam ?? baseline.page.showExam,
        showRegency: visibility.showRegency ?? baseline.page.showRegency,
        showProvince: visibility.showProvince ?? baseline.page.showProvince,
        archiveActive:
          data.settings?.archiveActive ?? baseline.page.archiveActive,
        archiveTitle: data.settings?.archiveTitle || baseline.page.archiveTitle,
        archiveAction:
          data.settings?.archiveAction || baseline.page.archiveAction,
        archiveLimit: data.settings?.archiveLimit ?? baseline.page.archiveLimit,
      },
      archives: (data.archives || []).map((event) => ({
        ...event,
        id: event.slug || event.id,
        name: event.name || event.title || "",
        icon: event.fallbackIcon || event.icon || "archive",
        iconMode: event.mascotAssetId ? "upload" : "library",
        uploadedIcon: event.mascotAssetId
          ? TalentaMedia.url(event.mascotAssetId)
          : "",
        iconAlt: `Logo atau maskot ${event.name || "lomba"}`,
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

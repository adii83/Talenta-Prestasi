/* Renderer halaman Pemenang publik — data API memakai markup shared. */
(() => {
  const root = document.getElementById("pemenang");
  if (!root) return;

  const archiveHref = (event) =>
    TalentaPaths.to("publicSite.archiveDetail", {
      query: { event: event.slug || event.id },
      hash: "pemenang",
    });

  function publicAssetUrl(url, assetId) {
    const source = url || (assetId ? `/api/v1/public/media/${assetId}` : "");
    if (!source) return "";
    return TalentaPublic.mediaUrl(source);
  }

  function apiState(data) {
    const baseline = getPublicWinnerState();
    const visibility = {
      showPhoto: true,
      showSchool: true,
      showExam: true,
      showRegency: true,
      showProvince: true,
    };
    return {
      manager: {
        competitionId: data.event?.slug || "",
        categories: (data.categories || []).map((category) => ({
          name: category.name,
          icon: category.icon,
          winners: (category.winners || []).map((winner) => ({
            name: winner.fullName || winner.name || "",
            rank: winner.rankLabel || winner.rank || "",
            school: winner.school || "",
            exam: winner.examNumber || winner.exam || "",
            district: winner.district || "",
            regency: winner.regency || "",
            province: winner.province || "",
            displayMode: winner.displayMode || "built_in",
            designAssetId: winner.designAssetId || null,
            design: publicAssetUrl(
              winner.designUrl || winner.design,
              winner.designAssetId,
            ),
            photoAssetId: winner.photoAssetId || null,
            photo: publicAssetUrl(
              winner.photoUrl || winner.photo,
              winner.photoAssetId,
            ),
          })),
        })),
        sk: (data.decrees || (data.decree ? [data.decree] : []))
          .map((decree) => ({
            ...decree,
            title: decree.title || "SK Penetapan Pemenang",
            defaultDownloadLabel:
              decree.defaultDownloadLabel || decree.title || "Unduh SK",
            description: decree.description || "",
            url: decree.url
              ? TalentaPublic.mediaUrl(decree.url)
              : decree.assetId
                ? TalentaPublic.mediaUrl(
                    `/api/v1/public/media/${decree.assetId}`,
                  )
                : "",
          }))
          .filter((decree) => decree.url),
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
        decreeTitle:
          data.settings?.decreeTitle ||
          baseline.page.decreeTitle ||
          "SK Penetapan Pemenang",
        ...visibility,
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
          ? TalentaPublic.mediaUrl(
              `/api/v1/public/media/${event.mascotAssetId}`,
            )
          : "",
        iconAlt: `Logo atau maskot ${event.name || "lomba"}`,
      })),
    };
  }

  function render(source = getPublicWinnerState()) {
    root.className = `section${source.page.active ? "" : " section--disabled"}`;
    root.innerHTML = buildWinnerPageMarkup(source, {
      archiveHref,
      resolveAsset: (value) => value || "",
    });
    activateWinnerCardFallbacks(root);
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

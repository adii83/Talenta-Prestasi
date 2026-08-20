/* Renderer publik Detail Arsip — data API memakai markup shared. */
(() => {
  const root = document.getElementById("archiveDetailPublicRoot");
  if (!root) return;
  const slug = new URLSearchParams(location.search).get("event");
  const mediaUrl = (url, assetId) => {
    const source = url || (assetId ? `/api/v1/public/media/${assetId}` : "");
    return source ? TalentaPublic.mediaUrl(source, "archiveDetail") : "";
  };

  function apiState(data) {
    const visibility = data.settings?.metadataVisibility || {};
    return {
      competition: data.event,
      detail: {
        ...archiveDetailDefaults(),
        active: data.settings?.isActive ?? true,
        winnersActive: data.settings?.winnersActive ?? true,
        documentsActive: data.settings?.documentsActive ?? true,
        showSk: visibility.showSk ?? true,
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
          displayMode: winner.displayMode || "built_in",
          designAssetId: winner.designAssetId || null,
          design: mediaUrl(winner.designUrl, winner.designAssetId),
          photoAssetId: winner.photoAssetId || null,
          photo: mediaUrl(winner.photoUrl, winner.photoAssetId),
        })),
      })),
      documents: data.documents.map((document) => ({
        id: document.id,
        title: document.title,
        category: document.category,
        type: document.fileType || "PDF",
        size: document.displaySize || "-",
        url: mediaUrl(document.url, document.assetId),
      })),
      sk: (() => {
        if (data.decree && (data.decree.url || data.decree.assetId)) {
          return {
            title:
              data.decree.title ||
              data.settings?.decreeTitle ||
              "SK Penetapan Pemenang",
            url: mediaUrl(data.decree.url, data.decree.assetId),
            type: data.decree.fileType || "PDF",
            size: data.decree.displaySize || "-",
          };
        }
        const document = (data.documents || []).find(
          (item) => item.id === data.settings?.decreeDocumentId,
        );
        if (!document) return null;
        return {
          title:
            data.settings?.decreeTitle ||
            document.title ||
            "SK Penetapan Pemenang",
          url: mediaUrl(document.url, document.assetId),
          type: document.fileType || "PDF",
          size: document.displaySize || "-",
        };
      })(),
    };
  }

  function render(data) {
    if (!data || !data.event) {
      if (!fallback) {
        root.innerHTML = `<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="file-question"></i><h1 class="t-h2">Detail arsip tidak tersedia</h1><p>Event arsip belum dipublikasikan atau tidak ditemukan.</p><a class="btn btn--outline" href="${TalentaPaths.to("publicSite.archive")}">Kembali ke Arsip</a></div></div></section>`;
        lucide.createIcons();
      }
      return;
    }
    const source = apiState(data);
    document.title = `${source.competition.name} — Arsip Ajang Talenta`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta)
      descriptionMeta.content =
        source.competition.description || `Detail ${source.competition.name}`;
    root.innerHTML = buildArchiveDetailMarkup(source, {
      archiveHref: () => TalentaPaths.to("publicSite.archive"),
    });
    activateWinnerCardFallbacks(root);
    lucide.createIcons();
    if (location.hash)
      requestAnimationFrame(() =>
        document.querySelector(location.hash)?.scrollIntoView(),
      );
  }

  if (!slug) {
    root.innerHTML = `<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="file-question"></i><h1 class="t-h2">Detail arsip tidak tersedia</h1><p>Slug Event tidak ditemukan.</p><a class="btn btn--outline" href="${TalentaPaths.to("publicSite.archive")}">Kembali ke Arsip</a></div></div></section>`;
    lucide.createIcons();
    return;
  }
  const fallback =
    typeof getPublicArchiveCompetitionById === "function"
      ? getPublicArchiveCompetitionById(slug)
      : null;
  if (fallback && typeof resolveArchiveDetailState === "function") {
    const state = resolveArchiveDetailState(fallback);
    render({
      event: state.competition,
      settings: {
        isActive: state.detail.active,
        winnersActive: state.detail.winnersActive,
        documentsActive: state.detail.documentsActive,
        metadataVisibility: {
          showSk: state.detail.showSk,
        },
        decreeDocumentId: state.sk?.documentId,
        decreeTitle: state.sk?.title,
      },
      categories: state.categories.map((category) => ({
        ...category,
        winners: category.winners.map((winner) => ({
          fullName: winner.name,
          rankLabel: winner.rank,
          school: winner.school,
          examNumber: winner.exam,
          district: winner.district,
          regency: winner.regency,
          province: winner.province,
          displayMode: winner.displayMode || "built_in",
          designAssetId: winner.designAssetId || null,
          designUrl: winner.design,
          photoAssetId: winner.photoAssetId || null,
          photoUrl: winner.photo,
        })),
      })),
      documents: state.documents.map((document) => ({
        ...document,
        fileType: document.type,
        displaySize: document.size,
      })),
    });
  }
  window.addEventListener("talenta:public:archiveDetail", (event) =>
    render(event.detail),
  );
  void TalentaPublic.load("archiveDetail", slug).catch((error) => {
    console.error(
      "Archive Detail API tidak tersedia; fallback ditampilkan.",
      error,
    );
    if (!fallback) {
      root.innerHTML = `<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="file-question"></i><h1 class="t-h2">Detail arsip tidak tersedia</h1><p>Event arsip tidak ditemukan.</p><a class="btn btn--outline" href="${TalentaPaths.to("publicSite.archive")}">Kembali ke Arsip</a></div></div></section>`;
      lucide.createIcons();
    }
  });
})();

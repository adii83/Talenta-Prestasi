(() => {
  const call = async (path) => (await TalentaApi.request(path)).data;
  async function load(competitionId) {
    const site = window.parent?.TalentaAdminAuth?.currentSite?.();
    if (!site?.id)
      throw new TalentaApi.ApiError("Portal Admin belum dipilih", 400);
    const [competitions, documents, categories, winners, page, detailConfig] =
      await Promise.all([
        call(`/admin/sites/${site.id}/competitions`),
        call(`/admin/competitions/${competitionId}/documents`),
        call(`/admin/competitions/${competitionId}/winner-categories`),
        call(`/admin/competitions/${competitionId}/winners`),
        call(`/admin/sites/${site.id}/pages/archive`),
        call(`/admin/competitions/${competitionId}/detail-settings`),
      ]);
    const competition = competitions.find((item) => item.id === competitionId);
    if (!competition)
      throw new TalentaApi.ApiError("Lomba tidak ditemukan", 404);
    const settings = detailConfig.settings || {};
    const categoryVisibility = new Map(
      detailConfig.categories.map((item) => [item.categoryId, item.isVisible]),
    );
    const documentVisibility = new Map(
      detailConfig.documents.map((item) => [item.documentId, item]),
    );
    const metadata = settings.metadataVisibility || {};
    return {
      ...competition,
      shortName: competition.name,
      status: competition.publicationStatus,
      active: !competition.deletedAt,
      detail: {
        ...archiveDetailDefaults(),
        active: settings.isActive ?? true,
        winnersActive: settings.winnersActive ?? true,
        documentsActive: settings.documentsActive ?? true,
        showPhoto: metadata.showPhoto ?? true,
        showSchool: metadata.showSchool ?? true,
        showExam: metadata.showExam ?? true,
        showDistrict: metadata.showDistrict ?? true,
        showRegency: metadata.showRegency ?? true,
        showProvince: metadata.showProvince ?? true,
        hiddenCategoryIds: categories
          .filter((item) => categoryVisibility.get(item.id) === false)
          .map((item) => item.id),
        hiddenDocumentIds: documents
          .filter(
            (item) => documentVisibility.get(item.id)?.isVisible === false,
          )
          .map((item) => item.id),
        documentLabelOverrides: Object.fromEntries(
          detailConfig.documents
            .filter((item) => item.labelOverride)
            .map((item) => [item.documentId, item.labelOverride]),
        ),
      },
      documents: documents.map((item) => ({
        ...item,
        active: item.isActive,
        type: item.assetId ? "FILE" : "METADATA",
        size: item.assetId ? "Tersedia" : "Belum ada file",
        url: item.assetId ? TalentaMedia.url(item.assetId) : "",
      })),
      winnerCategories: categories.map((category) => ({
        ...category,
        active: category.isActive,
        winners: winners
          .filter((winner) => winner.categoryId === category.id)
          .map((winner) => ({
            ...winner,
            name: winner.fullName,
            rank: winner.rankLabel,
            exam: winner.examNumber,
            photoAssetId: winner.photoAssetId || null,
            photo: winner.photoAssetId
              ? TalentaMedia.url(winner.photoAssetId)
              : "",
            active: winner.isActive,
          })),
      })),
      skDocument:
        documents.find((item) => item.id === settings.decreeDocumentId) || null,
    };
  }
  async function save(competition) {
    const site = window.parent.TalentaAdminAuth.currentSite();
    const updated = await TalentaApi.request(
      `/admin/competitions/${competition.id}`,
      {
        method: "PATCH",
        headers: { "If-Match": String(competition.version) },
        body: {
          name: competition.name,
          description: competition.description || "",
        },
      },
    );
    competition.version = updated.data.version;
    await TalentaApi.request(
      `/admin/competitions/${competition.id}/detail-settings`,
      {
        method: "PUT",
        body: {
          decreeDocumentId: competition.skDocument?.id,
          isActive: competition.detail.active,
          winnersActive: competition.detail.winnersActive,
          documentsActive: competition.detail.documentsActive,
          metadataVisibility: {
            showPhoto: competition.detail.showPhoto,
            showSchool: competition.detail.showSchool,
            showExam: competition.detail.showExam,
            showDistrict: competition.detail.showDistrict,
            showRegency: competition.detail.showRegency,
            showProvince: competition.detail.showProvince,
          },
          categories: competition.winnerCategories.map((category) => ({
            categoryId: category.id,
            isVisible: !competition.detail.hiddenCategoryIds.includes(
              category.id,
            ),
          })),
          documents: competition.documents.map((document) => ({
            documentId: document.id,
            isVisible: !competition.detail.hiddenDocumentIds.includes(
              document.id,
            ),
            labelOverride:
              competition.detail.documentLabelOverrides[document.id] || "",
          })),
        },
      },
    );
  }
  async function uploadDocument(competition, document, file) {
    const asset = await TalentaMedia.upload(file, { kind: "document" });
    const updated = await TalentaApi.request(
      `/admin/competitions/${competition.id}/documents/${document.id}`,
      {
        method: "PATCH",
        body: {
          title: document.title,
          category: document.category || "",
          documentRole: document.documentRole || "general",
          assetId: asset.assetId,
          isActive: document.active !== false,
          sortOrder: document.sortOrder || 0,
        },
      },
    );
    document.assetId = asset.assetId;
    document.url = TalentaMedia.url(asset);
    document.type = "PDF";
    document.size = `${(asset.byteSize / 1024 / 1024).toFixed(2)} MB`;
    return updated.data;
  }
  window.TalentaArchiveDetailApi = Object.freeze({
    load,
    save,
    uploadDocument,
  });
})();

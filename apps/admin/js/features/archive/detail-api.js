(() => {
  const call = async (path, options) =>
    (await TalentaApi.request(path, options)).data;
  async function load(eventId) {
    const [event, documents, categories, winners, detailConfig] =
      await Promise.all([
        call(`/admin/events/${eventId}`),
        call(`/admin/events/${eventId}/documents`),
        call(`/admin/events/${eventId}/winner-categories`),
        call(`/admin/events/${eventId}/winners`),
        call(`/admin/events/${eventId}/detail-settings`),
      ]);
    const settings = detailConfig.settings || {};
    const categoryVisibility = new Map(
      detailConfig.categories.map((item) => [item.categoryId, item.isVisible]),
    );
    const documentVisibility = new Map(
      detailConfig.documents.map((item) => [item.documentId, item]),
    );
    const metadata = settings.metadataVisibility || {};
    return {
      ...event,
      shortName: event.name,
      status: event.isActive ? "active" : "archive",
      active: !event.deletedAt,
      detail: {
        ...archiveDetailDefaults(),
        active: settings.isActive ?? true,
        winnersActive: settings.winnersActive ?? true,
        documentsActive: settings.documentsActive ?? true,
        showPhoto: metadata.showPhoto ?? true,
        showSchool: metadata.showSchool ?? true,
        showExam: metadata.showExam ?? true,
        showRegency: metadata.showRegency ?? true,
        showProvince: metadata.showProvince ?? true,
        hiddenCategoryIds: categories
          .filter((item) => categoryVisibility.get(item.id) === false)
          .map((item) => item.id),
        hiddenDocumentIds: documents
          .filter((item) => documentVisibility.get(item.id)?.isVisible === false)
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
        type: item.fileType || "PDF",
        size: item.displaySize || (item.assetId ? "Tersedia" : "Belum ada file"),
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
            photo: winner.photoAssetId ? TalentaMedia.url(winner.photoAssetId) : "",
            active: winner.isActive,
          })),
      })),
      skDocument: (() => {
        const document = documents.find(
          (item) => item.id === settings.decreeDocumentId,
        );
        return document
          ? {
              ...document,
              title: settings.decreeTitle || document.title,
              description: settings.decreeDescription || "Unduh dokumen resmi SK Pemenang.",
            }
          : null;
      })(),
    };
  }

  async function save(event) {
    await TalentaApi.request(`/admin/events/${event.id}`, {
      method: "PATCH",
      body: {
        name: event.name,
        description: event.description || "",
        fallbackIcon: event.fallbackIcon || event.icon || "graduation-cap",
        mascotAssetId: event.mascotAssetId || undefined,
      },
    });
    await TalentaApi.request(`/admin/events/${event.id}/detail-settings`, {
      method: "PUT",
      body: {
        decreeDocumentId: event.skDocument?.id,
        decreeTitle: event.skDocument?.title,
        decreeDescription: event.skDocument?.description,
        isActive: event.detail.active,
        winnersActive: event.detail.winnersActive,
        documentsActive: event.detail.documentsActive,
        metadataVisibility: {
          showPhoto: event.detail.showPhoto,
          showSchool: event.detail.showSchool,
          showExam: event.detail.showExam,
          showRegency: event.detail.showRegency,
          showProvince: event.detail.showProvince,
        },
        categories: event.winnerCategories.map((category) => ({
          categoryId: category.id,
          isVisible: !event.detail.hiddenCategoryIds.includes(category.id),
        })),
        documents: event.documents.map((document) => ({
          documentId: document.id,
          isVisible: !event.detail.hiddenDocumentIds.includes(document.id),
          labelOverride: event.detail.documentLabelOverrides[document.id] || "",
        })),
      },
    });
  }

  async function uploadDocument(event, document, file) {
    const asset = await TalentaMedia.upload(file, { kind: "document" });
    const updated = await TalentaApi.request(
      `/admin/events/${event.id}/documents/${document.id}`,
      {
        method: "PATCH",
        body: {
          title: document.title,
          category: document.category || "Dokumen",
          documentRole: document.documentRole || "general",
          fileType: "PDF",
          displaySize: `${(asset.byteSize / 1024 / 1024).toFixed(2)} MB`,
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
  window.TalentaArchiveDetailApi = Object.freeze({ load, save, uploadDocument });
})();

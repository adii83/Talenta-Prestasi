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
    const decreeDocuments = documents.filter(
      (item) => item.isActive && item.documentRole === "winner_decree",
    );
    const categoryVisibility = new Map(
      detailConfig.categories.map((item) => [item.categoryId, item.isVisible]),
    );
    const documentVisibility = new Map(
      detailConfig.documents.map((item) => [item.documentId, item]),
    );
    const documentsById = new Map(documents.map((item) => [item.id, item]));
    const seenDocumentIds = new Set();
    const orderedDocuments = [];
    detailConfig.documents.forEach((item) => {
      const document = documentsById.get(item.documentId);
      if (!document || seenDocumentIds.has(document.id)) return;
      seenDocumentIds.add(document.id);
      orderedDocuments.push(document);
    });
    documents.forEach((document) => {
      if (seenDocumentIds.has(document.id)) return;
      seenDocumentIds.add(document.id);
      orderedDocuments.push(document);
    });
    const metadata = settings.metadataVisibility || {};
    const mappedWinners = await Promise.all(
      winners.map(async (winner) => ({
        ...winner,
        name: winner.fullName || "",
        rank: winner.rankLabel || "",
        exam: winner.examNumber || "",
        district: winner.district || "",
        displayMode: winner.displayMode || "built_in",
        designAssetId: winner.designAssetId || null,
        design: winner.designAssetId
          ? await TalentaMedia.adminPreviewUrl(winner.designAssetId, {
              siteId: eventId,
            })
          : "",
        photoAssetId: winner.photoAssetId || null,
        photo: winner.photoAssetId
          ? await TalentaMedia.adminPreviewUrl(winner.photoAssetId, {
              siteId: eventId,
            })
          : "",
        active: winner.isActive,
      })),
    );
    return {
      ...event,
      archiveDisplayName: settings.archiveDisplayName,
      skBannerTitle: settings.decreeTitle || "SK Penetapan Pemenang",
      status: event.isActive ? "active" : "archive",
      active: !event.deletedAt,
      detail: {
        ...archiveDetailDefaults(),
        active: settings.isActive ?? true,
        winnersActive: settings.winnersActive ?? true,
        winnersEyebrow: settings.winnersEyebrow || "Hasil Ajang Talenta",
        winnersTitle: settings.winnersTitle || "Daftar Pemenang",
        winnersDescription: settings.winnersDescription || "",
        documentsActive: settings.documentsActive ?? true,
        showSk: metadata.showSk ?? true,
        showPhoto: metadata.showPhoto ?? true,
        showSchool: metadata.showSchool ?? true,
        showExam: metadata.showExam ?? true,
        showRegency: metadata.showRegency ?? true,
        showProvince: metadata.showProvince ?? true,
        hiddenCategoryIds: categories
          .filter((item) => categoryVisibility.get(item.id) === false)
          .map((item) => item.id),
        hiddenDocumentIds: orderedDocuments
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
      documents: orderedDocuments.map((item) => ({
        ...item,
        active: item.isActive,
        type: item.fileType || "PDF",
        size:
          item.displaySize || (item.assetId ? "Tersedia" : "Belum ada file"),
        url: item.assetId ? TalentaMedia.url(item.assetId) : "",
      })),
      winnerCategories: categories.map((category) => ({
        ...category,
        active: category.isActive,
        winners: mappedWinners.filter(
          (winner) => winner.categoryId === category.id,
        ),
      })),
      skDocuments: decreeDocuments.map((document) => ({
        ...document,
        documentId: document.id,
        url: document.assetId ? TalentaMedia.url(document.assetId) : "",
      })),
      skDocument: decreeDocuments[0]
        ? { ...decreeDocuments[0], documentId: decreeDocuments[0].id }
        : null,
    };
  }

  async function save(event) {
    await TalentaApi.request(`/admin/events/${event.id}`, {
      method: "PATCH",
      body: { description: event.description || "" },
    });
    await TalentaApi.request(`/admin/events/${event.id}/detail-settings`, {
      method: "PUT",
      body: {
        archiveDisplayName: event.archiveDisplayName,
        description: event.description || "",
        decreeTitle: event.skBannerTitle || "SK Penetapan Pemenang",
        isActive: event.detail.active,
        winnersActive: event.detail.winnersActive,
        winnersEyebrow: event.detail.winnersEyebrow,
        winnersTitle: event.detail.winnersTitle,
        winnersDescription: event.detail.winnersDescription || "",
        documentsActive: event.detail.documentsActive,
        metadataVisibility: {
          showSk: event.detail.showSk,
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
  window.TalentaArchiveDetailApi = Object.freeze({
    load,
    save,
    uploadDocument,
  });
})();

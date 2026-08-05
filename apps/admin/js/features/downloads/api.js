(() => {
  const site = () => window.parent?.TalentaAdminAuth?.currentSite?.();
  const call = async (path, options) =>
    (await TalentaApi.request(path, options)).data;

  const formatSize = (bytes) =>
    `${(Number(bytes || 0) / 1024 / 1024).toFixed(2)} MB`;

  const mapDocument = (document) => ({
    ...document,
    active: document.isActive,
    type: document.fileType || "PDF",
    size:
      document.displaySize ||
      (document.assetId ? "Tersedia" : "Belum ada file"),
    url: document.assetId ? TalentaMedia.url(document.assetId) : "",
  });

  async function load() {
    const currentSite = site();
    if (!currentSite?.id)
      throw new TalentaApi.ApiError("Portal Admin belum dipilih", 400);
    const [competitions, config, page] = await Promise.all([
      call(`/admin/sites/${currentSite.id}/competitions`),
      call(`/admin/sites/${currentSite.id}/downloads`),
      call(`/admin/sites/${currentSite.id}/pages/download`),
    ]);
    const eligible = competitions.filter(
      (item) =>
        !item.deletedAt &&
        ((!item.inherited && item.lifecycle === "current") ||
          (item.inherited && item.publicationStatus === "published")),
    );
    const available = await Promise.all(
      eligible.map(async (competition) => ({
        ...competition,
        shortName: competition.shortName || competition.name,
        status: competition.publicationStatus,
        active: true,
        sourceKind: competition.inherited ? "archive" : "current",
        documents: (
          await call(`/admin/competitions/${competition.id}/documents`)
        ).map(mapDocument),
      })),
    );
    const configs = config.competitions
      .filter((item) =>
        available.some((source) => source.id === item.competitionId),
      )
      .map((item) => ({
        competitionId: item.competitionId,
        customTabName: item.customTabName,
        isDefault: item.isDefault,
        active: item.isActive,
        hiddenDocumentIds: item.documents
          .filter((doc) => !doc.isVisible)
          .map((doc) => doc.documentId),
        documentLabelOverrides: Object.fromEntries(
          item.documents
            .filter((doc) => doc.labelOverride)
            .map((doc) => [doc.documentId, doc.labelOverride]),
        ),
      }));
    const currentCompetition = available.find(
      (competition) => competition.sourceKind === "current",
    );
    if (
      currentCompetition &&
      !configs.some((item) => item.competitionId === currentCompetition.id)
    )
      configs.unshift(
        downloadCompetitionLink(
          currentCompetition.id,
          currentCompetition.shortName,
          true,
        ),
      );
    if (currentCompetition && !configs.some((item) => item.isDefault))
      configs.find(
        (item) => item.competitionId === currentCompetition.id,
      ).isDefault = true;
    return {
      available,
      currentCompetition,
      archiveSources: available.filter(
        (competition) => competition.sourceKind === "archive",
      ),
      configs,
      page,
    };
  }

  async function save(state) {
    const currentSite = site();
    const competitions = state.competitions.map((config) => {
      const competition = window.TalentaDownloadCompetitions.find(
        (item) => item.id === config.competitionId,
      );
      return {
        competitionId: config.competitionId,
        customTabName: config.customTabName || "",
        isDefault: config.isDefault,
        isActive: config.active,
        documents: (competition?.documents || []).map((document) => ({
          documentId: document.id,
          isVisible: !config.hiddenDocumentIds.includes(document.id),
          labelOverride: config.documentLabelOverrides[document.id] || "",
        })),
      };
    });
    await Promise.all([
      TalentaApi.request(`/admin/sites/${currentSite.id}/downloads`, {
        method: "PUT",
        body: { competitions },
      }),
      TalentaApi.request(`/admin/sites/${currentSite.id}/pages/download`, {
        method: "PUT",
        body: {
          isActive: state.active,
          eyebrow: state.eyebrow,
          title: state.title,
          description: state.description,
          alignment: state.alignment,
        },
      }),
    ]);
  }

  async function createCurrentDocument(competitionId, input, file) {
    const asset = await TalentaMedia.upload(file, { kind: "document" });
    const document = await call(
      `/admin/competitions/${competitionId}/documents`,
      {
        method: "POST",
        body: {
          title: input.title,
          category: input.category || "Dokumen",
          documentRole: "download",
          fileType: "PDF",
          displaySize: formatSize(asset.byteSize),
          assetId: asset.assetId,
          isActive: true,
          sortOrder: input.sortOrder || 0,
        },
      },
    );
    return mapDocument({
      id: document.id,
      title: input.title,
      category: input.category || "Dokumen",
      documentRole: "download",
      fileType: "PDF",
      displaySize: formatSize(asset.byteSize),
      assetId: asset.assetId,
      isActive: true,
      sortOrder: input.sortOrder || 0,
    });
  }

  async function updateCurrentDocument(competitionId, document, file) {
    let assetId = document.assetId;
    let displaySize = document.displaySize || document.size || "";
    if (file) {
      const asset = await TalentaMedia.upload(file, { kind: "document" });
      assetId = asset.assetId;
      displaySize = formatSize(asset.byteSize);
    }
    await call(
      `/admin/competitions/${competitionId}/documents/${document.id}`,
      {
        method: "PATCH",
        body: {
          title: document.title,
          category: document.category || "Dokumen",
          documentRole: document.documentRole || "download",
          fileType: document.fileType || document.type || "PDF",
          displaySize,
          assetId: assetId || undefined,
          isActive: document.active !== false,
          sortOrder: document.sortOrder || 0,
        },
      },
    );
    return mapDocument({
      ...document,
      assetId,
      displaySize,
      fileType: document.fileType || document.type || "PDF",
      isActive: document.active !== false,
    });
  }

  async function deleteCurrentDocument(competitionId, documentId) {
    await TalentaApi.request(
      `/admin/competitions/${competitionId}/documents/${documentId}`,
      { method: "DELETE" },
    );
  }

  window.TalentaDownloadApi = Object.freeze({
    load,
    save,
    createCurrentDocument,
    updateCurrentDocument,
    deleteCurrentDocument,
  });
})();

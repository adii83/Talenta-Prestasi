(() => {
  const event = () => window.parent?.TalentaAdminAuth?.currentEvent?.();
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

  const restoreDocumentOrder = (documents, tabConfig) => {
    if (!documents.length || !tabConfig?.documents?.length) return documents;
    const documentMap = new Map(documents.map((doc) => [doc.id, doc]));
    const ordered = [];
    const seenIds = new Set();
    tabConfig.documents.forEach((item) => {
      const doc = documentMap.get(item.documentId);
      if (doc && !seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        ordered.push(doc);
      }
    });
    documents.forEach((doc) => {
      if (!seenIds.has(doc.id)) {
        seenIds.add(doc.id);
        ordered.push(doc);
      }
    });
    return ordered;
  };

  async function load() {
    const current = event();
    if (!current?.id) {
      const fallback = getPublicDownloadState();
      const available = getDownloadCompetitions();
      return {
        available,
        currentCompetition: available[0] || null,
        archiveSources: available.slice(1),
        configs: fallback.competitions,
        page: {
          isActive: fallback.active,
          eyebrow: fallback.eyebrow,
          title: fallback.title,
          description: fallback.description,
          alignment: fallback.alignment,
        },
      };
    }
    const [documents, config, page] = await Promise.all([
      call(`/admin/events/${current.id}/documents`),
      call(`/admin/events/${current.id}/downloads`),
      call(`/admin/events/${current.id}/pages/download`),
    ]);
    const chosenTab =
      config.tabs.find((tab) => tab.isDefault) || config.tabs[0] || null;
    const orderedDocuments = restoreDocumentOrder(
      documents.map(mapDocument),
      chosenTab,
    );
    const source = {
      ...current,
      shortName: current.name,
      documents: orderedDocuments,
    };
    const configs = config.tabs.slice(0, 1).map((tab) => ({
      competitionId: current.id,
      tabId: tab.tabId,
      customTabName: tab.customTabName,
      isDefault: tab.isDefault,
      active: tab.isActive,
      hiddenDocumentIds: tab.documents
        .filter((doc) => !doc.isVisible)
        .map((doc) => doc.documentId),
      documentLabelOverrides: Object.fromEntries(
        tab.documents
          .filter((doc) => doc.labelOverride)
          .map((doc) => [doc.documentId, doc.labelOverride]),
      ),
    }));
    if (!configs.length)
      configs.push({
        competitionId: current.id,
        customTabName: current.name,
        isDefault: true,
        active: true,
        hiddenDocumentIds: [],
        documentLabelOverrides: {},
      });
    return {
      available: [source],
      currentCompetition: source,
      archiveSources: [],
      configs,
      page,
    };
  }

  async function save(state) {
    const current = event();
    const documents = window.TalentaDownloadCompetitions?.[0]?.documents || [];
    const tabs = state.competitions.map((config) => ({
      customTabName: config.customTabName || "",
      isDefault: config.isDefault,
      isActive: config.active,
      documents: documents.map((document) => ({
        documentId: document.id,
        isVisible: !config.hiddenDocumentIds.includes(document.id),
        labelOverride: config.documentLabelOverrides[document.id] || "",
      })),
    }));
    await Promise.all([
      TalentaApi.request(`/admin/events/${current.id}/downloads`, {
        method: "PUT",
        body: { tabs },
      }),
      TalentaApi.request(`/admin/events/${current.id}/pages/download`, {
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

  async function createCurrentDocument(_sourceId, input, file) {
    const current = event();
    const asset = await TalentaMedia.upload(file, { kind: "document" });
    return mapDocument(
      await call(`/admin/events/${current.id}/documents`, {
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
      }),
    );
  }

  async function updateCurrentDocument(_sourceId, document, file) {
    const current = event();
    let assetId = document.assetId;
    let displaySize = document.displaySize || document.size || "";
    if (file) {
      const asset = await TalentaMedia.upload(file, { kind: "document" });
      assetId = asset.assetId;
      displaySize = formatSize(asset.byteSize);
    }
    return mapDocument(
      await call(`/admin/events/${current.id}/documents/${document.id}`, {
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
      }),
    );
  }

  async function deleteCurrentDocument(_sourceId, documentId) {
    const current = event();
    await TalentaApi.request(
      `/admin/events/${current.id}/documents/${documentId}`,
      {
        method: "DELETE",
      },
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

(() => {
  const site = () => window.parent?.TalentaAdminAuth?.currentSite?.();
  const call = async (path, options) =>
    (await TalentaApi.request(path, options)).data;
  async function load() {
    const current = site();
    if (!current?.id)
      throw new TalentaApi.ApiError("Portal Admin belum dipilih", 400);
    const [competitions, config, page] = await Promise.all([
      call(`/admin/sites/${current.id}/competitions`),
      call(`/admin/sites/${current.id}/downloads`),
      call(`/admin/sites/${current.id}/pages/download`),
    ]);
    const available = await Promise.all(
      competitions
        .filter((item) => !item.deletedAt)
        .map(async (competition) => ({
          ...competition,
          shortName: competition.name,
          status: competition.publicationStatus,
          active: true,
          documents: (
            await call(`/admin/competitions/${competition.id}/documents`)
          ).map((document) => ({
            ...document,
            active: document.isActive,
            type: document.assetId ? "FILE" : "METADATA",
            size: document.assetId ? "Tersedia" : "Belum ada file",
            url: "#",
          })),
        })),
    );
    const configs = config.competitions.map((item) => ({
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
    return { available, configs, page };
  }
  async function save(state) {
    const current = site();
    const competitions = state.competitions.map((config) => {
      const competition = window.TalentaDownloadCompetitions.find(
        (item) => item.id === config.competitionId,
      );
      return {
        competitionId: config.competitionId,
        customTabName: config.customTabName || "",
        isDefault: config.isDefault,
        isActive: config.active,
        documents: competition.documents.map((document) => ({
          documentId: document.id,
          isVisible: !config.hiddenDocumentIds.includes(document.id),
          labelOverride: config.documentLabelOverrides[document.id] || "",
        })),
      };
    });
    await Promise.all([
      TalentaApi.request(`/admin/sites/${current.id}/downloads`, {
        method: "PUT",
        body: { competitions },
      }),
      TalentaApi.request(`/admin/sites/${current.id}/pages/download`, {
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
  window.TalentaDownloadApi = Object.freeze({ load, save });
})();

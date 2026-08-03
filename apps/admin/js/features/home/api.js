(() => {
  const site = () => window.parent?.TalentaAdminAuth?.currentSite?.();
  async function load() {
    const current = site();
    if (!current?.id)
      throw new TalentaApi.ApiError("Portal Admin belum dipilih", 400);
    const response = await TalentaApi.request(
      `/admin/sites/${current.id}/home`,
    );
    return Object.fromEntries(
      response.data.sections.map((section) => [
        section.sectionType,
        { ...section.settings, active: section.isActive },
      ]),
    );
  }
  async function save(state) {
    const current = site();
    const types = [
      "hero",
      "winnerHighlight",
      "schedule",
      "pricing",
      "benefit",
      "partners",
    ];
    const sections = types
      .filter((type) => state[type])
      .map((type) => {
        const settings = structuredClone(state[type]);
        const isActive = settings.active !== false;
        delete settings.active;
        return { sectionType: type, isActive, settings };
      });
    return TalentaApi.request(`/admin/sites/${current.id}/home`, {
      method: "PUT",
      body: { sections },
    });
  }
  window.TalentaHomeApi = Object.freeze({ load, save });
})();

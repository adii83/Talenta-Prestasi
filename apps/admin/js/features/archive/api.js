(() => {
  function currentEvent() {
    const value = window.parent?.TalentaAdminAuth?.currentEvent?.();
    if (!value?.id) throw new TalentaApi.ApiError("Event belum dipilih", 400);
    return value;
  }
  const list = async () => {
    let event;
    try {
      event = currentEvent();
    } catch {
      return typeof getPublicArchivedCompetitions === "function"
        ? getPublicArchivedCompetitions()
        : [];
    }
    if (!event.categoryId) return [];
    const rows = (
      await TalentaApi.request(`/admin/categories/${event.categoryId}/events`)
    ).data;
    return rows.filter((item) => !item.isActive && item.id !== event.id);
  };
  const savePage = (page) => {
    const event = currentEvent();
    return TalentaApi.request(`/admin/events/${event.id}/pages/archive`, {
      method: "PUT",
      body: page,
    });
  };
  const loadPage = async () => {
    try {
      const event = currentEvent();
      return (
        await TalentaApi.request(`/admin/events/${event.id}/pages/archive`)
      ).data;
    } catch {
      const page = getEffectiveArchivePage();
      return { ...page, isActive: page.active };
    }
  };
  window.TalentaArchiveApi = Object.freeze({ list, loadPage, savePage });
})();

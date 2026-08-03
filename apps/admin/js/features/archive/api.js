(() => {
  function site() {
    const value =
      window.parent?.TalentaAdminAuth?.currentSite?.() ||
      window.TalentaAdminAuth?.currentSite?.();
    if (!value?.id)
      throw new TalentaApi.ApiError("Portal Admin belum dipilih", 400);
    return value;
  }
  const list = async () =>
    (await TalentaApi.request(`/admin/sites/${site().id}/competitions`)).data;
  const create = async (item) =>
    (
      await TalentaApi.request(`/admin/sites/${site().id}/competitions`, {
        method: "POST",
        body: { name: item.name, slug: item.slug, lifecycle: "archived" },
      })
    ).data;
  const update = async (item) =>
    (
      await TalentaApi.request(`/admin/competitions/${item.id}`, {
        method: "PATCH",
        headers: { "If-Match": String(item.version) },
        body: {
          name: item.name,
          description: item.description || "",
          mascotAssetId: item.mascotAssetId || undefined,
        },
      })
    ).data;
  const publish = async (item) =>
    (
      await TalentaApi.request(`/admin/competitions/${item.id}/publish`, {
        method: "POST",
        headers: { "If-Match": String(item.version) },
      })
    ).data;
  const remove = async (item) =>
    TalentaApi.request(`/admin/competitions/${item.id}`, {
      method: "DELETE",
      headers: { "If-Match": String(item.version) },
    });
  window.TalentaArchiveApi = Object.freeze({
    list,
    create,
    update,
    publish,
    remove,
  });
})();

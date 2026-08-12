(() => {
  const site = () => window.parent?.TalentaAdminAuth?.currentSite?.();
  async function load() {
    const current = site();
    if (!current?.id)
      throw new TalentaApi.ApiError("Portal Admin belum dipilih", 400);
    const [faq, page] = await Promise.all([
      TalentaApi.request(`/admin/events/${current.id}/faq`),
      TalentaApi.request(`/admin/events/${current.id}/pages/faq`),
    ]);
    return { categories: faq.data.categories, page: page.data };
  }
  async function save(state) {
    const current = site();
    const [faq] = await Promise.all([
      TalentaApi.request(`/admin/events/${current.id}/faq`, {
        method: "PUT",
        body: {
          categories: state.categories.map((c) => ({
            ...c,
            id:
              c.id &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                c.id,
              )
                ? c.id
                : undefined,
            questions: (c.questions || []).map((q) => ({
              ...q,
              id:
                q.id &&
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                  q.id,
                )
                  ? q.id
                  : undefined,
            })),
          })),
        },
      }),
      TalentaApi.request(`/admin/events/${current.id}/pages/faq`, {
        method: "PUT",
        body: {
          isActive: state.page.active,
          eyebrow: state.page.eyebrow,
          title: state.page.title,
          description: state.page.description,
          alignment: state.page.alignment,
        },
      }),
    ]);
    return faq.data.categories;
  }
  window.TalentaFaqApi = Object.freeze({ load, save });
})();

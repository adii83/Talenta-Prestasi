(() => {
  const getSite = () => window.parent?.TalentaAdminAuth?.currentSite?.();
  const call = async (path, options) =>
    (await TalentaApi.request(path, options)).data;
  let competitionId = "";
  let originalCategoryIds = new Set();
  let originalWinnerIds = new Set();

  async function load() {
    const site = getSite();
    if (!site?.id)
      throw new TalentaApi.ApiError("Portal Admin belum dipilih", 400);
    const competitions = await call(`/admin/sites/${site.id}/competitions`);
    const competition =
      competitions.find(
        (item) => item.lifecycle === "current" && !item.deletedAt,
      ) || competitions.find((item) => !item.deletedAt);
    if (!competition)
      return {
        competition: null,
        state: { sk: { title: "", description: "", url: "" }, categories: [] },
        page: null,
      };
    competitionId = competition.id;
    const [categories, winners, page] = await Promise.all([
      call(`/admin/competitions/${competitionId}/winner-categories`),
      call(`/admin/competitions/${competitionId}/winners`),
      call(`/admin/sites/${site.id}/pages/winners`),
    ]);
    originalCategoryIds = new Set(categories.map((item) => item.id));
    originalWinnerIds = new Set(winners.map((item) => item.id));
    return {
      competition,
      state: {
        sk: { title: "", description: "", url: "" },
        categories: categories.map((category) => ({
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
      },
      page,
    };
  }

  async function save(state, page) {
    if (!competitionId)
      throw new TalentaApi.ApiError(
        "Belum ada lomba untuk menyimpan pemenang",
        400,
      );
    const currentCategories = new Set(
      state.categories
        .filter((item) => originalCategoryIds.has(item.id))
        .map((item) => item.id),
    );
    const currentWinners = new Set(
      state.categories
        .flatMap((category) => category.winners)
        .filter((item) => originalWinnerIds.has(item.id))
        .map((item) => item.id),
    );
    for (const id of [...originalWinnerIds].filter(
      (id) => !currentWinners.has(id),
    ))
      await TalentaApi.request(
        `/admin/competitions/${competitionId}/winners/${id}`,
        { method: "DELETE" },
      );
    for (const id of [...originalCategoryIds].filter(
      (id) => !currentCategories.has(id),
    ))
      await TalentaApi.request(
        `/admin/competitions/${competitionId}/winner-categories/${id}`,
        { method: "DELETE" },
      );
    for (const [categoryIndex, category] of state.categories.entries()) {
      const categoryBody = {
        name: category.name,
        rankPrefix: category.rankPrefix || "Juara",
        icon: category.icon || "trophy",
        isActive: category.active !== false,
        sortOrder: categoryIndex,
      };
      if (originalCategoryIds.has(category.id))
        await call(
          `/admin/competitions/${competitionId}/winner-categories/${category.id}`,
          { method: "PATCH", body: categoryBody },
        );
      else {
        const created = await call(
          `/admin/competitions/${competitionId}/winner-categories`,
          { method: "POST", body: categoryBody },
        );
        category.id = created.id;
      }
      for (const [winnerIndex, winner] of category.winners.entries()) {
        const winnerBody = {
          categoryId: category.id,
          fullName: winner.name,
          rankLabel: winner.rank || "",
          school: winner.school || "",
          examNumber: winner.exam || "",
          photoAssetId: winner.photoAssetId || undefined,
          isActive: winner.active !== false,
          sortOrder: winnerIndex,
        };
        if (originalWinnerIds.has(winner.id))
          await call(
            `/admin/competitions/${competitionId}/winners/${winner.id}`,
            { method: "PATCH", body: winnerBody },
          );
        else {
          const created = await call(
            `/admin/competitions/${competitionId}/winners`,
            { method: "POST", body: winnerBody },
          );
          winner.id = created.id;
        }
      }
    }
    const site = getSite();
    await call(`/admin/sites/${site.id}/pages/winners`, {
      method: "PUT",
      body: {
        isActive: page.active,
        eyebrow: page.eyebrow,
        title: page.title,
        description: page.description,
        alignment: page.alignment,
      },
    });
    originalCategoryIds = new Set(state.categories.map((item) => item.id));
    originalWinnerIds = new Set(
      state.categories.flatMap((item) => item.winners).map((item) => item.id),
    );
  }
  window.TalentaWinnerApi = Object.freeze({ load, save });
})();

(() => {
  const getSite = () => window.parent?.TalentaAdminAuth?.currentSite?.();
  const call = async (path, options) =>
    (await TalentaApi.request(path, options)).data;
  let competitionId = "";
  let originalCategoryIds = new Set();
  let originalWinnerIds = new Set();

  const defaultDecree = {
    title: "SK Penetapan Pemenang",
    description:
      "Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.",
  };
  const formatSize = (bytes) =>
    `${(Number(bytes || 0) / 1024 / 1024).toFixed(2)} MB`;

  async function loadWinnerData(competition) {
    const [categories, winners] = await Promise.all([
      call(`/admin/competitions/${competition.id}/winner-categories`),
      call(`/admin/competitions/${competition.id}/winners`),
    ]);
    return {
      ...competition,
      active: true,
      status: competition.publicationStatus,
      icon: competition.fallbackIcon || "archive",
      detail: { active: true },
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
            photo: winner.photoAssetId
              ? TalentaMedia.url(winner.photoAssetId)
              : "",
            active: winner.isActive,
          })),
      })),
    };
  }

  async function load() {
    const site = getSite();
    if (!site?.id)
      throw new TalentaApi.ApiError("Portal Admin belum dipilih", 400);
    const competitions = await call(`/admin/sites/${site.id}/competitions`);
    const competition =
      competitions.find(
        (item) =>
          !item.inherited && item.lifecycle === "current" && !item.deletedAt,
      ) || null;
    const archiveCompetitions = competitions.filter(
      (item) =>
        item.inherited &&
        item.lifecycle === "archived" &&
        item.publicationStatus === "published" &&
        !item.deletedAt,
    );
    if (!competition)
      return {
        competition: null,
        state: { sk: { title: "", description: "", url: "" }, categories: [] },
        page: null,
        archives: await Promise.all(archiveCompetitions.map(loadWinnerData)),
      };
    competitionId = competition.id;
    const [currentData, page, archives, decree] = await Promise.all([
      loadWinnerData(competition),
      call(`/admin/sites/${site.id}/pages/winners`),
      Promise.all(archiveCompetitions.map(loadWinnerData)),
      call(`/admin/competitions/${competition.id}/decree`),
    ]);
    const categories = currentData.winnerCategories;
    const winners = categories.flatMap((category) => category.winners);
    originalCategoryIds = new Set(categories.map((item) => item.id));
    originalWinnerIds = new Set(winners.map((item) => item.id));
    return {
      competition,
      state: {
        competitionId: competition.id,
        sk: {
          ...defaultDecree,
          ...decree,
          url: decree.assetId ? TalentaMedia.url(decree.assetId) : "",
        },
        categories,
      },
      page,
      archives,
    };
  }

  async function saveDecree(sk, file) {
    let asset;
    if (file) asset = await TalentaMedia.upload(file, { kind: "document" });
    const isDelete = !file && (sk.documentId === null || sk.assetId === null);
    const decree = await call(`/admin/competitions/${competitionId}/decree`, {
      method: "PUT",
      body: {
        title: sk.title || defaultDecree.title,
        description: sk.description || defaultDecree.description,
        assetId: isDelete ? null : asset?.assetId,
        fileType: asset ? "PDF" : isDelete ? null : undefined,
        displaySize: asset ? formatSize(asset.byteSize) : isDelete ? null : undefined,
        deleteFile: isDelete,
      },
    });
    return {
      ...defaultDecree,
      ...decree,
      url: decree.assetId ? TalentaMedia.url(decree.assetId) : "",
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
          regency: winner.regency || "",
          province: winner.province || "",
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
        showDecree: page.showSk,
        metadataVisibility: {
          showPhoto: page.showPhoto,
          showSchool: page.showSchool,
          showExam: page.showExam,
          showRegency: page.showRegency,
          showProvince: page.showProvince,
        },
        archiveActive: page.archiveActive,
        archiveLimit: page.archiveLimit,
      },
    });
    originalCategoryIds = new Set(state.categories.map((item) => item.id));
    originalWinnerIds = new Set(
      state.categories.flatMap((item) => item.winners).map((item) => item.id),
    );
    return { sk: await saveDecree(state.sk) };
  }
  window.TalentaWinnerApi = Object.freeze({ load, save, saveDecree });
})();

(() => {
  const getEvent = () => window.parent?.TalentaAdminAuth?.currentEvent?.();
  const call = async (path, options) =>
    (await TalentaApi.request(path, options)).data;
  let eventId = "";
  let originalCategoryIds = new Set();
  let originalWinnerIds = new Set();
  const defaultDecree = {
    title: "SK Penetapan Pemenang",
    description:
      "Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.",
  };
  const formatSize = (bytes) =>
    `${(Number(bytes || 0) / 1024 / 1024).toFixed(2)} MB`;

  function formatWinnerEventName(event) {
    if (!event.periodYear) return event.name || "Ajang Talenta";
    const period = `${event.name || "Ajang Talenta"} ${event.periodYear}`;
    return event.batchLabel && event.batchNumber
      ? `${period} · ${event.batchLabel} ${event.batchNumber}`
      : event.batchNumber && event.batchNumber > 1
        ? `${period} · Gelombang ${event.batchNumber}`
        : period;
  }

  async function loadWinnerData(event) {
    const [categories, winners] = await Promise.all([
      call(`/admin/events/${event.id}/winner-categories`),
      call(`/admin/events/${event.id}/winners`),
    ]);
    const mappedWinners = await Promise.all(
      winners.map(async (winner) => ({
        ...winner,
        name: winner.fullName || "",
        rank: winner.rankLabel || "",
        exam: winner.examNumber || "",
        district: winner.district || "",
        photoAssetId: winner.photoAssetId || null,
        photo:
          winner.photoUrl ||
          (winner.photoAssetId
            ? TalentaMedia.url(winner.photoAssetId)
            : winner.photo || ""),
        displayMode: winner.displayMode || "built_in",
        designAssetId: winner.designAssetId || null,
        design: winner.designAssetId
          ? await TalentaMedia.adminPreviewUrl(winner.designAssetId, {
              siteId: event.id,
            })
          : "",
        active: winner.isActive,
      })),
    );
    return {
      ...event,
      name: event.archiveDisplayName || formatWinnerEventName(event),
      active: true,
      status: event.isActive ? "active" : "archive",
      icon: event.fallbackIcon || "archive",
      iconMode: event.mascotAssetId ? "upload" : "library",
      uploadedIcon: event.mascotAssetId
        ? await TalentaMedia.adminPreviewUrl(event.mascotAssetId, {
            siteId: event.id,
          })
        : "",
      iconAlt: `Logo atau maskot ${event.name || "lomba"}`,
      detail: { active: true },
      winnerCategories: categories.map((category) => ({
        ...category,
        active: category.isActive,
        winners: mappedWinners.filter(
          (winner) => winner.categoryId === category.id,
        ),
      })),
    };
  }

  async function load() {
    const event = getEvent();
    if (!event?.id) {
      const fallback = getPublicWinnerState();
      const current =
        typeof getActiveCompetition === "function"
          ? getActiveCompetition()
          : null;
      return {
        competition: current,
        state: fallback.manager,
        page: fallback.page,
        archives: fallback.archives,
      };
    }
    eventId = event.id;
    const categoryEvents = event.categoryId
      ? await call(`/admin/categories/${event.categoryId}/events`)
      : [];
    const archivedEvents = categoryEvents.filter((item) => {
      if (item.id === event.id) return false;
      const itemYear = item.periodYear || 0;
      const currentYear = event.periodYear || 0;
      if (itemYear < currentYear) return true;
      if (itemYear === currentYear) {
        return (item.batchNumber || 1) < (event.batchNumber || 1);
      }
      return false;
    });
    const [currentData, page, archives, decree] = await Promise.all([
      loadWinnerData(event),
      call(`/admin/events/${event.id}/pages/winners`),
      Promise.all(archivedEvents.map(loadWinnerData)),
      call(`/admin/events/${event.id}/decree`),
    ]);
    const categories = currentData.winnerCategories;
    originalCategoryIds = new Set(categories.map((item) => item.id));
    originalWinnerIds = new Set(
      categories.flatMap((category) => category.winners).map((item) => item.id),
    );
    return {
      competition: event,
      state: {
        competitionId: event.id,
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
    const decree = await call(`/admin/events/${eventId}/decree`, {
      method: "PUT",
      body: {
        title: sk.title || defaultDecree.title,
        description: sk.description || defaultDecree.description,
        assetId: isDelete ? undefined : asset?.assetId,
        fileType: asset ? "PDF" : undefined,
        displaySize: asset ? formatSize(asset.byteSize) : undefined,
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
    if (!eventId) throw new TalentaApi.ApiError("Event belum dipilih", 400);
    for (const category of state.categories) {
      for (const winner of category.winners) {
        if (!winner.displayMode)
          throw new TalentaApi.ApiError("Pilih jenis tampilan pemenang.", 400);
        if (winner.displayMode === "custom" && !winner.designAssetId)
          throw new TalentaApi.ApiError(
            `${winner.rank || "Pemenang"}: unggah gambar desain sendiri.`,
            400,
          );
        if (winner.displayMode === "built_in" && !winner.name?.trim())
          throw new TalentaApi.ApiError(
            `${winner.rank || "Pemenang"}: nama lengkap wajib diisi.`,
            400,
          );
      }
    }
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
      await TalentaApi.request(`/admin/events/${eventId}/winners/${id}`, {
        method: "DELETE",
      });
    for (const id of [...originalCategoryIds].filter(
      (id) => !currentCategories.has(id),
    ))
      await TalentaApi.request(
        `/admin/events/${eventId}/winner-categories/${id}`,
        {
          method: "DELETE",
        },
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
          `/admin/events/${eventId}/winner-categories/${category.id}`,
          {
            method: "PATCH",
            body: categoryBody,
          },
        );
      else {
        const created = await call(
          `/admin/events/${eventId}/winner-categories`,
          {
            method: "POST",
            body: categoryBody,
          },
        );
        category.id = created.id;
      }
      for (const [winnerIndex, winner] of category.winners.entries()) {
        const winnerBody = {
          categoryId: category.id,
          displayMode: winner.displayMode,
          designAssetId: winner.designAssetId ?? null,
          fullName: winner.name || null,
          rankLabel: winner.rank || "",
          school: winner.school || null,
          examNumber: winner.exam || null,
          district: winner.district || null,
          regency: winner.regency || null,
          province: winner.province || null,
          photoAssetId: winner.photoAssetId ?? null,
          isActive: winner.active !== false,
          sortOrder: winnerIndex,
        };
        if (originalWinnerIds.has(winner.id))
          await call(`/admin/events/${eventId}/winners/${winner.id}`, {
            method: "PATCH",
            body: winnerBody,
          });
        else {
          const created = await call(`/admin/events/${eventId}/winners`, {
            method: "POST",
            body: winnerBody,
          });
          winner.id = created.id;
        }
      }
    }
    await call(`/admin/events/${eventId}/pages/winners`, {
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

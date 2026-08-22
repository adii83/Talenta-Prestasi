/* Resolver, normalizer, dan markup bersama untuk Arsip serta Detail Arsip. */
const ARCHIVE_STATE_KEY = "talenta_archive_manager_v2";
const ARCHIVE_LEGACY_KEY = "talenta_archive_manager_v1";

function archiveClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function archiveReadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (error) {
    console.warn(`State ${key} tidak valid; baseline digunakan.`, error);
    return null;
  }
}

function archiveString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function archiveEscape(value = "") {
  return String(value).replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
  );
}

function archiveSafeUrl(value = "", fallback = "#") {
  const source = String(value).trim();
  return source && !/^(?:javascript|vbscript):/i.test(source)
    ? source
    : fallback;
}

function archiveInitials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function archiveDetailDefaults() {
  return {
    active: true,
    winnersActive: true,
    winnersEyebrow: "Hasil Ajang Talenta",
    winnersTitle: "Daftar Pemenang",
    winnersDescription: "",
    showSk: true,
    documentsActive: true,
    documentsEyebrow: "Dokumen",
    documentsTitle: "Dokumen Terkait",
    hiddenCategoryIds: [],
    hiddenDocumentIds: [],
    documentLabelOverrides: {},
  };
}

function normalizeArchivePage(source) {
  const baseline = {
    active: true,
    eyebrow: "Arsip",
    title: "Arsip Ajang Talenta",
    description:
      "Lihat catatan dan hasil dari ajang talenta yang telah berlangsung di tahun-tahun sebelumnya.",
    alignment: "center",
    action: "Lihat Detail",
  };
  const page = { ...baseline, ...(source || {}) };
  return {
    active: page.active !== false,
    eyebrow: archiveString(page.eyebrow, baseline.eyebrow),
    title: archiveString(page.title, baseline.title),
    description: archiveString(page.description, baseline.description),
    alignment: page.alignment === "left" ? "left" : "center",
    action: archiveString(page.action, baseline.action),
  };
}

function normalizeArchiveCompetition(source) {
  const id = archiveString(source?.id);
  if (!id || !/^[a-z0-9][a-z0-9_-]*$/i.test(id)) return null;
  const categoryIds = new Set();
  const winnerIds = new Set();
  const documentIds = new Set();
  const winnerCategories = (
    Array.isArray(source.winnerCategories) ? source.winnerCategories : []
  )
    .filter((category) => {
      const categoryId = archiveString(category?.id);
      if (!categoryId || categoryIds.has(categoryId)) return false;
      categoryIds.add(categoryId);
      return true;
    })
    .map((category) => ({
      id: archiveString(category.id),
      name: archiveString(category.name, "Kategori Pemenang"),
      icon: /^[a-z0-9-]+$/i.test(category.icon || "")
        ? category.icon
        : "trophy",
      active: category.active !== false,
      winners: (Array.isArray(category.winners) ? category.winners : [])
        .filter((winner) => {
          const winnerId = archiveString(winner?.id);
          if (!winnerId || winnerIds.has(winnerId)) return false;
          winnerIds.add(winnerId);
          return true;
        })
        .map((winner) => ({
          id: archiveString(winner.id),
          rank: archiveString(winner.rank),
          displayMode: winner.displayMode === "custom" ? "custom" : "built_in",
          designAssetId: archiveString(winner.designAssetId) || null,
          design: archiveSafeUrl(winner.design || winner.designUrl || "", ""),
          name: archiveString(winner.name),
          school: archiveString(winner.school),
          exam: archiveString(winner.exam),
          district: archiveString(winner.district),
          regency: archiveString(winner.regency),
          province: archiveString(winner.province),
          photoAssetId: archiveString(winner.photoAssetId) || null,
          photo: archiveSafeUrl(winner.photo || winner.photoUrl || "", ""),
          active: winner.active !== false,
        })),
    }));
  const documents = (Array.isArray(source.documents) ? source.documents : [])
    .filter((document) => {
      const documentId = archiveString(document?.id);
      if (!documentId || documentIds.has(documentId)) return false;
      documentIds.add(documentId);
      return true;
    })
    .map((document) => ({
      id: archiveString(document.id),
      title: archiveString(document.title, "Dokumen"),
      category: archiveString(document.category, "Dokumen"),
      documentRole: archiveString(document.documentRole, "general"),
      defaultDownloadLabel: archiveString(document.defaultDownloadLabel),
      assetId: archiveString(document.assetId) || null,
      type: archiveString(document.type, "PDF"),
      size: archiveString(document.size),
      url: archiveSafeUrl(document.url || ""),
      icon: /^[a-z0-9-]+$/i.test(document.icon || "")
        ? document.icon
        : "file-text",
      active: document.active !== false,
    }));

  const detailSource = {
    ...archiveDetailDefaults(),
    ...(source.detail || {}),
  };
  const hiddenCategoryIds = [
    ...new Set(
      (detailSource.hiddenCategoryIds || []).filter((categoryId) =>
        categoryIds.has(categoryId),
      ),
    ),
  ];
  const hiddenDocumentIds = [
    ...new Set(
      (detailSource.hiddenDocumentIds || []).filter((documentId) =>
        documentIds.has(documentId),
      ),
    ),
  ];
  const documentLabelOverrides = Object.fromEntries(
    Object.entries(detailSource.documentLabelOverrides || {})
      .filter(
        ([documentId, label]) =>
          documentIds.has(documentId) &&
          typeof label === "string" &&
          label.trim(),
      )
      .map(([documentId, label]) => [documentId, label.trim()]),
  );
  const detail = {
    active: detailSource.active !== false,
    winnersActive: detailSource.winnersActive !== false,
    winnersEyebrow: archiveString(
      detailSource.winnersEyebrow,
      "Hasil Ajang Talenta",
    ),
    winnersTitle: archiveString(detailSource.winnersTitle, "Daftar Pemenang"),
    winnersDescription: archiveString(detailSource.winnersDescription),
    showSk: detailSource.showSk !== false,
    documentsActive: detailSource.documentsActive !== false,
    documentsEyebrow: archiveString(detailSource.documentsEyebrow, "Dokumen"),
    documentsTitle: archiveString(
      detailSource.documentsTitle,
      "Dokumen Terkait",
    ),
    hiddenCategoryIds,
    hiddenDocumentIds,
    documentLabelOverrides,
  };

  let skDocument = null;
  if (source.skDocument) {
    const sourceSk = source.skDocument;
    let documentId = archiveString(sourceSk.documentId);
    if (!documentIds.has(documentId)) {
      const match = documents.find(
        (document) =>
          document.category === "SK Pemenang" ||
          document.title === sourceSk.title,
      );
      documentId = match?.id || "";
    }
    const linked = documents.find((document) => document.id === documentId);
    skDocument = linked
      ? {
          ...linked,
          documentId: linked.id,
          title: archiveString(sourceSk.title, linked.title),
          description: archiveString(sourceSk.description),
        }
      : {
          title: archiveString(sourceSk.title, "SK Penetapan Pemenang"),
          description: archiveString(sourceSk.description),
          url: archiveSafeUrl(sourceSk.url || ""),
          type: archiveString(sourceSk.type, "PDF"),
          size: archiveString(sourceSk.size),
        };
  }

  return {
    id,
    name: archiveString(source.name, "Ajang Talenta"),
    shortName: archiveString(source.shortName, source.name || "Ajang Talenta"),
    status: ["published", "draft", "disabled"].includes(source.status)
      ? source.status
      : "published",
    icon: /^[a-z0-9-]+$/i.test(source.icon || "") ? source.icon : "archive",
    iconMode:
      source.iconMode === "upload" && source.uploadedIcon
        ? "upload"
        : "library",
    uploadedIcon: archiveSafeUrl(source.uploadedIcon || "", ""),
    iconAlt: archiveString(source.iconAlt),
    description: archiveString(source.description),
    active: source.active !== false,
    skBannerTitle: archiveString(source.skBannerTitle, "SK Penetapan Pemenang"),
    detail,
    winnerCategories,
    documents,
    skDocument,
  };
}

function archiveBaseline() {
  return (
    typeof getArchivedCompetitions === "function"
      ? getArchivedCompetitions()
      : []
  )
    .map(normalizeArchiveCompetition)
    .filter(Boolean);
}

function archiveStateBaseline() {
  const competitions = archiveBaseline();
  return {
    version: 2,
    page: normalizeArchivePage(),
    order: competitions.map((competition) => competition.id),
    competitions: Object.fromEntries(
      competitions.map((competition) => [competition.id, competition]),
    ),
    removedCompetitionIds: [],
  };
}

function normalizeArchiveState(source) {
  if (!source || source.version !== 2) return archiveStateBaseline();
  const competitions = {};
  Object.entries(source.competitions || {}).forEach(([key, value]) => {
    const normalized = normalizeArchiveCompetition({
      ...value,
      id: value?.id || key,
    });
    if (normalized && !competitions[normalized.id])
      competitions[normalized.id] = normalized;
  });
  const removedCompetitionIds = [
    ...new Set(
      (source.removedCompetitionIds || [])
        .map((id) => archiveString(id))
        .filter(Boolean),
    ),
  ];
  const knownIds = new Set([
    ...archiveBaseline().map((competition) => competition.id),
    ...Object.keys(competitions),
  ]);
  const order = [
    ...new Set((source.order || []).filter((id) => knownIds.has(id))),
  ];
  return {
    version: 2,
    page: normalizeArchivePage(source.page),
    order,
    competitions,
    removedCompetitionIds,
  };
}

function migrateArchiveLegacy() {
  const legacy = archiveReadJson(ARCHIVE_LEGACY_KEY);
  if (!legacy?.items) return null;
  const state = normalizeArchiveState({
    version: 2,
    page: legacy,
    order: legacy.items.map((item) => item.id).filter(Boolean),
    competitions: Object.fromEntries(
      legacy.items.filter((item) => item?.id).map((item) => [item.id, item]),
    ),
    removedCompetitionIds: [],
  });
  saveArchiveAdminState(state);
  return state;
}

function getArchiveAdminState() {
  return normalizeArchiveState(
    archiveReadJson(ARCHIVE_STATE_KEY) ||
      migrateArchiveLegacy() ||
      archiveStateBaseline(),
  );
}

function getEffectiveArchivedCompetitions() {
  const state = getArchiveAdminState();
  const removed = new Set(state.removedCompetitionIds);
  const map = new Map(
    archiveBaseline()
      .filter((competition) => !removed.has(competition.id))
      .map((competition) => [competition.id, competition]),
  );
  Object.values(state.competitions || {}).forEach((competition) => {
    if (!removed.has(competition.id)) map.set(competition.id, competition);
  });
  const ordered = state.order.map((id) => map.get(id)).filter(Boolean);
  const seen = new Set(ordered.map((competition) => competition.id));
  return archiveClone([
    ...ordered,
    ...[...map.values()].filter((competition) => !seen.has(competition.id)),
  ]);
}

function getEffectiveCompetitionById(id) {
  if (!id) return null;
  return (
    getEffectiveArchivedCompetitions().find(
      (competition) => competition.id === id,
    ) || null
  );
}

function resolvePublicArchivedCompetitions(source) {
  return archiveClone(
    (source || []).filter(
      (competition) =>
        competition.status === "published" &&
        competition.active !== false &&
        competition.detail?.active !== false,
    ),
  );
}

function getPublicArchivedCompetitions() {
  return resolvePublicArchivedCompetitions(getEffectiveArchivedCompetitions());
}

function getPublicArchiveCompetitionById(id) {
  return (
    getPublicArchivedCompetitions().find(
      (competition) => competition.id === id,
    ) || null
  );
}

function getArchiveSkDocument(competition) {
  const decrees = (competition?.documents || [])
    .filter((document) => document.documentRole === "winner_decree")
    .map((document) => ({
      ...document,
      ...(document.id === competition.skDocument?.documentId
        ? competition.skDocument
        : {}),
      documentId: document.id,
    }));
  if (decrees.length > 1) return decrees;
  if (decrees.length === 1) return decrees[0];
  if (!competition?.skDocument) return null;
  const linked = competition.documents?.find(
    (document) => document.id === competition.skDocument.documentId,
  );
  return linked
    ? { ...linked, ...competition.skDocument, documentId: linked.id }
    : archiveClone(competition.skDocument);
}

function saveArchiveAdminState(state) {
  const normalized = normalizeArchiveState(state);
  localStorage.setItem(ARCHIVE_STATE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent("talenta:archive", { detail: archiveClone(normalized) }),
  );
  return archiveClone(normalized);
}

function resetArchiveAdminState() {
  localStorage.removeItem(ARCHIVE_STATE_KEY);
  localStorage.removeItem(ARCHIVE_LEGACY_KEY);
  const baseline = getArchiveAdminState();
  window.dispatchEvent(
    new CustomEvent("talenta:archive", { detail: archiveClone(baseline) }),
  );
  return baseline;
}

function getEffectiveArchivePage() {
  return getArchiveAdminState().page;
}

function resolveArchiveDetailState(competition) {
  if (!competition) return null;
  const detail = competition.detail || archiveDetailDefaults();
  const categories = (competition.winnerCategories || [])
    .filter(
      (category) =>
        category.active !== false &&
        !detail.hiddenCategoryIds.includes(category.id),
    )
    .map((category) => ({
      ...category,
      winners: (category.winners || []).filter(
        (winner) => winner.active !== false,
      ),
    }))
    .filter((category) => category.winners.length);
  const documents = (competition.documents || [])
    .filter(
      (document) =>
        document.active !== false &&
        !detail.hiddenDocumentIds.includes(document.id),
    )
    .map((document) => ({
      ...document,
      title: detail.documentLabelOverrides[document.id] || document.title,
    }));
  return {
    competition: archiveClone(competition),
    detail: archiveClone(detail),
    categories: archiveClone(categories),
    documents: archiveClone(documents),
    sk: getArchiveSkDocument(competition),
  };
}

function buildArchiveIconMarkup(competition) {
  if (competition.iconMode === "upload" && competition.uploadedIcon)
    return `<img class="archive-card__uploaded-icon" src="${archiveEscape(competition.uploadedIcon)}" alt="${archiveEscape(competition.iconAlt || "Logo atau maskot lomba")}">`;
  return `<i data-lucide="${archiveEscape(competition.icon || "archive")}"></i>`;
}

function buildArchiveListMarkup(page, competitions, options = {}) {
  const archiveHref =
    typeof options.archiveHref === "function" ? options.archiveHref : () => "#";
  const leftClass = page.alignment === "left" ? " section__header--left" : "";
  return `<section class="section" id="arsip"><div class="container"><div class="section__header${leftClass}"><p class="t-eyebrow">${archiveEscape(page.eyebrow)}</p><h1 class="t-h1">${archiveEscape(page.title)}</h1><p>${archiveEscape(page.description)}</p></div>${competitions.length ? `<div class="grid grid--3">${competitions.map((competition) => `<a href="${archiveEscape(archiveSafeUrl(archiveHref(competition)))}" class="lomba-card"><div class="lomba-card__thumb">${buildArchiveIconMarkup(competition)}</div><div class="lomba-card__body"><h2 class="lomba-card__title">${archiveEscape(competition.name)}</h2><span class="lomba-card__action">${archiveEscape(page.action)} <i data-lucide="arrow-right"></i></span></div></a>`).join("")}</div>` : '<div class="public-empty-state"><i data-lucide="archive-x"></i><h2 class="t-h2">Belum ada arsip</h2><p>Belum ada ajang terdahulu yang dipublikasikan.</p></div>'}</div></section>`;
}

function buildArchiveWinnerCardMarkup(winner) {
  return buildWinnerCardMarkup(winner);
}

function buildArchiveDetailMarkup(source, options = {}) {
  const { competition, detail, categories, documents, sk } = source;
  const archiveHref =
    typeof options.archiveHref === "function" ? options.archiveHref() : "#";
  const decrees = (Array.isArray(sk) ? sk : [sk]).filter(
    (decree) => decree?.title && decree?.url,
  );
  const decreeMarkup = decrees.length
    ? `<section class="winner-decrees"><h3 class="winner-decrees__title">${archiveEscape(competition.skBannerTitle || "SK Penetapan Pemenang")}</h3><span class="winner-decrees__ornament" aria-hidden="true"><i></i><i></i><i></i><b></b></span><div class="winner-decrees__actions">${decrees.map((decree) => `<a href="${archiveEscape(archiveSafeUrl(decree.url || ""))}" class="winner-decrees__download" target="_blank" rel="noopener"><i data-lucide="file-down"></i><span>${archiveEscape(decree.defaultDownloadLabel || decree.title)}</span></a>`).join("")}</div></section>`
    : "";
  const winnersSection =
    detail.winnersActive &&
    (categories.length || (detail.showSk && decrees.length))
      ? `<section class="section" id="pemenang"><div class="container"><div class="section__header section__header--left"><p class="t-eyebrow">${archiveEscape(detail.winnersEyebrow)}</p><h2 class="t-h2">${archiveEscape(detail.winnersTitle)}</h2>${detail.winnersDescription ? `<p>${archiveEscape(detail.winnersDescription)}</p>` : ""}</div>${categories.length ? `<div class="winner-section">${categories.map((category) => `<section class="winner-group"><h3 class="winner-group__title"><i data-lucide="${archiveEscape(category.icon || "trophy")}"></i>${archiveEscape(category.name)}<span class="badge badge--gold">${category.winners.length} Pemenang</span></h3><div class="champion-grid">${category.winners.map((winner) => buildArchiveWinnerCardMarkup(winner)).join("")}</div></section>`).join("")}</div>` : '<div class="public-empty-state public-empty-state--compact"><p>Belum ada pemenang yang dipublikasikan.</p></div>'}${detail.showSk ? decreeMarkup : ""}</div></section>`
      : "";
  const documentsSection =
    detail.documentsActive && documents.length
      ? `<section class="section section--soft" id="dokumen-terkait"><div class="container"><div class="section__header section__header--left"><p class="t-eyebrow">${archiveEscape(detail.documentsEyebrow)}</p><h2 class="t-h2">${archiveEscape(detail.documentsTitle)}</h2></div><div class="doc-list">${documents.map((document) => `<article class="doc-card" data-category="${archiveEscape(document.category || "")}"><div class="doc-card__icon"><i data-lucide="${archiveEscape(document.icon || "file-text")}"></i></div><div class="doc-card__info"><p class="doc-card__name">${archiveEscape(document.title)} <span class="doc-card__tag">${archiveEscape(document.category || "Dokumen")}</span></p><p class="doc-card__size">${archiveEscape(document.type || "PDF")} · <span class="t-mono">${archiveEscape(document.size || "-")}</span></p></div><div class="doc-card__download"><a href="${archiveEscape(archiveSafeUrl(document.url || ""))}" class="btn btn--outline btn--sm"><i data-lucide="download"></i>Unduh</a></div></article>`).join("")}</div></div></section>`
      : "";
  return `<section class="lomba-banner"><div class="lomba-banner__content"><h1 class="lomba-banner__title">${archiveEscape(competition.name)}</h1><p class="lomba-banner__desc">${archiveEscape(competition.description || "")}</p></div></section><nav class="archive-detail-breadcrumb" aria-label="Breadcrumb"><div class="container"><p class="t-caption"><a href="${archiveEscape(archiveSafeUrl(archiveHref))}">Arsip</a><span aria-hidden="true">/</span><span>${archiveEscape(competition.name)}</span></p></div></nav>${winnersSection}${documentsSection}`;
}

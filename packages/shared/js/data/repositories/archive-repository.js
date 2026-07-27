/* Resolver bersama untuk data Arsip efektif.
   Baseline tetap MOCK_ARCHIVE_DATABASE; localStorage hanya menyimpan override demo versi 2. */
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

function archiveDetailDefaults() {
  return {
    active: true,
    winnersActive: true,
    winnersEyebrow: "Hasil Ajang Talenta",
    winnersTitle: "Daftar Pemenang",
    showSk: true,
    documentsActive: true,
    documentsEyebrow: "Dokumen",
    documentsTitle: "Dokumen Terkait",
    showPhoto: true,
    showSchool: true,
    showExam: true,
    showDistrict: true,
    showRegency: true,
    showProvince: true,
    hiddenCategoryIds: [],
    hiddenDocumentIds: [],
    documentLabelOverrides: {},
  };
}

function normalizeArchiveCompetition(source, index = 0) {
  if (!source || !source.id) return null;
  const gradients = [
    "linear-gradient(135deg,#1E4B8C 0%,#10233F 100%)",
    "linear-gradient(135deg,#10233F 0%,#2a5fa8 100%)",
    "linear-gradient(135deg,#1E4B8C 0%,#10233F 100%)",
    "linear-gradient(135deg,#2a5fa8 0%,#1E4B8C 100%)",
  ];
  const competition = archiveClone(source);
  competition.active = competition.active !== false;
  competition.gradient =
    competition.gradient || gradients[index % gradients.length];
  competition.detail = {
    ...archiveDetailDefaults(),
    ...(competition.detail || {}),
  };
  competition.detail.active = competition.detail.active !== false;
  competition.detail.hiddenCategoryIds = [
    ...new Set(competition.detail.hiddenCategoryIds || []),
  ];
  competition.detail.hiddenDocumentIds = [
    ...new Set(competition.detail.hiddenDocumentIds || []),
  ];
  competition.detail.documentLabelOverrides =
    competition.detail.documentLabelOverrides || {};
  competition.winnerCategories = (competition.winnerCategories || [])
    .filter(Boolean)
    .map((category) => ({
      ...category,
      active: category.active !== false,
      winners: (category.winners || [])
        .filter(Boolean)
        .map((winner) => ({ ...winner, active: winner.active !== false })),
    }));
  competition.documents = (competition.documents || [])
    .filter(Boolean)
    .map((document) => ({
      ...document,
      type: document.type || "PDF",
      active: document.active !== false,
    }));
  if (competition.skDocument) {
    const sk = { ...competition.skDocument };
    if (!sk.documentId) {
      const match = competition.documents.find(
        (document) =>
          document.category === "SK Pemenang" || document.title === sk.title,
      );
      if (match) sk.documentId = match.id;
    }
    const linked = competition.documents.find(
      (document) => document.id === sk.documentId,
    );
    competition.skDocument = linked
      ? {
          ...sk,
          ...linked,
          documentId: linked.id,
          description: sk.description || "",
        }
      : sk;
  }
  return competition;
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

function migrateArchiveLegacy() {
  const legacy = archiveReadJson(ARCHIVE_LEGACY_KEY);
  if (!legacy?.items) return null;
  const state = {
    version: 2,
    page: {
      active: legacy.active !== false,
      eyebrow: legacy.eyebrow || "Arsip",
      title: legacy.title || "Arsip Ajang Talenta",
      description: legacy.description || "",
      alignment: legacy.alignment || "center",
      action: legacy.action || "Lihat Detail",
    },
    order: legacy.items.map((item) => item.id).filter(Boolean),
    competitions: {},
  };
  legacy.items.forEach((item, index) => {
    const normalized = normalizeArchiveCompetition(item, index);
    if (normalized) state.competitions[normalized.id] = normalized;
  });
  saveArchiveAdminState(state);
  return state;
}

function getArchiveAdminState() {
  const saved = archiveReadJson(ARCHIVE_STATE_KEY) || migrateArchiveLegacy();
  if (saved?.version === 2) return archiveClone(saved);
  const baseline = archiveBaseline();
  return {
    version: 2,
    page: {
      active: true,
      eyebrow: "Arsip",
      title: "Arsip Ajang Talenta",
      description:
        "Lihat catatan dan hasil dari ajang talenta yang telah berlangsung di tahun-tahun sebelumnya.",
      alignment: "center",
      action: "Lihat Detail",
    },
    order: baseline.map((competition) => competition.id),
    competitions: Object.fromEntries(
      baseline.map((competition) => [competition.id, competition]),
    ),
  };
}

function getEffectiveArchivedCompetitions() {
  const state = getArchiveAdminState();
  const map = new Map(
    archiveBaseline().map((competition) => [competition.id, competition]),
  );
  Object.entries(state.competitions || {}).forEach(([id, source], index) => {
    const normalized = normalizeArchiveCompetition(
      { ...source, id: source.id || id },
      index,
    );
    if (normalized) map.set(id, normalized);
  });
  const ordered = (state.order || []).map((id) => map.get(id)).filter(Boolean);
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

function getPublicArchivedCompetitions() {
  return getEffectiveArchivedCompetitions().filter(
    (competition) =>
      competition.status === "published" &&
      competition.active !== false &&
      competition.detail?.active !== false,
  );
}

function getPublicArchiveCompetitionById(id) {
  return (
    getPublicArchivedCompetitions().find(
      (competition) => competition.id === id,
    ) || null
  );
}

function getArchiveSkDocument(competition) {
  if (!competition?.skDocument) return null;
  const linked = competition.documents?.find(
    (document) => document.id === competition.skDocument.documentId,
  );
  return linked
    ? { ...competition.skDocument, ...linked, documentId: linked.id }
    : archiveClone(competition.skDocument);
}

function saveArchiveAdminState(state) {
  localStorage.setItem(
    ARCHIVE_STATE_KEY,
    JSON.stringify({ ...archiveClone(state), version: 2 }),
  );
}

function getEffectiveArchivePage() {
  const page = getArchiveAdminState().page || {};
  return {
    active: page.active !== false,
    eyebrow: page.eyebrow || "Arsip",
    title: page.title || "Arsip Ajang Talenta",
    description: page.description || "",
    alignment: page.alignment === "left" ? "left" : "center",
    action: page.action || "Lihat Detail",
  };
}

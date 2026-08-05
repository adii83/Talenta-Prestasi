/* Konfigurasi halaman Unduh yang menghubungkan tab publik ke data Arsip. */
const DOWNLOAD_STATE_KEY = "talenta_download_editor_v2";
const DOWNLOAD_STATE_EVENT = "talenta:download";

const DOWNLOAD_STATE_BASELINE = {
  version: 2,
  active: true,
  eyebrow: "Unduh",
  title: "Dokumen & Materi",
  description:
    "Unduh dokumen resmi yang diperlukan untuk persiapan ajang talenta.",
  alignment: "center",
  competitions: [
    downloadCompetitionLink("osn-2026", "Lomba Sekarang", true),
    downloadCompetitionLink("osn-2025", "OSN 2025"),
    downloadCompetitionLink("osn-2024", "OSN 2024"),
  ],
};

function downloadCompetitionLink(
  competitionId,
  customTabName = "",
  isDefault = false,
) {
  return {
    competitionId,
    customTabName,
    active: true,
    isDefault,
    hiddenDocumentIds: [],
    documentLabelOverrides: {},
  };
}

function downloadClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function downloadEscape(value = "") {
  return String(value).replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
  );
}

function downloadSafeUrl(value = "") {
  const source = String(value).trim();
  return source && !/^(?:javascript|vbscript):/i.test(source) ? source : "#";
}

function buildDownloadDocumentMarkup(document) {
  return `<article class="doc-card" data-category="${downloadEscape(document.category || "")}"><div class="doc-card__icon"><i data-lucide="${downloadEscape(document.icon || "file-text")}" style="width:20px;height:20px;stroke-width:1.5"></i></div><div class="doc-card__info"><p class="doc-card__name">${downloadEscape(document.title)}${document.category ? ` <span class="doc-card__tag">${downloadEscape(document.category)}</span>` : ""}</p><p class="doc-card__size">${downloadEscape(document.type || "PDF")} · <span class="t-mono">${downloadEscape(document.size || "")}</span></p></div><div class="doc-card__download"><a href="${downloadEscape(downloadSafeUrl(document.url))}" class="btn btn--outline btn--sm"${document.url ? ' target="_blank" rel="noopener"' : ""}><i data-lucide="download" style="width:14px;height:14px"></i> Unduh</a></div></article>`;
}

function buildDownloadMarkup(state, options = {}) {
  const competitions = state.competitions || [];
  const selected =
    competitions.find(
      (item) => item.competitionId === options.selectedCompetitionId,
    ) ||
    competitions.find((item) => item.isDefault) ||
    competitions[0];
  const headerClass =
    state.alignment === "left" ? " section__header--left" : "";
  const tabs = competitions
    .map(
      (item) =>
        `<button class="unduh-tab${item === selected ? " unduh-tab--active" : ""}" type="button" data-tab="download-${downloadEscape(item.competitionId)}">${downloadEscape(item.customTabName || item.competition?.shortName || item.competition?.name)}</button>`,
    )
    .join("");
  const panels = competitions
    .map(
      (item) =>
        `<div class="unduh-tab-panel${item === selected ? " unduh-tab-panel--active" : ""}" id="download-${downloadEscape(item.competitionId)}">${item.documents.length ? `<div class="doc-list">${item.documents.map(buildDownloadDocumentMarkup).join("")}</div>` : '<div class="public-empty-state"><i data-lucide="folder-open"></i><h2 class="t-h3">Belum ada dokumen</h2><p>Belum ada dokumen yang ditampilkan untuk lomba ini.</p></div>'}</div>`,
    )
    .join("");
  return `<div class="container"><div class="section__header${headerClass}"><p class="t-eyebrow">${downloadEscape(state.eyebrow)}</p><h1 class="t-h1">${downloadEscape(state.title)}</h1><p>${downloadEscape(state.description)}</p></div>${competitions.length ? `<div class="unduh-tabs">${tabs}</div>${panels}` : '<div class="public-empty-state"><i data-lucide="folder-open"></i><h2 class="t-h3">Belum ada lomba</h2><p>Belum ada sumber dokumen yang diaktifkan.</p></div>'}</div>`;
}

function getDownloadCompetition(id) {
  const runtime = window.TalentaDownloadCompetitions?.find(
    (competition) => competition.id === id,
  );
  if (runtime) return downloadClone(runtime);
  const active =
    typeof getActiveCompetition === "function" ? getActiveCompetition() : null;
  if (active?.id === id) return downloadClone(active);
  const archived =
    typeof getEffectiveCompetitionById === "function"
      ? getEffectiveCompetitionById(id)
      : null;
  return archived ? downloadClone(archived) : null;
}

function getDownloadCompetitions() {
  if (Array.isArray(window.TalentaDownloadCompetitions))
    return window.TalentaDownloadCompetitions.filter(
      (competition) => competition.active !== false,
    ).map(downloadClone);
  const active =
    typeof getActiveCompetition === "function" ? getActiveCompetition() : null;
  const archived =
    typeof getPublicArchivedCompetitions === "function"
      ? getPublicArchivedCompetitions()
      : typeof getEffectiveArchivedCompetitions === "function"
        ? getEffectiveArchivedCompetitions().filter(
            (competition) =>
              competition.status === "published" &&
              competition.active !== false &&
              competition.detail?.active !== false,
          )
        : [];
  return [active, ...archived]
    .filter(Boolean)
    .filter((competition) => competition.active !== false)
    .filter(
      (item, index, list) => list.findIndex((x) => x.id === item.id) === index,
    )
    .map(downloadClone);
}

function normalizeDownloadState(source) {
  const baseline = downloadClone(DOWNLOAD_STATE_BASELINE);
  const state =
    source?.version === 2
      ? { ...baseline, ...downloadClone(source) }
      : baseline;
  state.version = 2;
  state.active = state.active !== false;
  state.alignment = state.alignment === "left" ? "left" : "center";
  const seenCompetitionIds = new Set();
  state.competitions = (state.competitions || [])
    .filter((item) => {
      const competitionId = item?.competitionId;
      if (
        !competitionId ||
        seenCompetitionIds.has(competitionId) ||
        !getDownloadCompetition(competitionId)
      ) {
        return false;
      }
      seenCompetitionIds.add(competitionId);
      return true;
    })
    .map((item) => {
      const competition = getDownloadCompetition(item.competitionId);
      const documentIds = new Set(
        (competition?.documents || []).map((document) => document.id),
      );
      const documentLabelOverrides = Object.fromEntries(
        Object.entries(item.documentLabelOverrides || {})
          .filter(
            ([documentId, label]) =>
              documentIds.has(documentId) &&
              typeof label === "string" &&
              label.trim(),
          )
          .map(([documentId, label]) => [documentId, label.trim()]),
      );
      return {
        ...downloadCompetitionLink(item.competitionId),
        competitionId: item.competitionId,
        customTabName:
          typeof item.customTabName === "string"
            ? item.customTabName.trim()
            : "",
        active: item.active !== false,
        isDefault: item.isDefault === true,
        hiddenDocumentIds: [
          ...new Set(
            (item.hiddenDocumentIds || []).filter((documentId) =>
              documentIds.has(documentId),
            ),
          ),
        ],
        documentLabelOverrides,
      };
    });
  if (state.competitions.length) {
    const active = state.competitions.filter((item) => item.active !== false);
    if (!active.length) state.competitions[0].active = true;
    const enabled = state.competitions.filter((item) => item.active !== false);
    const selected = enabled.find((item) => item.isDefault) || enabled[0];
    state.competitions.forEach((item) => (item.isDefault = item === selected));
  }
  return state;
}

function getDownloadAdminState() {
  try {
    return normalizeDownloadState(
      JSON.parse(localStorage.getItem(DOWNLOAD_STATE_KEY) || "null"),
    );
  } catch (error) {
    console.warn("Konfigurasi Unduh rusak; baseline digunakan.", error);
    return normalizeDownloadState(null);
  }
}

function saveDownloadAdminState(value) {
  const state = normalizeDownloadState(value);
  localStorage.setItem(DOWNLOAD_STATE_KEY, JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent(DOWNLOAD_STATE_EVENT, {
      detail: downloadClone(state),
    }),
  );
  return downloadClone(state);
}

function resetDownloadAdminState() {
  localStorage.removeItem(DOWNLOAD_STATE_KEY);
  const baseline = getDownloadAdminState();
  window.dispatchEvent(
    new CustomEvent(DOWNLOAD_STATE_EVENT, {
      detail: downloadClone(baseline),
    }),
  );
  return baseline;
}

function resolveDownloadPublicState(source) {
  const state = normalizeDownloadState(source);
  const publicCompetitionIds = new Set(
    getDownloadCompetitions().map((competition) => competition.id),
  );
  const competitions = state.competitions
    .filter(
      (item) =>
        item.active !== false && publicCompetitionIds.has(item.competitionId),
    )
    .map((item) => {
      const competition = getDownloadCompetition(item.competitionId);
      return {
        ...item,
        competition,
        documents: (competition?.documents || [])
          .filter(
            (document) =>
              document.active !== false &&
              !item.hiddenDocumentIds.includes(document.id),
          )
          .map((document) => ({
            ...document,
            title: item.documentLabelOverrides[document.id] || document.title,
          })),
      };
    });
  const selected =
    competitions.find((item) => item.isDefault) || competitions[0];
  competitions.forEach((item) => (item.isDefault = item === selected));
  return {
    ...state,
    competitions,
  };
}

function getPublicDownloadState() {
  return resolveDownloadPublicState(getDownloadAdminState());
}

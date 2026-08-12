/* State dan markup Pemenang bersama untuk Admin, Beranda, dan Template publik. */
const WINNER_MANAGER_STATE_KEY = "talenta_winner_manager_v1";
const WINNER_PAGE_STATE_KEY = "talenta_winner_page_v1";
const WINNER_STATE_EVENT = "talenta:winners";

function winnerClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function winnerReadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (error) {
    console.warn(`State ${key} rusak; baseline digunakan.`, error);
    return null;
  }
}

function winnerString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function winnerEscape(value = "") {
  return String(value).replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character],
  );
}

function winnerSafeUrl(value = "") {
  const source = String(value).trim();
  if (!source) return "";
  return !/^(?:javascript|vbscript):/i.test(source) ? source : "#";
}

function winnerInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function winnerManagerBaseline() {
  const competition = Object.prototype.hasOwnProperty.call(
    window,
    "TalentaActiveCompetition",
  )
    ? window.TalentaActiveCompetition
    : typeof getActiveCompetition === "function"
      ? getActiveCompetition()
      : null;
  if (!competition)
    return {
      version: 1,
      competitionId: "",
      categories: [],
      sk: { title: "", description: "", url: "" },
    };
  return {
    version: 1,
    competitionId: competition.id,
    categories: (competition.winnerCategories || []).map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      rankPrefix: category.rankPrefix || "Juara",
      active: category.active !== false,
      winners: (category.winners || []).map((winner) => ({
        ...winner,
        active: winner.active !== false,
      })),
    })),
    sk: competition.skDocument
      ? {
          title: competition.skDocument.title,
          description: competition.skDocument.description,
          url: competition.skDocument.url,
        }
      : {
          title: "SK Penetapan Pemenang",
          description:
            "Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.",
          url: "",
        },
  };
}

function winnerPageBaseline() {
  const competition = Object.prototype.hasOwnProperty.call(
    window,
    "TalentaActiveCompetition",
  )
    ? window.TalentaActiveCompetition
    : typeof getActiveCompetition === "function"
      ? getActiveCompetition()
      : null;
  return {
    version: 1,
    active: true,
    eyebrow: competition?.name || "",
    title: "Daftar Pemenang",
    description:
      "Selamat kepada para pemenang ajang talenta nasional tahun ini.",
    alignment: "left",
    showSk: true,
    showPhoto: true,
    showSchool: true,
    showExam: true,
    showRegency: true,
    showProvince: true,
    archiveActive: true,
    archiveTitle: "Pemenang Ajang Talenta Sebelumnya",
    archiveAction: "Lihat Pemenang",
    archiveLimit: 3,
  };
}

function normalizeWinnerManagerState(source) {
  const baseline = winnerManagerBaseline();
  if (
    !baseline.competitionId ||
    !source ||
    source.competitionId !== baseline.competitionId
  )
    return baseline;

  const categoryIds = new Set();
  const winnerIds = new Set();
  const categories = (Array.isArray(source.categories) ? source.categories : [])
    .filter((category) => {
      const id = winnerString(category?.id);
      if (!id || categoryIds.has(id)) return false;
      categoryIds.add(id);
      return true;
    })
    .map((category) => ({
      id: winnerString(category.id),
      name: winnerString(category.name, "Kategori Pemenang"),
      icon: winnerString(category.icon, "trophy"),
      rankPrefix: winnerString(category.rankPrefix, "Juara"),
      active: category.active !== false,
      winners: (Array.isArray(category.winners) ? category.winners : [])
        .filter((winner) => {
          const id = winnerString(winner?.id);
          if (!id || winnerIds.has(id)) return false;
          winnerIds.add(id);
          return true;
        })
        .map((winner) => ({
          id: winnerString(winner.id),
          rank: winnerString(winner.rank),
          name: winnerString(winner.name),
          school: winnerString(winner.school),
          exam: winnerString(winner.exam),
          regency: winnerString(winner.regency),
          province: winnerString(winner.province),
          photo: winnerString(winner.photo),
          active: winner.active !== false,
        })),
    }));

  return {
    version: 1,
    competitionId: baseline.competitionId,
    categories,
    sk: {
      title: winnerString(source.sk?.title, baseline.sk.title),
      description: winnerString(
        source.sk?.description,
        baseline.sk.description,
      ),
      url: winnerSafeUrl(source.sk?.url || baseline.sk.url),
    },
  };
}

function normalizeWinnerPageState(source) {
  const baseline = winnerPageBaseline();
  const state = { ...baseline, ...(source || {}) };
  const archiveLimit = Number(state.archiveLimit);
  const availableArchiveCount = getWinnerArchiveAvailableCount();
  const maximumArchiveLimit =
    availableArchiveCount === null ? 12 : availableArchiveCount;
  const minimumArchiveLimit = maximumArchiveLimit > 0 ? 1 : 0;
  return {
    version: 1,
    active: state.active !== false,
    eyebrow: winnerString(state.eyebrow, baseline.eyebrow),
    title: winnerString(state.title, baseline.title),
    description: winnerString(state.description, baseline.description),
    alignment: state.alignment === "center" ? "center" : "left",
    showSk: state.showSk !== false,
    showPhoto: state.showPhoto !== false,
    showSchool: state.showSchool !== false,
    showExam: state.showExam !== false,
    showRegency: state.showRegency !== false,
    showProvince: state.showProvince !== false,
    archiveActive: state.archiveActive !== false,
    archiveTitle: winnerString(state.archiveTitle, baseline.archiveTitle),
    archiveAction: winnerString(state.archiveAction, baseline.archiveAction),
    archiveLimit: Math.max(
      minimumArchiveLimit,
      Math.min(
        maximumArchiveLimit,
        Number.isFinite(archiveLimit) ? Math.trunc(archiveLimit) : 3,
      ),
    ),
  };
}

function getWinnerManagerState() {
  return normalizeWinnerManagerState(
    winnerReadJson(WINNER_MANAGER_STATE_KEY) || winnerManagerBaseline(),
  );
}

function getWinnerPageState() {
  return normalizeWinnerPageState(winnerReadJson(WINNER_PAGE_STATE_KEY));
}

function saveWinnerAdminState(manager, page) {
  const managerState = normalizeWinnerManagerState(manager);
  const pageState = normalizeWinnerPageState(page);
  localStorage.setItem(WINNER_MANAGER_STATE_KEY, JSON.stringify(managerState));
  localStorage.setItem(WINNER_PAGE_STATE_KEY, JSON.stringify(pageState));
  window.dispatchEvent(
    new CustomEvent(WINNER_STATE_EVENT, {
      detail: {
        manager: winnerClone(managerState),
        page: winnerClone(pageState),
      },
    }),
  );
  return {
    manager: winnerClone(managerState),
    page: winnerClone(pageState),
  };
}

function resetWinnerAdminState() {
  localStorage.removeItem(WINNER_MANAGER_STATE_KEY);
  localStorage.removeItem(WINNER_PAGE_STATE_KEY);
  const state = {
    manager: getWinnerManagerState(),
    page: getWinnerPageState(),
  };
  window.dispatchEvent(
    new CustomEvent(WINNER_STATE_EVENT, { detail: winnerClone(state) }),
  );
  return state;
}

function getAvailableWinnerArchiveCompetitions() {
  const competitions =
    typeof getPublicArchivedCompetitions === "function"
      ? getPublicArchivedCompetitions()
      : [];
  return competitions
    .filter((competition) =>
      (competition.winnerCategories || []).some(
        (category) =>
          category.active !== false &&
          (category.winners || []).some((winner) => winner.active !== false),
      ),
    )
    .map(winnerClone);
}

function getWinnerArchiveAvailableCount() {
  if (typeof getPublicArchivedCompetitions !== "function") return null;
  return getAvailableWinnerArchiveCompetitions().length;
}

function getPublicWinnerArchiveCompetitions(
  page = getWinnerPageState(),
  archiveSource,
) {
  if (!page.archiveActive) return [];
  const available = Array.isArray(archiveSource)
    ? archiveSource.filter((competition) =>
        (competition.winnerCategories || []).some(
          (category) =>
            category.active !== false &&
            (category.winners || []).some((winner) => winner.active !== false),
        ),
      )
    : getAvailableWinnerArchiveCompetitions();
  return available.slice(0, page.archiveLimit).map(winnerClone);
}

function resolvePublicWinnerState(managerSource, pageSource, archiveSource) {
  const manager = normalizeWinnerManagerState(managerSource);
  const page = normalizeWinnerPageState(pageSource);
  return {
    manager: {
      ...manager,
      categories: manager.categories
        .filter((category) => category.active !== false)
        .map((category) => ({
          ...category,
          winners: category.winners.filter((winner) => winner.active !== false),
        }))
        .filter((category) => category.winners.length),
    },
    page,
    archives: getPublicWinnerArchiveCompetitions(page, archiveSource),
  };
}

function getPublicWinnerState() {
  return resolvePublicWinnerState(
    getWinnerManagerState(),
    getWinnerPageState(),
  );
}

function buildWinnerMetaMarkup(winner, page) {
  return [
    page.showExam && winner.exam
      ? `<span><span class="meta-label">No. Ujian:</span> ${winnerEscape(winner.exam)}</span>`
      : "",
    page.showRegency && winner.regency
      ? `<span><span class="meta-label">Kabupaten:</span> ${winnerEscape(winner.regency)}</span>`
      : "",
    page.showProvince && winner.province
      ? `<span><span class="meta-label">Provinsi:</span> ${winnerEscape(winner.province)}</span>`
      : "",
  ].join("");
}

function buildWinnerCardMarkup(winner, page) {
  const photoUrl = typeof TalentaMedia !== 'undefined' && winner.photo ? TalentaMedia.url(winner.photo) : winner.photo;
  return `<article class="champion-card">${page.showPhoto ? `<div class="champion-card__photo">${winner.photo ? `<img src="${winnerEscape(winnerSafeUrl(photoUrl))}" alt="Foto ${winnerEscape(winner.name)}" />` : winnerEscape(winnerInitials(winner.name))}</div>` : ""}<p class="champion-card__rank t-mono">${winnerEscape(winner.rank)}</p><p class="champion-card__name">${winnerEscape(winner.name || "—")}</p>${page.showSchool ? `<p class="champion-card__school">${winnerEscape(winner.school)}</p>` : ""}<div class="champion-card__meta">${buildWinnerMetaMarkup(winner, page)}</div></article>`;
}

function buildWinnerArchiveMarkup(page, archives, options = {}) {
  if (!page.archiveActive || !archives.length) return "";
  const archiveHref =
    typeof options.archiveHref === "function" ? options.archiveHref : () => "#";
  const actionLabel = page.archiveAction || "Lihat Pemenang";
  return `<div class="archive-winners"><h3 class="archive-winners__title">${winnerEscape(page.archiveTitle)}</h3><div class="grid grid--3">${archives.map((competition) => `<a href="${winnerEscape(winnerSafeUrl(archiveHref(competition)))}" class="lomba-card"><div class="lomba-card__thumb">${competition.iconMode === "upload" && competition.uploadedIcon ? `<img class="archive-card__uploaded-icon" src="${winnerEscape(winnerSafeUrl(competition.uploadedIcon))}" alt="${winnerEscape(competition.iconAlt || "Logo atau maskot lomba")}">` : `<i data-lucide="${winnerEscape(competition.icon || "archive")}" style="width:48px;height:48px;stroke-width:1"></i>`}</div><div class="lomba-card__body"><h3 class="lomba-card__title">${winnerEscape(competition.name)}</h3><span class="lomba-card__action">${winnerEscape(actionLabel)} <i data-lucide="arrow-right" style="width:14px;height:14px"></i></span></div></a>`).join("")}</div></div>`;
}

function buildWinnerPageMarkup(source, options = {}) {
  const { manager, page, archives = [] } = source;
  const headerClass = page.alignment === "left" ? " section__header--left" : "";
  const sk =
    page.showSk && manager.sk?.title && manager.sk?.url
      ? `<div class="sk-banner"><div class="sk-banner__left"><div class="sk-banner__icon"><i data-lucide="file-check-2" style="width:24px;height:24px"></i></div><div class="sk-banner__content"><h3>${winnerEscape(manager.sk.title)}</h3><p>${winnerEscape(manager.sk.description)}</p></div></div><a href="${winnerEscape(winnerSafeUrl(manager.sk.url))}" class="btn btn--primary" style="border:1px solid rgba(255,255,255,.2)"${manager.sk.url ? ' target="_blank" rel="noopener"' : ""}><i data-lucide="download" style="width:16px;height:16px"></i> Unduh PDF</a></div>`
      : "";
  const categories = manager.categories.length
    ? `<div class="winner-section">${manager.categories.map((category) => `<div class="winner-group"><h3 class="winner-group__title"><i data-lucide="${winnerEscape(category.icon || "trophy")}" style="width:20px;height:20px;stroke-width:1.75;color:var(--c-primary)"></i>${winnerEscape(category.name)}<span class="badge badge--gold">${category.winners.length} Pemenang</span></h3><div class="champion-grid">${category.winners.map((winner) => buildWinnerCardMarkup(winner, page)).join("")}</div></div>`).join("")}</div>`
    : '<div class="public-empty-state"><i data-lucide="trophy"></i><h2 class="t-h3">Belum ada pemenang</h2><p>Data pemenang belum dipublikasikan.</p></div>';
  return `<div class="container"><div class="section__header${headerClass}"><p class="t-eyebrow">${winnerEscape(page.eyebrow)}</p><h1 class="t-h1">${winnerEscape(page.title)}</h1><p>${winnerEscape(page.description)}</p></div>${sk}${categories}${buildWinnerArchiveMarkup(page, archives, options)}</div>`;
}

const WINNER_MANAGER_KEY = "talenta_winner_manager_v1",
  WINNER_PAGE_KEY = "talenta_winner_page_v1";
function winnerData() {
  const comp = getActiveCompetition(),
    saved = JSON.parse(localStorage.getItem(WINNER_MANAGER_KEY) || "null");
  return (
    saved && saved.competitionId === comp?.id
      ? saved.categories
      : comp?.winnerCategories || []
  )
    .filter((c) => c.active !== false)
    .map((c) => ({
      ...c,
      winners: (c.winners || []).filter((w) => w.active !== false),
    }))
    .filter((c) => c.winners.length);
}
function pageDisplay() {
  return {
    showPhoto: true,
    showSchool: true,
    showExam: true,
    showDistrict: true,
    showRegency: true,
    showProvince: true,
    ...JSON.parse(localStorage.getItem(WINNER_PAGE_KEY) || "null"),
  };
}
const winnerDefaults = {
  active: false,
  eyebrow: "Pengumuman",
  title: "Selamat Kepada Para Pemenang!",
  description: "Berikut adalah pemenang ajang talenta nasional tahun ini.",
  background: "navy",
  alignment: "center",
  action: {
    ...iconItem(
      "Lihat Semua Pemenang",
      "pemenang.html",
      "arrow-right",
      "primary",
      false,
    ),
    active: true,
  },
};
let winnerState = {
  ...structuredClone(winnerDefaults),
  ...(state.winnerHighlight || {}),
};
winnerState.action = {
  ...winnerDefaults.action,
  ...(winnerState.action || {}),
};
state.winnerHighlight = winnerState;
document.addEventListener("DOMContentLoaded", () => {
  bindWinner();
  syncWinner();
  renderWinnerAction();
  renderWinner();
  icons();
});
function bindWinner() {
  bindText(
    ["winnerEyebrow", "winnerTitle", "winnerDescription"],
    winnerState,
    renderWinner,
  );
  bindToggle("winnerHighlightActive", winnerState, renderWinner);
  [
    ["winnerBackground", "background"],
    ["winnerAlignment", "alignment"],
  ].forEach(
    ([id, k]) =>
      (document.getElementById(id).onchange = (e) => {
        winnerState[k] = e.target.value;
        renderWinner();
      }),
  );
  bindPreview(
    "[data-winner-preview]",
    "winnerPreviewFrame",
    "winner-preview-frame",
    "winnerPreview",
  );
  document.getElementById("homeEditorForm").addEventListener("submit", () => {
    state.winnerHighlight = winnerState;
    localStorage.setItem(HOME_KEY, JSON.stringify(state));
  });
  addEventListener("storage", (e) => {
    if (e.key === WINNER_MANAGER_KEY || e.key === WINNER_PAGE_KEY)
      renderWinner();
  });
}
function syncWinner() {
  Object.entries({
    winnerHighlightActive: winnerState.active,
    winnerEyebrow: winnerState.eyebrow,
    winnerTitle: winnerState.title,
    winnerDescription: winnerState.description,
    winnerBackground: winnerState.background,
    winnerAlignment: winnerState.alignment,
  }).forEach(([id, v]) => {
    const e = document.getElementById(id);
    if (e.type === "checkbox") e.checked = v;
    else e.value = v;
  });
}
function renderWinnerAction() {
  const a = winnerState.action,
    root = document.getElementById("winnerActionEditor");
  root.innerHTML = `<div class="action-editor__card"><div class="action-editor__title"><strong>Tombol Highlight</strong>${toggleHtml(a)}</div><div class="admin-form-grid"><div class="admin-field"><label>Teks tombol</label><input class="form-input" data-k="label" value="${esc(a.label)}"></div><div class="admin-field"><label>URL tujuan</label><input class="form-input" data-k="url" value="${esc(a.url)}"></div><div class="admin-field"><label>Gaya</label><select class="form-input" data-k="style"><option value="primary" ${a.style === "primary" ? "selected" : ""}>Primary</option><option value="white" ${a.style === "white" ? "selected" : ""}>Putih</option><option value="outline" ${a.style === "outline" ? "selected" : ""}>Outline</option></select></div></div>${iconControl(a, "winner-action")}<label class="editor-check"><input type="checkbox" data-newtab ${a.newTab ? "checked" : ""}> Buka di tab baru</label></div>`;
  root.querySelectorAll("[data-k]").forEach(
    (x) =>
      (x.oninput = () => {
        a[x.dataset.k] = x.value;
        renderWinner();
      }),
  );
  wireItemToggle(root, a, renderWinner);
  root.querySelector("[data-newtab]").onchange = (e) =>
    (a.newTab = e.target.checked);
  wireIcon(root, a, renderWinner);
  icons();
}
function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}
function renderWinner() {
  const root = document.getElementById("winnerPreview"),
    w = winnerState,
    t = theme(),
    display = pageDisplay(),
    cats = winnerData();
  applyTheme(root, t);
  if (!w.active) return disabled(root, "Highlight Pemenang");
  root.className = `winner-preview winner-preview--${w.background} winner-preview--${w.alignment}`;
  root.innerHTML = `<header><span>${esc(w.eyebrow)}</span><h2>${esc(w.title)}</h2><p>${esc(w.description)}</p></header>${cats.length ? `<div class="winner-preview__categories">${cats.map((cat) => `<section class="winner-preview__category"><h3 class="winner-group__title"><i data-lucide="${esc(cat.icon || "trophy")}"></i>${esc(cat.name)}<span class="badge badge--gold">${cat.winners.length} Pemenang</span></h3><div class="champion-grid">${cat.winners.map((x) => `<article class="champion-card">${display.showPhoto ? `<div class="champion-card__photo">${x.photo ? `<img src="${x.photo}" alt="Foto ${esc(x.name)}">` : initials(x.name)}</div>` : ""}<p class="champion-card__rank t-mono">${esc(x.rank)}</p><p class="champion-card__name">${esc(x.name)}</p>${display.showSchool ? `<p class="champion-card__school">${esc(x.school)}</p>` : ""}<div class="champion-card__meta">${display.showExam ? `<span><span class="meta-label">No. Ujian:</span> ${esc(x.exam)}</span>` : ""}${display.showDistrict ? `<span><span class="meta-label">Kecamatan:</span> ${esc(x.district)}</span>` : ""}${display.showRegency ? `<span><span class="meta-label">Kabupaten:</span> ${esc(x.regency)}</span>` : ""}${display.showProvince ? `<span><span class="meta-label">Provinsi:</span> ${esc(x.province)}</span>` : ""}</div></article>`).join("")}</div></section>`).join("")}</div>` : '<div class="winner-empty">Belum ada data pemenang aktif.</div>'}${w.action.active ? `<div class="winner-preview__action-wrap"><a class="winner-preview__action is-${w.action.style}">${esc(w.action.label)} ${iconMarkup(w.action)}</a></div>` : ""}`;
  icons();
}

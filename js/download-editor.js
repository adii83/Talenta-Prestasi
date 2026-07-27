const DOWNLOAD_KEY = "talenta_download_editor_v2",
  GLOBAL_KEY = "talenta_event_settings_v1";
let previewCompetitionId = "";
const defaults = {
  version: 2,
  active: true,
  eyebrow: "Unduh",
  title: "Dokumen & Materi",
  description:
    "Unduh dokumen resmi yang diperlukan untuk persiapan ajang talenta.",
  alignment: "center",
  competitions: [
    link("osn-2025", "Lomba Sekarang", true),
    link("osn-2024", "OSN 2024"),
    link("osn-2023", "OSN 2023"),
  ],
};
function link(competitionId, customTabName = "", isDefault = false) {
  return {
    competitionId,
    customTabName,
    active: true,
    isDefault,
    hiddenDocumentIds: [],
    documentLabelOverrides: {},
  };
}
function clone(v) {
  return JSON.parse(JSON.stringify(v));
}
function archive(id) {
  return typeof getEffectiveCompetitionById === 'function'
    ? getEffectiveCompetitionById(id)
    : MOCK_ARCHIVE_DATABASE.competitions.find((x) => x.id === id);
}
function load() {
  const saved = JSON.parse(localStorage.getItem(DOWNLOAD_KEY) || "null");
  const s =
    saved?.version === 2 ? { ...clone(defaults), ...saved } : clone(defaults);
  s.competitions = (s.competitions || [])
    .filter((x) => archive(x.competitionId))
    .map((x) => ({
      ...link(x.competitionId),
      ...x,
      hiddenDocumentIds: x.hiddenDocumentIds || [],
      documentLabelOverrides: x.documentLabelOverrides || {},
    }));
  normalize(s);
  return s;
}
let state = load();
document.addEventListener("DOMContentLoaded", () => {
  bind();
  sync();
  renderPicker();
  renderCompetitions();
  renderPreview();
  lucide.createIcons();
});
function normalize(s) {
  if (!s.competitions.length) return;
  const active = s.competitions.filter((x) => x.active);
  if (!active.length) s.competitions[0].active = true;
  const now = s.competitions.filter((x) => x.active),
    chosen = now.find((x) => x.isDefault) || now[0];
  s.competitions.forEach((x) => (x.isDefault = x === chosen));
  if (!now.some((x) => x.competitionId === previewCompetitionId))
    previewCompetitionId = chosen?.competitionId || "";
}
function bind() {
  document.getElementById("sidebarToggle").onclick = () =>
    document
      .getElementById("adminSidebar")
      .classList.toggle("admin-sidebar--open");
  [
    ["downloadEyebrow", "eyebrow"],
    ["downloadTitle", "title"],
    ["downloadDescription", "description"],
  ].forEach(
    ([id, k]) =>
      (document.getElementById(id).oninput = (e) => {
        state[k] = e.target.value;
        renderPreview();
      }),
  );
  document.getElementById("downloadActive").onchange = (e) => {
    state.active = e.target.checked;
    renderPreview();
  };
  document.getElementById("downloadAlignment").onchange = (e) => {
    state.alignment = e.target.value;
    renderPreview();
  };
  document.getElementById("addArchiveCompetition").onclick = () => {
    const id = document.getElementById("archiveCompetitionSelect").value;
    if (!id) return toast("Semua lomba sudah ditambahkan.", true);
    state.competitions.push(
      link(id, archive(id).shortName, !state.competitions.length),
    );
    normalize(state);
    renderPicker();
    renderCompetitions();
    renderPreview();
  };
  document.getElementById("downloadEditorForm").onsubmit = (e) => {
    e.preventDefault();
    normalize(state);
    localStorage.setItem(DOWNLOAD_KEY, JSON.stringify(state));
    toast("Konfigurasi Unduh berhasil disimpan.");
  };
  document.getElementById("resetDownload").onclick = () => {
    if (confirm("Reset konfigurasi Unduh versi baru?")) {
      localStorage.removeItem(DOWNLOAD_KEY);
      location.reload();
    }
  };
  document.querySelectorAll("[data-download-preview]").forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll("[data-download-preview]")
          .forEach((x) => x.classList.remove("preview-switch__btn--active"));
        b.classList.add("preview-switch__btn--active");
        const f = document.getElementById("downloadPreviewFrame");
        f.classList.remove(
          "download-preview-frame--tablet",
          "download-preview-frame--mobile",
        );
        if (b.dataset.downloadPreview !== "desktop")
          f.classList.add(
            "download-preview-frame--" + b.dataset.downloadPreview,
          );
      }),
  );
}
function sync() {
  Object.entries({
    downloadActive: state.active,
    downloadEyebrow: state.eyebrow,
    downloadTitle: state.title,
    downloadDescription: state.description,
    downloadAlignment: state.alignment,
  }).forEach(([id, v]) => {
    const e = document.getElementById(id);
    e.type === "checkbox" ? (e.checked = v) : (e.value = v);
  });
}
function renderPicker() {
  const selected = new Set(state.competitions.map((x) => x.competitionId)),
    allComps = typeof getEffectiveArchivedCompetitions === 'function'
      ? getEffectiveArchivedCompetitions()
      : MOCK_ARCHIVE_DATABASE.competitions.filter((x) => x.status === "published"),
    available = allComps.filter((x) => x.active !== false && !selected.has(x.id)),
    el = document.getElementById("archiveCompetitionSelect");
  el.innerHTML = available.length
    ? available
        .map((x) => `<option value="${x.id}">${esc(x.name)}</option>`)
        .join("")
    : '<option value="">Semua lomba sudah ditambahkan</option>';
  document.getElementById("addArchiveCompetition").disabled = !available.length;
}
function renderCompetitions() {
  normalize(state);
  const root = document.getElementById("downloadCompetitionEditor");
  root.innerHTML = "";
  state.competitions.forEach((cfg, i) => {
    const comp = archive(cfg.competitionId),
      el = document.createElement("article");
    el.className = "download-period-card archive-link-card";
    el.innerHTML = `<div class="download-period-card__order"><button type="button" data-up ${i === 0 ? "disabled" : ""}><i data-lucide="chevron-up"></i></button><span>${String(i + 1).padStart(2, "0")}</span><button type="button" data-down ${i === state.competitions.length - 1 ? "disabled" : ""}><i data-lucide="chevron-down"></i></button></div><div class="archive-link-card__main"><span class="archive-source-badge"><i data-lucide="database"></i> Dari Arsip</span><strong>${esc(comp.name)}</strong><div class="admin-field"><label>Nama tab di halaman Unduh</label><input class="form-input" value="${esc(cfg.customTabName || comp.shortName)}"></div><button type="button" class="archive-doc-toggle" data-doc-toggle><i data-lucide="files"></i> ${comp.documents.length} dokumen bawaan <i data-lucide="chevron-down"></i></button></div><label class="download-default"><input type="radio" name="defaultCompetition" ${cfg.isDefault ? "checked" : ""} ${!cfg.active ? "disabled" : ""}> Tab default</label><label class="admin-switch"><input type="checkbox" ${cfg.active ? "checked" : ""}><span></span><em>${cfg.active ? "Aktif" : "Nonaktif"}</em></label><button type="button" class="repeat-row__delete"><i data-lucide="unlink"></i></button><div class="archive-linked-docs" hidden>${comp.documents.map((d) => docEditor(cfg, d)).join("")}</div>`;
    el.querySelector(".form-input").oninput = (e) => {
      cfg.customTabName = e.target.value;
      renderPreview();
    };
    const toggle = el.querySelector(".admin-switch input");
    toggle.onchange = () => {
      cfg.active = toggle.checked;
      normalize(state);
      renderCompetitions();
      renderPreview();
    };
    el.querySelector("[type=radio]").onchange = () => {
      state.competitions.forEach((x) => (x.isDefault = x === cfg));
      previewCompetitionId = cfg.competitionId;
      renderCompetitions();
      renderPreview();
    };
    el.querySelector("[data-up]").onclick = () => move(i, -1);
    el.querySelector("[data-down]").onclick = () => move(i, 1);
    el.querySelector("[data-doc-toggle]").onclick = () => {
      const docs = el.querySelector(".archive-linked-docs");
      docs.hidden = !docs.hidden;
    };
    el.querySelectorAll("[data-document]").forEach((row) => {
      const id = row.dataset.document,
        check = row.querySelector("[type=checkbox]"),
        input = row.querySelector(".form-input");
      check.onchange = () => {
        cfg.hiddenDocumentIds = check.checked
          ? cfg.hiddenDocumentIds.filter((x) => x !== id)
          : [...new Set([...cfg.hiddenDocumentIds, id])];
        renderPreview();
      };
      input.oninput = () => {
        cfg.documentLabelOverrides[id] = input.value;
        renderPreview();
      };
      row.querySelector("[data-reset-label]").onclick = () => {
        delete cfg.documentLabelOverrides[id];
        input.value = "";
        renderPreview();
      };
    });
    el.querySelector(".repeat-row__delete").onclick = () => {
      if (
        confirm(
          "Lepas lomba ini dari halaman Unduh? Data Arsip tidak akan terhapus.",
        )
      ) {
        state.competitions.splice(i, 1);
        normalize(state);
        renderPicker();
        renderCompetitions();
        renderPreview();
      }
    };
    root.appendChild(el);
  });
  lucide.createIcons();
}
function docEditor(cfg, d) {
  const shown = !cfg.hiddenDocumentIds.includes(d.id);
  return `<div class="archive-linked-doc" data-document="${d.id}"><label class="admin-switch"><input type="checkbox" ${shown ? "checked" : ""}><span></span><em>${shown ? "Tampil" : "Sembunyi"}</em></label><div><strong>${esc(d.title)}</strong><small>${esc(d.category)} · ${d.type} · ${d.size}</small><input class="form-input" value="${esc(cfg.documentLabelOverrides[d.id] || "")}" placeholder="Nama custom (opsional)"></div><button type="button" data-reset-label title="Kembalikan nama asli"><i data-lucide="rotate-ccw"></i></button></div>`;
}
function move(i, d) {
  const n = i + d;
  if (n < 0 || n >= state.competitions.length) return;
  [state.competitions[i], state.competitions[n]] = [
    state.competitions[n],
    state.competitions[i],
  ];
  renderCompetitions();
  renderPreview();
}
function renderPreview() {
  const root = document.getElementById("downloadPreview"),
    g = JSON.parse(localStorage.getItem(GLOBAL_KEY) || "null") || {};
  root.style.setProperty("--preview-primary", g.primaryColor || "#1e4b8c");
  if (!state.active) return disabled();
  normalize(state);
  const links = state.competitions.filter((x) => x.active),
    cfg =
      links.find((x) => x.competitionId === previewCompetitionId) ||
      links.find((x) => x.isDefault) ||
      links[0];
  previewCompetitionId = cfg?.competitionId || "";
  root.className = `download-preview download-preview--${state.alignment}`;
  const comp = cfg && archive(cfg.competitionId),
    docs = comp
      ? comp.documents.filter(
          (d) => d.active && !cfg.hiddenDocumentIds.includes(d.id),
        )
      : [];
  root.innerHTML = `<header><span>${esc(state.eyebrow)}</span><h1>${esc(state.title)}</h1><p>${esc(state.description)}</p></header><div class="download-preview__tabs">${links
    .map((x) => {
      const c = archive(x.competitionId);
      return `<button type="button" class="${x === cfg ? "is-active" : ""}" data-preview="${x.competitionId}">${esc(x.customTabName || c.shortName)}</button>`;
    })
    .join(
      "",
    )}</div>${docs.length ? `<div class="download-preview__docs">${docs.map((d) => `<article><div class="download-preview__doc-icon"><i data-lucide="file-text"></i></div><div><strong>${esc(cfg.documentLabelOverrides[d.id] || d.title)}</strong><span>${esc(d.type)} · ${esc(d.size)} <b>${esc(d.category)}</b></span></div><button type="button"><i data-lucide="download"></i> Unduh</button></article>`).join("")}</div>` : '<div class="download-empty"><i data-lucide="folder-open"></i><strong>Belum ada dokumen ditampilkan</strong><span>Aktifkan dokumen bawaan lomba dari editor.</span></div>'}`;
  root.querySelectorAll("[data-preview]").forEach(
    (b) =>
      (b.onclick = () => {
        previewCompetitionId = b.dataset.preview;
        renderPreview();
      }),
  );
  lucide.createIcons();
}
function disabled() {
  document.getElementById("downloadPreview").innerHTML =
    '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Halaman Unduh dinonaktifkan</strong></div>';
  lucide.createIcons();
}
function esc(v = "") {
  return String(v).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}
function toast(msg, error = false) {
  const t = document.getElementById("adminToast");
  t.querySelector("span").textContent = msg;
  t.classList.toggle("admin-toast--error", error);
  t.classList.add("admin-toast--show");
  setTimeout(() => t.classList.remove("admin-toast--show"), 2600);
}

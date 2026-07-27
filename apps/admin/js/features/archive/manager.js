const ARCHIVE_KEY = ARCHIVE_STATE_KEY;
const gradients = [
  "linear-gradient(135deg,#1E4B8C 0%,#10233F 100%)",
  "linear-gradient(135deg,#10233F 0%,#2a5fa8 100%)",
  "linear-gradient(135deg,#1E4B8C 0%,#10233F 100%)",
  "linear-gradient(135deg,#2a5fa8 0%,#1E4B8C 100%)",
];
const effective = getArchiveAdminState();
const defaults = {
  ...effective.page,
  items: getEffectiveArchivedCompetitions(),
};
let archiveState = load();
const archiveEmbedded =
  new URLSearchParams(location.search).get("embedded") === "1";
function archiveDetailAdminUrl(id) {
  return TalentaPaths.to("admin.archiveDetailEditor", {
    query: { id, embedded: archiveEmbedded ? 1 : undefined },
  });
}
function load() {
  return structuredClone(defaults);
}
function esc(v = "") {
  const d = document.createElement("div");
  d.textContent = v;
  return d.innerHTML;
}
function uid() {
  return (
    "archive-" +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 6)
  );
}
function icons() {
  lucide.createIcons();
}
function toast(msg = "Pengaturan Arsip tersimpan.") {
  const t = document.getElementById("adminToast");
  t.querySelector("span").textContent = msg;
  t.classList.add("admin-toast--show");
  setTimeout(() => t.classList.remove("admin-toast--show"), 2200);
}
function sync() {
  const map = {
    archivePageActive: archiveState.active,
    archiveEyebrow: archiveState.eyebrow,
    archiveTitle: archiveState.title,
    archiveDescription: archiveState.description,
    archiveAlignment: archiveState.alignment,
    archiveAction: archiveState.action,
  };
  Object.entries(map).forEach(([id, v]) => {
    const e = document.getElementById(id);
    e.type === "checkbox" ? (e.checked = v) : (e.value = v);
  });
}
function renderItems() {
  const root = document.getElementById("archiveItems");
  root.innerHTML = archiveState.items
    .map(
      (c, i) =>
        `<article class="archive-manager-item" data-id="${esc(c.id)}"><div class="archive-manager-item__head"><span class="archive-manager-item__drag"><i data-lucide="grip-vertical"></i></span><div class="archive-manager-item__icon" style="background:${esc(c.gradient)}"><i data-lucide="${esc(c.icon || "archive")}"></i></div><div><strong>${esc(c.name || "Lomba tanpa nama")}</strong><small>${c.documents?.length || 0} dokumen Â· ${(c.winnerCategories || []).reduce((n, x) => n + (x.winners?.length || 0), 0)} pemenang</small></div><label class="admin-switch"><input type="checkbox" data-active ${c.active ? "checked" : ""}><span></span></label><a class="btn btn--outline btn--sm" href="${archiveDetailAdminUrl(c.id)}" data-detail><i data-lucide="settings-2"></i>Edit Detail</a><button type="button" class="repeat-row__delete" data-delete aria-label="Hapus"><i data-lucide="trash-2"></i></button></div><div class="admin-form-grid"><div class="admin-field"><label>Nama lomba</label><input class="form-input" data-field="name" value="${esc(c.name)}"></div><div class="admin-field"><label>Nama pendek</label><input class="form-input" data-field="shortName" value="${esc(c.shortName || "")}"></div><div class="admin-field"><label>Ikon Lucide</label><input class="form-input" data-field="icon" value="${esc(c.icon || "archive")}"></div><div class="admin-field"><label>Gradient thumbnail</label><input class="form-input" data-field="gradient" value="${esc(c.gradient)}"></div><div class="admin-field admin-field--wide"><label>Deskripsi</label><textarea class="form-input editor-textarea" data-field="description">${esc(c.description)}</textarea></div></div><div class="repeat-row__actions"><button type="button" data-up ${i === 0 ? "disabled" : ""}><i data-lucide="arrow-up"></i>Naik</button><button type="button" data-down ${i === archiveState.items.length - 1 ? "disabled" : ""}><i data-lucide="arrow-down"></i>Turun</button></div></article>`,
    )
    .join("");
  root.querySelectorAll(".archive-manager-item").forEach((el) => bindItem(el));
  icons();
}
function bindItem(el) {
  const item = archiveState.items.find((x) => x.id === el.dataset.id);
  el.querySelectorAll("[data-field]").forEach(
    (input) =>
      (input.oninput = (e) => {
        item[e.target.dataset.field] = e.target.value;
        const title = el.querySelector(".archive-manager-item__head strong");
        if (e.target.dataset.field === "name")
          title.textContent = e.target.value || "Lomba tanpa nama";
        if (e.target.dataset.field === "gradient")
          el.querySelector(".archive-manager-item__icon").style.background =
            e.target.value;
        renderPreview();
      }),
  );
  el.querySelector("[data-active]").onchange = (e) => {
    item.active = e.target.checked;
    renderPreview();
  };
  el.querySelector("[data-delete]").onclick = () => {
    if (confirm(`Hapus ${item.name} dari tampilan Arsip?`)) {
      archiveState.items = archiveState.items.filter((x) => x.id !== item.id);
      renderItems();
      renderPreview();
    }
  };
  el.querySelector("[data-up]").onclick = () => move(item.id, -1);
  el.querySelector("[data-down]").onclick = () => move(item.id, 1);
}
function move(id, dir) {
  const i = archiveState.items.findIndex((x) => x.id === id),
    n = i + dir;
  if (n < 0 || n >= archiveState.items.length) return;
  [archiveState.items[i], archiveState.items[n]] = [
    archiveState.items[n],
    archiveState.items[i],
  ];
  renderItems();
  renderPreview();
}
function addItem() {
  archiveState.items.push({
    id: uid(),
    name: "Ajang Talenta Baru",
    shortName: "Ajang Baru",
    status: "published",
    icon: "award",
    description: "Deskripsi singkat ajang talenta.",
    gradient: gradients[archiveState.items.length % gradients.length],
    active: true,
    documents: [],
    winnerCategories: [],
    skDocument: null,
  });
  renderItems();
  renderPreview();
}
function renderPreview() {
  const root = document.getElementById("archivePreview");
  if (!archiveState.active) {
    root.innerHTML =
      '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Halaman Arsip dinonaktifkan</strong><span>Data lomba tetap tersimpan.</span></div>';
    icons();
    return;
  }
  const items = archiveState.items.filter((x) => x.active),
    align = archiveState.alignment === "left" ? " section__header--left" : "";
  root.innerHTML = `<div class="section__header${align}"><p class="t-eyebrow">${esc(archiveState.eyebrow)}</p><h1 class="t-h1">${esc(archiveState.title)}</h1><p>${esc(archiveState.description)}</p></div><div class="grid grid--3">${items.map((c) => `<a href="#" class="lomba-card"><div class="lomba-card__thumb" style="background:${esc(c.gradient)}"><i data-lucide="${esc(c.icon || "archive")}"></i></div><div class="lomba-card__body"><h3 class="lomba-card__title">${esc(c.name)}</h3><p class="lomba-card__desc">${esc(c.description)}</p><span class="lomba-card__action">${esc(archiveState.action)} <i data-lucide="arrow-right"></i></span></div></a>`).join("")}</div>${items.length ? "" : '<div class="wm-empty">Belum ada lomba Arsip aktif.</div>'}`;
  icons();
}
function bind() {
  document.getElementById("archiveAdd").onclick = addItem;
  const texts = {
    archiveEyebrow: "eyebrow",
    archiveTitle: "title",
    archiveDescription: "description",
    archiveAction: "action",
  };
  Object.entries(texts).forEach(
    ([id, k]) =>
      (document.getElementById(id).oninput = (e) => {
        archiveState[k] = e.target.value;
        renderPreview();
      }),
  );
  document.getElementById("archiveAlignment").onchange = (e) => {
    archiveState.alignment = e.target.value;
    renderPreview();
  };
  document.getElementById("archivePageActive").onchange = (e) => {
    archiveState.active = e.target.checked;
    renderPreview();
  };
  document.querySelectorAll("[data-archive-preview]").forEach(
    (btn) =>
      (btn.onclick = () => {
        document
          .querySelectorAll("[data-archive-preview]")
          .forEach((x) =>
            x.classList.toggle("preview-switch__btn--active", x === btn),
          );
        document.getElementById("archivePreviewFrame").className =
          `archive-preview-frame archive-preview-frame--${btn.dataset.archivePreview}`;
      }),
  );
  document.getElementById("archiveEditorForm").onsubmit = (e) => {
    e.preventDefault();
    saveArchiveAdminState({
      version: 2,
      page: {
        active: archiveState.active,
        eyebrow: archiveState.eyebrow,
        title: archiveState.title,
        description: archiveState.description,
        alignment: archiveState.alignment,
        action: archiveState.action,
      },
      order: archiveState.items.map((x) => x.id),
      competitions: Object.fromEntries(
        archiveState.items.map((x) => [x.id, x]),
      ),
    });
    toast();
  };
  document.getElementById("archiveReset").onclick = () => {
    if (confirm("Reset seluruh pengaturan Arsip?")) {
      localStorage.removeItem(ARCHIVE_STATE_KEY);
      localStorage.removeItem(ARCHIVE_LEGACY_KEY);
      location.reload();
    }
  };
}
sync();
renderItems();
renderPreview();
bind();
icons();

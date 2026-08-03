const ARCHIVE_KEY = ARCHIVE_STATE_KEY;
const ARCHIVE_ICONS = [
  "archive",
  "award",
  "beaker",
  "book-open",
  "calculator",
  "graduation-cap",
  "landmark",
  "medal",
  "microscope",
  "trophy",
];
const effective = getArchiveAdminState();
const defaults = {
  ...effective.page,
  items: getEffectiveArchivedCompetitions(),
  removedCompetitionIds: effective.removedCompetitionIds || [],
};
let archiveState = load();
let archiveRemovedItems = new Map();
let archivePreviewResizeObserver;
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
function archiveItem(row) {
  return {
    ...normalizeArchiveCompetition({
      id: row.id,
      name: row.name,
      shortName: row.shortName || row.name,
      description: row.description || "",
      status: row.publicationStatus,
      active: !row.deletedAt,
      icon: row.fallbackIcon,
      iconMode: row.mascotAssetId ? "upload" : "library",
      mascotAssetId: row.mascotAssetId,
      uploadedIcon: row.mascotUrl
        ? TalentaMedia.url({ url: row.mascotUrl })
        : "",
      documents: [],
      winnerCategories: [],
    }),
    slug: row.slug,
    version: row.version,
    lifecycle: row.lifecycle,
  };
}
async function hydrateArchive() {
  try {
    archiveState.items = (await TalentaArchiveApi.list())
      .filter((row) => row.lifecycle === "archived" && !row.deletedAt)
      .map(archiveItem);
    archiveState.removedCompetitionIds = [];
    archiveRemovedItems = new Map();
    renderItems();
    renderPreview();
  } catch (error) {
    toast(error.message);
  }
}
function slugify(value) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `event-${Date.now()}`
  );
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
function iconMarkup(item, className = "") {
  if (item.iconMode === "upload" && item.uploadedIcon)
    return `<img class="${className}" src="${esc(item.uploadedIcon)}" alt="${esc(item.iconAlt || "Logo atau maskot lomba")}">`;
  return `<i data-lucide="${esc(item.icon || "archive")}"></i>`;
}

function applyGlobalTheme(root) {
  applyGlobalThemeTokens(root);
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
        `<article class="archive-manager-item" data-id="${esc(c.id)}"><div class="archive-manager-item__head"><span class="archive-manager-item__drag"><i data-lucide="grip-vertical"></i></span><div class="archive-manager-item__icon">${iconMarkup(c, "archive-manager-item__uploaded-icon")}</div><div><strong>${esc(c.name || "Lomba tanpa nama")}</strong><small>${c.documents?.length || 0} dokumen · ${(c.winnerCategories || []).reduce((n, x) => n + (x.winners?.length || 0), 0)} pemenang</small></div><div class="archive-manager-item__actions"><a class="btn btn--outline btn--sm" href="${archiveDetailAdminUrl(c.id)}" data-detail><i data-lucide="settings-2"></i>Edit Detail</a><button type="button" class="repeat-row__delete" data-delete aria-label="Hapus"><i data-lucide="trash-2"></i></button><label class="admin-switch"><input type="checkbox" data-active ${c.active ? "checked" : ""}><span></span></label></div></div><div class="admin-form-grid"><div class="admin-field"><label>Nama lomba</label><input class="form-input" data-field="name" value="${esc(c.name)}"></div><div class="admin-field"><label>Nama pendek</label><input class="form-input" data-field="shortName" value="${esc(c.shortName || "")}"></div><div class="admin-field"><label>Ikon fallback</label><select class="form-input" data-icon>${ARCHIVE_ICONS.map((icon) => `<option value="${icon}" ${icon === c.icon ? "selected" : ""}>${icon}</option>`).join("")}</select><small class="admin-field__hint">Dipakai jika logo atau maskot belum diunggah.</small></div><div class="admin-field"><label>Logo atau maskot lomba (opsional)</label><input class="form-input" data-icon-alt placeholder="Deskripsi logo atau maskot" value="${esc(c.iconAlt || "")}"><div class="icon-upload-row"><label class="btn btn--outline btn--sm">Upload logo/maskot<input type="file" data-icon-upload accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>${c.uploadedIcon ? '<button type="button" class="icon-remove" data-icon-remove>Hapus upload</button>' : ""}</div><small class="admin-field__hint">PNG transparan/WebP direkomendasikan. JPG dan SVG juga didukung, maksimal 1 MB.</small></div><div class="admin-field admin-field--wide"><label>Deskripsi</label><textarea class="form-input editor-textarea" data-field="description">${esc(c.description)}</textarea></div></div><div class="repeat-row__actions"><button type="button" data-up ${i === 0 ? "disabled" : ""}><i data-lucide="arrow-up"></i>Naik</button><button type="button" data-down ${i === archiveState.items.length - 1 ? "disabled" : ""}><i data-lucide="arrow-down"></i>Turun</button></div></article>`,
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
        renderPreview();
      }),
  );
  el.querySelector("[data-icon]").onchange = (e) => {
    item.icon = e.target.value;
    item.iconMode = "library";
    renderItems();
    renderPreview();
  };
  el.querySelector("[data-icon-upload]").onchange = async (e) => {
    const input = e.target;
    if (!input.files[0]) return;
    input.disabled = true;
    try {
      const asset = await TalentaMedia.upload(input.files[0], {
        altText: item.iconAlt || item.name,
      });
      item.mascotAssetId = asset.assetId;
      item.uploadedIcon = TalentaMedia.url(asset);
      item.iconMode = "upload";
      renderItems();
      renderPreview();
      toast("Logo atau maskot berhasil diunggah.");
    } catch (error) {
      toast(error.message);
    } finally {
      input.disabled = false;
    }
  };
  el.querySelector("[data-icon-alt]").oninput = (e) => {
    item.iconAlt = e.target.value;
    renderPreview();
  };
  const removeIcon = el.querySelector("[data-icon-remove]");
  if (removeIcon)
    removeIcon.onclick = () => {
      item.uploadedIcon = "";
      item.iconMode = "library";
      renderItems();
      renderPreview();
    };
  el.querySelector("[data-active]").onchange = (e) => {
    item.active = e.target.checked;
    renderPreview();
  };
  el.querySelector("[data-delete]").onclick = async () => {
    const confirmed = await adminConfirm({
      title: "Hapus lomba dari Arsip?",
      message: `${item.name} beserta relasinya akan disembunyikan dari Arsip, Unduh, dan riwayat Pemenang setelah perubahan disimpan.`,
      confirmLabel: "Ya, hapus lomba",
      variant: "danger",
      icon: "archive-x",
    });
    if (!confirmed) return;
    if (!item.isNew) archiveRemovedItems.set(item.id, { ...item });
    archiveState.removedCompetitionIds = [
      ...new Set([...(archiveState.removedCompetitionIds || []), item.id]),
    ];
    archiveState.items = archiveState.items.filter((x) => x.id !== item.id);
    renderItems();
    renderPreview();
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
  const id = uid();
  archiveState.removedCompetitionIds = (
    archiveState.removedCompetitionIds || []
  ).filter((removedId) => removedId !== id);
  archiveState.items.push({
    id,
    name: "Ajang Talenta Baru",
    shortName: "Ajang Baru",
    status: "published",
    icon: "award",
    iconMode: "library",
    uploadedIcon: "",
    iconAlt: "",
    description: "Deskripsi singkat ajang talenta.",
    active: true,
    documents: [],
    winnerCategories: [],
    skDocument: null,
    isNew: true,
    slug: `event-${Date.now()}`,
  });
  renderItems();
  renderPreview();
}
function renderPreview() {
  const root = document.getElementById("archivePreview");
  applyGlobalTheme(root);
  if (!archiveState.active) {
    root.className = "archive-list-public-preview";
    root.innerHTML =
      '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Halaman Arsip dinonaktifkan</strong><span>Data lomba tetap tersimpan.</span></div>';
    icons();
    return;
  }
  const page = normalizeArchivePage(archiveState);
  const items = resolvePublicArchivedCompetitions(
    archiveState.items.map(normalizeArchiveCompetition).filter(Boolean),
  );
  root.className = "archive-list-public-preview scaled-public-preview";
  root.innerHTML = buildArchiveListMarkup(page, items);
  requestAnimationFrame(fitArchivePreview);
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
        document.getElementById("archivePreviewFrame").dataset.previewMode =
          btn.dataset.archivePreview;
        requestAnimationFrame(fitArchivePreview);
      }),
  );
  document.getElementById("archiveEditorForm").onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.submitter;
    if (submit) submit.disabled = true;
    try {
      for (const removedId of archiveState.removedCompetitionIds || []) {
        const removed = archiveRemovedItems.get(removedId);
        if (removed?.version) await TalentaArchiveApi.remove(removed);
      }
      for (const item of archiveState.items) {
        if (item.isNew) {
          const created = await TalentaArchiveApi.create({
            ...item,
            slug: slugify(item.slug || item.name),
          });
          item.id = created.id;
          item.version = 1;
          item.isNew = false;
        }
        const updated = await TalentaArchiveApi.update(item);
        item.version = updated.version;
        if (item.active && item.status !== "published") {
          const published = await TalentaArchiveApi.publish(item);
          item.version = published.version;
          item.status = published.publicationStatus;
        }
      }
      archiveState.removedCompetitionIds = [];
      toast("Perubahan Arsip tersimpan ke database.");
      await hydrateArchive();
    } catch (error) {
      toast(error.message);
    } finally {
      if (submit) submit.disabled = false;
    }
  };
  document.getElementById("archiveReset").onclick = async () => {
    const confirmed = await adminConfirm({
      title: "Reset seluruh Arsip?",
      message:
        "Urutan, tampilan, lomba tambahan, dan perubahan Detail Arsip akan dikembalikan ke data template awal.",
      confirmLabel: "Ya, reset Arsip",
      variant: "danger",
      icon: "rotate-ccw",
    });
    if (!confirmed) return;
    resetArchiveAdminState();
    location.reload();
  };
}
sync();
renderItems();
renderPreview();
setupArchivePreviewSizing();
subscribeGlobalSettings(() => {
  applyGlobalThemeTokens(document.documentElement);
  renderPreview();
});
bind();
icons();
void hydrateArchive();

function setupArchivePreviewSizing() {
  const frame = document.getElementById("archivePreviewFrame");
  const root = document.getElementById("archivePreview");
  frame.dataset.previewMode = frame.dataset.previewMode || "desktop";
  archivePreviewResizeObserver?.disconnect();
  archivePreviewResizeObserver = new ResizeObserver(fitArchivePreview);
  archivePreviewResizeObserver.observe(frame);
  archivePreviewResizeObserver.observe(root);
  requestAnimationFrame(fitArchivePreview);
}

function fitArchivePreview() {
  const frame = document.getElementById("archivePreviewFrame");
  const root = document.getElementById("archivePreview");
  if (!frame || !root || !root.classList.contains("scaled-public-preview"))
    return;
  const designWidths = { desktop: 1425, tablet: 753, mobile: 375 };
  const mode = frame.dataset.previewMode || "desktop";
  const designWidth = designWidths[mode] || designWidths.desktop;
  const frameStyle = getComputedStyle(frame);
  const horizontalPadding =
    parseFloat(frameStyle.paddingLeft) + parseFloat(frameStyle.paddingRight);
  const verticalPadding =
    parseFloat(frameStyle.paddingTop) + parseFloat(frameStyle.paddingBottom);
  const availableWidth = Math.max(1, frame.clientWidth - horizontalPadding);
  const scale = Math.min(1, availableWidth / designWidth);
  root.style.setProperty("--public-preview-scale", String(scale));
  frame.style.height = `${Math.ceil(root.offsetHeight * scale + verticalPadding)}px`;
}

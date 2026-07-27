const PARTNER_CATEGORIES = [
  ["organizer", "Penyelenggara"],
  ["main", "Mitra Utama"],
  ["sponsor", "Sponsor"],
  ["media", "Media Partner"],
  ["supporter", "Pendukung"],
];
const partnerDefaults = {
  active: true,
  eyebrow: "Mitra & Partner",
  title: "Didukung Oleh",
  description: "",
  background: "soft",
  alignment: "center",
  variant: "simple",
  size: "medium",
  showCategories: false,
  items: [
    partnerItem(
      "Mitra OAIN",
      "../../../packages/shared/images/mitra-oain.jpg",
      "Mitra OAIN",
      "main",
    ),
    partnerItem(
      "Talenta Prestasi Indonesia",
      "../../../packages/shared/images/mitra-talenta.png",
      "Talenta Prestasi Indonesia",
      "organizer",
    ),
  ],
};
function partnerItem(name, logo = "", alt = "", category = "supporter") {
  return {
    name,
    logo,
    alt: alt || name,
    category,
    label: "",
    url: "",
    newTab: false,
    active: true,
  };
}
let partnerState = {
  ...structuredClone(partnerDefaults),
  ...(state.partners || {}),
};
partnerState.items = (partnerState.items || partnerDefaults.items).map(
  (x, i) => ({
    ...(partnerDefaults.items[i] || partnerDefaults.items[0]),
    ...x,
  }),
);
state.partners = partnerState;
document.addEventListener("DOMContentLoaded", () => {
  bindPartner();
  syncPartner();
  renderPartnerItems();
  renderPartners();
  icons();
});
function bindPartner() {
  bindText(
    ["partnerEyebrow", "partnerTitle", "partnerDescription"],
    partnerState,
    renderPartners,
  );
  bindToggle("partnerActive", partnerState, renderPartners);
  const selects = {
    partnerBackground: "background",
    partnerAlignment: "alignment",
    partnerVariant: "variant",
    partnerSize: "size",
  };
  Object.entries(selects).forEach(
    ([id, k]) =>
      (document.getElementById(id).onchange = (e) => {
        partnerState[k] = e.target.value;
        renderPartners();
      }),
  );
  document.getElementById("partnerShowCategories").onchange = (e) => {
    partnerState.showCategories = e.target.checked;
    renderPartners();
  };
  document.getElementById("addPartner").onclick = () => {
    partnerState.items.push(partnerItem("Mitra baru", "", "Logo Mitra baru"));
    renderPartnerItems();
    renderPartners();
  };
  bindPreview(
    "[data-partner-preview]",
    "partnerPreviewFrame",
    "partner-preview-frame",
    "partnerPreview",
  );
  document.getElementById("homeEditorForm").addEventListener("submit", () => {
    state.partners = partnerState;
    localStorage.setItem(HOME_KEY, JSON.stringify(state));
  });
}
function syncPartner() {
  Object.entries({
    partnerActive: partnerState.active,
    partnerEyebrow: partnerState.eyebrow,
    partnerTitle: partnerState.title,
    partnerDescription: partnerState.description,
    partnerBackground: partnerState.background,
    partnerAlignment: partnerState.alignment,
    partnerVariant: partnerState.variant,
    partnerSize: partnerState.size,
    partnerShowCategories: partnerState.showCategories,
  }).forEach(([id, v]) => {
    const e = document.getElementById(id);
    if (e.type === "checkbox") e.checked = v;
    else e.value = v;
  });
}
function renderPartnerItems() {
  const root = document.getElementById("partnerItemEditor");
  root.innerHTML = "";
  partnerState.items.forEach((item, i) => {
    const el = document.createElement("article");
    el.className = "partner-editor-card";
    el.innerHTML = `<div class="schedule-editor-card__head"><span class="admin-step">${String(i + 1).padStart(2, "0")}</span><strong>Data Mitra</strong>${toggleHtml(item)}<button type="button" class="repeat-row__delete"><i data-lucide="trash-2"></i></button></div><div class="partner-logo-control"><div class="partner-logo-control__preview">${item.logo ? `<img src="${item.logo}" alt="${esc(item.alt)}">` : `<span>${esc(item.name)}</span>`}</div><div><label class="btn btn--outline btn--sm">${item.logo ? "Ganti logo" : "Upload logo"}<input type="file" data-logo accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>${item.logo ? '<button type="button" class="icon-remove" data-remove-logo>Hapus logo</button>' : ""}<small>PNG, JPG, WebP, SVG · maks. 2 MB</small></div></div><div class="admin-form-grid"><div class="admin-field"><label>Nama mitra</label><input class="form-input" data-k="name" value="${esc(item.name)}"></div><div class="admin-field"><label>Alt text logo</label><input class="form-input" data-k="alt" value="${esc(item.alt)}"></div><div class="admin-field"><label>Kategori</label><select class="form-input" data-k="category">${PARTNER_CATEGORIES.map((x) => `<option value="${x[0]}" ${item.category === x[0] ? "selected" : ""}>${x[1]}</option>`).join("")}</select></div><div class="admin-field"><label>Label opsional</label><input class="form-input" data-k="label" value="${esc(item.label)}"></div><div class="admin-field admin-field--wide"><label>URL website opsional</label><input class="form-input" data-k="url" value="${esc(item.url)}"></div></div><label class="editor-check"><input type="checkbox" data-newtab ${item.newTab ? "checked" : ""}> Buka URL di tab baru</label>`;
    el.querySelectorAll("[data-k]").forEach(
      (x) =>
        (x.oninput = () => {
          item[x.dataset.k] = x.value;
          renderPartners();
        }),
    );
    wireItemToggle(el, item, renderPartners);
    el.querySelector("[data-newtab]").onchange = (e) =>
      (item.newTab = e.target.checked);
    el.querySelector("[data-logo]").onchange = (e) =>
      readImage(e.target.files[0], 2, (data) => {
        item.logo = data;
        renderPartnerItems();
        renderPartners();
      });
    const remove = el.querySelector("[data-remove-logo]");
    if (remove)
      remove.onclick = () => {
        item.logo = "";
        renderPartnerItems();
        renderPartners();
      };
    el.querySelector(".repeat-row__delete").onclick = () =>
      removeItem(
        partnerState.items,
        i,
        "mitra",
        renderPartnerItems,
        renderPartners,
      );
    root.appendChild(el);
  });
  icons();
}
function partnerLogo(item) {
  const visual = item.logo
    ? `<img src="${item.logo}" alt="${esc(item.alt)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><b hidden>${esc(item.name)}</b>`
    : `<b>${esc(item.name)}</b>`;
  return `${item.url ? `<a href="${esc(item.url)}">` : "<div>"}<span class="partner-preview__logo">${visual}</span>${partnerState.variant === "card" && (item.label || item.name) ? `<small>${esc(item.label || item.name)}</small>` : ""}${item.url ? "</a>" : "</div>"}`;
}
function renderPartners() {
  const root = document.getElementById("partnerPreview"),
    p = partnerState,
    t = theme();
  applyTheme(root, t);
  if (!p.active) return disabled(root, "Mitra & Partner");
  const items = p.items.filter((x) => x.active);
  root.className = `partner-preview partner-preview--${p.background} partner-preview--${p.alignment} partner-preview--${p.variant} partner-preview--${p.size}`;
  let content = "";
  if (p.showCategories) {
    PARTNER_CATEGORIES.forEach((cat) => {
      const list = items.filter((x) => x.category === cat[0]);
      if (list.length)
        content += `<section><h3>${cat[1]}</h3><div class="partner-preview__grid">${list.map(partnerLogo).join("")}</div></section>`;
    });
  } else
    content = `<div class="partner-preview__grid">${items.map(partnerLogo).join("")}</div>`;
  root.innerHTML = `<header><span>${esc(p.eyebrow)}</span><h2>${esc(p.title)}</h2>${p.description ? `<p>${esc(p.description)}</p>` : ""}</header>${items.length ? content : '<div class="partner-empty">Belum ada logo mitra aktif.</div>'}`;
  icons();
}

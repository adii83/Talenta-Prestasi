function partnerAssetUrl(value = "") {
  const source = String(value).trim();
  if (!source || /^(?:data:|blob:|https?:\/\/)/i.test(source)) return source;
  const file = source.match(/(?:template|public-site)\/assets\/images\/([^/?#]+)$/i)?.[1];
  if (!file || typeof TalentaPaths === "undefined") return source;
  return new URL(`assets/images/${file}`, TalentaPaths.to("publicSite.home"))
    .href;
}

const partnerDefaults = {
  active: true,
  eyebrow: "Mitra & Partner",
  title: "Didukung Oleh",
  background: "soft",
  alignment: "center",
  variant: "simple",
  size: "medium",
  items: [
    partnerItem(
      "Mitra OAIN",
      "../../../../public-site/assets/images/mitra-oain.jpg",
      "Mitra OAIN",
    ),
    partnerItem(
      "Talenta Prestasi Indonesia",
      "../../../../public-site/assets/images/mitra-talenta.png",
      "Talenta Prestasi Indonesia",
    ),
  ],
};
function partnerItem(name, logo = "", alt = "") {
  return {
    name,
    logo,
    alt: alt || name,
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
  bindText(["partnerEyebrow", "partnerTitle"], partnerState, renderPartners);
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
  setupScaledPreview("partnerPreviewFrame", "partnerPreview", "partnerPreview");
}
function syncPartner() {
  Object.entries({
    partnerActive: partnerState.active,
    partnerEyebrow: partnerState.eyebrow,
    partnerTitle: partnerState.title,
    partnerBackground: partnerState.background,
    partnerAlignment: partnerState.alignment,
    partnerVariant: partnerState.variant,
    partnerSize: partnerState.size,
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
    el.innerHTML = `<div class="schedule-editor-card__head"><span class="admin-step">${String(i + 1).padStart(2, "0")}</span><strong>Data Mitra</strong>${toggleHtml(item)}<button type="button" class="repeat-row__delete"><i data-lucide="trash-2"></i></button></div><div class="partner-logo-control"><div class="partner-logo-control__preview">${item.logo ? `<img src="${esc(partnerAssetUrl(item.logo))}" alt="${esc(item.alt)}">` : `<span>${esc(item.name)}</span>`}</div><div><label class="btn btn--outline btn--sm">${item.logo ? "Ganti logo" : "Upload logo"}<input type="file" data-logo accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>${item.logo ? '<button type="button" class="icon-remove" data-remove-logo>Hapus logo</button>' : ""}<small>PNG, JPG, WebP, SVG · maks. 5 MB</small></div></div><div class="admin-form-grid"><div class="admin-field"><label>Nama mitra</label><input class="form-input" data-k="name" value="${esc(item.name)}"></div><div class="admin-field"><label>Alt text logo</label><input class="form-input" data-k="alt" value="${esc(item.alt)}"></div><div class="admin-field admin-field--wide"><label>URL website opsional</label><input class="form-input" data-k="url" value="${esc(item.url)}"></div></div><label class="editor-check"><input type="checkbox" data-newtab ${item.newTab ? "checked" : ""}> Buka URL di tab baru</label>`;
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
function renderPartners() {
  const root = document.getElementById("partnerPreview"),
    p = partnerState,
    t = theme();
  root.className = `section scaled-public-preview partner-public-preview${
    p.background === "white" ? "" : " section--soft"
  }`;
  applyTheme(root, t);
  if (!p.active) return disabled(root, "Mitra & Partner");
  root.innerHTML = buildHomePartnerMarkup(p, {
    resolveAsset: partnerAssetUrl,
    resolveUrl: () => "#",
    linkAttributes: () => ' data-partner-preview-link="true"',
  });
  root.querySelectorAll("[data-partner-preview-link]").forEach(
    (link) =>
      (link.onclick = (event) => {
        event.preventDefault();
      }),
  );
  root
    .querySelectorAll("img")
    .forEach(
      (image) => (image.onload = () => fitScaledPreview("partnerPreviewFrame")),
    );
  requestAnimationFrame(() => fitScaledPreview("partnerPreviewFrame"));
  icons();
}

const pricingDefaults = {
  active: true,
  eyebrow: "Biaya Pendaftaran",
  variant: "single",
  ornament: true,
  packages: [
    pricingPackage("Semua Jenjang", "Rp150.000", "per peserta, semua jenjang"),
  ],
  features: [
    pricingFeature("Sertifikat digital"),
    pricingFeature("Akses materi"),
    pricingFeature("ID Card peserta"),
  ],
};
function pricingPackage(name, price, unit) {
  return {
    name,
    price,
    unit,
    featured: false,
    active: true,
  };
}
function pricingFeature(label) {
  return { label, active: true };
}
let pricingState = {
  ...structuredClone(pricingDefaults),
  ...(state.pricing || {}),
};
pricingState.packages = (pricingState.packages || pricingDefaults.packages).map(
  (x) => ({ ...pricingDefaults.packages[0], ...x }),
);
pricingState.features =
  pricingState.features || structuredClone(pricingDefaults.features);
state.pricing = pricingState;
document.addEventListener("DOMContentLoaded", () => {
  bindPricing();
  syncPricing();
  renderPricingAll();
  icons();
});
function bindPricing() {
  bindText(["pricingEyebrow"], pricingState, renderPricing);
  bindToggle("pricingActive", pricingState, renderPricing);
  document.getElementById("pricingVariant").onchange = (e) => {
    pricingState.variant = e.target.value;
    renderPricing();
  };
  document.getElementById("pricingOrnament").onchange = (e) => {
    pricingState.ornament = e.target.checked;
    renderPricing();
  };
  document.getElementById("addPricingPackage").onclick = () => {
    pricingState.packages.push(
      pricingPackage("Paket baru", "Rp0", "per peserta"),
    );
    renderPricingPackages();
    renderPricing();
  };
  document.getElementById("addPricingFeature").onclick = () => {
    pricingState.features.push(pricingFeature("Fasilitas baru"));
    renderPricingFeatures();
    renderPricing();
  };
  bindPreview(
    "[data-pricing-preview]",
    "pricingPreviewFrame",
    "pricing-preview-frame",
    "pricingPreview",
  );
  setupScaledPreview("pricingPreviewFrame", "pricingPreview", "pricingPreview");
}
function syncPricing() {
  Object.entries({
    pricingActive: pricingState.active,
    pricingEyebrow: pricingState.eyebrow,
    pricingVariant: pricingState.variant,
    pricingOrnament: pricingState.ornament,
  }).forEach(([id, v]) => {
    const e = document.getElementById(id);
    if (e.type === "checkbox") e.checked = v;
    else e.value = v;
  });
}
function renderPricingAll() {
  renderPricingPackages();
  renderPricingFeatures();
  renderPricing();
}
function renderPricingPackages() {
  const root = document.getElementById("pricingPackageEditor");
  root.innerHTML = "";
  pricingState.packages.forEach((pkg, i) => {
    const el = document.createElement("article");
    el.className = "pricing-editor-card";
    el.innerHTML = `<div class="schedule-editor-card__head"><span class="admin-step">${String(i + 1).padStart(2, "0")}</span><strong>Paket Harga</strong>${toggleHtml(pkg)}<button type="button" class="repeat-row__delete"><i data-lucide="trash-2"></i></button></div><div class="admin-form-grid"><div class="admin-field"><label>Nama paket / jenjang</label><input class="form-input" data-k="name" value="${esc(pkg.name)}"></div><div class="admin-field"><label>Harga utama</label><input class="form-input" data-k="price" value="${esc(pkg.price)}"></div><div class="admin-field"><label>Keterangan harga</label><input class="form-input" data-k="unit" value="${esc(pkg.unit)}"></div></div><label class="editor-check"><input type="checkbox" data-featured ${pkg.featured ? "checked" : ""}> Tandai sebagai paket unggulan</label>`;
    el.querySelectorAll("[data-k]").forEach(
      (x) =>
        (x.oninput = () => {
          pkg[x.dataset.k] = x.value;
          renderPricing();
        }),
    );
    wireItemToggle(el, pkg, renderPricing);
    el.querySelector("[data-featured]").onchange = (e) => {
      pkg.featured = e.target.checked;
      renderPricing();
    };
    el.querySelector(".repeat-row__delete").onclick = () =>
      removeItem(
        pricingState.packages,
        i,
        "paket harga",
        renderPricingPackages,
        renderPricing,
      );
    root.appendChild(el);
  });
  icons();
}
function renderPricingFeatures() {
  const root = document.getElementById("pricingFeatureEditor");
  root.innerHTML = "";
  pricingState.features.forEach((f, i) => {
    const el = document.createElement("div");
    el.className = "repeat-row";
    el.innerHTML = `<span class="repeat-row__grip"><i data-lucide="check-circle"></i></span><input class="form-input" value="${esc(f.label)}">${toggleHtml(f)}<button type="button" class="repeat-row__delete"><i data-lucide="trash-2"></i></button>`;
    el.querySelector(".form-input").oninput = (e) => {
      f.label = e.target.value;
      renderPricing();
    };
    wireItemToggle(el, f, renderPricing);
    el.querySelector("button").onclick = () =>
      removeItem(
        pricingState.features,
        i,
        "fasilitas",
        renderPricingFeatures,
        renderPricing,
      );
    root.appendChild(el);
  });
  icons();
}
function renderPricing() {
  const root = document.getElementById("pricingPreview"),
    p = pricingState,
    t = theme();
  root.className =
    "section section--soft scaled-public-preview pricing-public-preview";
  applyTheme(root, t);
  if (!p.active) return disabled(root, "Biaya Pendaftaran");
  root.innerHTML = buildHomePricingMarkup(p);
  requestAnimationFrame(() => fitScaledPreview("pricingPreviewFrame"));
  icons();
}

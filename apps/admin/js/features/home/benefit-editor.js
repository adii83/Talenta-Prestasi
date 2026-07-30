const benefitDefaults = {
  active: true,
  eyebrow: "Benefit",
  title: "Keuntungan Mengikuti Ajang Talenta",
  description:
    "Lebih dari sekadar ajang talenta — ini adalah kesempatan untuk berkembang.",
  background: "white",
  alignment: "center",
  variant: "standard",
  cards: [
    benefitCard(
      "Sertifikat Resmi",
      "Setiap peserta mendapatkan sertifikat digital yang dapat digunakan sebagai portofolio akademik.",
      "award",
    ),
    benefitCard(
      "Penilaian Transparan",
      "Sistem penilaian terbuka dengan peringkat nasional, provinsi, dan kabupaten/kota.",
      "bar-chart-3",
    ),
    benefitCard(
      "Akses Materi",
      "Dapatkan akses ke kisi-kisi dan materi persiapan yang disusun oleh tim akademik.",
      "book-open",
    ),
    benefitCard(
      "Jaringan Nasional",
      "Bergabung dengan ribuan siswa berprestasi dari seluruh Indonesia dalam satu ajang talenta.",
      "users",
    ),
  ],
};
function benefitCard(title, description, icon) {
  return {
    title,
    description,
    url: "",
    newTab: false,
    active: true,
    iconMode: "library",
    libraryIcon: icon,
    uploadedIcon: "",
    iconAlt: "",
  };
}
let benefitState = {
  ...structuredClone(benefitDefaults),
  ...(state.benefit || {}),
};
benefitState.cards = (benefitState.cards || benefitDefaults.cards).map(
  (x, i) => ({
    ...(benefitDefaults.cards[i] || benefitDefaults.cards[0]),
    ...x,
  }),
);
state.benefit = benefitState;
document.addEventListener("DOMContentLoaded", () => {
  bindBenefit();
  syncBenefit();
  renderBenefitCards();
  renderBenefit();
  icons();
});
function bindBenefit() {
  bindText(
    ["benefitEyebrow", "benefitTitle", "benefitDescription"],
    benefitState,
    renderBenefit,
  );
  bindToggle("benefitActive", benefitState, renderBenefit);
  ["benefitBackground", "benefitAlignment", "benefitVariant"].forEach(
    (id) =>
      (document.getElementById(id).onchange = (e) => {
        benefitState[
          id.replace("benefit", "").replace(/^./, (c) => c.toLowerCase())
        ] = e.target.value;
        renderBenefit();
      }),
  );
  document.getElementById("addBenefitCard").onclick = () => {
    benefitState.cards.push(
      benefitCard(
        "Benefit baru",
        "Jelaskan keuntungan yang didapat peserta.",
        "sparkles",
      ),
    );
    renderBenefitCards();
    renderBenefit();
  };
  bindPreview(
    "[data-benefit-preview]",
    "benefitPreviewFrame",
    "benefit-preview-frame",
    "benefitPreview",
  );
  setupScaledPreview("benefitPreviewFrame", "benefitPreview", "benefitPreview");
}
function syncBenefit() {
  Object.entries({
    benefitActive: benefitState.active,
    benefitEyebrow: benefitState.eyebrow,
    benefitTitle: benefitState.title,
    benefitDescription: benefitState.description,
    benefitBackground: benefitState.background,
    benefitAlignment: benefitState.alignment,
    benefitVariant: benefitState.variant,
  }).forEach(([id, v]) => {
    const e = document.getElementById(id);
    if (e.type === "checkbox") e.checked = v;
    else e.value = v;
  });
}
function renderBenefitCards() {
  const root = document.getElementById("benefitCardEditor");
  root.innerHTML = "";
  benefitState.cards.forEach((card, i) => {
    const el = document.createElement("article");
    el.className = "benefit-editor-card";
    el.innerHTML = `<div class="schedule-editor-card__head"><span class="admin-step">${String(i + 1).padStart(2, "0")}</span><strong>Kartu Benefit</strong>${toggleHtml(card)}<button type="button" class="repeat-row__delete"><i data-lucide="trash-2"></i></button></div><div class="admin-form-grid"><div class="admin-field"><label>Judul kartu</label><input class="form-input" data-k="title" value="${esc(card.title)}"></div><div class="admin-field admin-field--wide"><label>Deskripsi</label><textarea class="form-input editor-textarea" data-k="description">${esc(card.description)}</textarea></div><div class="admin-field"><label>URL opsional</label><input class="form-input" data-k="url" value="${esc(card.url)}" placeholder="Kosongkan jika kartu tidak diklik"></div></div><div class="benefit-card-options"><label class="editor-check"><input type="checkbox" data-newtab ${card.newTab ? "checked" : ""}> Buka URL di tab baru</label></div>${iconControl(card, "benefit-" + i)}`;
    el.querySelectorAll("[data-k]").forEach(
      (x) =>
        (x.oninput = () => {
          card[x.dataset.k] = x.value;
          renderBenefit();
        }),
    );
    wireItemToggle(el, card, renderBenefit);
    el.querySelector("[data-newtab]").onchange = (e) =>
      (card.newTab = e.target.checked);
    wireIcon(el, card, renderBenefit);
    el.querySelector(".repeat-row__delete").onclick = () =>
      removeItem(
        benefitState.cards,
        i,
        "kartu Benefit",
        renderBenefitCards,
        renderBenefit,
      );
    root.appendChild(el);
  });
  icons();
}
function renderBenefit() {
  const root = document.getElementById("benefitPreview"),
    b = benefitState,
    t = theme();
  root.className = `section scaled-public-preview benefit-public-preview${
    b.background === "soft" ? " section--soft" : ""
  }`;
  applyTheme(root, t);
  if (!b.active) return disabled(root, "Benefit");
  root.innerHTML = buildHomeBenefitMarkup(b, {
    renderIcon: heroPreviewIconMarkup,
    resolveUrl: () => "#",
    linkAttributes: () => ' data-benefit-preview-link="true"',
  });
  root.querySelectorAll("[data-benefit-preview-link]").forEach(
    (link) =>
      (link.onclick = (event) => {
        event.preventDefault();
      }),
  );
  requestAnimationFrame(() => fitScaledPreview("benefitPreviewFrame"));
  icons();
}

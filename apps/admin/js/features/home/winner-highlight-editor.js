const WINNER_MANAGER_KEY = "talenta_winner_manager_v1",
  WINNER_PAGE_KEY = "talenta_winner_page_v1";
const winnerDefaults = {
  active: false,
  eyebrow: "Pengumuman",
  title: "Selamat Kepada Para Pemenang!",
  description: "Berikut adalah pemenang ajang talenta nasional tahun ini.",
  background: "navy",
  alignment: "center",
};
let winnerState = {
  ...structuredClone(winnerDefaults),
  ...(state.winnerHighlight || {}),
};
state.winnerHighlight = winnerState;
console.info("[Highlight audit] editor dimuat", {
  active: winnerState.active,
  storedActive: getHomeAdminState().winnerHighlight.active,
});
let winnerCategoriesData =
  typeof getPublicWinnerState === "function"
    ? getPublicWinnerState().manager.categories
    : [];
let winnerDisplayData = {
  showPhoto: true,
  showSchool: true,
  showExam: true,
  showRegency: true,
  showProvince: true,
};

async function fetchRealWinnerData() {
  const site = window.parent?.TalentaAdminAuth?.currentSite?.();
  if (!site?.id) return;
  try {
    const [pagesReq, catReq, winReq] = await Promise.all([
      TalentaApi.request(`/admin/events/${site.id}/pages/winners`),
      TalentaApi.request(`/admin/events/${site.id}/winner-categories`),
      TalentaApi.request(`/admin/events/${site.id}/winners`),
    ]);
    winnerDisplayData = pagesReq.data.metadataVisibility || winnerDisplayData;
    winnerCategoriesData = (
      await Promise.all(
        catReq.data
          .filter((category) => category.isActive)
          .map(async (category) => ({
            ...category,
            winners: await Promise.all(
              winReq.data
                .filter(
                  (winner) =>
                    winner.categoryId === category.id && winner.isActive,
                )
                .map(async (winner) => ({
                  ...winner,
                  name: winner.fullName || "",
                  rank: winner.rankLabel || "",
                  exam: winner.examNumber || "",
                  displayMode: winner.displayMode || "built_in",
                  designAssetId: winner.designAssetId || null,
                  design: winner.designAssetId
                    ? await TalentaMedia.adminPreviewUrl(winner.designAssetId, {
                        siteId: site.id,
                      })
                    : "",
                  photo: winner.photoAssetId
                    ? await TalentaMedia.adminPreviewUrl(winner.photoAssetId, {
                        siteId: site.id,
                      })
                    : "",
                })),
            ),
          })),
      )
    ).filter((category) => category.winners.length > 0);
  } catch (e) {
    console.warn("Gagal memuat data pemenang untuk pratinjau", e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  bindWinner();
  syncWinner();
  renderWinner();
  icons();
  await fetchRealWinnerData();
  renderWinner();
  icons();
});
document.addEventListener("talenta:home-before-save", () => {
  // Menjamin nilai toggle dan pengaturan Highlight masuk ke transaksi Simpan Beranda.
  state.winnerHighlight = structuredClone(winnerState);
});
function bindWinner() {
  bindText(
    ["winnerEyebrow", "winnerTitle", "winnerDescription"],
    winnerState,
    renderWinner,
  );
  document.getElementById("winnerHighlightActive").onchange = (event) => {
    winnerState.active = event.target.checked;
    state.winnerHighlight = winnerState;
    console.info("[Highlight audit] toggle diubah", {
      active: winnerState.active,
    });
    event.target.parentElement.querySelector("em").textContent = event.target
      .checked
      ? "Aktif"
      : "Nonaktif";
    renderWinner();
  };
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
  setupScaledPreview("winnerPreviewFrame", "winnerPreview", "winnerPreview");
  addEventListener("storage", async (e) => {
    if (e.key === WINNER_MANAGER_KEY || e.key === WINNER_PAGE_KEY) {
      await fetchRealWinnerData();
      renderWinner();
    }
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
    if (e.type === "checkbox") {
      e.checked = v;
      e.parentElement.querySelector("em").textContent = v
        ? "Aktif"
        : "Nonaktif";
    } else e.value = v;
  });
}
function renderWinner() {
  const root = document.getElementById("winnerPreview"),
    w = winnerState,
    t = theme(),
    display = winnerDisplayData,
    cats = winnerCategoriesData;
  applyTheme(root, t);
  if (!w.active) return disabled(root, "Highlight Pemenang");
  root.className = `section scaled-public-preview winner-highlight-preview${
    w.background === "soft"
      ? " section--soft"
      : " section--navy section--winner-gradient"
  }`;
  root.innerHTML = buildHomeWinnerMarkup(w, cats, display, {
    resolveAsset: (value) => value || "",
  });
  activateWinnerCardFallbacks(root);
  requestAnimationFrame(() => fitScaledPreview("winnerPreviewFrame"));
  icons();
}

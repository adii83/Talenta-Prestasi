/* Renderer publik FAQ — state mandiri dan markup template asli. */
(() => {
  const root = document.getElementById("faqPublicRoot");
  if (!root) return;
  function render() {
    const state = getPublicFaqState();
    root.innerHTML = buildFaqPageMarkup(state, {
      idPrefix: "public-faq",
      homeHref: TalentaPaths.to("template.home"),
    });
    document.title = `${state.page.title} — Olimpiade Sains Nusantara`;
    bindFaqAccordion(root);
    lucide.createIcons();
  }
  render();
  window.addEventListener("talenta:faq", render);
  window.addEventListener("storage", (event) => {
    if (event.key === FAQ_STATE_KEY || event.key === null) render();
  });
})();

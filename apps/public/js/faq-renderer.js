/* Renderer publik FAQ — state mandiri dan markup template asli. */
(() => {
  const root = document.getElementById("faqPublicRoot");
  if (!root) return;
  const esc = (v = "") => {
    const n = document.createElement("div");
    n.textContent = v;
    return n.innerHTML;
  };
  const state = getPublicFaqState(),
    page = state.page;
  if (!page.active) {
    root.innerHTML =
      '<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="eye-off"></i><h1 class="t-h2">FAQ tidak tersedia</h1><p>Halaman bantuan sedang dinonaktifkan.</p><a class="btn btn--outline" href="${TalentaPaths.to("public.home")}">Kembali ke Beranda</a></div></div></section>';
    lucide.createIcons();
    return;
  }
  const categories = state.categories
    .map(
      (category) =>
        `<section class="faq-category"><h2 class="faq-category__title">${esc(category.title)}</h2><div class="accordion">${category.questions.map((question) => `<div class="accordion__item"><button class="accordion__trigger" type="button" aria-expanded="false" aria-controls="${esc(question.id)}"><span>${esc(question.question)}</span><svg class="accordion__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="accordion__content" id="${esc(question.id)}"><div class="accordion__body">${esc(question.answer).replace(/\n/g, "<br>")}</div></div></div>`).join("")}</div></section>`,
    )
    .join("");
  root.innerHTML = `<section class="section"><div class="container"><div class="section__header${page.alignment === "left" ? " section__header--left" : ""}"><p class="t-eyebrow">${esc(page.eyebrow)}</p><h1 class="t-h1">${esc(page.title)}</h1><p>${esc(page.description)}</p></div>${categories || '<div class="public-empty-state public-empty-state--compact"><p>Belum ada pertanyaan yang dipublikasikan.</p></div>'}</div></section>`;
  document.title = `${page.title} — Olimpiade Sains Nusantara`;
  initAccordion(root);
  lucide.createIcons();
})();

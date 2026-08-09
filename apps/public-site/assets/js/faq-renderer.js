/* Renderer publik FAQ — state API dengan fallback baseline. */
(() => {
  const root = document.getElementById("faqPublicRoot");
  if (!root) return;
  function render(apiData) {
    const baseline = getPublicFaqState();
    const state = apiData
      ? {
          page: {
            ...baseline.page,
            active: apiData.page?.isActive ?? baseline.page.active,
            eyebrow: apiData.page?.eyebrow || baseline.page.eyebrow,
            title: apiData.page?.title || baseline.page.title,
            description: apiData.page?.description || baseline.page.description,
            alignment: apiData.page?.alignment || baseline.page.alignment,
          },
          categories: apiData.categories.map((category, categoryIndex) => ({
            id: `api-category-${categoryIndex}`,
            active: true,
            title: category.title,
            questions: category.questions.map((question, questionIndex) => ({
              id: `api-question-${categoryIndex}-${questionIndex}`,
              active: true,
              question: question.question,
              answer: question.answer,
            })),
          })),
        }
      : baseline;
    root.innerHTML = buildFaqPageMarkup(state, {
      idPrefix: "public-faq",
      homeHref: TalentaPaths.to("publicSite.home"),
    });
    document.title = `${state.page.title} — ${apiData?.site?.name || "Talenta Prestasi"}`;
    bindFaqAccordion(root);
    lucide.createIcons();
  }
  render();
  window.addEventListener("talenta:public:faq", (event) =>
    render(event.detail),
  );
  void TalentaPublic.load("faq").catch((error) =>
    console.error("FAQ API tidak tersedia; baseline ditampilkan.", error),
  );
})();

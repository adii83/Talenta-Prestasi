/* Renderer publik Arsip — resolver efektif dan class template asli. */
(() => {
  const root = document.getElementById("archivePublicRoot");
  if (!root) return;
  const esc = (value = "") => {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
  };
  const page = getEffectiveArchivePage();
  const competitions = getPublicArchivedCompetitions();
  if (!page.active) {
    root.innerHTML =
      '<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="eye-off"></i><h1 class="t-h2">Arsip tidak tersedia</h1><p>Halaman Arsip sedang dinonaktifkan.</p><a class="btn btn--outline" href="index.html">Kembali ke Beranda</a></div></div></section>';
    lucide.createIcons();
    return;
  }
  const leftClass = page.alignment === "left" ? " section__header--left" : "";
  root.innerHTML = `<section class="section" id="arsip"><div class="container"><div class="section__header${leftClass}"><p class="t-eyebrow">${esc(page.eyebrow)}</p><h1 class="t-h1">${esc(page.title)}</h1><p>${esc(page.description)}</p></div>${competitions.length ? `<div class="grid grid--3">${competitions.map((competition) => `<a href="arsip-detail.html?id=${encodeURIComponent(competition.id)}" class="lomba-card"><div class="lomba-card__thumb" style="background:${esc(competition.gradient)}"><i data-lucide="${esc(competition.icon || "archive")}"></i></div><div class="lomba-card__body"><h2 class="lomba-card__title">${esc(competition.name)}</h2><p class="lomba-card__desc">${esc(competition.description || "")}</p><span class="lomba-card__action">${esc(page.action)} <i data-lucide="arrow-right"></i></span></div></a>`).join("")}</div>` : '<div class="public-empty-state"><i data-lucide="archive-x"></i><h2 class="t-h2">Belum ada arsip</h2><p>Belum ada ajang terdahulu yang dipublikasikan.</p></div>'}</div></section>`;
  lucide.createIcons();
})();

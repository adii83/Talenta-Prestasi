/* Renderer publik Detail Arsip — satu competition berdasarkan query ?id=. */
(() => {
  const root = document.getElementById("archiveDetailPublicRoot");
  if (!root) return;
  const esc = (value = "") => {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
  };
  const initials = (name = "") =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  const id = new URLSearchParams(location.search).get("id");
  const competition = getPublicArchiveCompetitionById(id);
  if (!competition) {
    document.title = "Arsip Tidak Ditemukan — Olimpiade Sains Nusantara";
    root.innerHTML =
      '<section class="section"><div class="container"><div class="public-empty-state"><i data-lucide="file-question"></i><h1 class="t-h2">Detail arsip tidak tersedia</h1><p>ID lomba tidak ditemukan atau lomba sedang dinonaktifkan.</p><a class="btn btn--outline" href="${TalentaPaths.to("public.archive")}"><i data-lucide="arrow-left"></i>Kembali ke Arsip</a></div></div></section>';
    lucide.createIcons();
    return;
  }
  const detail = competition.detail || archiveDetailDefaults();
  const categories = (competition.winnerCategories || [])
    .filter(
      (category) =>
        category.active !== false &&
        !detail.hiddenCategoryIds.includes(category.id),
    )
    .map((category) => ({
      ...category,
      winners: (category.winners || []).filter(
        (winner) => winner.active !== false,
      ),
    }))
    .filter((category) => category.winners.length);
  const documents = (competition.documents || []).filter(
    (document) =>
      document.active !== false &&
      !detail.hiddenDocumentIds.includes(document.id),
  );
  const sk = getArchiveSkDocument(competition);
  const meta = (winner) =>
    `<div class="champion-card__meta">${detail.showExam !== false ? `<span><span class="meta-label">No. Ujian:</span> ${esc(winner.exam || "-")}</span>` : ""}${detail.showDistrict !== false ? `<span><span class="meta-label">Kecamatan:</span> ${esc(winner.district || "-")}</span>` : ""}${detail.showRegency !== false ? `<span><span class="meta-label">Kabupaten:</span> ${esc(winner.regency || "-")}</span>` : ""}${detail.showProvince !== false ? `<span><span class="meta-label">Provinsi:</span> ${esc(winner.province || "-")}</span>` : ""}</div>`;
  const winnerCard = (winner) =>
    `<article class="champion-card">${detail.showPhoto !== false ? `<div class="champion-card__photo">${winner.photo ? `<img src="${esc(winner.photo)}" alt="Foto ${esc(winner.name)}" onerror="this.remove();this.parentElement.textContent='${initials(winner.name)}'">` : initials(winner.name)}</div>` : ""}<p class="champion-card__rank t-mono">${esc(winner.rank)}</p><p class="champion-card__name">${esc(winner.name)}</p>${detail.showSchool !== false ? `<p class="champion-card__school">${esc(winner.school || "-")}</p>` : ""}${meta(winner)}</article>`;
  const winnersSection =
    detail.winnersActive !== false &&
    (categories.length || (detail.showSk !== false && sk))
      ? `<section class="section" id="pemenang"><div class="container"><div class="section__header section__header--left"><p class="t-eyebrow">${esc(detail.winnersEyebrow)}</p><h2 class="t-h2">${esc(detail.winnersTitle)}</h2></div>${detail.showSk !== false && sk ? `<div class="sk-banner"><div class="sk-banner__left"><div class="sk-banner__icon"><i data-lucide="file-check-2"></i></div><div class="sk-banner__content"><h3>${esc(sk.title)}</h3><p>${esc(sk.description || "Unduh dokumen resmi penetapan pemenang.")}</p></div></div><a href="${esc(sk.url || "#")}" class="btn btn--primary"><i data-lucide="download"></i>Unduh ${esc(sk.type || "PDF")}</a></div>` : ""}${categories.length ? `<div class="winner-section">${categories.map((category) => `<section class="winner-group"><h3 class="winner-group__title"><i data-lucide="${esc(category.icon || "trophy")}"></i>${esc(category.name)}<span class="badge badge--gold">${category.winners.length} Pemenang</span></h3><div class="champion-grid">${category.winners.map(winnerCard).join("")}</div></section>`).join("")}</div>` : '<div class="public-empty-state public-empty-state--compact"><p>Belum ada pemenang yang dipublikasikan.</p></div>'}</div></section>`
      : "";
  const documentsSection =
    detail.documentsActive !== false && documents.length
      ? `<section class="section section--soft" id="dokumen-terkait"><div class="container"><div class="section__header section__header--left"><p class="t-eyebrow">${esc(detail.documentsEyebrow)}</p><h2 class="t-h2">${esc(detail.documentsTitle)}</h2></div><div class="doc-list">${documents.map((document) => `<article class="doc-card" data-category="${esc(document.category || "")}"><div class="doc-card__icon"><i data-lucide="file-text"></i></div><div class="doc-card__info"><p class="doc-card__name">${esc(detail.documentLabelOverrides[document.id] || document.title)} <span class="doc-card__tag">${esc(document.category || "Dokumen")}</span></p><p class="doc-card__size">${esc(document.type || "PDF")} · <span class="t-mono">${esc(document.size || "-")}</span></p></div><div class="doc-card__download"><a href="${esc(document.url || "#")}" class="btn btn--outline btn--sm"><i data-lucide="download"></i>Unduh</a></div></article>`).join("")}</div></div></section>`
      : "";
  document.title = `${competition.name} — Arsip Ajang Talenta`;
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta)
    descriptionMeta.content =
      competition.description || `Detail ${competition.name}`;
  root.innerHTML = `<section class="lomba-banner" style="background:${esc(competition.gradient)}"><div class="lomba-banner__content"><h1 class="lomba-banner__title">${esc(competition.name)}</h1><p class="lomba-banner__desc">${esc(competition.description || "")}</p></div></section><nav class="archive-detail-breadcrumb" aria-label="Breadcrumb"><div class="container"><p class="t-caption"><a href="${TalentaPaths.to("public.archive")}">Arsip</a><span aria-hidden="true">/</span><span>${esc(competition.name)}</span></p></div></nav>${winnersSection}${documentsSection}`;
  lucide.createIcons();
  if (location.hash)
    requestAnimationFrame(() =>
      document.querySelector(location.hash)?.scrollIntoView(),
    );
})();

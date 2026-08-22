/* Editor Detail Arsip â€” preview identik arsip-detail.html */
const detailParams = new URLSearchParams(location.search);
const compId = detailParams.get("id");
const detailEmbedded = detailParams.get("embedded") === "1";
if (compId) window.TalentaEditor = Object.freeze({ eventId: compId });
const archiveBackUrl = detailEmbedded
  ? TalentaPaths.to("admin.archiveEditor", { query: { embedded: 1 } })
  : TalentaPaths.to("admin.shell", { query: { page: "archive" } });
if (!compId) {
  document.querySelector(".admin-main").innerHTML =
    `<div class="preview-disabled" style="margin:80px auto;max-width:400px"><strong>ID lomba tidak ditemukan</strong><p>Buka halaman ini dari daftar Arsip.</p><a class="btn btn--outline" href="${archiveBackUrl}">Kembali ke Arsip</a></div>`;
}

let comp = compId ? archiveClone(getEffectiveCompetitionById(compId)) : null;
if (comp && !comp.detail) comp.detail = archiveDetailDefaults();
let archiveDetailPreviewResizeObserver;
async function hydrateDetail() {
  if (!compId) return;
  try {
    comp = await TalentaArchiveDetailApi.load(compId);
    syncForm();
    bindForm();
    renderPreview();
  } catch (error) {
    toast(error.message);
  }
}

function applyGlobalTheme(root) {
  applyGlobalThemeTokens(root);
}

function esc(v = "") {
  const d = document.createElement("div");
  d.textContent = v;
  return d.innerHTML;
}
function icons() {
  lucide.createIcons();
}
function toast(msg = "Detail tersimpan.") {
  const t = document.getElementById("adminToast");
  t.querySelector("span").textContent = msg;
  t.classList.add("admin-toast--show");
  setTimeout(() => t.classList.remove("admin-toast--show"), 2200);
}
function formatArchiveDisplayName(item) {
  if (!item.periodYear) return item.name || "Ajang Talenta";
  const period = `${item.name || "Ajang Talenta"} ${item.periodYear}`;
  return item.batchLabel && item.batchNumber
    ? `${period} · ${item.batchLabel} ${item.batchNumber}`
    : item.batchNumber && item.batchNumber > 1
      ? `${period} · Gelombang ${item.batchNumber}`
      : period;
}
function archiveDisplayName(item) {
  return item.archiveDisplayName || formatArchiveDisplayName(item);
}
function detailPublicUrl(archiveToken, currentToken = "") {
  const url = new URL(
    TalentaPaths.to("publicSite.archiveDetail", {
      query: { event: comp.slug },
    }),
  );
  const category = window.parent?.TalentaAdminAuth?.currentCategory?.();
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!isLocal && category?.hostname) {
    try {
      const host = new URL(`https://${category.hostname}`);
      if (
        host.protocol === "https:" &&
        host.hostname &&
        !host.username &&
        !host.password &&
        !host.port &&
        host.pathname === "/" &&
        !host.search &&
        !host.hash
      )
        url.href = `https://${host.hostname}/arsip/detail/?event=${encodeURIComponent(comp.slug)}`;
    } catch (_error) {}
  } else if (category?.slug) url.searchParams.set("site", category.slug);
  if (archiveToken)
    url.hash = new URLSearchParams({
      preview: currentToken,
      archivePreview: archiveToken,
      previewScope: "archiveDetail",
    }).toString();
  return url.href;
}
function markDetailDirty() {
  document.dispatchEvent(new CustomEvent("talenta:editor-dirty"));
}
function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

function syncForm() {
  if (!comp) return;
  const det = comp.detail;
  const displayName = archiveDisplayName(comp);
  document.getElementById("detailTopTitle").textContent = displayName;
  document.getElementById("detailContextTitle").textContent = displayName;
  const openDetailPreview = async (event) => {
    event.preventDefault();
    const link = event.currentTarget;
    link.setAttribute("aria-disabled", "true");
    try {
      const { data } = await TalentaApi.request(
        `/admin/events/${comp.id}/preview-token`,
        { method: "POST" },
      );
      const currentEvent = window.parent?.TalentaAdminAuth?.currentEvent?.();
      const currentToken =
        currentEvent?.id && currentEvent.id !== comp.id
          ? (
              await TalentaApi.request(
                `/admin/events/${currentEvent.id}/preview-token`,
                { method: "POST" },
              )
            ).data.token
          : data.token;
      open(detailPublicUrl(data.token, currentToken), "_blank", "noopener");
    } catch (error) {
      toast(error.message);
    } finally {
      link.removeAttribute("aria-disabled");
    }
  };
  ["detailPublicLink", "detailToolbarPublicLink"].forEach((id) => {
    const link = document.getElementById(id);
    link.href = detailPublicUrl();
    link.onclick = openDetailPreview;
  });
  const map = {
    detailActive: comp.active,
    detailName: archiveDisplayName(comp),
    detailDescription: comp.description || "",
    detailWinnersActive: det.winnersActive,
    detailWinnersEyebrow: det.winnersEyebrow,
    detailWinnersTitle: det.winnersTitle,
    detailWinnersDescription: det.winnersDescription,
    detailShowSk: det.showSk,
    detailSkBannerTitle: comp.skBannerTitle || "SK Penetapan Pemenang",
    detailDocumentsActive: det.documentsActive,
    detailDocumentsEyebrow: det.documentsEyebrow,
    detailDocumentsTitle: det.documentsTitle,
  };
  Object.entries(map).forEach(([id, v]) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.type === "checkbox" ? (e.checked = v) : (e.value = v);
  });
  renderCategorySummary();
  renderDocumentList();
}

function renderCategorySummary() {
  const root = document.getElementById("detailCategorySummary");
  const cats = (comp.winnerCategories || []).filter((c) => c.active !== false);
  if (!cats.length) {
    root.innerHTML =
      '<p class="wm-source-note"><i data-lucide="info"></i> Lomba ini belum memiliki data pemenang.</p>';
    icons();
    return;
  }
  root.innerHTML = cats
    .map((c) => {
      const ws = (c.winners || []).filter((w) => w.active !== false);
      return `<div class="wm-archive-source is-included"><i data-lucide="${esc(c.icon || "trophy")}"></i><span><strong>${esc(c.name)}</strong><small>${ws.length} pemenang aktif</small></span><em>Ditampilkan</em></div>`;
    })
    .join("");
  icons();
}

function moveDetailDocument(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= comp.documents.length) return;
  [comp.documents[index], comp.documents[target]] = [
    comp.documents[target],
    comp.documents[index],
  ];
  renderDocumentList();
  renderPreview();
  markDetailDirty();
}

function documentOrderMarkup(d, index, total) {
  return `<div class="detail-document-row__order"><button type="button" data-detail-up ${index === 0 ? "disabled" : ""} aria-label="Naikkan urutan ${esc(d.title)}" title="Naikkan urutan"><i data-lucide="arrow-up"></i></button><span>${String(index + 1).padStart(2, "0")}</span><button type="button" data-detail-down ${index === total - 1 ? "disabled" : ""} aria-label="Turunkan urutan ${esc(d.title)}" title="Turunkan urutan"><i data-lucide="arrow-down"></i></button></div>`;
}
function renderDecreeDocuments(d, index, total, det) {
  const shown = d.active !== false && !det.hiddenDocumentIds.includes(d.id);
  const label = det.documentLabelOverrides[d.id] || "";
  return `<div class="archive-linked-doc detail-document-row detail-decree-row" data-doc-id="${esc(d.id)}" data-document-index="${index}">${documentOrderMarkup(d, index, total)}<div class="detail-decree-row__main"><strong>${esc(d.title)}</strong><small>${esc(d.category)} · ${d.type} · ${d.size}</small><div class="detail-decree-row__details"><input class="form-input" maxlength="40" data-decree-label value="${esc(label)}" placeholder="Label override"><small><span data-decree-counter>${label.length}</span>/40</small><label class="btn btn--outline btn--sm">${d.assetId ? "Ganti PDF" : "Upload PDF"}<input type="file" data-document-upload accept="application/pdf" hidden></label></div></div><div class="detail-document-row__actions"><button type="button" class="btn btn--outline btn--sm detail-decree-row__edit" data-decree-toggle aria-expanded="false" aria-label="Edit detail ${esc(d.title)}"><i data-lucide="settings-2"></i>Edit detail</button><label class="admin-switch"><input type="checkbox" data-decree-visibility ${shown ? "checked" : ""} aria-label="Arsipkan ${esc(d.title)}"><span></span></label><button type="button" data-reset-label title="Kembalikan nama asli" aria-label="Kembalikan label ${esc(d.title)}"><i data-lucide="rotate-ccw"></i></button></div></div>`;
}
function renderRegularDocument(d, index, total, det) {
  const shown = d.active !== false && !det.hiddenDocumentIds.includes(d.id);
  return `<div class="archive-linked-doc detail-document-row" data-doc-id="${esc(d.id)}" data-document-index="${index}">${documentOrderMarkup(d, index, total)}<div><strong>${esc(d.title)}</strong><small>${esc(d.category)} · ${d.type} · ${d.size}</small><label class="btn btn--outline btn--sm">${d.assetId ? "Ganti PDF" : "Upload PDF"}<input type="file" data-document-upload accept="application/pdf" hidden></label></div><div class="detail-document-row__actions detail-document-row__actions--regular"><span class="detail-document-row__edit-slot" aria-hidden="true"></span><label class="admin-switch"><input type="checkbox" ${shown ? "checked" : ""}><span></span><em>${shown ? "Tampil" : "Sembunyi"}</em></label><button type="button" data-reset-label title="Kembalikan nama asli" aria-label="Kembalikan label ${esc(d.title)}"><i data-lucide="rotate-ccw"></i></button></div></div>`;
}
function renderDocumentList() {
  const root = document.getElementById("detailDocumentList");
  const docs = comp.documents || [];
  if (!docs.length) {
    root.innerHTML =
      '<p class="wm-source-note"><i data-lucide="info"></i> Belum ada dokumen untuk lomba ini.</p>';
    icons();
    return;
  }
  const det = comp.detail;
  root.innerHTML = docs
    .map((d, index) =>
      d.documentRole === "winner_decree"
        ? renderDecreeDocuments(d, index, docs.length, det)
        : renderRegularDocument(d, index, docs.length, det),
    )
    .join("");
  root.querySelectorAll(".archive-linked-doc").forEach((row) => {
    const docId = row.dataset.docId,
      index = Number(row.dataset.documentIndex),
      check = row.querySelector("[type=checkbox]"),
      input = row.querySelector("[data-decree-label]");
    const up = row.querySelector("[data-detail-up]");
    const down = row.querySelector("[data-detail-down]");
    up.onclick = () => moveDetailDocument(index, -1);
    down.onclick = () => moveDetailDocument(index, 1);
    up.onkeydown = (event) => {
      if (event.key !== "ArrowUp") return;
      event.preventDefault();
      moveDetailDocument(index, -1);
    };
    down.onkeydown = (event) => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      moveDetailDocument(index, 1);
    };
    check.onchange = () => {
      comp.detail.hiddenDocumentIds = check.checked
        ? comp.detail.hiddenDocumentIds.filter((x) => x !== docId)
        : [...new Set([...comp.detail.hiddenDocumentIds, docId])];
      renderPreview();
    };
    if (input) {
      input.oninput = () => {
        comp.detail.documentLabelOverrides[docId] = input.value.slice(0, 40);
        row.querySelector("[data-decree-counter]").textContent =
          input.value.length;
        renderPreview();
      };
    }
    row.querySelector("[data-decree-toggle]")?.addEventListener("click", () => {
      const expanded = row.classList.toggle("is-expanded");
      const button = row.querySelector("[data-decree-toggle]");
      button.setAttribute("aria-expanded", expanded);
      button.lastChild.textContent = expanded ? "Tutup detail" : "Edit detail";
    });
    row.querySelector("[data-reset-label]").onclick = () => {
      delete comp.detail.documentLabelOverrides[docId];
      if (input) input.value = "";
      renderPreview();
    };
    row.querySelector("[data-document-upload]").onchange = async (event) => {
      const upload = event.target;
      const document = docs.find((item) => item.id === docId);
      if (!upload.files[0]) return;
      upload.disabled = true;
      try {
        await TalentaArchiveDetailApi.uploadDocument(
          comp,
          document,
          upload.files[0],
        );
        renderDocumentList();
        renderPreview();
        toast("PDF berhasil diunggah dan ditautkan.");
      } catch (error) {
        toast(error.message);
      } finally {
        upload.disabled = false;
      }
    };
  });
  icons();
}

function bindForm() {
  if (!comp) return;
  const det = comp.detail;
  document.getElementById("detailName").oninput = (e) => {
    comp.archiveDisplayName = e.target.value;
    const displayName = archiveDisplayName(comp);
    document.getElementById("detailTopTitle").textContent = displayName;
    document.getElementById("detailContextTitle").textContent = displayName;
    renderPreview();
  };
  document.getElementById("detailDescription").oninput = (e) => {
    comp.description = e.target.value;
    renderPreview();
  };
  document.getElementById("detailActive").onchange = (e) => {
    comp.active = e.target.checked;
    renderPreview();
  };
  const detTexts = {
    detailWinnersEyebrow: "winnersEyebrow",
    detailWinnersTitle: "winnersTitle",
    detailWinnersDescription: "winnersDescription",
    detailDocumentsEyebrow: "documentsEyebrow",
    detailDocumentsTitle: "documentsTitle",
  };
  Object.entries(detTexts).forEach(
    ([id, k]) =>
      (document.getElementById(id).oninput = (e) => {
        det[k] = e.target.value;
        renderPreview();
      }),
  );
  document.getElementById("detailWinnersActive").onchange = (e) => {
    det.winnersActive = e.target.checked;
    renderPreview();
  };
  document.getElementById("detailDocumentsActive").onchange = (e) => {
    det.documentsActive = e.target.checked;
    renderPreview();
  };
  document.getElementById("detailShowSk").onchange = (e) => {
    det.showSk = e.target.checked;
    renderPreview();
  };
  document.getElementById("detailSkBannerTitle").oninput = (e) => {
    comp.skBannerTitle = e.target.value;
    renderPreview();
  };
  document.querySelectorAll("[data-detail-preview]").forEach(
    (btn) =>
      (btn.onclick = () => {
        document
          .querySelectorAll("[data-detail-preview]")
          .forEach((x) =>
            x.classList.toggle("preview-switch__btn--active", x === btn),
          );
        document.getElementById("archiveDetailPreviewFrame").className =
          "archive-detail-preview-frame archive-detail-preview-frame--" +
          btn.dataset.detailPreview;
        document.getElementById(
          "archiveDetailPreviewFrame",
        ).dataset.previewMode = btn.dataset.detailPreview;
        requestAnimationFrame(fitArchiveDetailPreview);
      }),
  );
  const form = document.getElementById("archiveDetailForm");
  const submit = form.querySelector('button[type="submit"]');
  const revertArchiveDetail = () => location.reload();
  const saveArchiveDetail = async () => {
    if (submit) submit.disabled = true;
    try {
      await TalentaArchiveDetailApi.save(comp);
      document.dispatchEvent(new CustomEvent("talenta:editor-saved"));
      toast("Detail tersimpan ke database.");
    } catch (error) {
      toast(error.message);
      throw error;
    } finally {
      if (submit) submit.disabled = false;
    }
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    void saveArchiveDetail().catch(() => {});
  };
  const currentEvent = window.parent?.TalentaAdminAuth?.currentEvent?.();
  window.TalentaEditor = Object.freeze({
    eventId: comp.id,
    currentEventId: currentEvent?.id || comp.id,
    publicUrl: detailPublicUrl,
    save: saveArchiveDetail,
    revert: revertArchiveDetail,
  });
  document.dispatchEvent(new CustomEvent("talenta:editor-ready"));
  document.getElementById("archiveDetailReset").onclick = async () => {
    const confirmed = await adminConfirm({
      title: "Urungkan edit Detail Arsip?",
      message:
        "Perubahan Detail Arsip yang belum disimpan akan dibuang dan draf tersimpan akan dimuat kembali.",
      confirmLabel: "Urungkan edit",
      variant: "danger",
      icon: "undo-2",
    });
    if (confirmed) revertArchiveDetail();
  };
}

function saveDetail() {
  const s = getArchiveAdminState();
  if (!s.competitions) s.competitions = {};
  s.competitions[comp.id] = archiveClone(comp);
  if (!s.order) s.order = [];
  if (!s.order.includes(comp.id)) s.order.push(comp.id);
  saveArchiveAdminState(s);
}

/* Preview menggunakan class publik asli. */
function renderLegacyPreview() {
  const root = document.getElementById("archiveDetailPreview");
  applyGlobalTheme(root);
  if (!comp) {
    root.innerHTML =
      '<div class="preview-disabled"><strong>Lomba tidak ditemukan</strong></div>';
    return;
  }
  if (!comp.active) {
    root.innerHTML =
      '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Detail dinonaktifkan</strong><span>Data tetap tersimpan.</span></div>';
    icons();
    return;
  }
  const det = comp.detail;
  let html = "";

  /* 1. Banner — .lomba-banner */
  html += `<section class="lomba-banner"><div class="lomba-banner__content"><h1 class="lomba-banner__title">${esc(comp.name)}</h1><p class="lomba-banner__desc">${esc(comp.description)}</p></div></section>`;

  /* 2. BREADCRUMB */
  html += `<div class="detail-preview__breadcrumb"><div class="container"><p class="t-caption"><a style="color:var(--c-primary)">Arsip</a>&nbsp;/&nbsp;<span style="color:var(--c-ink)">${esc(comp.name)}</span></p></div></div>`;

  /* 3. PEMENANG */
  if (det.winnersActive) {
    const cats = (comp.winnerCategories || []).filter(
      (c) =>
        c.active !== false && (c.winners || []).some((w) => w.active !== false),
    );
    const decrees = (comp.documents || []).filter(
      (d) =>
        d.documentRole === "winner_decree" &&
        d.active !== false &&
        !det.hiddenDocumentIds.includes(d.id),
    );
    if (cats.length || decrees.length) {
      html += `<section class="section"><div class="container"><div class="section__header section__header--left"><p class="t-eyebrow">${esc(det.winnersEyebrow)}</p><h2 class="t-h2">${esc(det.winnersTitle)}</h2></div>`;
      if (det.showSk) {
        html += `<div class="sk-banner"><div class="sk-banner__left"><div class="sk-banner__icon"><i data-lucide="file-check-2" style="width:24px;height:24px"></i></div><div class="sk-banner__content"><h3>${esc(comp.skBannerTitle || "SK Penetapan Pemenang")}</h3></div></div><div class="sk-banner__actions">${decrees.map((sk) => `<a href="#" class="btn btn--primary" style="border:1px solid rgba(255,255,255,0.2)"><i data-lucide="download" style="width:16px;height:16px"></i> ${esc(det.documentLabelOverrides[sk.id] || sk.defaultDownloadLabel || sk.title)}</a>`).join("")}</div></div>`;
      }
      /* Winner groups */
      if (cats.length) {
        html += `<div class="winner-section">`;
        cats.forEach((cat) => {
          const ws = (cat.winners || []).filter((w) => w.active !== false);
          html += `<div class="winner-group"><h3 class="winner-group__title"><i data-lucide="${esc(cat.icon || "trophy")}" style="width:20px;height:20px;stroke-width:1.75;color:var(--c-primary)"></i> ${esc(cat.name)} <span class="badge badge--gold">${ws.length} Pemenang</span></h3><div class="champion-grid">`;
          ws.forEach((w) => {
            html += `<div class="champion-card"><div class="champion-card__photo">${w.photo ? `<img src="${w.photo}" alt="Foto ${esc(w.name)}">` : initials(w.name)}</div><p class="champion-card__rank t-mono">${esc(w.rank)}</p><p class="champion-card__name">${esc(w.name)}</p><p class="champion-card__school">${esc(w.school)}</p><div class="champion-card__meta">${w.exam ? `<span><span class="meta-label">No. Ujian:</span> ${esc(w.exam)}</span>` : ""}${w.regency ? `<span><span class="meta-label">Kabupaten:</span> ${esc(w.regency)}</span>` : ""}${w.province ? `<span><span class="meta-label">Provinsi:</span> ${esc(w.province)}</span>` : ""}</div></div>`;
          });
          html += `</div></div>`;
        });
        html += `</div>`;
      }
      html += `</div></section>`;
    }
  }

  /* 4. DOKUMEN TERKAIT */
  if (det.documentsActive) {
    const docs = (comp.documents || []).filter(
      (d) => d.active !== false && !det.hiddenDocumentIds.includes(d.id),
    );
    if (docs.length) {
      html += `<section class="section section--soft"><div class="container"><div class="section__header section__header--left"><p class="t-eyebrow">${esc(det.documentsEyebrow)}</p><h2 class="t-h2">${esc(det.documentsTitle)}</h2></div><div class="doc-list">`;
      docs.forEach((d) => {
        const label = det.documentLabelOverrides[d.id] || d.title;
        html += `<article class="doc-card"><div class="doc-card__icon"><i data-lucide="file-text" style="width:20px;height:20px;stroke-width:1.5"></i></div><div class="doc-card__info"><p class="doc-card__name">${esc(label)} <span class="doc-card__tag">${esc(d.category)}</span></p><p class="doc-card__size">${esc(d.type)} · <span class="t-mono">${esc(d.size)}</span></p></div><div class="doc-card__download"><a href="#" class="btn btn--outline btn--sm"><i data-lucide="download" style="width:14px;height:14px"></i> ${d.documentRole === "winner_decree" ? "Unduh SK" : "Unduh"}</a></div></article>`;
      });
      html += `</div></div></section>`;
    }
  }

  root.innerHTML = html;
  icons();
}

function renderPreview() {
  const root = document.getElementById("archiveDetailPreview");
  applyGlobalTheme(root);
  if (!comp) {
    root.className = "archive-detail-public-preview";
    root.innerHTML =
      '<div class="preview-disabled"><strong>Lomba tidak ditemukan</strong></div>';
    return;
  }
  const normalizedCompetition = normalizeArchiveCompetition({
    ...comp,
    name: archiveDisplayName(comp),
  });
  if (
    !normalizedCompetition?.active ||
    normalizedCompetition.detail.active === false
  ) {
    root.className = "archive-detail-public-preview";
    root.innerHTML =
      '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Detail dinonaktifkan</strong><span>Data tetap tersimpan.</span></div>';
    icons();
    return;
  }
  root.className = "archive-detail-public-preview scaled-public-preview";
  root.innerHTML = buildArchiveDetailMarkup(
    resolveArchiveDetailState(normalizedCompetition),
  );
  activateWinnerCardFallbacks(root);
  requestAnimationFrame(fitArchiveDetailPreview);
  icons();
}

function setupArchiveDetailPreviewSizing() {
  const frame = document.getElementById("archiveDetailPreviewFrame");
  const root = document.getElementById("archiveDetailPreview");
  frame.dataset.previewMode = frame.dataset.previewMode || "desktop";
  archiveDetailPreviewResizeObserver?.disconnect();
  archiveDetailPreviewResizeObserver = new ResizeObserver(
    fitArchiveDetailPreview,
  );
  archiveDetailPreviewResizeObserver.observe(frame);
  archiveDetailPreviewResizeObserver.observe(root);
  requestAnimationFrame(fitArchiveDetailPreview);
}

function fitArchiveDetailPreview() {
  const frame = document.getElementById("archiveDetailPreviewFrame");
  const root = document.getElementById("archiveDetailPreview");
  if (!frame || !root || !root.classList.contains("scaled-public-preview"))
    return;
  const designWidths = { desktop: 1425, tablet: 753, mobile: 375 };
  const mode = frame.dataset.previewMode || "desktop";
  const designWidth = designWidths[mode] || designWidths.desktop;
  const frameStyle = getComputedStyle(frame);
  const horizontalPadding =
    parseFloat(frameStyle.paddingLeft) + parseFloat(frameStyle.paddingRight);
  const verticalPadding =
    parseFloat(frameStyle.paddingTop) + parseFloat(frameStyle.paddingBottom);
  const availableWidth = Math.max(1, frame.clientWidth - horizontalPadding);
  const scale = Math.min(1, availableWidth / designWidth);
  root.style.setProperty("--public-preview-scale", String(scale));
  frame.style.height = `${Math.ceil(root.offsetHeight * scale + verticalPadding)}px`;
}

/* Init */
if (compId) {
  document
    .querySelectorAll("[data-archive-back]")
    .forEach((link) => (link.href = archiveBackUrl));
  if (comp) {
    syncForm();
    bindForm();
    renderPreview();
  }
  setupArchiveDetailPreviewSizing();
  subscribeGlobalSettings(renderPreview);
  icons();
  void hydrateDetail();
}

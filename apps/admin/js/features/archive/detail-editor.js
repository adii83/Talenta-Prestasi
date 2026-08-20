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
    detailSkTitle: comp.skDocument?.title || "SK Penetapan Pemenang",
    detailSkDescription:
      comp.skDocument?.description ||
      "Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.",
    detailWinnersActive: det.winnersActive,
    detailWinnersEyebrow: det.winnersEyebrow,
    detailWinnersTitle: det.winnersTitle,
    detailShowSk: det.showSk,
    detailDocumentsActive: det.documentsActive,
    detailDocumentsEyebrow: det.documentsEyebrow,
    detailDocumentsTitle: det.documentsTitle,
  };
  Object.entries(map).forEach(([id, v]) => {
    const e = document.getElementById(id);
    if (!e) return;
    e.type === "checkbox" ? (e.checked = v) : (e.value = v);
  });
  document.querySelectorAll("[data-meta]").forEach((x) => {
    x.checked = det[x.dataset.meta] !== false;
  });
  renderSkSelect();
  document.getElementById("detailSkTitle").disabled =
    !comp.skDocument?.documentId;
  document.getElementById("detailSkDescription").disabled =
    !comp.skDocument?.documentId;
  renderCategorySummary();
  renderDocumentList();
}

function renderSkSelect() {
  const sel = document.getElementById("detailSkDocument");
  const docs = (comp.documents || []).filter((d) => d.active !== false);
  sel.innerHTML =
    '<option value="">— Tidak ada SK —</option>' +
    docs
      .map(
        (d) =>
          `<option value="${esc(d.id)}" ${comp.skDocument?.documentId === d.id ? "selected" : ""}>${esc(d.title)}</option>`,
      )
      .join("");
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
    .map((d, index) => {
      const shown = d.active !== false && !det.hiddenDocumentIds.includes(d.id);
      return `<div class="archive-linked-doc detail-document-row" data-doc-id="${esc(d.id)}" data-document-index="${index}"><div class="detail-document-row__order"><button type="button" data-detail-up ${index === 0 ? "disabled" : ""} aria-label="Naikkan urutan ${esc(d.title)}" title="Naikkan urutan"><i data-lucide="arrow-up"></i></button><span>${String(index + 1).padStart(2, "0")}</span><button type="button" data-detail-down ${index === docs.length - 1 ? "disabled" : ""} aria-label="Turunkan urutan ${esc(d.title)}" title="Turunkan urutan"><i data-lucide="arrow-down"></i></button></div><div><strong>${esc(d.title)}</strong><small>${esc(d.category)} · ${d.type} · ${d.size}</small><input class="form-input" value="${esc(det.documentLabelOverrides[d.id] || "")}" placeholder="Label custom (opsional)"><label class="btn btn--outline btn--sm">${d.assetId ? "Ganti PDF" : "Upload PDF"}<input type="file" data-document-upload accept="application/pdf" hidden></label></div><label class="admin-switch"><input type="checkbox" ${shown ? "checked" : ""}><span></span><em>${shown ? "Tampil" : "Sembunyi"}</em></label><button type="button" data-reset-label title="Kembalikan nama asli" aria-label="Kembalikan label ${esc(d.title)}"><i data-lucide="rotate-ccw"></i></button></div>`;
    })
    .join("");
  root.querySelectorAll(".archive-linked-doc").forEach((row) => {
    const docId = row.dataset.docId,
      index = Number(row.dataset.documentIndex),
      check = row.querySelector("[type=checkbox]"),
      input = row.querySelector(".form-input");
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
    input.oninput = () => {
      comp.detail.documentLabelOverrides[docId] = input.value;
      renderPreview();
    };
    row.querySelector("[data-reset-label]").onclick = () => {
      delete comp.detail.documentLabelOverrides[docId];
      input.value = "";
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
  document.querySelectorAll("[data-meta]").forEach(
    (x) =>
      (x.onchange = () => {
        det[x.dataset.meta] = x.checked;
        renderPreview();
      }),
  );
  const skTitle = document.getElementById("detailSkTitle");
  const skDescription = document.getElementById("detailSkDescription");
  skTitle.oninput = () => {
    if (!comp.skDocument?.documentId) return;
    comp.skDocument.title = skTitle.value;
    renderPreview();
  };
  skDescription.oninput = () => {
    if (!comp.skDocument?.documentId) return;
    comp.skDocument.description = skDescription.value;
    renderPreview();
  };
  document.getElementById("detailSkDocument").onchange = (e) => {
    const d = (comp.documents || []).find((x) => x.id === e.target.value);
    comp.skDocument = d
      ? {
          ...d,
          documentId: d.id,
          title: skTitle.value || "SK Penetapan Pemenang",
          description:
            skDescription.value ||
            "Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.",
        }
      : null;
    skTitle.disabled = !d;
    skDescription.disabled = !d;
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
    if (cats.length || comp.skDocument) {
      html += `<section class="section"><div class="container"><div class="section__header section__header--left"><p class="t-eyebrow">${esc(det.winnersEyebrow)}</p><h2 class="t-h2">${esc(det.winnersTitle)}</h2></div>`;
      /* SK Banner */
      if (det.showSk && comp.skDocument) {
        const sk = comp.skDocument;
        html += `<div class="sk-banner"><div class="sk-banner__left"><div class="sk-banner__icon"><i data-lucide="file-check-2" style="width:24px;height:24px"></i></div><div class="sk-banner__content"><h3>${esc(sk.title || "SK Penetapan Pemenang")}</h3><p>${esc(sk.description || "Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.")}</p></div></div><a href="#" class="btn btn--primary" style="border:1px solid rgba(255,255,255,0.2)"><i data-lucide="download" style="width:16px;height:16px"></i> Unduh SK</a></div>`;
      }
      /* Winner groups */
      if (cats.length) {
        html += `<div class="winner-section">`;
        cats.forEach((cat) => {
          const ws = (cat.winners || []).filter((w) => w.active !== false);
          html += `<div class="winner-group"><h3 class="winner-group__title"><i data-lucide="${esc(cat.icon || "trophy")}" style="width:20px;height:20px;stroke-width:1.75;color:var(--c-primary)"></i> ${esc(cat.name)} <span class="badge badge--gold">${ws.length} Pemenang</span></h3><div class="champion-grid">`;
          ws.forEach((w) => {
            html += `<div class="champion-card">`;
            if (det.showPhoto !== false)
              html += `<div class="champion-card__photo">${w.photo ? `<img src="${w.photo}" alt="Foto ${esc(w.name)}">` : initials(w.name)}</div>`;
            html += `<p class="champion-card__rank t-mono">${esc(w.rank)}</p><p class="champion-card__name">${esc(w.name)}</p>`;
            if (det.showSchool !== false)
              html += `<p class="champion-card__school">${esc(w.school)}</p>`;
            html += `<div class="champion-card__meta">`;
            if (det.showExam !== false)
              html += `<span><span class="meta-label">No. Ujian:</span> ${esc(w.exam)}</span>`;
            if (det.showRegency !== false)
              html += `<span><span class="meta-label">Kabupaten:</span> ${esc(w.regency)}</span>`;
            if (det.showProvince !== false)
              html += `<span><span class="meta-label">Provinsi:</span> ${esc(w.province)}</span>`;
            html += `</div></div>`;
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
        html += `<article class="doc-card"><div class="doc-card__icon"><i data-lucide="file-text" style="width:20px;height:20px;stroke-width:1.5"></i></div><div class="doc-card__info"><p class="doc-card__name">${esc(label)} <span class="doc-card__tag">${esc(d.category)}</span></p><p class="doc-card__size">${esc(d.type)} · <span class="t-mono">${esc(d.size)}</span></p></div><div class="doc-card__download"><a href="#" class="btn btn--outline btn--sm"><i data-lucide="download" style="width:14px;height:14px"></i> Unduh</a></div></article>`;
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

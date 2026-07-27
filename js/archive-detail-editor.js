/* Editor Detail Arsip — preview identik arsip-detail.html */
const detailParams = new URLSearchParams(location.search);
const compId = detailParams.get("id");
const detailEmbedded = detailParams.get("embedded") === "1";
const archiveBackUrl = detailEmbedded
  ? "admin-arsip.html?embedded=1"
  : "admin.html?page=archive";
if (!compId) {
  document.querySelector(".admin-main").innerHTML =
    `<div class="preview-disabled" style="margin:80px auto;max-width:400px"><strong>ID lomba tidak ditemukan</strong><p>Buka halaman ini dari daftar Arsip.</p><a class="btn btn--outline" href="${archiveBackUrl}">Kembali ke Arsip</a></div>`;
}

let comp = compId ? archiveClone(getEffectiveCompetitionById(compId)) : null;
if (comp && !comp.detail) comp.detail = archiveDetailDefaults();

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
  document.getElementById("detailTopTitle").textContent =
    comp.name || "Detail Arsip";
  document.getElementById("detailContextTitle").textContent =
    comp.name || "Detail Arsip";
  const publicUrl = "arsip-detail.html?id=" + encodeURIComponent(comp.id);
  document.getElementById("detailPublicLink").href = publicUrl;
  document.getElementById("detailToolbarPublicLink").href = publicUrl;
  const map = {
    detailActive: comp.active,
    detailName: comp.name,
    detailShortName: comp.shortName || "",
    detailDescription: comp.description,
    detailGradient: comp.gradient || "",
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
    .map((d) => {
      const shown = d.active !== false && !det.hiddenDocumentIds.includes(d.id);
      return `<div class="archive-linked-doc" data-doc-id="${esc(d.id)}"><label class="admin-switch"><input type="checkbox" ${shown ? "checked" : ""}><span></span><em>${shown ? "Tampil" : "Sembunyi"}</em></label><div><strong>${esc(d.title)}</strong><small>${esc(d.category)} · ${d.type} · ${d.size}</small><input class="form-input" value="${esc(det.documentLabelOverrides[d.id] || "")}" placeholder="Label custom (opsional)"></div><button type="button" data-reset-label title="Kembalikan nama asli"><i data-lucide="rotate-ccw"></i></button></div>`;
    })
    .join("");
  root.querySelectorAll(".archive-linked-doc").forEach((row) => {
    const docId = row.dataset.docId,
      check = row.querySelector("[type=checkbox]"),
      input = row.querySelector(".form-input");
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
  });
  icons();
}

function bindForm() {
  if (!comp) return;
  const det = comp.detail;
  const texts = {
    detailName: "name",
    detailShortName: "shortName",
    detailDescription: "description",
    detailGradient: "gradient",
  };
  Object.entries(texts).forEach(
    ([id, k]) =>
      (document.getElementById(id).oninput = (e) => {
        comp[k] = e.target.value;
        if (k === "name") {
          document.getElementById("detailTopTitle").textContent =
            e.target.value;
          document.getElementById("detailContextTitle").textContent =
            e.target.value;
        }
        renderPreview();
      }),
  );
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
  document.getElementById("detailSkDocument").onchange = (e) => {
    if (e.target.value) {
      if (!comp.skDocument) comp.skDocument = {};
      comp.skDocument.documentId = e.target.value;
      const d = (comp.documents || []).find((x) => x.id === e.target.value);
      if (d) {
        comp.skDocument.title = d.title;
        comp.skDocument.description = "Unduh dokumen resmi SK Pemenang.";
        comp.skDocument.url = d.url || "#";
        comp.skDocument.type = d.type;
        comp.skDocument.size = d.size;
      }
    } else {
      comp.skDocument = null;
    }
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
      }),
  );
  document.getElementById("archiveDetailForm").onsubmit = (e) => {
    e.preventDefault();
    saveDetail();
    toast();
  };
  document.getElementById("archiveDetailReset").onclick = () => {
    if (!confirm("Reset perubahan Detail Arsip ini ke data sumber?")) return;
    const state = getArchiveAdminState();
    if (state.competitions) delete state.competitions[compId];
    saveArchiveAdminState(state);
    comp = archiveClone(getEffectiveCompetitionById(compId));
    if (comp && !comp.detail) comp.detail = archiveDetailDefaults();
    syncForm();
    renderPreview();
    toast("Detail Arsip dikembalikan ke data sumber.");
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

/* ═══════════════════════════════════════════════
   PREVIEW — menggunakan class publik asli
   ═══════════════════════════════════════════════ */
function renderPreview() {
  const root = document.getElementById("archiveDetailPreview");
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
  const det = comp.detail,
    grad = comp.gradient || "linear-gradient(135deg,#1E4B8C 0%,#10233F 100%)";
  let html = "";

  /* 1. BANNER — .lomba-banner */
  html += `<section class="lomba-banner" style="background:${esc(grad)}"><div class="lomba-banner__content"><h1 class="lomba-banner__title">${esc(comp.name)}</h1><p class="lomba-banner__desc">${esc(comp.description)}</p></div></section>`;

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
        html += `<div class="sk-banner"><div class="sk-banner__left"><div class="sk-banner__icon"><i data-lucide="file-check-2" style="width:24px;height:24px"></i></div><div class="sk-banner__content"><h3>${esc(sk.title || "SK Penetapan Pemenang")}</h3><p>${esc(sk.description || "Unduh dokumen resmi SK Pemenang.")}</p></div></div><a href="#" class="btn btn--primary" style="border:1px solid rgba(255,255,255,0.2)"><i data-lucide="download" style="width:16px;height:16px"></i> Unduh PDF</a></div>`;
      }
      /* Winner groups */
      if (cats.length) {
        html += `<div class="winner-section">`;
        cats.forEach((cat) => {
          const ws = (cat.winners || []).filter((w) => w.active !== false);
          html += `<div class="winner-group"><h3 class="winner-group__title"><i data-lucide="${esc(cat.icon || "trophy")}" style="width:20px;height:20px;stroke-width:1.75;color:var(--c-gold)"></i> ${esc(cat.name)} <span class="badge badge--gold">${ws.length} Pemenang</span></h3><div class="champion-grid">`;
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
            if (det.showDistrict !== false)
              html += `<span><span class="meta-label">Kecamatan:</span> ${esc(w.district)}</span>`;
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

/* Init */
if (comp) {
  document
    .querySelectorAll("[data-archive-back]")
    .forEach((link) => (link.href = archiveBackUrl));
  syncForm();
  bindForm();
  renderPreview();
  icons();
}

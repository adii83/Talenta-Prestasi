let previewCompetitionId = "";
let downloadPreviewResizeObserver;
function archive(id) {
  return (
    window.TalentaDownloadCompetitions?.find((item) => item.id === id) ||
    (typeof getDownloadCompetition === "function"
      ? getDownloadCompetition(id)
      : typeof getEffectiveCompetitionById === "function"
        ? getEffectiveCompetitionById(id)
        : MOCK_ARCHIVE_DATABASE.competitions.find((x) => x.id === id))
  );
}
function load() {
  const s = getDownloadAdminState();
  s.competitions = (s.competitions || [])
    .filter((x) => archive(x.competitionId))
    .map((x) => ({
      ...downloadCompetitionLink(x.competitionId),
      ...x,
      hiddenDocumentIds: x.hiddenDocumentIds || [],
      documentLabelOverrides: x.documentLabelOverrides || {},
    }));
  normalize(s);
  return s;
}
let state = load();
async function hydrateDownloads() {
  try {
    const loaded = await TalentaDownloadApi.load();
    window.TalentaDownloadCompetitions = loaded.available;
    state = {
      ...state,
      active: loaded.page?.isActive ?? state.active,
      eyebrow: loaded.page?.eyebrow ?? state.eyebrow,
      title: loaded.page?.title ?? state.title,
      description: loaded.page?.description ?? state.description,
      alignment: loaded.page?.alignment ?? state.alignment,
      competitions: loaded.configs,
    };
    normalize(state);
    sync();
    renderPicker();
    renderCompetitions();
    renderPreview();
  } catch (error) {
    toast(error.message, true);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  bind();
  sync();
  renderPicker();
  renderCompetitions();
  renderPreview();
  setupDownloadPreviewSizing();
  subscribeGlobalSettings(renderPreview);
  lucide.createIcons();
  void hydrateDownloads();
});
function normalize(s) {
  if (!s.competitions.length) return;
  const active = s.competitions.filter((x) => x.active);
  if (!active.length) s.competitions[0].active = true;
  const now = s.competitions.filter((x) => x.active),
    chosen = now.find((x) => x.isDefault) || now[0];
  s.competitions.forEach((x) => (x.isDefault = x === chosen));
  if (!now.some((x) => x.competitionId === previewCompetitionId))
    previewCompetitionId = chosen?.competitionId || "";
}
function bind() {
  document.getElementById("sidebarToggle").onclick = () =>
    document
      .getElementById("adminSidebar")
      .classList.toggle("admin-sidebar--open");
  [
    ["downloadEyebrow", "eyebrow"],
    ["downloadTitle", "title"],
    ["downloadDescription", "description"],
  ].forEach(
    ([id, k]) =>
      (document.getElementById(id).oninput = (e) => {
        state[k] = e.target.value;
        renderPreview();
      }),
  );
  document.getElementById("downloadActive").onchange = (e) => {
    state.active = e.target.checked;
    renderPreview();
  };
  document.getElementById("downloadAlignment").onchange = (e) => {
    state.alignment = e.target.value;
    renderPreview();
  };
  document.getElementById("addArchiveCompetition").onclick = () => {
    const id = document.getElementById("archiveCompetitionSelect").value;
    if (!id) return toast("Semua lomba sudah ditambahkan.", true);
    state.competitions.push(
      downloadCompetitionLink(
        id,
        archive(id).shortName,
        !state.competitions.length,
      ),
    );
    normalize(state);
    renderPicker();
    renderCompetitions();
    renderPreview();
  };
  document.getElementById("downloadEditorForm").onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.submitter;
    if (submit) submit.disabled = true;
    normalize(state);
    try {
      await TalentaDownloadApi.save(state);
      toast("Konfigurasi Unduh tersimpan ke database.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  };
  document.getElementById("resetDownload").onclick = async () => {
    const confirmed = await adminConfirm({
      title: "Reset halaman Unduh?",
      message:
        "Pilihan sumber lomba, urutan tab, visibilitas dokumen, dan label custom akan dikembalikan ke template awal.",
      confirmLabel: "Ya, reset Unduh",
      variant: "danger",
      icon: "rotate-ccw",
    });
    if (!confirmed) return;
    resetDownloadAdminState();
    location.reload();
  };
  document.querySelectorAll("[data-download-preview]").forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll("[data-download-preview]")
          .forEach((x) => x.classList.remove("preview-switch__btn--active"));
        b.classList.add("preview-switch__btn--active");
        const f = document.getElementById("downloadPreviewFrame");
        f.dataset.previewMode = b.dataset.downloadPreview;
        f.classList.remove(
          "download-preview-frame--tablet",
          "download-preview-frame--mobile",
        );
        if (b.dataset.downloadPreview !== "desktop")
          f.classList.add(
            "download-preview-frame--" + b.dataset.downloadPreview,
          );
        requestAnimationFrame(fitDownloadPreview);
      }),
  );
}
function setupDownloadPreviewSizing() {
  const frame = document.getElementById("downloadPreviewFrame");
  const root = document.getElementById("downloadPreview");
  frame.dataset.previewMode = frame.dataset.previewMode || "desktop";
  downloadPreviewResizeObserver?.disconnect();
  downloadPreviewResizeObserver = new ResizeObserver(fitDownloadPreview);
  downloadPreviewResizeObserver.observe(frame);
  downloadPreviewResizeObserver.observe(root);
  requestAnimationFrame(fitDownloadPreview);
}
function fitDownloadPreview() {
  const frame = document.getElementById("downloadPreviewFrame");
  const root = document.getElementById("downloadPreview");
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
function sync() {
  Object.entries({
    downloadActive: state.active,
    downloadEyebrow: state.eyebrow,
    downloadTitle: state.title,
    downloadDescription: state.description,
    downloadAlignment: state.alignment,
  }).forEach(([id, v]) => {
    const e = document.getElementById(id);
    e.type === "checkbox" ? (e.checked = v) : (e.value = v);
  });
}
function renderPicker() {
  const selected = new Set(state.competitions.map((x) => x.competitionId)),
    activeCompetition =
      typeof getActiveCompetition === "function"
        ? getActiveCompetition()
        : null,
    allComps =
      window.TalentaDownloadCompetitions ||
      (typeof getDownloadCompetitions === "function"
        ? getDownloadCompetitions()
        : typeof getEffectiveArchivedCompetitions === "function"
          ? getEffectiveArchivedCompetitions()
          : MOCK_ARCHIVE_DATABASE.competitions.filter(
              (x) => x.status === "published",
            )),
    available = allComps.filter(
      (x) => x.active !== false && !selected.has(x.id),
    ),
    el = document.getElementById("archiveCompetitionSelect");
  const archivedCount = allComps.filter(
    (competition) => competition.id !== activeCompetition?.id,
  ).length;
  document.getElementById("downloadSourceSummary").textContent =
    `Halaman Unduh bukan salinan otomatis Arsip: ${selected.size} tab dipilih dari ${allComps.length} sumber tersedia (${activeCompetition ? "1 lomba aktif" : "tanpa lomba aktif"} + ${archivedCount} Arsip).`;
  el.innerHTML = available.length
    ? available
        .map(
          (x) =>
            `<option value="${x.id}">${x.id === activeCompetition?.id ? "Lomba aktif" : "Arsip"} — ${esc(x.name)}</option>`,
        )
        .join("")
    : '<option value="">Semua lomba sudah ditambahkan</option>';
  document.getElementById("addArchiveCompetition").disabled = !available.length;
}
function renderCompetitions() {
  normalize(state);
  const root = document.getElementById("downloadCompetitionEditor");
  root.innerHTML = "";
  state.competitions.forEach((cfg, i) => {
    const comp = archive(cfg.competitionId),
      isActiveCompetition =
        typeof getActiveCompetition === "function" &&
        getActiveCompetition()?.id === comp.id,
      sourceLabel = isActiveCompetition ? "Lomba aktif" : "Dari Arsip",
      sourceIcon = isActiveCompetition ? "radio-tower" : "database",
      el = document.createElement("article");
    el.className = "download-period-card archive-link-card";
    el.innerHTML = `<div class="download-period-card__order"><button type="button" data-up ${i === 0 ? "disabled" : ""}><i data-lucide="chevron-up"></i></button><span>${String(i + 1).padStart(2, "0")}</span><button type="button" data-down ${i === state.competitions.length - 1 ? "disabled" : ""}><i data-lucide="chevron-down"></i></button></div><div class="archive-link-card__main"><span class="archive-source-badge"><i data-lucide="${sourceIcon}"></i> ${sourceLabel}</span><strong>${esc(comp.name)}</strong><div class="admin-field"><label>Nama tab di halaman Unduh</label><input class="form-input" value="${esc(cfg.customTabName || comp.shortName)}"></div><button type="button" class="archive-doc-toggle" data-doc-toggle><i data-lucide="files"></i> ${comp.documents.length} dokumen bawaan <i data-lucide="chevron-down"></i></button></div><label class="download-default"><input type="radio" name="defaultCompetition" ${cfg.isDefault ? "checked" : ""} ${!cfg.active ? "disabled" : ""}> Tab default</label><label class="admin-switch"><input type="checkbox" ${cfg.active ? "checked" : ""}><span></span><em>${cfg.active ? "Aktif" : "Nonaktif"}</em></label><button type="button" class="repeat-row__delete"><i data-lucide="unlink"></i></button><div class="archive-linked-docs" hidden>${comp.documents.map((d) => docEditor(cfg, d)).join("")}</div>`;
    el.querySelector(".form-input").oninput = (e) => {
      cfg.customTabName = e.target.value;
      renderPreview();
    };
    const toggle = el.querySelector(".admin-switch input");
    toggle.onchange = () => {
      cfg.active = toggle.checked;
      normalize(state);
      renderCompetitions();
      renderPreview();
    };
    el.querySelector("[type=radio]").onchange = () => {
      state.competitions.forEach((x) => (x.isDefault = x === cfg));
      previewCompetitionId = cfg.competitionId;
      renderCompetitions();
      renderPreview();
    };
    el.querySelector("[data-up]").onclick = () => move(i, -1);
    el.querySelector("[data-down]").onclick = () => move(i, 1);
    el.querySelector("[data-doc-toggle]").onclick = () => {
      const docs = el.querySelector(".archive-linked-docs");
      docs.hidden = !docs.hidden;
    };
    el.querySelectorAll("[data-document]").forEach((row) => {
      const id = row.dataset.document,
        check = row.querySelector("[type=checkbox]"),
        input = row.querySelector(".form-input");
      check.onchange = () => {
        cfg.hiddenDocumentIds = check.checked
          ? cfg.hiddenDocumentIds.filter((x) => x !== id)
          : [...new Set([...cfg.hiddenDocumentIds, id])];
        renderPreview();
      };
      input.oninput = () => {
        cfg.documentLabelOverrides[id] = input.value;
        renderPreview();
      };
      row.querySelector("[data-reset-label]").onclick = () => {
        delete cfg.documentLabelOverrides[id];
        input.value = "";
        renderPreview();
      };
    });
    el.querySelector(".repeat-row__delete").onclick = async () => {
      const confirmed = await adminConfirm({
        title: "Lepas sumber lomba?",
        message: `${comp.name} akan dihapus dari tab halaman Unduh. Data lomba dan dokumennya di Arsip tetap aman.`,
        confirmLabel: "Ya, lepas sumber",
        variant: "danger",
        icon: "unlink",
      });
      if (!confirmed) return;
      state.competitions.splice(i, 1);
      normalize(state);
      renderPicker();
      renderCompetitions();
      renderPreview();
    };
    root.appendChild(el);
  });
  lucide.createIcons();
}
function docEditor(cfg, d) {
  const shown = !cfg.hiddenDocumentIds.includes(d.id);
  return `<div class="archive-linked-doc" data-document="${d.id}"><label class="admin-switch"><input type="checkbox" ${shown ? "checked" : ""}><span></span><em>${shown ? "Tampil" : "Sembunyi"}</em></label><div><strong>${esc(d.title)}</strong><small>${esc(d.category)} · ${d.type} · ${d.size}</small><input class="form-input" value="${esc(cfg.documentLabelOverrides[d.id] || "")}" placeholder="Nama custom (opsional)"></div><button type="button" data-reset-label title="Kembalikan nama asli"><i data-lucide="rotate-ccw"></i></button></div>`;
}
function move(i, d) {
  const n = i + d;
  if (n < 0 || n >= state.competitions.length) return;
  [state.competitions[i], state.competitions[n]] = [
    state.competitions[n],
    state.competitions[i],
  ];
  renderCompetitions();
  renderPreview();
}
function renderPreview() {
  const root = document.getElementById("downloadPreview");
  applyGlobalThemeTokens(root);
  if (!state.active) return disabled();
  normalize(state);
  const previewState = resolveDownloadPublicState(state);
  const selected =
    previewState.competitions.find(
      (item) => item.competitionId === previewCompetitionId,
    ) ||
    previewState.competitions.find((item) => item.isDefault) ||
    previewState.competitions[0];
  previewCompetitionId = selected?.competitionId || "";
  root.className = "section download-public-preview scaled-public-preview";
  root.innerHTML = buildDownloadMarkup(previewState, {
    selectedCompetitionId: previewCompetitionId,
  });
  root.querySelectorAll(".unduh-tab").forEach(
    (b) =>
      (b.onclick = () => {
        previewCompetitionId = b.dataset.tab.replace(/^download-/, "");
        renderPreview();
      }),
  );
  requestAnimationFrame(fitDownloadPreview);
  lucide.createIcons();
}
function disabled() {
  const root = document.getElementById("downloadPreview");
  root.className = "download-public-preview";
  root.innerHTML =
    '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Halaman Unduh dinonaktifkan</strong></div>';
  lucide.createIcons();
}
function esc(v = "") {
  return String(v).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}
function toast(msg, error = false) {
  const t = document.getElementById("adminToast");
  t.querySelector("span").textContent = msg;
  t.classList.toggle("admin-toast--error", error);
  t.classList.add("admin-toast--show");
  setTimeout(() => t.classList.remove("admin-toast--show"), 2600);
}

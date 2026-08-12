let previewCompetitionId = "";
let downloadPreviewResizeObserver;
let currentDownloadCompetition = null;
let downloadArchiveSources = [];
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
let state = { ...getDownloadAdminState(), competitions: [] };
async function hydrateDownloads() {
  try {
    const loaded = await TalentaDownloadApi.load();
    window.TalentaDownloadCompetitions = loaded.available;
    currentDownloadCompetition = loaded.currentCompetition;
    downloadArchiveSources = loaded.archiveSources;
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
    renderCurrentDocuments();
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
  renderCurrentDocuments();
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
  document.getElementById("addCurrentDocument").onclick = async (event) => {
    if (!currentDownloadCompetition)
      return toast("Lomba saat ini belum tersedia.", true);
    const titleInput = document.getElementById("downloadDocumentTitle");
    const categoryInput = document.getElementById("downloadDocumentCategory");
    const fileInput = document.getElementById("downloadDocumentFile");
    const title = titleInput.value.trim();
    const file = fileInput.files[0];
    if (!title) return toast("Nama dokumen wajib diisi.", true);
    if (!file) return toast("Pilih file PDF yang akan disimpan.", true);
    event.currentTarget.disabled = true;
    try {
      const uploadedDocument = await TalentaDownloadApi.createCurrentDocument(
        currentDownloadCompetition.id,
        {
          title,
          category: categoryInput.value.trim(),
          sortOrder: currentDownloadCompetition.documents.length,
        },
        file,
      );
      currentDownloadCompetition.documents.push(uploadedDocument);
      titleInput.value = "";
      categoryInput.value = "";
      fileInput.value = "";
      document.getElementById("addDocumentFormContainer").style.display =
        "none";
      renderCurrentDocuments();
      renderPreview();
      toast("Dokumen lomba saat ini berhasil disimpan.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      event.currentTarget.disabled = false;
    }
  };

  const btnShowAddForm = document.getElementById("btnShowAddDocumentForm");
  const btnCancelAddForm = document.getElementById("btnCancelAddDocument");
  const formContainer = document.getElementById("addDocumentFormContainer");

  if (btnShowAddForm && btnCancelAddForm && formContainer) {
    btnShowAddForm.onclick = () => {
      formContainer.style.display = "block";
      document.getElementById("downloadDocumentTitle").focus();
    };
    btnCancelAddForm.onclick = () => {
      formContainer.style.display = "none";
      document.getElementById("downloadDocumentTitle").value = "";
      document.getElementById("downloadDocumentCategory").value = "";
      document.getElementById("downloadDocumentFile").value = "";
    };
  }
  const form = document.getElementById("downloadEditorForm");
  const revertDownload = () => location.reload();
  form.onsubmit = async (e) => {
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
  window.TalentaEditor = Object.freeze({
    save: () => form.requestSubmit(),
    revert: revertDownload,
  });
  document.getElementById("resetDownload").onclick = async () => {
    const confirmed = await adminConfirm({
      title: "Urungkan edit halaman Unduh?",
      message:
        "Perubahan halaman Unduh yang belum disimpan akan dibuang dan draf tersimpan akan dimuat kembali.",
      confirmLabel: "Urungkan edit",
      variant: "danger",
      icon: "undo-2",
    });
    if (confirmed) revertDownload();
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
    allComps = downloadArchiveSources,
    available = allComps.filter(
      (x) => x.active !== false && !selected.has(x.id),
    ),
    el = document.getElementById("archiveCompetitionSelect");
  const selectedArchiveCount = state.competitions.filter((item) =>
    allComps.some((source) => source.id === item.competitionId),
  ).length;
  document.getElementById("downloadSourceSummary").textContent =
    allComps.length > 0
      ? `${selectedArchiveCount} sumber dipilih dari ${allComps.length} Event sebelumnya.`
      : "Belum ada Event sebelumnya. Sumber Arsip akan muncul otomatis setelah Event berikutnya dibuat.";
  el.innerHTML = available.length
    ? available
        .map((x) => `<option value="${x.id}">Arsip — ${esc(x.name)}</option>`)
        .join("")
    : `<option value="">${allComps.length ? "Semua Arsip sudah ditambahkan" : "Belum ada Event sebelumnya"}</option>`;
  document.getElementById("addArchiveCompetition").disabled = !available.length;
}
function renderCompetitions() {
  normalize(state);
  const root = document.getElementById("downloadCompetitionEditor");
  root.innerHTML = "";
  const archiveConfigs = state.competitions
    .map((cfg, stateIndex) => ({ cfg, stateIndex }))
    .filter(({ cfg }) =>
      downloadArchiveSources.some((source) => source.id === cfg.competitionId),
    );
  archiveConfigs.forEach(({ cfg, stateIndex }, archiveIndex) => {
    const comp = archive(cfg.competitionId),
      el = document.createElement("article");
    el.className = "download-period-card archive-link-card";
    el.innerHTML = `<div class="download-period-card__order"><button type="button" data-up ${archiveIndex === 0 ? "disabled" : ""}><i data-lucide="chevron-up"></i></button><span>${String(archiveIndex + 1).padStart(2, "0")}</span><button type="button" data-down ${archiveIndex === archiveConfigs.length - 1 ? "disabled" : ""}><i data-lucide="chevron-down"></i></button></div><div class="archive-link-card__main"><span class="archive-source-badge"><i data-lucide="database"></i> Dari Event sebelumnya</span><strong>${esc(comp.name)}</strong><div class="admin-field"><label>Nama tab di halaman Unduh</label><input class="form-input" value="${esc(cfg.customTabName || comp.shortName)}"></div><button type="button" class="archive-doc-toggle" data-doc-toggle><i data-lucide="files"></i> ${comp.documents.length} dokumen bawaan <i data-lucide="chevron-down"></i></button></div><label class="download-default"><input type="radio" name="defaultCompetition" ${cfg.isDefault ? "checked" : ""} ${!cfg.active ? "disabled" : ""}> Tab default</label><label class="admin-switch"><input type="checkbox" ${cfg.active ? "checked" : ""}><span></span><em>${cfg.active ? "Aktif" : "Nonaktif"}</em></label><button type="button" class="repeat-row__delete"><i data-lucide="unlink"></i></button><div class="archive-linked-docs" hidden>${comp.documents.map((d) => docEditor(cfg, d)).join("")}</div>`;
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
    el.querySelector("[data-up]").onclick = () =>
      moveArchive(archiveConfigs, archiveIndex, -1);
    el.querySelector("[data-down]").onclick = () =>
      moveArchive(archiveConfigs, archiveIndex, 1);
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
      state.competitions.splice(stateIndex, 1);
      normalize(state);
      renderPicker();
      renderCompetitions();
      renderPreview();
    };
    root.appendChild(el);
  });
  lucide.createIcons();
}

function moveCurrentDocument(fromIndex, toIndex, options = {}) {
  if (!currentDownloadCompetition?.documents) return false;
  const list = currentDownloadCompetition.documents;
  if (
    fromIndex < 0 ||
    fromIndex >= list.length ||
    toIndex < 0 ||
    toIndex >= list.length ||
    fromIndex === toIndex
  ) {
    return false;
  }
  const [moved] = list.splice(fromIndex, 1);
  list.splice(toIndex, 0, moved);
  renderCurrentDocuments();
  renderPreview();
  if (options.focusId && options.focusControl) {
    const targetRow = document.querySelector(
      `[data-current-document="${options.focusId}"]`,
    );
    const targetControl = targetRow?.querySelector(
      `[data-current-${options.focusControl}]`,
    );
    if (targetControl) targetControl.focus();
  }
  toast(
    `Urutan "${moved.title}" diubah ke posisi ${toIndex + 1}. Simpan perubahan untuk memperbarui ke database.`,
  );
  return true;
}

function renderCurrentDocuments() {
  const name = document.getElementById("downloadCurrentCompetitionName");
  const root = document.getElementById("downloadCurrentDocumentList");
  if (!name || !root) return;
  if (!currentDownloadCompetition) {
    name.textContent = "Belum ada lomba saat ini.";
    root.innerHTML =
      '<div class="download-empty"><strong>Dokumen belum dapat dikelola.</strong></div>';
    return;
  }
  name.textContent = `${currentDownloadCompetition.name} · ${currentDownloadCompetition.documents.length} dokumen`;
  const total = currentDownloadCompetition.documents.length;
  root.innerHTML = total
    ? currentDownloadCompetition.documents
        .map(
          (item, index) =>
            `<article class="repeat-row download-document-row" data-current-document="${item.id}" data-document-index="${index}">
            <button type="button" class="repeat-row__grip" data-current-grip aria-label="Seret untuk mengubah urutan ${esc(item.title)} (posisi ${index + 1} dari ${total})">
              <i data-lucide="grip-vertical"></i>
            </button>
            <div class="download-document-row__main">
              <div class="download-document-row__heading">
                <strong>${esc(item.title)}</strong>
                <span class="download-document-row__badge">${esc(item.category || "Dokumen")}</span>
              </div>
              <a class="download-document-row__file" href="${esc(item.url || item.fileUrl || "#")}" target="_blank" rel="noopener">
                <i data-lucide="file-text"></i> Lihat File PDF
              </a>
            </div>
            <div class="download-document-row__order-actions">
              <button type="button" class="repeat-row__order-btn" data-current-up ${index === 0 ? "disabled" : ""} aria-label="Naikkan urutan ${esc(item.title)}" title="Naikkan urutan">
                <i data-lucide="arrow-up"></i>
              </button>
              <button type="button" class="repeat-row__order-btn" data-current-down ${index === total - 1 ? "disabled" : ""} aria-label="Turunkan urutan ${esc(item.title)}" title="Turunkan urutan">
                <i data-lucide="arrow-down"></i>
              </button>
            </div>
            <label class="admin-switch"><input type="checkbox" data-current-active ${item.active !== false ? "checked" : ""}><span></span><em>${item.active !== false ? "Aktif" : "Nonaktif"}</em></label>
            <button type="button" class="repeat-row__delete" data-current-delete aria-label="Hapus ${esc(item.title)}" title="Hapus dokumen"><i data-lucide="trash-2"></i></button>
          </article>`,
        )
        .join("")
    : '<div class="download-empty"><i data-lucide="file-plus-2"></i><strong>Belum ada dokumen untuk lomba saat ini.</strong><span>Klik "Tambah dokumen baru" untuk memulai.</span></div>';

  let activePointer = null;

  root.querySelectorAll("[data-current-document]").forEach((row) => {
    const documentId = row.dataset.currentDocument;
    const currentIndex = Number(row.dataset.documentIndex);
    const item = currentDownloadCompetition.documents[currentIndex];

    const btnUp = row.querySelector("[data-current-up]");
    const btnDown = row.querySelector("[data-current-down]");
    if (btnUp) {
      btnUp.onclick = () =>
        moveCurrentDocument(currentIndex, currentIndex - 1, {
          focusId: documentId,
          focusControl: "up",
        });
    }
    if (btnDown) {
      btnDown.onclick = () =>
        moveCurrentDocument(currentIndex, currentIndex + 1, {
          focusId: documentId,
          focusControl: "down",
        });
    }

    const grip = row.querySelector("[data-current-grip]");
    if (grip) {
      grip.onkeydown = (event) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          moveCurrentDocument(currentIndex, currentIndex - 1, {
            focusId: documentId,
            focusControl: "grip",
          });
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          moveCurrentDocument(currentIndex, currentIndex + 1, {
            focusId: documentId,
            focusControl: "grip",
          });
        }
      };

      grip.onpointerdown = (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        activePointer = {
          pointerId: event.pointerId,
          startY: event.clientY,
          sourceIndex: currentIndex,
          documentId,
          moved: false,
          targetIndex: currentIndex,
        };
        grip.setPointerCapture(event.pointerId);
      };

      grip.onpointermove = (event) => {
        if (!activePointer || activePointer.pointerId !== event.pointerId)
          return;
        const deltaY = event.clientY - activePointer.startY;
        if (Math.abs(deltaY) > 6) activePointer.moved = true;
        if (!activePointer.moved) return;

        event.preventDefault();
        const rows = Array.from(
          root.querySelectorAll("[data-current-document]"),
        );
        let targetIndex = activePointer.sourceIndex;
        rows.forEach((candidateRow, index) => {
          const rect = candidateRow.getBoundingClientRect();
          const middleY = rect.top + rect.height / 2;
          if (event.clientY > middleY) targetIndex = index;
        });
        targetIndex = Math.max(0, Math.min(rows.length - 1, targetIndex));
        activePointer.targetIndex = targetIndex;
        rows.forEach((r, idx) => {
          r.classList.toggle(
            "download-document-row--drag-target",
            idx === targetIndex && idx !== activePointer.sourceIndex,
          );
        });
      };

      const cleanupPointer = (event) => {
        if (!activePointer || activePointer.pointerId !== event.pointerId)
          return;
        const state = activePointer;
        activePointer = null;
        try {
          if (grip.hasPointerCapture(event.pointerId)) {
            grip.releasePointerCapture(event.pointerId);
          }
        } catch (_error) {}
        root.querySelectorAll("[data-current-document]").forEach((r) => {
          r.classList.remove(
            "download-document-row--drag-active",
            "download-document-row--drag-target",
          );
        });
        if (
          state.moved &&
          state.targetIndex !== undefined &&
          state.targetIndex !== state.sourceIndex
        ) {
          moveCurrentDocument(state.sourceIndex, state.targetIndex, {
            focusId: state.documentId,
            focusControl: "grip",
          });
        }
      };

      grip.onpointerup = cleanupPointer;
      grip.onpointercancel = cleanupPointer;
    }

    const activeToggle = row.querySelector("[data-current-active]");
    activeToggle.onchange = async () => {
      const previousActive = item.active !== false;
      activeToggle.disabled = true;
      item.active = activeToggle.checked;
      activeToggle.parentElement.querySelector("em").textContent = item.active
        ? "Aktif"
        : "Nonaktif";
      try {
        const updated = await TalentaDownloadApi.updateCurrentDocument(
          currentDownloadCompetition.id,
          item,
        );
        Object.assign(item, updated);
        renderPreview();
        toast(`Status dokumen "${item.title}" diperbarui.`);
      } catch (error) {
        item.active = previousActive;
        activeToggle.checked = previousActive;
        activeToggle.parentElement.querySelector("em").textContent =
          previousActive ? "Aktif" : "Nonaktif";
        toast(error.message, true);
      } finally {
        activeToggle.disabled = false;
      }
    };

    row.querySelector("[data-current-delete]").onclick = async () => {
      let message = `${item.title} akan dihapus dari lomba saat ini.`;
      if (item.documentRole === "winner_decree") {
        message +=
          " PENTING: Ini adalah file SK Pemenang. Jika dokumen ini dihapus, SK pada Manajemen Pemenang juga akan otomatis ikut terhapus.";
      }
      const confirmed = await adminConfirm({
        title: "Hapus dokumen?",
        message: message,
        confirmLabel: "Ya, hapus dokumen",
        variant: "danger",
        icon: "file-x-2",
      });
      if (!confirmed) return;
      try {
        await TalentaDownloadApi.deleteCurrentDocument(
          currentDownloadCompetition.id,
          item.id,
        );
        currentDownloadCompetition.documents =
          currentDownloadCompetition.documents.filter(
            (document) => document.id !== item.id,
          );
        state.competitions.forEach((config) => {
          config.hiddenDocumentIds = config.hiddenDocumentIds.filter(
            (id) => id !== item.id,
          );
          delete config.documentLabelOverrides[item.id];
        });
        renderCurrentDocuments();
        renderPreview();
        toast("Dokumen berhasil dihapus.");
      } catch (error) {
        toast(error.message, true);
      }
    };
  });
  lucide.createIcons();
}
function docEditor(cfg, d) {
  const shown = !cfg.hiddenDocumentIds.includes(d.id);
  return `<div class="archive-linked-doc" data-document="${d.id}"><label class="admin-switch"><input type="checkbox" ${shown ? "checked" : ""}><span></span><em>${shown ? "Tampil" : "Sembunyi"}</em></label><div><strong>${esc(d.title)}</strong><small>${esc(d.category)} · ${d.type} · ${d.size}</small><input class="form-input" value="${esc(cfg.documentLabelOverrides[d.id] || "")}" placeholder="Nama custom (opsional)"></div><button type="button" data-reset-label title="Kembalikan nama asli"><i data-lucide="rotate-ccw"></i></button></div>`;
}
function moveArchive(configs, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= configs.length) return;
  const sourceIndex = configs[index].stateIndex;
  const targetIndex = configs[target].stateIndex;
  [state.competitions[sourceIndex], state.competitions[targetIndex]] = [
    state.competitions[targetIndex],
    state.competitions[sourceIndex],
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

window.addEventListener("storage", (e) => {
  if (e.key === "talenta_download_editor_v2") {
    toast(
      "Peringatan: Data Unduhan baru saja diubah di tab atau perangkat lain. Harap muat ulang halaman untuk menghindari konflik timpa data.",
      true,
    );
  }
});

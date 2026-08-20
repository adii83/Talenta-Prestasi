/* CRUD kategori juara dan pemenang lomba aktif. */
let wmState = {
  competitionId: "",
  sk: {
    title: "SK Penetapan Pemenang",
    description:
      "Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.",
    url: "",
  },
  categories: [],
};
let wmDisplay = loadDisplay();
let winnerPreviewResizeObserver;
let winnerArchiveSources = [];

function load() {
  return getWinnerManagerState();
}
function loadDisplay() {
  return getWinnerPageState();
}
function applyGlobalTheme(root) {
  applyGlobalThemeTokens(root);
}
async function save() {
  let invalid = false;
  wmState.categories.forEach((category) =>
    category.winners.forEach((winner) => {
      winner.modeError = winner.displayMode
        ? ""
        : "Pilih jenis tampilan pemenang.";
      winner.designError =
        winner.displayMode === "custom" && !winner.designAssetId
          ? "Unggah gambar desain sendiri."
          : "";
      winner.nameError =
        winner.displayMode === "built_in" && !winner.name?.trim()
          ? "Nama lengkap wajib diisi."
          : "";
      invalid ||= Boolean(
        winner.modeError || winner.designError || winner.nameError,
      );
    }),
  );
  if (invalid) {
    renderCategories();
    toast("Lengkapi data pemenang yang ditandai.", true);
    return;
  }
  try {
    const saved = await TalentaWinnerApi.save(wmState, wmDisplay);
    wmState.sk = saved.sk;
    syncSk();
    toast("Data pemenang tersimpan ke database.");
  } catch (error) {
    toast(error.message, true);
  }
}
async function hydrateWinners() {
  try {
    const loaded = await TalentaWinnerApi.load();
    wmState = loaded.state;
    winnerArchiveSources = loaded.archives || [];
    const metadata = loaded.page?.metadataVisibility || {};
    wmDisplay = normalizeWinnerPageState({
      ...wmDisplay,
      ...(loaded.page || {}),
      showSk: loaded.page?.showDecree ?? wmDisplay.showSk,
      showPhoto: metadata.showPhoto ?? wmDisplay.showPhoto,
      showSchool: metadata.showSchool ?? wmDisplay.showSchool,
      showExam: metadata.showExam ?? wmDisplay.showExam,
      showRegency: metadata.showRegency ?? wmDisplay.showRegency,
      showProvince: metadata.showProvince ?? wmDisplay.showProvince,
    });
    if (Number.isFinite(Number(loaded.page?.archiveLimit)))
      wmDisplay.archiveLimit = Number(loaded.page.archiveLimit);
    if (loaded.competition)
      loaded.competition.winnerCategories = loaded.state.categories;
    window.TalentaActiveCompetition = loaded.competition;
    renderActiveComp();
    renderCategories();
    syncDisplay();
    renderArchiveSources();
    renderPreview();
    syncSk();
  } catch (error) {
    toast(error.message, true);
  }
}
function uid() {
  return (
    "wc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  );
}
function wid() {
  return (
    "wn-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  );
}
function esc(v = "") {
  return String(v).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}
function toast(msg, err = false) {
  const t = document.getElementById("adminToast");
  t.querySelector("span").textContent = msg;
  t.classList.toggle("admin-toast--error", err);
  t.classList.add("admin-toast--show");
  setTimeout(() => t.classList.remove("admin-toast--show"), 2600);
}
function icons() {
  lucide.createIcons();
}
function availableWinnerArchives() {
  return winnerArchiveSources.filter((competition) =>
    (competition.winnerCategories || []).some(
      (category) =>
        category.active !== false &&
        (category.winners || []).some((winner) => winner.active !== false),
    ),
  );
}
function archiveSourceIcon(competition) {
  if (competition.iconMode === "upload" && competition.uploadedIcon)
    return `<img class="wm-archive-source__uploaded-icon" src="${esc(competition.uploadedIcon)}" alt="${esc(competition.iconAlt || "Logo atau maskot lomba")}">`;
  return `<span class="wm-archive-source__icon"><i data-lucide="${esc(competition.icon || "archive")}"></i></span>`;
}

document.addEventListener("DOMContentLoaded", () => {
  renderActiveComp();
  syncSk();
  bindSk();
  renderCategories();
  syncDisplay();
  bindDisplay();
  renderArchiveSources();
  renderPreview();
  setupWinnerPreviewSizing();
  subscribeGlobalSettings(() => {
    applyGlobalTheme(document.getElementById("wmCategoryEditor"));
    renderPreview();
  });
  window.addEventListener("talenta:archive", refreshWinnerArchiveSources);
  window.addEventListener("storage", (event) => {
    if (event.key === ARCHIVE_STATE_KEY || event.key === null) {
      refreshWinnerArchiveSources();
    }
    if (event.key === WINNER_MANAGER_STATE_KEY) {
      wmToast(
        "Peringatan: Data pemenang baru saja diubah di tab atau perangkat lain. Harap muat ulang halaman untuk menghindari konflik timpa data.",
        true,
      );
    }
  });
  bindGlobal();
  icons();
  void hydrateWinners();
});

function refreshWinnerArchiveSources() {
  wmDisplay = normalizeWinnerPageState(wmDisplay);
  syncDisplay();
  renderArchiveSources();
  renderPreview();
}

function renderActiveComp() {
  const comp = window.TalentaActiveCompetition,
    el = document.getElementById("wmActiveCompetition");
  if (!comp) {
    el.innerHTML = "";
    return;
  }
  const winnersCount = (comp.winnerCategories || []).reduce(
    (acc, cat) => acc + (cat.winners || []).length,
    0,
  );
  el.innerHTML = `<div class="wm-comp-badge"><i data-lucide="${esc(comp.icon || "trophy")}"></i><div><strong>${esc(comp.name)}</strong><small>${esc(comp.shortName)} · ${(comp.winnerCategories || []).length} kategori sumber · ${winnersCount} pemenang sumber</small></div></div>`;
}
function syncSk() {
  document.getElementById("wmSkTitle").value = wmState.sk.title;
  document.getElementById("wmSkDescription").value = wmState.sk.description;
  const btnText = document.getElementById("wmSkFileBtnText");
  const link = document.getElementById("wmSkFileLink");
  btnText.textContent = wmState.sk.assetId
    ? `File SK tersimpan${wmState.sk.displaySize ? ` · ${wmState.sk.displaySize}` : ""}`
    : "Pilih file PDF... (Maks 10MB)";
  btnText.style.color = wmState.sk.assetId ? "var(--c-text)" : "var(--c-gray)";
  link.hidden = !wmState.sk.url;
  link.style.display = wmState.sk.url ? "inline-flex" : "none";
  if (wmState.sk.url) link.href = wmState.sk.url;
  const delBtn = document.getElementById("wmSkDeleteBtn");
  if (delBtn) delBtn.hidden = !wmState.sk.assetId;
}
function bindSk() {
  ["wmSkTitle", "wmSkDescription"].forEach((id) => {
    const map = {
      wmSkTitle: "title",
      wmSkDescription: "description",
    };
    document.getElementById(id).oninput = (e) => {
      wmState.sk[map[id]] = e.target.value;
      renderPreview();
    };
  });
  document.getElementById("wmSkFile").onchange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.disabled = true;
    try {
      wmState.sk = await TalentaWinnerApi.saveDecree(wmState.sk, file);
      syncSk();
      renderPreview();
      toast("File SK tersimpan dan otomatis ditambahkan ke dokumen lomba.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      event.target.value = "";
      event.target.disabled = false;
    }
  };
  const delBtn = document.getElementById("wmSkDeleteBtn");
  if (delBtn)
    delBtn.onclick = async () => {
      const confirmed = await adminConfirm({
        title: "Hapus file SK?",
        message: "File SK akan dihapus dari lomba saat ini.",
        confirmLabel: "Ya, hapus",
        variant: "danger",
        icon: "file-x-2",
      });
      if (!confirmed) return;
      try {
        wmState.sk = await TalentaWinnerApi.saveDecree(
          { ...wmState.sk, documentId: null },
          null,
        );
        wmState.sk.assetId = null;
        wmState.sk.url = "";
        wmState.sk.displaySize = "";
        syncSk();
        renderPreview();
        toast("File SK berhasil dihapus.");
      } catch (error) {
        toast(error.message, true);
      }
    };
}
function syncDisplay() {
  const availableCount = availableWinnerArchives().length;
  wmDisplay.archiveLimit = availableCount
    ? Math.max(1, Math.min(availableCount, wmDisplay.archiveLimit))
    : 0;
  const vals = {
    wmPageActive: wmDisplay.active,
    wmPageEyebrow: wmDisplay.eyebrow,
    wmPageTitle: wmDisplay.title,
    wmPageDescription: wmDisplay.description,
    wmPageAlignment: wmDisplay.alignment,
    wmShowSk: wmDisplay.showSk,
    wmShowPhoto: wmDisplay.showPhoto,
    wmShowSchool: wmDisplay.showSchool,
    wmShowExam: wmDisplay.showExam,
    wmShowRegency: wmDisplay.showRegency,
    wmShowProvince: wmDisplay.showProvince,
    wmArchiveActive: wmDisplay.archiveActive,
    wmArchiveTitle: wmDisplay.archiveTitle,
    wmArchiveAction: wmDisplay.archiveAction,
    wmArchiveLimit: wmDisplay.archiveLimit,
  };
  Object.entries(vals).forEach(([id, v]) => {
    const e = document.getElementById(id);
    e.type === "checkbox" ? (e.checked = v) : (e.value = v);
  });
  const limitInput = document.getElementById("wmArchiveLimit");
  limitInput.min = availableCount ? "1" : "0";
  limitInput.max = String(availableCount);
  limitInput.disabled = availableCount === 0;
  document.getElementById("wmArchiveLimitHint").textContent = availableCount
    ? `Maksimal ${availableCount}, sesuai Arsip yang memiliki pemenang`
    : "Belum ada Arsip yang memiliki pemenang aktif";
}
function bindDisplay() {
  const text = {
    wmPageEyebrow: "eyebrow",
    wmPageTitle: "title",
    wmPageDescription: "description",
    wmArchiveTitle: "archiveTitle",
    wmArchiveAction: "archiveAction",
  };
  Object.entries(text).forEach(
    ([id, k]) =>
      (document.getElementById(id).oninput = (e) => {
        wmDisplay[k] = e.target.value;
        renderPreview();
      }),
  );
  document.getElementById("wmPageAlignment").onchange = (e) => {
    wmDisplay.alignment = e.target.value;
    renderPreview();
  };
  const checks = {
    wmPageActive: "active",
    wmShowSk: "showSk",
    wmShowPhoto: "showPhoto",
    wmShowSchool: "showSchool",
    wmShowExam: "showExam",
    wmShowRegency: "showRegency",
    wmShowProvince: "showProvince",
    wmArchiveActive: "archiveActive",
  };
  Object.entries(checks).forEach(
    ([id, k]) =>
      (document.getElementById(id).onchange = (e) => {
        wmDisplay[k] = e.target.checked;
        renderPreview();
      }),
  );
  document.getElementById("wmArchiveLimit").oninput = (e) => {
    const availableCount = availableWinnerArchives().length;
    wmDisplay.archiveLimit = Math.max(
      availableCount ? 1 : 0,
      Math.min(availableCount, Number(e.target.value) || 0),
    );
    e.target.value = String(wmDisplay.archiveLimit);
    renderArchiveSources();
    renderPreview();
  };
}
function renderArchiveSources() {
  const root = document.getElementById("wmArchiveSourceList"),
    allArchives = winnerArchiveSources,
    items = availableWinnerArchives(),
    unavailableCount = Math.max(0, allArchives.length - items.length);
  root.innerHTML =
    `<p class="wm-source-note"><i data-lucide="database"></i> ${allArchives.length} Arsip publik; ${items.length} memiliki pemenang aktif${unavailableCount ? `; ${unavailableCount} tidak masuk karena belum memiliki pemenang` : ""}. ${Math.min(wmDisplay.archiveLimit, items.length)} card akan tampil.</p>` +
    items
      .map(
        (c, i) =>
          `<div class="wm-archive-source ${i < wmDisplay.archiveLimit ? "is-included" : ""}">${archiveSourceIcon(c)}<span><strong>${esc(c.name)}</strong><small>${(c.winnerCategories || []).reduce((n, x) => n + x.winners.filter((w) => w.active !== false).length, 0)} pemenang · Sumber Arsip</small></span><em>${i < wmDisplay.archiveLimit ? "Ditampilkan" : "Di luar batas"}</em></div>`,
      )
      .join("");
  icons();
}
function bindGlobal() {
  document.getElementById("sidebarToggle").onclick = () =>
    document
      .getElementById("adminSidebar")
      .classList.toggle("admin-sidebar--open");
  const form = document.getElementById("winnerManagerForm");
  const revertWinners = () => location.reload();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.submitter;
    if (submit) submit.disabled = true;
    await save();
    if (submit) submit.disabled = false;
  };
  window.TalentaEditor = Object.freeze({ save, revert: revertWinners });
  document.getElementById("resetWinnerManager").onclick = async () => {
    const confirmed = await adminConfirm({
      title: "Urungkan edit Pemenang?",
      message:
        "Perubahan Pemenang yang belum disimpan akan dibuang dan draf tersimpan akan dimuat kembali.",
      confirmLabel: "Urungkan edit",
      variant: "danger",
      icon: "undo-2",
    });
    if (confirmed) revertWinners();
  };
  document.getElementById("addWinnerCategory").onclick = () => {
    wmState.categories.push({
      id: uid(),
      name: "Kategori Baru",
      icon: "medal",
      rankPrefix: "Juara",
      active: true,
      winners: [],
    });
    renderCategories();
    renderPreview();
  };
  document.querySelectorAll("[data-wm-preview]").forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll("[data-wm-preview]")
          .forEach((x) => x.classList.remove("preview-switch__btn--active"));
        b.classList.add("preview-switch__btn--active");
        const f = document.getElementById("wmPreviewFrame");
        f.dataset.previewMode = b.dataset.wmPreview;
        f.classList.remove(
          "wm-preview-frame--tablet",
          "wm-preview-frame--mobile",
        );
        if (b.dataset.wmPreview !== "desktop")
          f.classList.add("wm-preview-frame--" + b.dataset.wmPreview);
        requestAnimationFrame(fitWinnerPreview);
      }),
  );
}

function setupWinnerPreviewSizing() {
  const frame = document.getElementById("wmPreviewFrame");
  const root = document.getElementById("wmPreview");
  frame.dataset.previewMode = frame.dataset.previewMode || "desktop";
  winnerPreviewResizeObserver?.disconnect();
  winnerPreviewResizeObserver = new ResizeObserver(fitWinnerPreview);
  winnerPreviewResizeObserver.observe(frame);
  winnerPreviewResizeObserver.observe(root);
  requestAnimationFrame(fitWinnerPreview);
}

function fitWinnerPreview() {
  const frame = document.getElementById("wmPreviewFrame");
  const root = document.getElementById("wmPreview");
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

function reconcileWinnerRanks(category, previousOrder) {
  const prefix = category.rankPrefix || "Juara";
  category.winners.forEach((winner, newIndex) => {
    const oldIndex = previousOrder.indexOf(winner);
    if (oldIndex >= 0 && winner.rank === `${prefix} ${oldIndex + 1}`)
      winner.rank = `${prefix} ${newIndex + 1}`;
  });
}

function renderCategories() {
  const root = document.getElementById("wmCategoryEditor");
  applyGlobalTheme(root);
  root.innerHTML = "";
  wmState.categories.forEach((cat, ci) => {
    const el = document.createElement("div");
    el.className = "wm-category-block";
    el.innerHTML = `
<div class="wm-category-header">
<div class="wm-category-header__order"><button type="button" data-cat-up ${ci === 0 ? "disabled" : ""}><i data-lucide="chevron-up"></i></button><span>${String(ci + 1).padStart(2, "0")}</span><button type="button" data-cat-down ${ci === wmState.categories.length - 1 ? "disabled" : ""}><i data-lucide="chevron-down"></i></button></div>
<div class="wm-category-header__fields">
<div class="admin-field"><label>Nama kategori</label><input class="form-input" data-cat-name value="${esc(cat.name)}"></div>
<div class="admin-field"><label>Ikon <small>(Lucide)</small></label><input class="form-input" data-cat-icon value="${esc(cat.icon)}"></div>
<div class="admin-field"><label>Prefix rank <small>(mis. "Juara", "Medali")</small></label><input class="form-input" data-cat-prefix value="${esc(cat.rankPrefix || "Juara")}"></div>
</div>
<label class="admin-switch"><input type="checkbox" data-cat-toggle ${cat.active ? "checked" : ""}><span></span><em>${cat.active ? "Aktif" : "Nonaktif"}</em></label>
<button type="button" class="repeat-row__delete" data-cat-delete title="Hapus kategori"><i data-lucide="trash-2"></i></button>
</div>
<div class="wm-winners-section">
<div class="wm-winners-toolbar"><strong><i data-lucide="${esc(cat.icon)}"></i> ${esc(cat.name)} <span class="badge badge--gold">${cat.winners.length} Pemenang</span></strong><button type="button" class="btn btn--outline btn--sm" data-add-winner><i data-lucide="user-plus"></i> Tambah pemenang</button></div>
<div class="wm-winners-list" data-winners></div>
</div>`;
    // Bind category fields
    el.querySelector("[data-cat-name]").oninput = (e) => {
      cat.name = e.target.value;
      renderCategories();
      renderPreview();
    };
    el.querySelector("[data-cat-icon]").oninput = (e) => {
      cat.icon = e.target.value;
      renderPreview();
    };
    el.querySelector("[data-cat-prefix]").oninput = (e) => {
      cat.rankPrefix = e.target.value;
      renderPreview();
    };
    el.querySelector("[data-cat-toggle]").onchange = (e) => {
      cat.active = e.target.checked;
      renderCategories();
      renderPreview();
    };
    el.querySelector("[data-cat-up]").onclick = () => {
      if (ci > 0) {
        [wmState.categories[ci - 1], wmState.categories[ci]] = [
          wmState.categories[ci],
          wmState.categories[ci - 1],
        ];
        renderCategories();
        renderPreview();
      }
    };
    el.querySelector("[data-cat-down]").onclick = () => {
      if (ci < wmState.categories.length - 1) {
        [wmState.categories[ci], wmState.categories[ci + 1]] = [
          wmState.categories[ci + 1],
          wmState.categories[ci],
        ];
        renderCategories();
        renderPreview();
      }
    };
    el.querySelector("[data-cat-delete]").onclick = async () => {
      const confirmed = await adminConfirm({
        title: "Hapus kategori Pemenang?",
        message: `${cat.name} dan seluruh ${cat.winners.length} data pemenang di dalamnya akan dihapus dari perubahan saat ini.`,
        confirmLabel: "Ya, hapus kategori",
        variant: "danger",
        icon: "folder-x",
      });
      if (!confirmed) return;
      wmState.categories.splice(ci, 1);
      renderCategories();
      renderPreview();
    };
    el.querySelector("[data-add-winner]").onclick = () => {
      cat.winners.push({
        id: wid(),
        rank: `${cat.rankPrefix || "Juara"} ${cat.winners.length + 1}`,
        displayMode: null,
        designAssetId: null,
        design: "",
        photoAssetId: null,
        name: "",
        school: "",
        exam: "",
        district: "",
        regency: "",
        province: "",
        photo: "",
        active: true,
      });
      renderCategories();
      renderPreview();
    };
    const wList = el.querySelector("[data-winners]");
    cat.winners.forEach((w, wi) => {
      const wEl = document.createElement("div");
      const visual = w.displayMode === "custom" ? w.design : w.photo;
      const visualAlt = w.displayMode === "custom" ? w.rank : w.name;
      const builtInFields = `
<div class="admin-field"><label>Label rank <small>(dapat diubah)</small></label><input class="form-input" data-w="rank" value="${esc(w.rank)}"></div>
<div class="admin-field"><label>Nama lengkap</label><input class="form-input${w.nameError ? " is-invalid" : ""}" data-w="name" value="${esc(w.name)}" aria-invalid="${Boolean(w.nameError)}">${w.nameError ? `<p class="admin-field-error">${esc(w.nameError)}</p>` : ""}</div>
<div class="admin-field"><label>Sekolah</label><input class="form-input" data-w="school" value="${esc(w.school)}"></div>
<div class="admin-field"><label>No. Ujian</label><input class="form-input" data-w="exam" value="${esc(w.exam)}"></div>
<div class="admin-field"><label>Kabupaten</label><input class="form-input" data-w="regency" value="${esc(w.regency)}"></div>
<div class="admin-field"><label>Provinsi</label><input class="form-input" data-w="province" value="${esc(w.province)}"></div>
<div class="admin-field"><label>Foto</label>${w.photo ? `<div class="wm-upload-actions"><span class="badge badge--gold">Foto tersimpan</span><button type="button" class="btn btn--outline btn--sm is-danger" data-w-remove-photo><i data-lucide="trash-2"></i> Hapus</button></div>` : ""}<input type="file" class="form-input" data-w-photo accept="image/png,image/jpeg,image/webp"></div>`;
      const customFields = `
<div class="admin-field wm-winner-context"><label>Urutan</label><strong>${esc(w.rank)}</strong></div>
<div class="admin-field admin-field--wide"><label>Desain sendiri</label>
${w.design ? `<div class="wm-custom-design-preview"><img src="${esc(w.design)}" alt="${esc(w.rank)}"></div><div class="wm-upload-actions"><label class="btn btn--outline btn--sm" for="w-design-${esc(w.id)}">Ganti gambar</label><button type="button" class="btn btn--outline btn--sm is-danger" data-w-remove-design>Hapus gambar</button></div>` : `<label class="wm-custom-design-upload${w.designError ? " is-invalid" : ""}" for="w-design-${esc(w.id)}"><span class="wm-custom-design-upload__content"><i data-lucide="image-up"></i><strong>Unggah gambar</strong><span>JPG, PNG, atau WebP</span></span></label>`}
<input id="w-design-${esc(w.id)}" type="file" data-w-design accept="image/png,image/jpeg,image/webp" hidden>
${w.designError ? `<p class="admin-field-error">${esc(w.designError)}</p>` : ""}
<p class="admin-field__hint">Rekomendasi 1080 × 1080 px (rasio 1:1). Format JPG, PNG, atau WebP. Maksimum upload 2 MB. Gambar dioptimalkan otomatis ke target 400 KB, dengan batas hasil 500 KB. Gambar dengan rasio berbeda akan dipotong otomatis dari tengah.</p></div>`;
      wEl.className =
        "wm-winner-card" + (w.active ? "" : " wm-winner-card--disabled");
      wEl.innerHTML = `
<div class="wm-winner-card__header">
<div class="wm-winner-card__photo">${visual ? `<img src="${esc(visual)}" alt="${esc(visualAlt)}">` : initials(w.name)}</div>
<div class="wm-winner-card__order"><button type="button" data-w-up ${wi === 0 ? "disabled" : ""}><i data-lucide="chevron-up"></i></button><span>${wi + 1}</span><button type="button" data-w-down ${wi === cat.winners.length - 1 ? "disabled" : ""}><i data-lucide="chevron-down"></i></button></div>
<label class="admin-switch"><input type="checkbox" data-w-toggle ${w.active ? "checked" : ""}><span></span><em>${w.active ? "Aktif" : "Nonaktif"}</em></label>
<button type="button" class="repeat-row__delete" data-w-delete><i data-lucide="trash-2"></i></button>
</div>
<fieldset class="wm-display-mode-selector${w.modeError ? " is-invalid" : ""}"><legend>Jenis tampilan</legend>
<div class="wm-display-mode-selector__options"><label><input type="radio" name="winner-mode-${esc(w.id)}" data-w-mode value="built_in" ${w.displayMode === "built_in" ? "checked" : ""}><span><i data-lucide="layout-template"></i><strong>Gunakan desain bawaan</strong></span></label>
<label><input type="radio" name="winner-mode-${esc(w.id)}" data-w-mode value="custom" ${w.displayMode === "custom" ? "checked" : ""}><span><i data-lucide="image-up"></i><strong>Unggah desain sendiri</strong></span></label></div>
${w.modeError ? `<p class="admin-field-error">${esc(w.modeError)}</p>` : ""}</fieldset>
${w.displayMode ? `<div class="wm-winner-card__form admin-form-grid">${w.displayMode === "custom" ? customFields : builtInFields}</div>` : ""}`;
      wEl.querySelectorAll("[data-w]").forEach(
        (inp) =>
          (inp.oninput = () => {
            w[inp.dataset.w] = inp.value;
            w.nameError = "";
            renderPreview();
          }),
      );
      wEl.querySelectorAll("[data-w-mode]").forEach((radio) => {
        radio.onchange = async () => {
          const newMode = radio.value;
          const oldMode = w.displayMode;
          if (oldMode && oldMode !== newMode) {
            const confirmed = await adminConfirm({
              title: "Ganti jenis tampilan?",
              message: "Data jenis tampilan lama akan dibuang. Lanjutkan?",
              confirmLabel: "Ya, ganti",
              variant: "warning",
              icon: "alert-triangle",
            });
            if (!confirmed) {
              renderCategories();
              return;
            }
            if (newMode === "custom") {
              Object.assign(w, {
                name: "",
                school: "",
                exam: "",
                district: "",
                regency: "",
                province: "",
                photoAssetId: null,
                photo: "",
                nameError: "",
              });
            } else {
              TalentaMedia.revokePreviewUrl(w.design);
              Object.assign(w, {
                designAssetId: null,
                design: "",
                name: "",
                school: "",
                exam: "",
                district: "",
                regency: "",
                province: "",
                photoAssetId: null,
                photo: "",
                designError: "",
              });
            }
          }
          w.displayMode = newMode;
          w.modeError = "";
          renderCategories();
          renderPreview();
        };
      });
      wEl.querySelector("[data-w-toggle]").onchange = (e) => {
        w.active = e.target.checked;
        renderCategories();
        renderPreview();
      };
      wEl.querySelector("[data-w-up]").onclick = () => {
        if (wi > 0) {
          const previousOrder = [...cat.winners];
          [cat.winners[wi - 1], cat.winners[wi]] = [
            cat.winners[wi],
            cat.winners[wi - 1],
          ];
          reconcileWinnerRanks(cat, previousOrder);
          renderCategories();
          renderPreview();
        }
      };
      wEl.querySelector("[data-w-down]").onclick = () => {
        if (wi < cat.winners.length - 1) {
          const previousOrder = [...cat.winners];
          [cat.winners[wi], cat.winners[wi + 1]] = [
            cat.winners[wi + 1],
            cat.winners[wi],
          ];
          reconcileWinnerRanks(cat, previousOrder);
          renderCategories();
          renderPreview();
        }
      };
      wEl.querySelector("[data-w-delete]").onclick = async () => {
        const confirmed = await adminConfirm({
          title: "Hapus data pemenang?",
          message: `${w.name || w.rank || "Pemenang"} akan dihapus dari kategori ${cat.name}.`,
          confirmLabel: "Ya, hapus pemenang",
          variant: "danger",
          icon: "user-x",
        });
        if (!confirmed) return;
        const oldWinners = [...cat.winners];
        TalentaMedia.revokePreviewUrl(w.design);
        TalentaMedia.revokePreviewUrl(w.photo);
        cat.winners.splice(wi, 1);
        reconcileWinnerRanks(cat, oldWinners);
        renderCategories();
        renderPreview();
      };
      const photoInput = wEl.querySelector("[data-w-photo]");
      if (photoInput)
        photoInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          e.target.disabled = true;
          try {
            const asset = await TalentaMedia.upload(file, {
              altText: `Foto ${w.name || "pemenang"}`,
            });
            const photo = await TalentaMedia.adminPreviewUrl(asset.assetId, {
              siteId: wmState.competitionId,
            });
            TalentaMedia.revokePreviewUrl(w.photo);
            w.photoAssetId = asset.assetId;
            w.photo = photo;
            renderCategories();
            renderPreview();
            toast("Foto berhasil diunggah.");
          } catch (error) {
            toast(error.message, true);
          } finally {
            e.target.value = "";
            e.target.disabled = false;
          }
        };
      const designInput = wEl.querySelector("[data-w-design]");
      if (designInput)
        designInput.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
          if (!allowed.has(file.type)) {
            w.designError = "Format harus JPG, PNG, atau WebP.";
            e.target.value = "";
            renderCategories();
            return;
          }
          e.target.disabled = true;
          try {
            const compressed = await TalentaMedia.compressCustomDesign(file);
            if (compressed.size > TalentaMedia.LIMITS.customDesignOutput)
              throw new Error("Hasil optimasi maksimum 500 KB.");
            const asset = await TalentaMedia.upload(compressed, {
              siteId: wmState.competitionId,
              altText: w.rank || "Pemenang",
            });
            const design = await TalentaMedia.adminPreviewUrl(asset.assetId, {
              siteId: wmState.competitionId,
            });
            TalentaMedia.revokePreviewUrl(w.design);
            w.designAssetId = asset.assetId;
            w.design = design;
            w.designError = "";
            renderCategories();
            renderPreview();
            toast("Desain berhasil diunggah.");
          } catch (error) {
            w.designError = error.message;
            renderCategories();
            toast(error.message, true);
          } finally {
            e.target.value = "";
            e.target.disabled = false;
          }
        };
      const removePhotoBtn = wEl.querySelector("[data-w-remove-photo]");
      if (removePhotoBtn)
        removePhotoBtn.onclick = () => {
          TalentaMedia.revokePreviewUrl(w.photo);
          w.photoAssetId = null;
          w.photo = "";
          renderCategories();
          renderPreview();
          toast("Foto berhasil dihapus.");
        };
      const removeDesignBtn = wEl.querySelector("[data-w-remove-design]");
      if (removeDesignBtn)
        removeDesignBtn.onclick = () => {
          TalentaMedia.revokePreviewUrl(w.design);
          w.designAssetId = null;
          w.design = "";
          renderCategories();
          renderPreview();
          toast("Gambar desain berhasil dihapus.");
        };
      wList.appendChild(wEl);
    });
    root.appendChild(el);
  });
  icons();
}

function initials(name) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
}

function renderPreview() {
  const root = document.getElementById("wmPreview");
  const competition = window.TalentaActiveCompetition;
  applyGlobalTheme(root);
  if (!wmDisplay.active) {
    root.className = "winner-public-preview";
    root.innerHTML =
      '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Halaman Pemenang dinonaktifkan</strong><span>Aktifkan kembali dari Pengaturan Tampilan.</span></div>';
    icons();
    return;
  }
  const source = resolvePublicWinnerState(
    wmState,
    wmDisplay,
    winnerArchiveSources,
  );
  const archiveHref = (archiveCompetition) =>
    TalentaPaths.to("publicSite.archiveDetail", {
      query: { event: archiveCompetition.slug || archiveCompetition.id },
      hash: "pemenang",
    });
  root.className = "section winner-public-preview scaled-public-preview";
  root.innerHTML = buildWinnerPageMarkup(source, {
    archiveHref,
    resolveAsset: (value) => value || "",
  });
  activateWinnerCardFallbacks(root);
  requestAnimationFrame(fitWinnerPreview);
  icons();
}

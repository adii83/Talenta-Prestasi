const effective = getArchiveAdminState();
let archiveState = { ...structuredClone(effective.page), items: [] };
let archivePreviewResizeObserver;
const ARCHIVE_ICONS = [
  "archive",
  "award",
  "book-open",
  "graduation-cap",
  "medal",
  "school",
  "sparkles",
  "star",
  "trophy",
];
const archiveEmbedded =
  new URLSearchParams(location.search).get("embedded") === "1";

const esc = (value = "") => {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
};
const detailUrl = (id) =>
  TalentaPaths.to("admin.archiveDetailEditor", {
    query: { id, embedded: archiveEmbedded ? 1 : undefined },
  });
const formatArchivePeriod = (item) =>
  item.periodYear
    ? `${item.periodYear}${item.batchNumber ? ` · ${item.batchLabel || "Gelombang"} ${item.batchNumber}` : ""}`
    : item.slug;
const toast = (message, error = false) => {
  const node = document.getElementById("adminToast");
  node.querySelector("span").textContent = message;
  node.classList.toggle("admin-toast--error", error);
  node.classList.add("admin-toast--show");
  setTimeout(() => node.classList.remove("admin-toast--show"), 2400);
};

function sync() {
  const values = {
    archivePageActive: archiveState.active,
    archiveEyebrow: archiveState.eyebrow,
    archiveTitle: archiveState.title,
    archiveDescription: archiveState.description,
    archiveAlignment: archiveState.alignment,
    archiveAction: archiveState.action,
  };
  Object.entries(values).forEach(([id, value]) => {
    const input = document.getElementById(id);
    if (input)
      input.type === "checkbox"
        ? (input.checked = value)
        : (input.value = value || "");
  });
}

function archiveIconMarkup(item) {
  return item.mascotAssetId && item.uploadedIcon
    ? `<img class="archive-manager-item__uploaded-icon" src="${esc(item.uploadedIcon)}" alt="${esc(item.iconAlt || `Logo atau maskot ${item.name}`)}">`
    : `<i data-lucide="${esc(item.fallbackIcon || "archive")}"></i>`;
}

function archiveIconControl(item) {
  const mode = item.mascotAssetId ? "upload" : "library";
  return `<div class="icon-control" data-archive-icon-control><div class="icon-control__preview">${archiveIconMarkup(item)}</div><div class="icon-control__fields"><label>Sumber ikon <small style="display:block;font-weight:normal;color:#64748b;margin-top:2px;">Ikon otomatis terpublish setelah disimpan draf</small></label><select class="form-input" data-icon-mode><option value="library" ${mode === "library" ? "selected" : ""}>Pustaka ikon</option><option value="upload" ${mode === "upload" ? "selected" : ""}>Upload sendiri</option></select><select class="form-input" data-library-icon>${ARCHIVE_ICONS.map((icon) => `<option value="${icon}" ${icon === item.fallbackIcon ? "selected" : ""}>${icon}</option>`).join("")}</select><div class="icon-upload-row" style="align-items:stretch;"><label class="btn btn--outline btn--sm" style="display:inline-flex;align-items:center;">Upload ikon<input type="file" data-icon-upload accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>${item.mascotAssetId ? '<button type="button" class="btn btn--outline btn--sm btn--danger icon-remove" data-icon-remove style="display:inline-flex;align-items:center;height:auto;"><i data-lucide="rotate-ccw"></i> Reset upload</button>' : ""}</div></div></div>`;
}

function renderItems() {
  const root = document.getElementById("archiveItems");
  if (!archiveState.items.length) {
    root.innerHTML =
      '<div class="public-empty-state"><i data-lucide="archive"></i><p>Belum ada Event sebelumnya. Event lama akan muncul otomatis sebagai arsip.</p></div>';
  } else {
    root.innerHTML = archiveState.items
      .map(
        (item) =>
          `<article class="archive-manager-item" data-event-id="${esc(item.id)}"><div class="archive-manager-item__head"><div class="archive-manager-item__icon">${archiveIconMarkup(item)}</div><div class="archive-manager-item__identity"><strong>${esc(item.archiveDisplayName || formatArchiveDisplayName(item))}</strong><small>Periode ${esc(formatArchivePeriod(item))}</small></div><div class="archive-manager-item__actions"><a class="btn btn--outline btn--sm" href="${detailUrl(item.id)}"><i data-lucide="settings-2"></i>Edit Detail</a><span class="event-card__badge event-card__badge--archive">Arsip otomatis</span></div></div>${archiveIconControl(item)}</article>`,
      )
      .join("");
    root.querySelectorAll("[data-event-id]").forEach((card) => {
      const item = archiveState.items.find(
        (candidate) => candidate.id === card.dataset.eventId,
      );
      const mode = card.querySelector("[data-icon-mode]");
      const library = card.querySelector("[data-library-icon]");
      mode.onchange = () => {
        if (mode.value === "library") {
          item.mascotAssetId = null;
          TalentaMedia.revokePreviewUrl(item.uploadedIcon);
          item.uploadedIcon = "";
          renderItems();
          renderPreview();
          return;
        }
        library.hidden = true;
      };
      library.onchange = () => {
        item.fallbackIcon = library.value;
        item.mascotAssetId = null;
        TalentaMedia.revokePreviewUrl(item.uploadedIcon);
        item.uploadedIcon = "";
        renderItems();
        renderPreview();
      };
      card.querySelector("[data-icon-upload]").onchange = async (event) => {
        const input = event.target;
        if (!input.files[0]) return;
        input.disabled = true;
        try {
          const asset = await TalentaMedia.upload(input.files[0], {
            siteId: item.id,
            altText: `Logo atau maskot ${item.name}`,
          });
          TalentaMedia.revokePreviewUrl(item.uploadedIcon);
          item.mascotAssetId = asset.assetId;
          item.uploadedIcon = await TalentaMedia.adminPreviewUrl(
            item.mascotAssetId,
            { siteId: item.id },
          );
          renderItems();
          renderPreview();
          toast("Ikon Arsip berhasil diunggah.");
        } catch (error) {
          toast(error.message, true);
        } finally {
          input.disabled = false;
        }
      };
      const remove = card.querySelector("[data-icon-remove]");
      if (remove)
        remove.onclick = () => {
          item.mascotAssetId = null;
          TalentaMedia.revokePreviewUrl(item.uploadedIcon);
          item.uploadedIcon = "";
          renderItems();
          renderPreview();
        };
      library.hidden = mode.value !== "library";
    });
  }
  lucide.createIcons();
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

function previewItems() {
  return archiveState.items.map((item) => {
    const fullName = item.archiveDisplayName || formatArchiveDisplayName(item);
    return normalizeArchiveCompetition({
      id: item.id,
      slug: item.slug,
      name: fullName,
      shortName: fullName,
      description: item.description || "",
      status: "published",
      active: true,
      icon: item.fallbackIcon || "archive",
      iconMode: item.mascotAssetId ? "upload" : "library",
      uploadedIcon: item.uploadedIcon || "",
      iconAlt: item.iconAlt || `Logo atau maskot ${item.name}`,
      documents: [],
      winnerCategories: [],
    });
  });
}

function renderPreview() {
  const root = document.getElementById("archivePreview");
  applyGlobalThemeTokens(root);
  if (!archiveState.active) {
    root.className = "archive-list-public-preview";
    root.innerHTML =
      '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Halaman Arsip dinonaktifkan</strong></div>';
  } else {
    root.className = "archive-list-public-preview scaled-public-preview";
    root.innerHTML = buildArchiveListMarkup(
      normalizeArchivePage(archiveState),
      resolvePublicArchivedCompetitions(previewItems().filter(Boolean)),
    );
    requestAnimationFrame(fitArchivePreview);
  }
  lucide.createIcons();
}

async function hydrateArchive() {
  try {
    const [items, page] = await Promise.all([
      TalentaArchiveApi.list(),
      TalentaArchiveApi.loadPage(),
    ]);
    const hydratedItems = await Promise.all(
      items.map(async (item) => ({
        ...item,
        fallbackIcon: item.fallbackIcon || "archive",
        uploadedIcon: item.mascotAssetId
          ? await TalentaMedia.adminPreviewUrl(item.mascotAssetId, {
              siteId: item.id,
            })
          : "",
        iconAlt: `Logo atau maskot ${item.name}`,
      })),
    );
    archiveState = {
      ...archiveState,
      ...(page || {}),
      active: page?.isActive ?? archiveState.active,
      items: hydratedItems,
    };
    sync();
    renderItems();
    renderPreview();
  } catch (error) {
    toast(error.message, true);
  }
}

function bind() {
  const texts = {
    archiveEyebrow: "eyebrow",
    archiveTitle: "title",
    archiveDescription: "description",
    archiveAction: "action",
  };
  Object.entries(texts).forEach(([id, key]) => {
    document.getElementById(id).oninput = (event) => {
      archiveState[key] = event.target.value;
      renderPreview();
    };
  });
  document.getElementById("archiveAlignment").onchange = (event) => {
    archiveState.alignment = event.target.value;
    renderPreview();
  };
  document.getElementById("archivePageActive").onchange = (event) => {
    archiveState.active = event.target.checked;
    renderPreview();
  };
  document.querySelectorAll("[data-archive-preview]").forEach((button) => {
    button.onclick = () => {
      document
        .querySelectorAll("[data-archive-preview]")
        .forEach((item) =>
          item.classList.toggle("preview-switch__btn--active", item === button),
        );
      const frame = document.getElementById("archivePreviewFrame");
      frame.dataset.previewMode = button.dataset.archivePreview;
      frame.className = `archive-preview-frame archive-preview-frame--${button.dataset.archivePreview}`;
      requestAnimationFrame(fitArchivePreview);
    };
  });
  const form = document.getElementById("archiveEditorForm");
  const revertArchive = () => location.reload();
  form.onsubmit = async (event) => {
    event.preventDefault();
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    try {
      await Promise.all([
        TalentaArchiveApi.savePage({
          isActive: archiveState.active,
          eyebrow: archiveState.eyebrow,
          title: archiveState.title,
          description: archiveState.description,
          alignment: archiveState.alignment,
        }),
        ...archiveState.items.map((item) =>
          TalentaArchiveApi.saveIdentity(item),
        ),
      ]);
      toast("Pengaturan halaman Arsip tersimpan.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  };
  window.TalentaEditor = Object.freeze({
    save: () => form.requestSubmit(),
    revert: revertArchive,
  });
  document.getElementById("archiveReset").onclick = async () => {
    if (
      await adminConfirm({
        title: "Urungkan edit Arsip?",
        message:
          "Perubahan tampilan Arsip yang belum disimpan akan dibuang dan draf tersimpan akan dimuat kembali.",
        confirmLabel: "Urungkan edit",
        variant: "danger",
        icon: "undo-2",
      })
    )
      revertArchive();
  };
}

function setupArchivePreviewSizing() {
  const frame = document.getElementById("archivePreviewFrame");
  const root = document.getElementById("archivePreview");
  frame.dataset.previewMode ||= "desktop";
  archivePreviewResizeObserver?.disconnect();
  archivePreviewResizeObserver = new ResizeObserver(fitArchivePreview);
  archivePreviewResizeObserver.observe(frame);
  archivePreviewResizeObserver.observe(root);
}
function fitArchivePreview() {
  const frame = document.getElementById("archivePreviewFrame");
  const root = document.getElementById("archivePreview");
  if (!frame || !root || !root.classList.contains("scaled-public-preview"))
    return;
  const widths = { desktop: 1425, tablet: 753, mobile: 375 };
  const style = getComputedStyle(frame);
  const horizontal =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const vertical =
    parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const scale = Math.min(
    1,
    Math.max(1, frame.clientWidth - horizontal) /
      widths[frame.dataset.previewMode || "desktop"],
  );
  root.style.setProperty("--public-preview-scale", String(scale));
  frame.style.height = `${Math.ceil(root.offsetHeight * scale + vertical)}px`;
}

sync();
renderItems();
renderPreview();
setupArchivePreviewSizing();
subscribeGlobalSettings(renderPreview);
bind();
void hydrateArchive();

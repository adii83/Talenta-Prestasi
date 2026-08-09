const effective = getArchiveAdminState();
let archiveState = { ...structuredClone(effective.page), items: [] };
let archivePreviewResizeObserver;
const archiveEmbedded = new URLSearchParams(location.search).get("embedded") === "1";

const esc = (value = "") => {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
};
const detailUrl = (id) =>
  TalentaPaths.to("admin.archiveDetailEditor", {
    query: { id, embedded: archiveEmbedded ? 1 : undefined },
  });
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
    if (input) input.type === "checkbox" ? (input.checked = value) : (input.value = value || "");
  });
}

function renderItems() {
  const root = document.getElementById("archiveItems");
  if (!archiveState.items.length) {
    root.innerHTML = '<div class="public-empty-state"><i data-lucide="archive"></i><p>Belum ada Event sebelumnya. Event nonaktif akan muncul otomatis sebagai arsip.</p></div>';
  } else {
    root.innerHTML = archiveState.items
      .map(
        (item) => `<article class="archive-manager-item"><div class="archive-manager-item__head"><div class="archive-manager-item__icon"><i data-lucide="${esc(item.icon || item.fallbackIcon || "archive")}"></i></div><div><strong>${esc(item.name)}</strong><small>Periode ${esc(item.slug)} · Event nonaktif</small></div><div class="archive-manager-item__actions"><a class="btn btn--outline btn--sm" href="${detailUrl(item.id)}"><i data-lucide="settings-2"></i>Edit Detail</a><span class="event-card__badge event-card__badge--archive">Arsip otomatis</span></div></div><p>${esc(item.description || "Belum ada deskripsi arsip.")}</p></article>`,
      )
      .join("");
  }
  lucide.createIcons();
}

function previewItems() {
  return archiveState.items.map((item) =>
    normalizeArchiveCompetition({
      id: item.id,
      slug: item.slug,
      name: item.name,
      shortName: item.name,
      description: item.description || "",
      status: "published",
      active: true,
      icon: item.icon || item.fallbackIcon || "archive",
      iconMode: item.iconMode,
      uploadedIcon: item.uploadedIcon,
      iconAlt: item.iconAlt,
      documents: [],
      winnerCategories: [],
    }),
  );
}

function renderPreview() {
  const root = document.getElementById("archivePreview");
  applyGlobalThemeTokens(root);
  if (!archiveState.active) {
    root.className = "archive-list-public-preview";
    root.innerHTML = '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Halaman Arsip dinonaktifkan</strong></div>';
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
    archiveState = {
      ...archiveState,
      ...(page || {}),
      active: page?.isActive ?? archiveState.active,
      items,
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
      document.querySelectorAll("[data-archive-preview]").forEach((item) =>
        item.classList.toggle("preview-switch__btn--active", item === button),
      );
      const frame = document.getElementById("archivePreviewFrame");
      frame.dataset.previewMode = button.dataset.archivePreview;
      frame.className = `archive-preview-frame archive-preview-frame--${button.dataset.archivePreview}`;
      requestAnimationFrame(fitArchivePreview);
    };
  });
  document.getElementById("archiveEditorForm").onsubmit = async (event) => {
    event.preventDefault();
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    try {
      await TalentaArchiveApi.savePage({
        isActive: archiveState.active,
        eyebrow: archiveState.eyebrow,
        title: archiveState.title,
        description: archiveState.description,
        alignment: archiveState.alignment,
      });
      toast("Pengaturan halaman Arsip tersimpan.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  };
  document.getElementById("archiveReset").onclick = async () => {
    if (!(await adminConfirm({ title: "Reset tampilan Arsip?", message: "Heading halaman dikembalikan ke template. Daftar Event arsip tidak berubah.", confirmLabel: "Reset tampilan", variant: "danger", icon: "rotate-ccw" }))) return;
    archiveState = { ...archiveState, ...structuredClone(effective.page) };
    sync();
    renderPreview();
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
  if (!frame || !root || !root.classList.contains("scaled-public-preview")) return;
  const widths = { desktop: 1425, tablet: 753, mobile: 375 };
  const style = getComputedStyle(frame);
  const horizontal = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const vertical = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const scale = Math.min(1, Math.max(1, frame.clientWidth - horizontal) / widths[frame.dataset.previewMode || "desktop"]);
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

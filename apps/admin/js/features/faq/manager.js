/* Manajemen FAQ — kategori dan pertanyaan bebas dengan preview template publik. */
let faqState = getFaqAdminState();
let faqPreviewResizeObserver;
const faqEsc = (v = "") => {
  const n = document.createElement("div");
  n.textContent = v;
  return n.innerHTML;
};
const faqIcons = () => lucide.createIcons();
function faqToast(message = "FAQ tersimpan.", error = false) {
  const t = document.getElementById("adminToast");
  t.querySelector("span").textContent = message;
  t.classList.toggle("admin-toast--error", error);
  t.classList.add("admin-toast--show");
  setTimeout(() => t.classList.remove("admin-toast--show"), 2200);
}
async function faqHydrate() {
  try {
    const loaded = await TalentaFaqApi.load();
    faqState = normalizeFaqState({
      page: loaded.page
        ? {
            active: loaded.page.isActive,
            eyebrow: loaded.page.eyebrow,
            title: loaded.page.title,
            description: loaded.page.description,
            alignment: loaded.page.alignment,
          }
        : faqState.page,
      categories: loaded.categories,
    });
    faqSyncPage();
    faqRenderEditor();
    faqRenderPreview();
  } catch (error) {
    faqToast(error.message, true);
  }
}
function faqSyncPage() {
  const map = {
    faqPageActive: faqState.page.active,
    faqEyebrow: faqState.page.eyebrow,
    faqTitle: faqState.page.title,
    faqDescription: faqState.page.description,
    faqAlignment: faqState.page.alignment,
  };
  Object.entries(map).forEach(([id, v]) => {
    const e = document.getElementById(id);
    e.type === "checkbox" ? (e.checked = v) : (e.value = v);
  });
}
function faqRenderEditor() {
  const root = document.getElementById("faqCategoryEditor");
  root.innerHTML =
    faqState.categories
      .map(
        (cat, ci) =>
          `<article class="faq-manager-category" data-category-id="${faqEsc(cat.id)}"><header class="faq-manager-category__head"><span class="faq-manager-category__index">${String(ci + 1).padStart(2, "0")}</span><div class="admin-field"><label>Nama kategori</label><input class="form-input" data-category-title value="${faqEsc(cat.title)}"></div><label class="admin-switch admin-switch--label"><input type="checkbox" data-category-active ${cat.active ? "checked" : ""}><span></span><em>Aktif</em></label><div class="faq-manager-actions"><button type="button" data-category-up ${ci === 0 ? "disabled" : ""} aria-label="Naikkan kategori"><i data-lucide="arrow-up"></i></button><button type="button" data-category-down ${ci === faqState.categories.length - 1 ? "disabled" : ""} aria-label="Turunkan kategori"><i data-lucide="arrow-down"></i></button><button type="button" data-category-delete class="is-danger" aria-label="Hapus kategori"><i data-lucide="trash-2"></i></button></div></header><div class="faq-manager-questions">${cat.questions.map((q, qi) => `<div class="faq-manager-question" data-question-id="${faqEsc(q.id)}"><header><span>${qi + 1}</span><strong>Pertanyaan ${qi + 1}</strong><label class="admin-switch"><input type="checkbox" data-question-active ${q.active ? "checked" : ""}><span></span></label><div class="faq-manager-actions"><button type="button" data-question-up ${qi === 0 ? "disabled" : ""} aria-label="Naikkan pertanyaan"><i data-lucide="arrow-up"></i></button><button type="button" data-question-down ${qi === cat.questions.length - 1 ? "disabled" : ""} aria-label="Turunkan pertanyaan"><i data-lucide="arrow-down"></i></button><button type="button" data-question-delete class="is-danger" aria-label="Hapus pertanyaan"><i data-lucide="trash-2"></i></button></div></header><div class="admin-field"><label>Pertanyaan</label><input class="form-input" data-question-text value="${faqEsc(q.question)}"></div><div class="admin-field"><label>Jawaban</label><textarea class="form-input editor-textarea" data-question-answer>${faqEsc(q.answer)}</textarea></div></div>`).join("")}<button type="button" class="faq-add-question" data-add-question><i data-lucide="plus"></i>Tambah Pertanyaan</button></div></article>`,
      )
      .join("") ||
    '<div class="faq-manager-empty" role="status"><span class="faq-manager-empty__icon" aria-hidden="true"><i data-lucide="folder-plus"></i></span><strong>Belum ada kategori</strong><span>Tambahkan kategori FAQ pertama.</span></div>';
  faqBindEditor();
  faqIcons();
}
function faqMove(array, index, dir) {
  const target = index + dir;
  if (target < 0 || target >= array.length) return;
  [array[index], array[target]] = [array[target], array[index]];
  faqRenderEditor();
  faqRenderPreview();
}
function faqBindEditor() {
  document.querySelectorAll("[data-category-id]").forEach((catEl) => {
    const ci = faqState.categories.findIndex(
        (c) => c.id === catEl.dataset.categoryId,
      ),
      cat = faqState.categories[ci];
    catEl.querySelector("[data-category-title]").oninput = (e) => {
      cat.title = e.target.value;
      faqRenderPreview();
    };
    catEl.querySelector("[data-category-active]").onchange = (e) => {
      cat.active = e.target.checked;
      faqRenderPreview();
    };
    catEl.querySelector("[data-category-up]").onclick = () =>
      faqMove(faqState.categories, ci, -1);
    catEl.querySelector("[data-category-down]").onclick = () =>
      faqMove(faqState.categories, ci, 1);
    catEl.querySelector("[data-category-delete]").onclick = async () => {
      const confirmed = await adminConfirm({
        title: "Hapus kategori FAQ?",
        message: `${cat.title} beserta ${cat.questions.length} pertanyaan di dalamnya akan dihapus dari perubahan saat ini.`,
        confirmLabel: "Ya, hapus kategori",
        variant: "danger",
        icon: "folder-x",
      });
      if (!confirmed) return;
      faqState.categories.splice(ci, 1);
      faqRenderEditor();
      faqRenderPreview();
    };
    catEl.querySelector("[data-add-question]").onclick = () => {
      cat.questions.push({
        id: faqUid("question"),
        active: true,
        question: "Pertanyaan baru",
        answer: "Tuliskan jawaban pertanyaan di sini.",
      });
      faqRenderEditor();
      faqRenderPreview();
    };
    catEl.querySelectorAll("[data-question-id]").forEach((qEl) => {
      const qi = cat.questions.findIndex(
          (q) => q.id === qEl.dataset.questionId,
        ),
        q = cat.questions[qi];
      qEl.querySelector("[data-question-text]").oninput = (e) => {
        q.question = e.target.value;
        faqRenderPreview();
      };
      qEl.querySelector("[data-question-answer]").oninput = (e) => {
        q.answer = e.target.value;
        faqRenderPreview();
      };
      qEl.querySelector("[data-question-active]").onchange = (e) => {
        q.active = e.target.checked;
        faqRenderPreview();
      };
      qEl.querySelector("[data-question-up]").onclick = () =>
        faqMove(cat.questions, qi, -1);
      qEl.querySelector("[data-question-down]").onclick = () =>
        faqMove(cat.questions, qi, 1);
      qEl.querySelector("[data-question-delete]").onclick = async () => {
        const confirmed = await adminConfirm({
          title: "Hapus pertanyaan FAQ?",
          message: `"${q.question || "Pertanyaan tanpa judul"}" akan dihapus dari kategori ${cat.title}.`,
          confirmLabel: "Ya, hapus pertanyaan",
          variant: "danger",
          icon: "message-circle-x",
        });
        if (!confirmed) return;
        cat.questions.splice(qi, 1);
        faqRenderEditor();
        faqRenderPreview();
      };
    });
  });
}
function faqRenderPreview() {
  const root = document.getElementById("faqPreview");
  const publicState = getPublicFaqStateFromSource(faqState);
  applyGlobalThemeTokens(root);
  root.className = "faq-public-preview scaled-public-preview";
  root.innerHTML = buildFaqPageMarkup(publicState, {
    idPrefix: "preview-faq",
    homeHref: "../../../public-site/",
  });
  bindFaqAccordion(root);
  requestAnimationFrame(fitFaqPreview);
  faqIcons();
}
function faqBindPage() {
  const map = {
    faqEyebrow: "eyebrow",
    faqTitle: "title",
    faqDescription: "description",
  };
  Object.entries(map).forEach(
    ([id, k]) =>
      (document.getElementById(id).oninput = (e) => {
        faqState.page[k] = e.target.value;
        faqRenderPreview();
      }),
  );
  document.getElementById("faqPageActive").onchange = (e) => {
    faqState.page.active = e.target.checked;
    faqRenderPreview();
  };
  document.getElementById("faqAlignment").onchange = (e) => {
    faqState.page.alignment = e.target.value;
    faqRenderPreview();
  };
  document.getElementById("faqAddCategory").onclick = () => {
    faqState.categories.push({
      id: faqUid("category"),
      active: true,
      title: "Kategori Baru",
      questions: [],
    });
    faqRenderEditor();
    faqRenderPreview();
  };
  document.querySelectorAll("[data-faq-preview]").forEach(
    (btn) =>
      (btn.onclick = () => {
        document
          .querySelectorAll("[data-faq-preview]")
          .forEach((x) =>
            x.classList.toggle("preview-switch__btn--active", x === btn),
          );
        document.getElementById("faqPreviewFrame").className =
          `faq-preview-frame faq-preview-frame--${btn.dataset.faqPreview}`;
        document.getElementById("faqPreviewFrame").dataset.previewMode =
          btn.dataset.faqPreview;
        requestAnimationFrame(fitFaqPreview);
      }),
  );
  const form = document.getElementById("faqEditorForm");
  const revertFaq = () => location.reload();
  document.getElementById("faqReset").onclick = async () => {
    const confirmed = await adminConfirm({
      title: "Urungkan edit FAQ?",
      message:
        "Perubahan FAQ yang belum disimpan akan dibuang dan draf tersimpan akan dimuat kembali.",
      confirmLabel: "Urungkan edit",
      variant: "danger",
      icon: "undo-2",
    });
    if (confirmed) revertFaq();
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.submitter;
    if (submit) submit.disabled = true;
    try {
      faqState.categories = await TalentaFaqApi.save(faqState);
      faqRenderEditor();
      faqRenderPreview();
      faqToast("FAQ tersimpan ke database.");
    } catch (error) {
      faqToast(error.message, true);
    } finally {
      if (submit) submit.disabled = false;
    }
  };
  window.TalentaEditor = Object.freeze({
    save: () => form.requestSubmit(),
    revert: revertFaq,
  });
}
faqBindPage();
faqSyncPage();
faqRenderEditor();
faqRenderPreview();
setupFaqPreviewSizing();
subscribeGlobalSettings(faqRenderPreview);
faqIcons();
void faqHydrate();

window.addEventListener("storage", (e) => {
  if (e.key === "talenta_faq_manager_v1") {
    faqToast(
      "Peringatan: Data FAQ baru saja diubah di tab atau perangkat lain. Harap muat ulang halaman untuk menghindari konflik timpa data.",
      true,
    );
  }
});

function setupFaqPreviewSizing() {
  const frame = document.getElementById("faqPreviewFrame");
  const root = document.getElementById("faqPreview");
  frame.dataset.previewMode = frame.dataset.previewMode || "desktop";
  faqPreviewResizeObserver?.disconnect();
  faqPreviewResizeObserver = new ResizeObserver(fitFaqPreview);
  faqPreviewResizeObserver.observe(frame);
  faqPreviewResizeObserver.observe(root);
  requestAnimationFrame(fitFaqPreview);
}

function fitFaqPreview() {
  const frame = document.getElementById("faqPreviewFrame");
  const root = document.getElementById("faqPreview");
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

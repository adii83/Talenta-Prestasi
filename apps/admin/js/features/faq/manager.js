/* Manajemen FAQ — kategori dan pertanyaan bebas dengan preview template publik. */
let faqState = getFaqAdminState();
const faqEsc = (v = "") => {
  const n = document.createElement("div");
  n.textContent = v;
  return n.innerHTML;
};
const faqIcons = () => lucide.createIcons();
function faqToast(message = "FAQ tersimpan.") {
  const t = document.getElementById("adminToast");
  t.querySelector("span").textContent = message;
  t.classList.add("admin-toast--show");
  setTimeout(() => t.classList.remove("admin-toast--show"), 2200);
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
    '<div class="editor-empty"><i data-lucide="folder-plus"></i><strong>Belum ada kategori</strong><span>Tambahkan kategori FAQ pertama.</span></div>';
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
    catEl.querySelector("[data-category-delete]").onclick = () => {
      if (
        confirm(
          `Hapus kategori “${cat.title}” beserta ${cat.questions.length} pertanyaan?`,
        )
      ) {
        faqState.categories.splice(ci, 1);
        faqRenderEditor();
        faqRenderPreview();
      }
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
      qEl.querySelector("[data-question-delete]").onclick = () => {
        if (confirm("Hapus pertanyaan ini?")) {
          cat.questions.splice(qi, 1);
          faqRenderEditor();
          faqRenderPreview();
        }
      };
    });
  });
}
function faqAccordionMarkup(categories) {
  return categories
    .map(
      (cat) =>
        `<section class="faq-category"><h2 class="faq-category__title">${faqEsc(cat.title)}</h2><div class="accordion">${cat.questions.map((q) => `<div class="accordion__item"><button class="accordion__trigger" type="button" aria-expanded="false" aria-controls="preview-${faqEsc(q.id)}"><span>${faqEsc(q.question)}</span><svg class="accordion__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg></button><div class="accordion__content" id="preview-${faqEsc(q.id)}"><div class="accordion__body">${faqEsc(q.answer).replace(/\n/g, "<br>")}</div></div></div>`).join("")}</div></section>`,
    )
    .join("");
}
function faqBindPreviewAccordion() {
  document.querySelectorAll("#faqPreview .accordion__trigger").forEach(
    (trigger) =>
      (trigger.onclick = () => {
        const item = trigger.closest(".accordion__item"),
          accordion = item.closest(".accordion"),
          opening = !item.classList.contains("accordion__item--open");
        accordion.querySelectorAll(".accordion__item").forEach((other) => {
          other.classList.remove("accordion__item--open");
          other
            .querySelector(".accordion__trigger")
            .setAttribute("aria-expanded", "false");
          other.querySelector(".accordion__content").style.maxHeight = "0";
        });
        if (opening) {
          const content = item.querySelector(".accordion__content");
          item.classList.add("accordion__item--open");
          trigger.setAttribute("aria-expanded", "true");
          content.style.maxHeight = content.scrollHeight + "px";
        }
      }),
  );
}
function faqRenderPreview() {
  const root = document.getElementById("faqPreview"),
    page = faqState.page,
    cats = faqState.categories
      .filter((c) => c.active && c.title.trim())
      .map((c) => ({
        ...c,
        questions: c.questions.filter(
          (q) => q.active && q.question.trim() && q.answer.trim(),
        ),
      }))
      .filter((c) => c.questions.length);
  if (!page.active) {
    root.innerHTML =
      '<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>Halaman FAQ dinonaktifkan</strong><span>Aktifkan kembali melalui pengaturan heading.</span></div>';
    faqIcons();
    return;
  }
  root.innerHTML = `<section class="section"><div class="container"><div class="section__header${page.alignment === "left" ? " section__header--left" : ""}"><p class="t-eyebrow">${faqEsc(page.eyebrow)}</p><h1 class="t-h1">${faqEsc(page.title)}</h1><p>${faqEsc(page.description)}</p></div>${cats.length ? faqAccordionMarkup(cats) : '<div class="public-empty-state public-empty-state--compact"><p>Belum ada pertanyaan aktif.</p></div>'}</div></section>`;
  faqBindPreviewAccordion();
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
      }),
  );
  document.getElementById("faqReset").onclick = () => {
    if (confirm("Reset seluruh FAQ ke isi template awal?")) {
      faqState = resetFaqAdminState();
      faqSyncPage();
      faqRenderEditor();
      faqRenderPreview();
      faqToast("FAQ dikembalikan ke template awal.");
    }
  };
  document.getElementById("faqEditorForm").onsubmit = (e) => {
    e.preventDefault();
    saveFaqAdminState(faqState);
    faqState = getFaqAdminState();
    faqRenderEditor();
    faqRenderPreview();
    faqToast();
  };
}
faqBindPage();
faqSyncPage();
faqRenderEditor();
faqRenderPreview();
faqIcons();

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const storage = new Map();
const localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
};

class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

const context = vm.createContext({
  console,
  localStorage,
  CustomEvent,
  window: { dispatchEvent() {} },
});
vm.runInContext(
  await readFile(
    "packages/shared/js/data/repositories/faq-repository.js",
    "utf8",
  ),
  context,
  { filename: "faq-repository.js" },
);

const evaluate = (source) => vm.runInContext(source, context);
const clone = (value) => JSON.parse(JSON.stringify(value));
const baseline = clone(evaluate("getFaqAdminState()"));

assert.equal(baseline.version, 2);
assert.equal(baseline.categories.length, 3);
assert.equal(
  baseline.categories.flatMap((category) => category.questions).length,
  11,
);

const dirty = clone(
  evaluate(`normalizeFaqState({
    page: { active: true, alignment: "right", title: 42 },
    categories: [
      {
        id: " Kategori Tidak Aman! ",
        active: true,
        title: "  ",
        questions: [
          { id: "duplikat", question: "<script>rusak()</script>", answer: "A" },
          { id: "duplikat", question: "Kosong", answer: "   " }
        ]
      },
      {
        id: "kategori-tidak-aman",
        active: false,
        title: "Nonaktif",
        questions: [
          { id: "", active: true, question: "Tidak tampil", answer: "B" }
        ]
      }
    ]
  })`),
);

assert.equal(dirty.page.alignment, "center");
assert.equal(dirty.page.title, "Pertanyaan Umum");
assert.equal(dirty.categories[0].title, "Kategori 1");

const allIds = dirty.categories.flatMap((category) => [
  category.id,
  ...category.questions.map((question) => question.id),
]);
assert.equal(new Set(allIds).size, allIds.length, "ID FAQ harus unik.");
assert.ok(
  allIds.every((id) => /^[a-z0-9_-]+$/.test(id)),
  "ID FAQ harus aman untuk HTML dan backend.",
);
for (const category of dirty.categories)
  for (const question of category.questions)
    assert.equal(
      question.categoryId,
      category.id,
      "Pertanyaan harus dimiliki kategori induknya.",
    );

const publicState = clone(
  evaluate(`getPublicFaqStateFromSource(${JSON.stringify(dirty)})`),
);
assert.equal(publicState.categories.length, 1);
assert.equal(publicState.categories[0].questions.length, 1);

const markup = evaluate(
  `buildFaqPageMarkup(${JSON.stringify(publicState)}, { idPrefix: "audit" })`,
);
assert.ok(!markup.includes("<script>rusak()</script>"));
assert.ok(markup.includes("&lt;script&gt;rusak()&lt;/script&gt;"));
assert.match(markup, /role="region"/);
assert.match(markup, /aria-labelledby=/);
assert.match(markup, /aria-controls=/);

const saved = clone(evaluate(`saveFaqAdminState(${JSON.stringify(dirty)})`));
assert.equal(saved.version, 2);
assert.deepEqual(
  saved.categories.map((category) => category.id),
  dirty.categories.map((category) => category.id),
  "Urutan kategori harus stabil setelah disimpan.",
);

console.log(
  "Audit FAQ lulus: owner kategori, ID unik, urutan, status publik, sanitasi, dan aksesibilitas accordion tervalidasi.",
);

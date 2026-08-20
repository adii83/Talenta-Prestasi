import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const settingsEditor = await readFile(
  "apps/admin/js/shell/settings-editor.js",
  "utf8",
);
const readForm = settingsEditor.slice(
  settingsEditor.indexOf("function readForm()"),
  settingsEditor.indexOf("function navMarkup("),
);

assert.match(
  readForm,
  /document\.querySelectorAll\("\[data-global-navigation\]"\)[\s\S]*globalState\.navigation\[input\.dataset\.globalNavigation\]\s*=\s*input\.checked/,
  "submit pertama harus membaca langsung nilai checkbox navigasi ke state draf.",
);

const submitHandler = settingsEditor.slice(
  settingsEditor.indexOf("form.onsubmit"),
  settingsEditor.indexOf("async function revertSettings"),
);
assert.match(
  submitHandler,
  /document\.dispatchEvent\(new CustomEvent\("talenta:editor-saved"\)\)/,
  "router harus menerima sinyal setelah simpan draf benar-benar selesai.",
);

console.log(
  "PASS: submit pertama menyinkronkan checkbox dan memberi sinyal setelah tersimpan.",
);

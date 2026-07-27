import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const routes = [
  "apps/public/index.html",
  "apps/public/unduh/index.html",
  "apps/public/pemenang/index.html",
  "apps/public/arsip/index.html",
  "apps/public/arsip/detail/index.html",
  "apps/public/faq/index.html",
  "apps/admin/index.html",
  "apps/admin/editors/beranda/index.html",
  "apps/admin/editors/unduh/index.html",
  "apps/admin/editors/pemenang/index.html",
  "apps/admin/editors/arsip/index.html",
  "apps/admin/editors/arsip/detail/index.html",
  "apps/admin/editors/faq/index.html",
  "apps/portal/login/index.html",
  "apps/portal/dashboard/index.html",
];
const errors = [];
for (const route of routes)
  if (!fs.existsSync(path.join(root, route)))
    errors.push(`Missing route: ${route}`);
const rootHtml = fs.readdirSync(root).filter((x) => x.endsWith(".html"));
if (rootHtml.length) errors.push(`Root HTML forbidden: ${rootHtml.join(", ")}`);
function walk(d) {
  return fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)],
    );
}
for (const file of walk(path.join(root, "apps")).filter((x) =>
  x.endsWith(".html"),
)) {
  const html = fs.readFileSync(file, "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((x) => x[1]);
  for (const id of new Set(ids))
    if (ids.filter((x) => x === id).length > 1)
      errors.push(`${path.relative(root, file)} duplicate id ${id}`);
  for (const m of html.matchAll(/(?:src|href)="([^"#?]+)"/g)) {
    const ref = m[1];
    if (/^(?:https?:|mailto:|tel:|javascript:|data:|#)/.test(ref)) continue;
    const target = path.resolve(path.dirname(file), ref);
    if (!fs.existsSync(target))
      errors.push(`${path.relative(root, file)} missing ${ref}`);
  }
}
const source = walk(path.join(root, "apps"))
  .filter((x) => /\.(?:html|js)$/.test(x))
  .map((x) => fs.readFileSync(x, "utf8"))
  .join("\n");
if (/(?:href|src)="[^"]*\.html(?:[?#"])/.test(source))
  errors.push("Internal .html navigation remains");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `PASS: ${routes.length} canonical routes; zero root HTML; local assets and IDs valid.`,
);

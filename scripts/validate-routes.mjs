import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const routes = [
  "apps/public-site/index.html",
  "apps/public-site/unduh/index.html",
  "apps/public-site/pemenang/index.html",
  "apps/public-site/arsip/index.html",
  "apps/public-site/arsip/detail/index.html",
  "apps/public-site/faq/index.html",
  "apps/admin/index.html",
  "apps/admin/editors/beranda/index.html",
  "apps/admin/editors/unduh/index.html",
  "apps/admin/editors/pemenang/index.html",
  "apps/admin/editors/arsip/index.html",
  "apps/admin/editors/arsip/detail/index.html",
  "apps/admin/editors/faq/index.html",
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
    .filter(
      (entry) =>
        !entry.isDirectory() ||
        !["node_modules", "dist", "coverage", "uploads"].includes(entry.name),
    )
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
const source = ["apps", "packages"]
  .flatMap((directory) => walk(path.join(root, directory)))
  .filter((x) => /\.(?:html|js)$/.test(x))
  .map((x) => fs.readFileSync(x, "utf8"))
  .join("\n");
if (source.includes("apps/template"))
  errors.push("Active application source still references apps/template");
if (
  /['"]template\.(?:home|download|winners|archive|archiveDetail|faq)['"]/.test(
    source,
  )
)
  errors.push("Active canonical route IDs still use template.*");
if (/['"]\.\.\/(?:\.\.\/)*template\//.test(source))
  errors.push("Active relative path literals still reference template/");
if (/(?:href|src)="[^"]*\.html(?:[?#"])/.test(source))
  errors.push("Internal .html navigation remains");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `PASS: ${routes.length} canonical routes; zero root HTML; local assets and IDs valid.`,
);

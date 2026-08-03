import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
const files = [...walk("apps"), ...walk("packages")].filter((x) =>
  x.endsWith(".js"),
);
for (const file of files) {
  const r = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (r.status) process.exit(r.status);
}
console.log(`PASS: ${files.length} JavaScript files syntax-valid.`);

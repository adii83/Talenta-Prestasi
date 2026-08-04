/* Canonical, base-path-aware routes for every Talenta application. */
(() => {
  const marker = "/packages/shared/js/core/paths.js";
  const source = document.currentScript?.src || "";
  const pathname = source
    ? new URL(source, location.href).pathname
    : location.pathname;
  const markerIndex = pathname.lastIndexOf(marker);
  const basePath = markerIndex >= 0 ? pathname.slice(0, markerIndex) : "";
  const isPublicRoot =
    !["localhost", "127.0.0.1"].includes(location.hostname) &&
    !location.pathname.startsWith("/apps/");
  const routes = Object.freeze({
    "template.home": "/apps/template/",
    "template.download": "/apps/template/unduh/",
    "template.winners": "/apps/template/pemenang/",
    "template.archive": "/apps/template/arsip/",
    "template.archiveDetail": "/apps/template/arsip/detail/",
    "template.faq": "/apps/template/faq/",
    "admin.shell": "/apps/admin/",
    "admin.homeEditor": "/apps/admin/editors/beranda/",
    "admin.downloadEditor": "/apps/admin/editors/unduh/",
    "admin.winnersEditor": "/apps/admin/editors/pemenang/",
    "admin.archiveEditor": "/apps/admin/editors/arsip/",
    "admin.archiveDetailEditor": "/apps/admin/editors/arsip/detail/",
    "admin.faqEditor": "/apps/admin/editors/faq/",
  });
  function to(id, options = {}) {
    if (!routes[id]) throw new Error(`Unknown route: ${id}`);
    const route =
      isPublicRoot && id.startsWith("template.")
        ? routes[id].replace(/^\/apps\/template/, "") || "/"
        : `${basePath}${routes[id]}`;
    const url = new URL(route, location.origin);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "")
        url.searchParams.set(key, value);
    });
    if (options.hash) url.hash = String(options.hash).replace(/^#/, "");
    return url.href;
  }
  function is(id) {
    if (!routes[id]) return false;
    const route =
      isPublicRoot && id.startsWith("template.")
        ? routes[id].replace(/^\/apps\/template/, "") || "/"
        : `${basePath}${routes[id]}`;
    return location.pathname.replace(/index\.html$/, "") === route;
  }
  window.TalentaPaths = Object.freeze({ basePath, routes, to, is });
})();

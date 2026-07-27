/* Canonical, base-path-aware routes for every Talenta application. */
(() => {
  const marker = "/packages/shared/js/core/paths.js";
  const source = document.currentScript?.src || "";
  const pathname = source
    ? new URL(source, location.href).pathname
    : location.pathname;
  const markerIndex = pathname.lastIndexOf(marker);
  const basePath = markerIndex >= 0 ? pathname.slice(0, markerIndex) : "";
  const routes = Object.freeze({
    "public.home": "/apps/public/",
    "public.download": "/apps/public/unduh/",
    "public.winners": "/apps/public/pemenang/",
    "public.archive": "/apps/public/arsip/",
    "public.archiveDetail": "/apps/public/arsip/detail/",
    "public.faq": "/apps/public/faq/",
    "admin.shell": "/apps/admin/",
    "admin.homeEditor": "/apps/admin/editors/beranda/",
    "admin.downloadEditor": "/apps/admin/editors/unduh/",
    "admin.winnersEditor": "/apps/admin/editors/pemenang/",
    "admin.archiveEditor": "/apps/admin/editors/arsip/",
    "admin.archiveDetailEditor": "/apps/admin/editors/arsip/detail/",
    "admin.faqEditor": "/apps/admin/editors/faq/",
    "portal.login": "/apps/portal/login/",
    "portal.dashboard": "/apps/portal/dashboard/",
  });
  function to(id, options = {}) {
    if (!routes[id]) throw new Error(`Unknown route: ${id}`);
    const url = new URL(`${basePath}${routes[id]}`, location.origin);
    Object.entries(options.query || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "")
        url.searchParams.set(key, value);
    });
    if (options.hash) url.hash = String(options.hash).replace(/^#/, "");
    return url.href;
  }
  function is(id) {
    if (!routes[id]) return false;
    return (
      location.pathname.replace(/index\.html$/, "") ===
      `${basePath}${routes[id]}`
    );
  }
  window.TalentaPaths = Object.freeze({ basePath, routes, to, is });
})();

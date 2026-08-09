(() => {
  const injected = window.TALENTA_CONFIG || {};
  const publicBaseDomain = String(
    injected.publicBaseDomain || "nexaplaymetadata.online",
  )
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
  const hostname = location.hostname.toLowerCase();
  const publicSuffix = `.${publicBaseDomain}`;
  const hostnameSlug = hostname.endsWith(publicSuffix)
    ? hostname.slice(0, -publicSuffix.length)
    : null;
  const querySlug = new URLSearchParams(location.search).get("site");
  if (querySlug) sessionStorage.setItem("talenta_public_site_slug", querySlug);
  let selectedCategory = null;
  try {
    selectedCategory = JSON.parse(
      sessionStorage.getItem("talenta_admin_category") || "null",
    );
  } catch (_error) {
    sessionStorage.removeItem("talenta_admin_category");
  }
  const categorySlug =
    querySlug ||
    hostnameSlug ||
    selectedCategory?.slug ||
    sessionStorage.getItem("talenta_public_site_slug") ||
    "talenta-prestasi-local";
  const defaults = Object.freeze({
    apiBaseUrl:
      hostname === "localhost" || hostname === "127.0.0.1"
        ? "http://localhost:3000/api/v1"
        : "/api/v1",
    publicBaseDomain,
    categorySlug,
    siteSlug: categorySlug,
    requestTimeoutMs: 10000,
  });
  window.TalentaConfig = Object.freeze({ ...defaults, ...injected });
})();

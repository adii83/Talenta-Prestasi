(() => {
  const injected = window.TALENTA_CONFIG || {};
  const hostname = location.hostname.toLowerCase();
  const apiBaseUrl =
    injected.apiBaseUrl ||
    (hostname === "localhost" || hostname === "127.0.0.1"
      ? "http://localhost:3000/api/v1"
      : "/api/v1");
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

  const ready = fetch(`${apiBaseUrl}/public/runtime-config`, {
    credentials: "same-origin",
  }).then(async (response) => {
    if (!response.ok) throw new Error("Konfigurasi domain tidak tersedia");
    const payload = await response.json();
    const publicBaseDomain = String(payload.data?.publicBaseDomain || "")
      .trim()
      .toLowerCase()
      .replace(/^\.+|\.+$/g, "");
    if (!publicBaseDomain)
      throw new Error("PUBLIC_BASE_DOMAIN belum dikonfigurasi");
    const publicSuffix = `.${publicBaseDomain}`;
    const hostnameSlug = hostname.endsWith(publicSuffix)
      ? hostname.slice(0, -publicSuffix.length)
      : null;
    const categorySlug =
      querySlug ||
      hostnameSlug ||
      selectedCategory?.slug ||
      sessionStorage.getItem("talenta_public_site_slug") ||
      "talenta-prestasi-local";
    window.TalentaConfig = Object.freeze({
      ...injected,
      apiBaseUrl,
      publicBaseDomain,
      categorySlug,
      siteSlug: categorySlug,
      requestTimeoutMs: injected.requestTimeoutMs || 10000,
      ready,
    });
    return window.TalentaConfig;
  });

  window.TalentaConfig = Object.freeze({
    ...injected,
    apiBaseUrl,
    publicBaseDomain: "",
    categorySlug:
      querySlug || selectedCategory?.slug || "talenta-prestasi-local",
    siteSlug: querySlug || selectedCategory?.slug || "talenta-prestasi-local",
    requestTimeoutMs: injected.requestTimeoutMs || 10000,
    ready,
  });
})();

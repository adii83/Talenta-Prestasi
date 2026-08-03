(() => {
  const defaults = Object.freeze({
    apiBaseUrl: "http://localhost:3000/api/v1",
    siteSlug: "talenta-prestasi-local",
    requestTimeoutMs: 10000,
  });
  const injected = window.TALENTA_CONFIG || {};
  window.TalentaConfig = Object.freeze({ ...defaults, ...injected });
})();

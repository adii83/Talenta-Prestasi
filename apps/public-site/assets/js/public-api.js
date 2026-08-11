(() => {
  let bootstrapPromise = null;
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
  const safeSlug = (value) => {
    const trimmed = String(value || "").trim();
    return slugPattern.test(trimmed) ? trimmed : "";
  };

  async function resolveBootstrap() {
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = (async () => {
      const host = String(location.hostname || "")
        .trim()
        .toLowerCase()
        .replace(/^\.+|\.+$/g, "");
      const isLocalHost = host === "localhost" || host === "127.0.0.1";
      if (!isLocalHost && host) {
        try {
          const payload = await TalentaApi.request(
            `/public/sites/by-host/${encodeURIComponent(host)}/bootstrap`,
            { auth: false },
          );
          const canonicalSlug = safeSlug(payload.data?.site?.slug);
          if (canonicalSlug) {
            window.dispatchEvent(
              new CustomEvent("talenta:public:bootstrap", {
                detail: payload.data,
              }),
            );
            return { ...payload.data, canonicalSlug };
          }
        } catch (_error) {
          // Domain/host belum di-verify atau tidak ditemukan, fallback ke site query/config slug
        }
      }

      const targetSlug =
        safeSlug(new URLSearchParams(location.search).get("site")) ||
        safeSlug(TalentaConfig.categorySlug) ||
        "talenta-prestasi-local";
      const payload = await TalentaApi.request(
        `/public/sites/${encodeURIComponent(targetSlug)}/bootstrap`,
        { auth: false },
      );
      const canonicalSlug = safeSlug(payload.data?.site?.slug) || targetSlug;
      window.dispatchEvent(
        new CustomEvent("talenta:public:bootstrap", { detail: payload.data }),
      );
      return { ...payload.data, canonicalSlug };
    })();

    bootstrapPromise.catch(() => {
      bootstrapPromise = null;
    });
    return bootstrapPromise;
  }

  async function load(page, detailSlug = "") {
    const boot = await resolveBootstrap();
    const targetSlug =
      boot.canonicalSlug ||
      safeSlug(TalentaConfig.categorySlug) ||
      "talenta-prestasi-local";
    const suffix =
      page === "archiveDetail"
        ? `archives/${encodeURIComponent(detailSlug)}`
        : {
            home: "home",
            download: "downloads",
            faq: "faq",
            winners: "winners",
            archive: "archives",
          }[page];
    if (!suffix) throw new Error(`Halaman publik tidak dikenal: ${page}`);
    const payload = await TalentaApi.request(
      `/public/sites/${encodeURIComponent(targetSlug)}/${suffix}`,
      { auth: false },
    );
    window.dispatchEvent(
      new CustomEvent(`talenta:public:${page}`, { detail: payload.data }),
    );
    return payload.data;
  }

  async function bootstrap() {
    return resolveBootstrap();
  }

  window.TalentaPublic = Object.freeze({ load, bootstrap });
  void bootstrap().catch((error) =>
    console.error("Bootstrap API tidak tersedia.", error),
  );
})();

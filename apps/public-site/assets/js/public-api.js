(() => {
  const PREVIEW_KEY = "talenta_event_preview_token";
  const PREVIEW_SCOPE_KEY = "talenta_preview_scope";
  let bootstrapPromise = null;
  let previewError = null;
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
  const safeSlug = (value) => {
    const trimmed = String(value || "").trim();
    return slugPattern.test(trimmed) ? trimmed : "";
  };

  function capturePreview() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const token = hash.get("preview") || "";
    const archiveToken = hash.get("archivePreview") || "";
    const scope = hash.get("previewScope") || "";
    if (token) {
      if (scope === "archiveDetail" && !archiveToken) {
        sessionStorage.removeItem(PREVIEW_KEY);
        sessionStorage.setItem(PREVIEW_SCOPE_KEY, scope);
      } else {
        sessionStorage.setItem(PREVIEW_KEY, token);
        sessionStorage.removeItem(PREVIEW_SCOPE_KEY);
      }
      history.replaceState(
        history.state,
        "",
        `${location.pathname}${location.search}`,
      );
    }
    const isolatedArchiveScope =
      (scope === "archiveDetail" && !archiveToken) ||
      sessionStorage.getItem(PREVIEW_SCOPE_KEY) === "archiveDetail";
    return {
      globalToken: isolatedArchiveScope
        ? ""
        : token || sessionStorage.getItem(PREVIEW_KEY) || "",
      archiveDetailToken:
        scope === "archiveDetail" ? archiveToken || token : "",
      isolatedArchiveScope,
    };
  }

  const {
    globalToken: previewToken,
    archiveDetailToken,
    isolatedArchiveScope,
  } = capturePreview();

  async function establishPreview() {
    if (!previewToken) return;
    try {
      await TalentaApi.request("/public/preview/session", {
        method: "POST",
        auth: false,
        previewToken,
      });
      window.dispatchEvent(
        new CustomEvent("talenta:preview", { detail: { active: true } }),
      );
    } catch (error) {
      previewError = error;
      sessionStorage.removeItem(PREVIEW_KEY);
      window.dispatchEvent(
        new CustomEvent("talenta:preview", {
          detail: { active: false, expired: true, message: error.message },
        }),
      );
      throw error;
    }
  }

  const previewReady = establishPreview();
  const request = (path, token = previewToken) => {
    if (previewError) throw previewError;
    return TalentaApi.request(path, {
      auth: false,
      previewToken: token || undefined,
      credentials: isolatedArchiveScope ? "omit" : undefined,
    });
  };

  async function resolveBootstrap() {
    if (bootstrapPromise) return bootstrapPromise;
    bootstrapPromise = (async () => {
      await previewReady;
      const host = String(location.hostname || "")
        .trim()
        .toLowerCase()
        .replace(/^\.+|\.+$/g, "");
      const isLocalHost = host === "localhost" || host === "127.0.0.1";
      if (!isLocalHost && host) {
        try {
          const payload = await request(
            `/public/sites/by-host/${encodeURIComponent(host)}/bootstrap`,
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
        } catch (error) {
          if (previewToken) throw error;
        }
      }

      const targetSlug =
        safeSlug(new URLSearchParams(location.search).get("site")) ||
        safeSlug(TalentaConfig.categorySlug) ||
        "talenta-prestasi-local";
      const payload = await request(
        `/public/sites/${encodeURIComponent(targetSlug)}/bootstrap`,
      );
      const canonicalSlug = safeSlug(payload.data?.site?.slug) || targetSlug;
      window.dispatchEvent(
        new CustomEvent("talenta:public:bootstrap", { detail: payload.data }),
      );
      return { ...payload.data, canonicalSlug };
    })();

    bootstrapPromise.catch(() => {
      if (!previewToken) bootstrapPromise = null;
    });
    return bootstrapPromise;
  }

  function mediaUrl(source, page = "") {
    const value = String(source || "").trim();
    if (!value) return "";
    const base =
      window.TalentaConfig?.apiBaseUrl &&
      window.TalentaConfig.apiBaseUrl.startsWith("http")
        ? window.TalentaConfig.apiBaseUrl.replace(/\/api\/v1\/?$/, "")
        : location.origin;
    const resolved = new URL(value, base);
    if (
      page === "archiveDetail" &&
      archiveDetailToken &&
      value.startsWith("/") &&
      /^\/api\/v1\/public\/media\/[0-9a-f-]+$/i.test(resolved.pathname)
    )
      resolved.searchParams.set("preview_token", archiveDetailToken);
    return resolved.href;
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
    const payload = await request(
      `/public/sites/${encodeURIComponent(targetSlug)}/${suffix}`,
      page === "archiveDetail" && archiveDetailToken
        ? archiveDetailToken
        : previewToken,
    );
    window.dispatchEvent(
      new CustomEvent(`talenta:public:${page}`, { detail: payload.data }),
    );
    return payload.data;
  }

  window.TalentaPublic = Object.freeze({
    load,
    bootstrap: resolveBootstrap,
    mediaUrl,
    preview: () => ({ active: Boolean(previewToken) && !previewError }),
  });
  void resolveBootstrap().catch((error) => {
    if (!previewToken) console.error("Bootstrap API tidak tersedia.", error);
  });
})();

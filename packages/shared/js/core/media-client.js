(() => {
  const LIMITS = Object.freeze({
    image: 5 * 1024 * 1024,
    document: 10 * 1024 * 1024,
  });
  const IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
  ]);
  async function upload(file, { siteId, altText = "", kind = "image" } = {}) {
    if (!(file instanceof File)) throw new Error("Pilih file terlebih dahulu.");
    const max = kind === "document" ? LIMITS.document : LIMITS.image;
    const allowed =
      kind === "document"
        ? file.type === "application/pdf"
        : IMAGE_TYPES.has(file.type);
    if (!allowed)
      throw new Error(
        kind === "document"
          ? "Dokumen harus berformat PDF."
          : "Gambar harus PNG, JPEG, WebP, atau SVG.",
      );
    if (file.size > max)
      throw new Error(`Ukuran file maksimum ${max / 1024 / 1024} MB.`);
    const currentSite =
      siteId || window.parent?.TalentaAdminAuth?.currentSite?.()?.id;
    if (!currentSite) throw new Error("Site Admin belum dipilih.");
    const body = new FormData();
    body.append("file", file);
    body.append("altText", altText);
    const response = await TalentaApi.request(
      `/admin/events/${currentSite}/media`,
      { method: "POST", body },
    );
    return response.data;
  }
  function url(asset) {
    if (!asset) return "";
    if (typeof asset === "string" && asset.startsWith("http")) return asset;
    const token = new URLSearchParams(location.search).get("preview_token");
    let path =
      typeof asset === "string"
        ? asset.startsWith("/api/")
          ? asset
          : `/api/v1/public/media/${asset}`
        : asset?.url;
    if (token && path && path.startsWith("/api/v1/public/media/")) {
      const parsed = new URL(path, "http://localhost");
      parsed.searchParams.set("preview_token", token);
      path = `${parsed.pathname}${parsed.search}`;
    }
    const base =
      window.TalentaConfig?.apiBaseUrl &&
      window.TalentaConfig.apiBaseUrl.startsWith("http")
        ? window.TalentaConfig.apiBaseUrl
        : location.origin;
    return path ? new URL(path, base).href : "";
  }
  async function adminPreviewUrl(assetId, { siteId } = {}) {
    const event =
      siteId || window.parent?.TalentaAdminAuth?.currentEvent?.()?.id;
    if (!event || !assetId) return "";
    const blob = await TalentaApi.request(
      `/admin/events/${event}/media/${assetId}`,
      { responseType: "blob" },
    );
    return URL.createObjectURL(blob);
  }

  function revokePreviewUrl(value) {
    if (String(value || "").startsWith("blob:")) URL.revokeObjectURL(value);
  }

  window.TalentaMedia = Object.freeze({
    upload,
    url,
    adminPreviewUrl,
    revokePreviewUrl,
    LIMITS,
  });
})();

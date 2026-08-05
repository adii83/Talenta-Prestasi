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
      `/admin/sites/${currentSite}/media`,
      { method: "POST", body },
    );
    return response.data;
  }
  function url(asset) {
    const path =
      typeof asset === "string" ? `/api/v1/public/media/${asset}` : asset?.url;
    return path ? new URL(path, TalentaConfig.apiBaseUrl).href : "";
  }
  window.TalentaMedia = Object.freeze({ upload, url, LIMITS });
})();

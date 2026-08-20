(() => {
  const LIMITS = Object.freeze({
    image: 5 * 1024 * 1024,
    customDesign: 2 * 1024 * 1024,
    customDesignTarget: 400 * 1024,
    customDesignOutput: 500 * 1024,
    document: 10 * 1024 * 1024,
  });
  const IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/svg+xml",
  ]);
  const CUSTOM_DESIGN_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);
  const canvasBlob = (canvas, quality) =>
    new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob?.type === "image/webp"
            ? resolve(blob)
            : reject(new Error("Browser gagal membuat gambar WebP.")),
        "image/webp",
        quality,
      ),
    );
  async function compressCustomDesign(file) {
    if (!(file instanceof File)) throw new Error("Pilih file terlebih dahulu.");
    if (!CUSTOM_DESIGN_TYPES.has(file.type))
      throw new Error("Format harus JPG, PNG, atau WebP.");

    if (file.size > LIMITS.customDesign)
      throw new Error("Ukuran file sumber maksimum 2 MB.");

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
      const longestSide = Math.max(bitmap.width, bitmap.height);
      if (!longestSide) throw new Error("Dimensi gambar tidak valid.");
      if (file.size <= LIMITS.customDesignTarget && longestSide <= 1080)
        return file;

      const scale = Math.min(1, 1080 / longestSide);
      let width = Math.max(1, Math.round(bitmap.width * scale));
      let height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Browser gagal menyiapkan kompresi gambar.");
      let best;

      while (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        context.drawImage(bitmap, 0, 0, width, height);
        for (const quality of [0.86, 0.74, 0.62, 0.5, 0.38]) {
          const blob = await canvasBlob(canvas, quality);
          if (!best || blob.size < best.size) best = blob;
          if (blob.size <= LIMITS.customDesignTarget) {
            if (file.size <= blob.size && longestSide <= 1080) return file;
            return new File(
              [blob],
              `${file.name.replace(/\.[^.]+$/, "") || "desain-pemenang"}.webp`,
              { type: "image/webp", lastModified: file.lastModified },
            );
          }
        }
        if (Math.max(width, height) <= 256) break;
        width = Math.max(1, Math.round(width * 0.85));
        height = Math.max(1, Math.round(height * 0.85));
      }
      if (best?.size <= LIMITS.customDesignOutput && best.size < file.size)
        return new File(
          [best],
          `${file.name.replace(/\.[^.]+$/, "") || "desain-pemenang"}.webp`,
          { type: "image/webp", lastModified: file.lastModified },
        );
      if (file.size <= LIMITS.customDesignOutput && longestSide <= 1080)
        return file;
      throw new Error("Gambar tidak dapat dikompres hingga maksimum 500 KB.");
    } catch (error) {
      if (error instanceof Error && error.message) throw error;
      throw new Error("Gambar tidak dapat dibaca atau dikompres.");
    } finally {
      bitmap?.close();
    }
  }
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
    compressCustomDesign,
    url,
    adminPreviewUrl,
    revokePreviewUrl,
    LIMITS,
  });
})();

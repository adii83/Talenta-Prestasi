(() => {
  const TOKEN_KEY = "talenta_admin_token";

  class ApiError extends Error {
    constructor(message, status = 0, details = null) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.details = details;
    }
  }

  function token() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(value) {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  async function request(path, options = {}) {
    await TalentaConfig.ready;
    const { responseType, timeoutMs, auth, previewToken, ...fetchOptions } =
      options;
    const revision =
      window.TalentaWorkspaceRevision ||
      window.parent?.TalentaWorkspaceRevision;
    const eventMatch = path.match(/^\/admin\/events\/([^/?]+)/);
    const method = String(fetchOptions.method || "GET").toUpperCase();
    const mutatesWorkspace =
      eventMatch &&
      (["PUT", "PATCH", "DELETE"].includes(method) ||
        (method === "POST" &&
          (/\/(documents|winner-categories|winners)$/.test(path) ||
            path.endsWith("/publish") ||
            path.endsWith("/discard-draft"))));
    if (mutatesWorkspace && revision?.current) {
      const expectedRevision = revision.current(eventMatch[1]);
      if (expectedRevision) {
        if (fetchOptions.body instanceof FormData)
          fetchOptions.body.set("expectedRevision", String(expectedRevision));
        else
          fetchOptions.body = revision.body(
            fetchOptions.body || {},
            expectedRevision,
          );
        if (String(fetchOptions.method).toUpperCase() === "DELETE")
          path = revision.query(path, expectedRevision);
      }
    }
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      timeoutMs || TalentaConfig.requestTimeoutMs,
    );
    const headers = new Headers(fetchOptions.headers);
    if (
      fetchOptions.body !== undefined &&
      !(fetchOptions.body instanceof FormData)
    ) {
      headers.set("Content-Type", "application/json");
    }
    const accessToken = auth === false ? "" : token();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    if (previewToken) headers.set("X-Talenta-Preview", previewToken);

    try {
      const response = await fetch(
        `${TalentaConfig.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`,
        {
          ...fetchOptions,
          headers,
          body:
            fetchOptions.body === undefined ||
            fetchOptions.body instanceof FormData
              ? fetchOptions.body
              : JSON.stringify(fetchOptions.body),
          signal: controller.signal,
          credentials: fetchOptions.credentials || "include",
        },
      );
      if (response.status === 401 && accessToken) setToken("");
      if (responseType === "blob" && response.ok) return await response.blob();
      const text = await response.text();
      let payload = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        if (!response.ok)
          throw new ApiError(
            `Permintaan gagal (${response.status})`,
            response.status,
          );
        throw new ApiError("Respons server tidak valid");
      }
      if (!response.ok) {
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.message || `Permintaan gagal (${response.status})`;
        throw new ApiError(message, response.status, payload);
      }
      if (eventMatch && revision?.next) revision.next(eventMatch[1], payload);
      return payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error?.name === "AbortError")
        throw new ApiError("Server tidak merespons tepat waktu");
      if (error instanceof SyntaxError)
        throw new ApiError("Respons server tidak valid");
      throw new ApiError("Tidak dapat terhubung ke server");
    } finally {
      clearTimeout(timeout);
    }
  }

  window.TalentaApi = Object.freeze({ ApiError, request, token, setToken });
})();

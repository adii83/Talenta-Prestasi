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
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs || TalentaConfig.requestTimeoutMs,
    );
    const headers = new Headers(options.headers);
    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    const accessToken = options.auth === false ? "" : token();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    if (options.previewToken)
      headers.set("X-Talenta-Preview", options.previewToken);

    try {
      const response = await fetch(
        `${TalentaConfig.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`,
        {
          ...options,
          headers,
          body:
            options.body === undefined || options.body instanceof FormData
              ? options.body
              : JSON.stringify(options.body),
          signal: controller.signal,
          credentials: options.credentials || "include",
        },
      );
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;
      if (!response.ok) {
        if (response.status === 401 && accessToken) setToken("");
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.message || `Permintaan gagal (${response.status})`;
        throw new ApiError(message, response.status, payload);
      }
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

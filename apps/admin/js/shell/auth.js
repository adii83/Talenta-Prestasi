(() => {
  const SITE_KEY = "talenta_admin_site";

  function createGate() {
    const gate = document.createElement("div");
    gate.id = "adminAuthGate";
    gate.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:24px;background:linear-gradient(135deg,#071a33 0%,#123f73 55%,#1e4b8c 100%);font-family:inherit";
    gate.innerHTML = `
      <form id="adminLoginForm" style="width:min(100%,420px);padding:32px;border:1px solid rgba(255,255,255,.18);border-radius:24px;background:rgba(255,255,255,.97);box-shadow:0 24px 70px rgba(2,15,32,.35)">
        <p style="margin:0 0 8px;color:#1e4b8c;font-weight:800;letter-spacing:.08em;text-transform:uppercase;font-size:.75rem">Talenta Prestasi</p>
        <h1 style="margin:0;color:#071a33;font-size:clamp(1.75rem,5vw,2.25rem)">Masuk ke Admin</h1>
        <p style="margin:10px 0 24px;color:#52657a;line-height:1.6">Gunakan akun pengelola portal untuk melanjutkan.</p>
        <label for="adminLoginEmail" style="display:block;margin:0 0 8px;font-weight:700;color:#172b45">Email</label>
        <input id="adminLoginEmail" name="email" type="email" autocomplete="username" required maxlength="254" style="box-sizing:border-box;width:100%;padding:12px 14px;border:1px solid #c8d3df;border-radius:10px;font:inherit" />
        <label for="adminLoginPassword" style="display:block;margin:18px 0 8px;font-weight:700;color:#172b45">Kata sandi</label>
        <input id="adminLoginPassword" name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="128" style="box-sizing:border-box;width:100%;padding:12px 14px;border:1px solid #c8d3df;border-radius:10px;font:inherit" />
        <p id="adminLoginError" role="alert" aria-live="polite" style="min-height:1.5em;margin:12px 0 0;color:#a1263a"></p>
        <button id="adminLoginButton" type="submit" style="width:100%;margin-top:8px;padding:13px 18px;border:0;border-radius:10px;background:#1e4b8c;color:#fff;font:inherit;font-weight:800;cursor:pointer">Masuk</button>
      </form>`;
    document.body.append(gate);
    return gate;
  }

  async function loadSession() {
    const response = await TalentaApi.request("/admin/session");
    const session = response.data;
    const selected = JSON.parse(sessionStorage.getItem(SITE_KEY) || "null");
    if (selected && !session.sites.some((site) => site.id === selected.id)) {
      sessionStorage.removeItem(SITE_KEY);
    }
    window.TalentaAdminSession = Object.freeze(session);
    return session;
  }

  async function boot() {
    const gate = createGate();
    const form = document.getElementById("adminLoginForm");
    const error = document.getElementById("adminLoginError");
    const button = document.getElementById("adminLoginButton");

    async function authenticate(email, password) {
      button.disabled = true;
      button.textContent = "Memeriksa...";
      error.textContent = "";
      try {
        if (email !== undefined) {
          const login = await TalentaApi.request("/auth/login", {
            method: "POST",
            body: { email, password },
          });
          TalentaApi.setToken(login.access_token);
        }
        const interactive = email !== undefined;
        if (interactive) sessionStorage.removeItem(SITE_KEY);
        const session = await loadSession();
        gate.remove();
        document.dispatchEvent(
          new CustomEvent("talenta:admin-ready", {
            detail: { session, interactive },
          }),
        );
      } catch (reason) {
        TalentaApi.setToken("");
        sessionStorage.removeItem(SITE_KEY);
        error.textContent = reason.message;
      } finally {
        button.disabled = false;
        button.textContent = "Masuk";
      }
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(form);
      authenticate(
        String(data.get("email") || ""),
        String(data.get("password") || ""),
      );
    });

    if (TalentaApi.token()) await authenticate();
  }

  window.TalentaAdminAuth = Object.freeze({
    currentSite: () => JSON.parse(sessionStorage.getItem(SITE_KEY) || "null"),
    selectSite: (site) => {
      sessionStorage.setItem(SITE_KEY, JSON.stringify(site));
      sessionStorage.setItem("talenta_public_site_slug", site.slug);
      location.assign(`${location.pathname}?page=settings`);
    },
    updateCurrentSite: (patch) => {
      const current = JSON.parse(sessionStorage.getItem(SITE_KEY) || "null");
      if (!current) return;
      const updated = { ...current, ...patch };
      sessionStorage.setItem(SITE_KEY, JSON.stringify(updated));
      if (updated.slug)
        sessionStorage.setItem("talenta_public_site_slug", updated.slug);
    },
    clearCurrentSite: (siteId) => {
      const current = JSON.parse(sessionStorage.getItem(SITE_KEY) || "null");
      if (!siteId || current?.id === siteId)
        sessionStorage.removeItem(SITE_KEY);
    },
    showPortals: () =>
      document.dispatchEvent(new CustomEvent("talenta:show-portals")),
    logout: () => {
      TalentaApi.setToken("");
      sessionStorage.removeItem(SITE_KEY);
      location.reload();
    },
  });
  boot();
})();

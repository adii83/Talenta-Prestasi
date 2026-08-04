(() => {
  let session = null;
  let root = null;

  function ensureUi() {
    if (root) return root;
    const style = document.createElement("style");
    style.textContent = `
      .event-dashboard{position:fixed;inset:0;z-index:9000;overflow:auto;background:#f4f7fb;color:#10243e;font-family:"Source Sans 3",sans-serif}
      .event-dashboard[hidden]{display:none}.event-dashboard__header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px clamp(24px,6vw,80px);background:#0a2b50;color:#fff}
      .event-dashboard__brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:1.05rem}.event-dashboard__mark{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#fff;color:#174f8f}
      .event-dashboard__actions{display:flex;align-items:center;gap:12px}.event-dashboard__email{color:#cbd9e9}.event-dashboard__logout,.event-dashboard__secondary{padding:10px 14px;border:1px solid #b9cae0;border-radius:10px;background:#fff;color:#173b65;font-weight:700;cursor:pointer}
      .event-dashboard__main{width:min(1080px,calc(100% - 40px));margin:0 auto;padding:56px 0 80px}.event-dashboard__intro{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:28px}.event-dashboard__eyebrow{margin:0 0 8px;color:#1e5a9d;font-size:.8rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.event-dashboard h1{margin:0;font-size:clamp(2rem,5vw,3.1rem)}
      .event-dashboard__intro p:last-child{max-width:650px;margin:12px 0 0;color:#5b6d83;line-height:1.6}.event-dashboard__primary{padding:12px 18px;border:0;border-radius:11px;background:#1e5a9d;color:#fff;font-weight:800;cursor:pointer}.event-dashboard__primary:disabled{opacity:.55;cursor:not-allowed}
      .event-dashboard__status{min-height:1.5em;margin:0 0 18px;color:#17623b}.event-dashboard__status--error{color:#a1263a}.event-dashboard__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}.event-card{display:flex;flex-direction:column;min-height:170px;padding:24px;border:1px solid #dbe3ed;border-radius:18px;background:#fff;box-shadow:0 10px 30px rgba(19,49,83,.07)}
      .event-card__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.event-card h2{margin:0 0 7px;font-size:1.45rem}.event-card__badge{flex:none;padding:5px 9px;border-radius:999px;background:#eef2f7;color:#53657b;font-size:.73rem;font-weight:800}.event-card__badge--published{background:#daf5e5;color:#126238}.event-card__badge--unpublished{background:#ffead9;color:#8a4615}.event-card__domain{margin:0 0 20px;color:#738499;font-family:"Roboto Mono",monospace;font-size:.82rem}.event-card__domain a{color:#1e5a9d}.event-card__hint{margin:10px 0 0;color:#9a6019;font-size:.84rem}.event-card__buttons{display:flex;flex-wrap:wrap;gap:10px;margin-top:auto}.event-card__buttons button{flex:1 1 130px}.event-card__delete{color:#9d2940;border-color:#e2b9c2}.event-dashboard__empty{grid-column:1/-1;padding:44px;border:1px dashed #aebfd1;border-radius:18px;background:#fff;text-align:center;color:#5b6d83}
      .event-dialog{width:min(460px,calc(100% - 32px));max-height:calc(100vh - 48px);margin:0;padding:0;border:0;border-radius:20px;box-shadow:0 25px 80px rgba(5,25,49,.3);overflow:auto}.event-dialog[open]{position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%)}.event-dialog::backdrop{background:rgba(4,20,40,.66)}.event-dialog form{padding:30px}.event-dialog h2{margin:0}.event-dialog__help{margin:8px 0 22px;color:#61738a;line-height:1.5}.event-dialog label{display:block;margin:14px 0 6px;font-weight:700}.event-dialog input{box-sizing:border-box;width:100%;padding:12px 14px;border:1px solid #c3cfdd;border-radius:9px;font:inherit}.event-dialog__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}.event-dialog__error{min-height:1.4em;margin:12px 0 0;color:#a1263a}
      .event-switch{box-sizing:border-box;display:block;margin:18px 16px 0;width:calc(100% - 32px);padding:10px;border:1px solid rgba(255,255,255,.25);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;font:inherit;font-weight:700;text-align:center;text-decoration:none;cursor:pointer}
      @media(max-width:700px){.event-dashboard__header,.event-dashboard__intro{align-items:flex-start;flex-direction:column}.event-dashboard__actions{width:100%;justify-content:space-between}.event-dashboard__email{display:none}.event-card__buttons{flex-direction:column}}
    `;
    document.head.append(style);
    root = document.createElement("section");
    root.className = "event-dashboard";
    root.hidden = true;
    root.innerHTML = `
      <header class="event-dashboard__header"><div class="event-dashboard__brand"><span class="event-dashboard__mark">TP</span><span>TalentaPanel</span></div><div class="event-dashboard__actions"><span class="event-dashboard__email" id="eventUserEmail"></span><button class="event-dashboard__logout" id="eventLogout" type="button">Keluar</button></div></header>
      <main class="event-dashboard__main"><div class="event-dashboard__intro"><div><p class="event-dashboard__eyebrow">Workspace Admin</p><h1>Daftar Event</h1><p>Kelola event yang sudah ada atau buat event baru. Riwayat event sebelumnya otomatis tersedia pada Arsip event berikutnya.</p></div><button class="event-dashboard__primary" id="newEventButton" type="button">+ Buat Event Baru</button></div><p class="event-dashboard__status" id="eventStatus" role="status"></p><div class="event-dashboard__grid" id="eventGrid"></div></main>
      <dialog class="event-dialog" id="newEventDialog"><form id="newEventForm"><h2>Buat Event Baru</h2><p class="event-dialog__help">Masukkan nama event. Slug dan subdomain dapat ditentukan nanti dari Pengaturan Event.</p><label for="newEventName">Nama event</label><input id="newEventName" name="name" required maxlength="160" autofocus placeholder="Contoh: Olimpiade Sains Nasional 2027"><p class="event-dialog__error" id="newEventError"></p><div class="event-dialog__actions"><button class="event-dashboard__secondary" id="cancelEventDialog" type="button">Batal</button><button class="event-dashboard__primary" type="submit">Buat Event</button></div></form></dialog>`;
    document.body.append(root);
    bindUi();
    return root;
  }

  function setStatus(message, error = false) {
    const node = document.getElementById("eventStatus");
    node.textContent = message;
    node.classList.toggle("event-dashboard__status--error", error);
  }

  function bindUi() {
    document.getElementById("eventLogout").onclick = TalentaAdminAuth.logout;
    document.getElementById("newEventButton").onclick = () => {
      document.getElementById("newEventForm").reset();
      document.getElementById("newEventError").textContent = "";
      document.getElementById("newEventDialog").showModal();
    };
    document.getElementById("cancelEventDialog").onclick = () =>
      document.getElementById("newEventDialog").close();
    document.getElementById("newEventForm").onsubmit = createEvent;
  }

  async function refreshSession() {
    const response = await TalentaApi.request("/admin/session");
    session = response.data;
    window.TalentaAdminSession = Object.freeze(session);
    render();
  }

  function render() {
    ensureUi();
    document.getElementById("eventUserEmail").textContent = session.user.email;
    const canCreate = session.organizations.some((organization) =>
      ["owner", "admin"].includes(organization.role),
    );
    document.getElementById("newEventButton").disabled = !canCreate;
    const grid = document.getElementById("eventGrid");
    grid.replaceChildren();
    if (!session.sites.length) {
      const empty = document.createElement("div");
      empty.className = "event-dashboard__empty";
      empty.textContent = canCreate
        ? "Belum ada event. Buat event pertama untuk mulai mengelola website."
        : "Belum ada event dan akun ini tidak memiliki izin untuk membuatnya.";
      grid.append(empty);
      return;
    }
    for (const site of session.sites) grid.append(eventCard(site));
  }

  function eventCard(site) {
    const card = document.createElement("article");
    card.className = "event-card";
    const heading = document.createElement("div");
    heading.className = "event-card__heading";
    const title = document.createElement("h2");
    title.textContent = site.name;
    const status = document.createElement("span");
    status.className = `event-card__badge event-card__badge--${site.publicationStatus}`;
    status.textContent =
      site.publicationStatus === "published"
        ? "Aktif"
        : site.publicationStatus === "unpublished"
          ? "Nonaktif"
          : "Draft";
    heading.append(title, status);
    const domain = document.createElement("p");
    domain.className = "event-card__domain";
    if (site.hostname && site.publicationStatus === "published") {
      const link = document.createElement("a");
      link.href = `https://${site.hostname}/`;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = site.hostname;
      domain.append(link);
    } else {
      domain.textContent = site.slug.startsWith("event-")
        ? "Subdomain belum diatur"
        : `${site.slug}.${TalentaConfig.publicBaseDomain}`;
    }
    const buttons = document.createElement("div");
    buttons.className = "event-card__buttons";
    const manage = document.createElement("button");
    manage.className = "event-dashboard__primary";
    manage.type = "button";
    manage.textContent = "Kelola Event";
    manage.onclick = () => TalentaAdminAuth.selectSite(site);
    const publish = document.createElement("button");
    publish.className = "event-dashboard__secondary";
    publish.type = "button";
    publish.textContent =
      site.publicationStatus === "published" ? "Nonaktifkan" : "Publikasikan";
    publish.disabled =
      site.publicationStatus !== "published" && site.slug.startsWith("event-");
    publish.onclick = () => togglePublication(site, publish);
    const remove = document.createElement("button");
    remove.className = "event-dashboard__secondary event-card__delete";
    remove.type = "button";
    remove.textContent = "Hapus Event";
    remove.onclick = () => deleteEvent(site);
    buttons.append(manage, publish, remove);
    card.append(heading, domain);
    if (publish.disabled) {
      const hint = document.createElement("p");
      hint.className = "event-card__hint";
      hint.textContent =
        "Atur slug/subdomain di Pengaturan Event sebelum publikasi.";
      card.append(hint);
    }
    card.append(buttons);
    return card;
  }

  async function togglePublication(site, button) {
    const isPublished = site.publicationStatus === "published";
    if (isPublished) {
      const confirmed = await adminConfirm({
        title: "Nonaktifkan Event?",
        message: `${site.name} tidak akan dapat diakses publik sampai dipublikasikan kembali.`,
        confirmLabel: "Ya, nonaktifkan",
        variant: "danger",
        icon: "eye-off",
      });
      if (!confirmed) return;
    }
    button.disabled = true;
    setStatus("");
    try {
      const action = isPublished ? "unpublish" : "publish";
      const response = await TalentaApi.request(
        `/admin/sites/${site.id}/${action}`,
        { method: "POST" },
      );
      setStatus(
        isPublished
          ? "Event berhasil dinonaktifkan."
          : `Event berhasil dipublikasikan di ${response.data.hostname}.`,
      );
      await refreshSession();
    } catch (reason) {
      setStatus(reason.message, true);
      button.disabled = false;
    }
  }

  async function createEvent(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    const error = document.getElementById("newEventError");
    button.disabled = true;
    error.textContent = "";
    try {
      const values = Object.fromEntries(new FormData(form));
      const response = await TalentaApi.request("/admin/sites", {
        method: "POST",
        body: { name: values.name },
      });
      document.getElementById("newEventDialog").close();
      TalentaAdminAuth.selectSite(response.data);
    } catch (reason) {
      error.textContent = reason.message;
    } finally {
      button.disabled = false;
    }
  }

  async function deleteEvent(site) {
    const confirmed = await adminConfirm({
      title: "Hapus Event?",
      message: `${site.name} akan dihapus dari daftar event. Tindakan ini tidak menghapus event lain.`,
      confirmLabel: "Ya, hapus event",
      variant: "danger",
      icon: "trash-2",
    });
    if (!confirmed) return;
    try {
      await TalentaApi.request(`/admin/sites/${site.id}`, { method: "DELETE" });
      TalentaAdminAuth.clearCurrentSite(site.id);
      setStatus("Event berhasil dihapus.");
      await refreshSession();
    } catch (reason) {
      setStatus(reason.message, true);
    }
  }

  function show() {
    session = window.TalentaAdminSession || session;
    if (!session) return;
    ensureUi().hidden = false;
    render();
  }

  function addSwitchButton() {
    if (document.getElementById("portalSwitchButton")) return;
    const link = document.createElement("a");
    link.id = "portalSwitchButton";
    link.className = "event-switch";
    link.href = `${location.pathname}?events=1`;
    link.textContent = "Daftar Event";
    document.getElementById("adminSidebar")?.append(link);
  }

  document.addEventListener("talenta:admin-ready", (event) => {
    session = event.detail.session;
    addSwitchButton();
    if (
      event.detail.interactive ||
      !TalentaAdminAuth.currentSite() ||
      new URLSearchParams(location.search).has("events") ||
      new URLSearchParams(location.search).has("portals")
    )
      show();
  });
  document.addEventListener("talenta:show-portals", show);
  window.TalentaPortalDashboard = Object.freeze({ show });
})();

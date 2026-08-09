(() => {
  let session;
  let root;
  let selectedCategory;
  let events = [];

  function ensureUi() {
    if (root) return root;
    const style = document.createElement("style");
    style.textContent = `
      .event-dashboard{position:fixed;inset:0;z-index:9000;overflow:auto;background:#f4f7fb;color:#10243e;font-family:"Source Sans 3",sans-serif}.event-dashboard[hidden]{display:none}
      .event-dashboard__header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px clamp(24px,6vw,80px);background:#0a2b50;color:#fff}.event-dashboard__brand{display:flex;align-items:center;gap:12px;font-weight:800}.event-dashboard__mark{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#fff;color:#174f8f}.event-dashboard__actions{display:flex;align-items:center;gap:12px}.event-dashboard__email{color:#cbd9e9}
      .event-dashboard button{font:inherit}.event-dashboard__logout,.event-dashboard__secondary{padding:10px 14px;border:1px solid #b9cae0;border-radius:10px;background:#fff;color:#173b65;font-weight:700;cursor:pointer}.event-dashboard__primary{padding:12px 18px;border:0;border-radius:11px;background:#1e5a9d;color:#fff;font-weight:800;cursor:pointer}.event-dashboard button:disabled{opacity:.55;cursor:not-allowed}
      .event-dashboard__main{width:min(1080px,calc(100% - 40px));margin:auto;padding:56px 0 80px}.event-dashboard__intro{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:28px}.event-dashboard__eyebrow{margin:0 0 8px;color:#1e5a9d;font-size:.8rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.event-dashboard h1{margin:0;font-size:clamp(2rem,5vw,3.1rem)}.event-dashboard__description{max-width:650px;margin:12px 0 0;color:#5b6d83;line-height:1.6}.event-dashboard__status{min-height:1.5em;margin:0 0 18px;color:#17623b}.event-dashboard__status--error{color:#a1263a}.event-dashboard__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
      .event-card{display:flex;flex-direction:column;min-height:170px;padding:24px;border:1px solid #dbe3ed;border-radius:18px;background:#fff;box-shadow:0 10px 30px rgba(19,49,83,.07)}.event-card__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.event-card h2{margin:0 0 7px;font-size:1.4rem}.event-card__badge{flex:none;padding:5px 9px;border-radius:999px;background:#eef2f7;color:#53657b;font-size:.73rem;font-weight:800}.event-card__badge--published,.event-card__badge--active{background:#daf5e5;color:#126238}.event-card__badge--unpublished,.event-card__badge--archive{background:#ffead9;color:#8a4615}.event-card__domain{margin:0 0 20px;color:#738499;font-family:"Roboto Mono",monospace;font-size:.82rem}.event-card__domain a{color:#1e5a9d}.event-card__buttons{display:flex;flex-wrap:wrap;gap:10px;margin-top:auto}.event-card__buttons button{flex:1 1 120px}.event-card__delete{color:#9d2940;border-color:#e2b9c2}.event-dashboard__empty{grid-column:1/-1;padding:44px;border:1px dashed #aebfd1;border-radius:18px;background:#fff;text-align:center;color:#5b6d83}
      .event-dialog{width:min(460px,calc(100% - 32px));max-height:calc(100vh - 48px);padding:0;border:0;border-radius:20px;box-shadow:0 25px 80px rgba(5,25,49,.3)}.event-dialog[open]{position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%)}.event-dialog::backdrop{background:rgba(4,20,40,.66)}.event-dialog form{padding:30px}.event-dialog h2{margin:0}.event-dialog__help{margin:8px 0 22px;color:#61738a}.event-dialog label{display:block;margin:14px 0 6px;font-weight:700}.event-dialog input{box-sizing:border-box;width:100%;padding:12px 14px;border:1px solid #c3cfdd;border-radius:9px;font:inherit}.event-dialog__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}.event-dialog__error{min-height:1.4em;margin:12px 0 0;color:#a1263a}.event-switch{box-sizing:border-box;display:block;margin:18px 16px 0;width:calc(100% - 32px);padding:10px;border:1px solid rgba(255,255,255,.25);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;font-weight:700;text-align:center;text-decoration:none;cursor:pointer}
      @media(max-width:700px){.event-dashboard__header,.event-dashboard__intro{align-items:flex-start;flex-direction:column}.event-dashboard__email{display:none}.event-card__buttons{flex-direction:column}}
    `;
    document.head.append(style);
    root = document.createElement("section");
    root.className = "event-dashboard";
    root.hidden = true;
    root.innerHTML = `
      <header class="event-dashboard__header"><div class="event-dashboard__brand"><span class="event-dashboard__mark">TP</span><span>TalentaPanel</span></div><div class="event-dashboard__actions"><span class="event-dashboard__email" id="eventUserEmail"></span><button class="event-dashboard__logout" id="eventLogout" type="button">Keluar</button></div></header>
      <main class="event-dashboard__main"><div class="event-dashboard__intro"><div><p class="event-dashboard__eyebrow" id="dashboardEyebrow">Workspace Admin</p><h1 id="dashboardTitle">Kategori Lomba</h1><p class="event-dashboard__description" id="dashboardDescription"></p></div><div><button class="event-dashboard__secondary" id="backToCategories" type="button" hidden>← Kategori</button> <button class="event-dashboard__primary" id="dashboardCreate" type="button"></button></div></div><p class="event-dashboard__status" id="eventStatus" role="status" aria-live="polite"></p><div class="event-dashboard__grid" id="eventGrid"></div></main>
      <dialog class="event-dialog" id="categoryDialog"><form id="categoryForm"><h2>Buat Kategori Lomba</h2><p class="event-dialog__help">Satu kategori memiliki satu subdomain tetap untuk seluruh periode.</p><label for="categoryName">Nama kategori</label><input id="categoryName" name="name" required maxlength="160"><label for="categorySlug">Slug subdomain</label><input id="categorySlug" name="slug" required maxlength="100" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="contoh: octal"><p class="event-dialog__error" id="categoryError"></p><div class="event-dialog__actions"><button class="event-dashboard__secondary" type="button" data-close="categoryDialog">Batal</button><button class="event-dashboard__primary" type="submit">Buat Kategori</button></div></form></dialog>
      <dialog class="event-dialog" id="eventDialog"><form id="eventForm"><h2>Buat Event/Periode</h2><p class="event-dialog__help">Event baru menjadi draft arsip sampai diaktifkan.</p><label for="newEventName">Nama event</label><input id="newEventName" name="name" required maxlength="160" placeholder="Contoh: Octal 2027"><p class="event-dialog__error" id="newEventError"></p><div class="event-dialog__actions"><button class="event-dashboard__secondary" type="button" data-close="eventDialog">Batal</button><button class="event-dashboard__primary" type="submit">Buat Event</button></div></form></dialog>`;
    document.body.append(root);
    document.getElementById("eventLogout").onclick = TalentaAdminAuth.logout;
    document.getElementById("backToCategories").onclick = showCategories;
    document.getElementById("dashboardCreate").onclick = openCreate;
    document.getElementById("categoryForm").onsubmit = createCategory;
    document.getElementById("eventForm").onsubmit = createEvent;
    root.querySelectorAll("[data-close]").forEach(
      (button) => (button.onclick = () => document.getElementById(button.dataset.close).close()),
    );
    return root;
  }

  const setStatus = (message, error = false) => {
    const node = document.getElementById("eventStatus");
    node.textContent = message;
    node.classList.toggle("event-dashboard__status--error", error);
  };
  const canManage = (item) => ["owner", "admin"].includes(item.role);
  const badge = (text, state) => `<span class="event-card__badge event-card__badge--${state}">${text}</span>`;

  function showCategories() {
    selectedCategory = null;
    events = [];
    TalentaAdminAuth.selectCategory(null);
    renderCategories();
  }

  function renderCategories() {
    ensureUi();
    document.getElementById("eventUserEmail").textContent = session.user.email;
    document.getElementById("dashboardEyebrow").textContent = "Workspace Admin";
    document.getElementById("dashboardTitle").textContent = "Kategori Lomba";
    document.getElementById("dashboardDescription").textContent =
      "Setiap kategori memiliki satu subdomain tetap. Pilih kategori untuk mengelola Event/Periode di dalamnya.";
    document.getElementById("backToCategories").hidden = true;
    const create = document.getElementById("dashboardCreate");
    create.textContent = "+ Buat Kategori";
    create.disabled = !session.organizations.some(canManage);
    const grid = document.getElementById("eventGrid");
    grid.replaceChildren();
    if (!session.categories.length) {
      grid.innerHTML = '<div class="event-dashboard__empty">Belum ada kategori lomba.</div>';
      return;
    }
    session.categories.forEach((category) => grid.append(categoryCard(category)));
  }

  function categoryCard(category) {
    const card = document.createElement("article");
    card.className = "event-card";
    const state = category.publicationStatus || "draft";
    card.innerHTML = `<div class="event-card__heading"><h2></h2>${badge(state === "published" ? "Dipublikasikan" : state === "unpublished" ? "Nonaktif" : "Draft", state)}</div><p class="event-card__domain"></p><div class="event-card__buttons"></div>`;
    card.querySelector("h2").textContent = category.name;
    const domain = card.querySelector(".event-card__domain");
    domain.textContent = category.hostname || `${category.slug}.${TalentaConfig.publicBaseDomain}`;
    const buttons = card.querySelector(".event-card__buttons");
    buttons.append(
      action("Kelola Event", "event-dashboard__primary", () => openCategory(category)),
      action(state === "published" ? "Nonaktifkan" : "Publikasikan", "event-dashboard__secondary", () => toggleCategory(category)),
      action("Hapus", "event-dashboard__secondary event-card__delete", () => deleteCategory(category)),
    );
    return card;
  }

  async function openCategory(category) {
    selectedCategory = category;
    TalentaAdminAuth.selectCategory(category);
    setStatus("Memuat event...");
    try {
      events = (await TalentaApi.request(`/admin/categories/${category.id}/events`)).data;
      renderEvents();
      setStatus("");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function renderEvents() {
    document.getElementById("dashboardEyebrow").textContent = selectedCategory.slug;
    document.getElementById("dashboardTitle").textContent = selectedCategory.name;
    document.getElementById("dashboardDescription").textContent =
      "Hanya satu Event aktif. Event nonaktif otomatis tersedia sebagai arsip kategori ini.";
    document.getElementById("backToCategories").hidden = false;
    const create = document.getElementById("dashboardCreate");
    create.textContent = "+ Buat Event";
    create.disabled = !canManage(selectedCategory);
    const grid = document.getElementById("eventGrid");
    grid.replaceChildren();
    if (!events.length) {
      grid.innerHTML = '<div class="event-dashboard__empty">Belum ada Event/Periode dalam kategori ini.</div>';
      return;
    }
    events.forEach((event) => grid.append(eventCard(event)));
  }

  function eventCard(event) {
    const card = document.createElement("article");
    card.className = "event-card";
    const state = event.isActive ? "active" : "archive";
    card.innerHTML = `<div class="event-card__heading"><h2></h2>${badge(event.isActive ? "Aktif" : "Arsip", state)}</div><p class="event-card__domain"></p><div class="event-card__buttons"></div>`;
    card.querySelector("h2").textContent = event.name;
    card.querySelector(".event-card__domain").textContent = `Periode: ${event.slug}`;
    const buttons = card.querySelector(".event-card__buttons");
    buttons.append(
      action("Kelola Event", "event-dashboard__primary", () =>
        TalentaAdminAuth.selectEvent(event, selectedCategory),
      ),
    );
    if (!event.isActive)
      buttons.append(action("Jadikan Aktif", "event-dashboard__secondary", () => activateEvent(event)));
    buttons.append(action("Hapus", "event-dashboard__secondary event-card__delete", () => deleteEvent(event)));
    return card;
  }

  function action(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.onclick = handler;
    return button;
  }

  function openCreate() {
    const id = selectedCategory ? "eventDialog" : "categoryDialog";
    const form = document.querySelector(`#${id} form`);
    form.reset();
    form.querySelector(".event-dialog__error").textContent = "";
    document.getElementById(id).showModal();
  }

  async function submit(form, request, dialogId, errorId) {
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    document.getElementById(errorId).textContent = "";
    try {
      await request(Object.fromEntries(new FormData(form)));
      document.getElementById(dialogId).close();
    } catch (error) {
      document.getElementById(errorId).textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  async function createCategory(event) {
    event.preventDefault();
    await submit(event.currentTarget, async (body) => {
      await TalentaApi.request("/admin/categories", { method: "POST", body });
      await refreshSession();
    }, "categoryDialog", "categoryError");
  }

  async function createEvent(event) {
    event.preventDefault();
    await submit(event.currentTarget, async (body) => {
      await TalentaApi.request(`/admin/categories/${selectedCategory.id}/events`, { method: "POST", body });
      await openCategory(selectedCategory);
    }, "eventDialog", "newEventError");
  }

  async function toggleCategory(category) {
    const published = category.publicationStatus === "published";
    if (published && !(await adminConfirm({ title: "Nonaktifkan kategori?", message: "Subdomain tidak dapat diakses sampai kategori dipublikasikan kembali.", confirmLabel: "Nonaktifkan", variant: "danger", icon: "eye-off" }))) return;
    try {
      await TalentaApi.request(`/admin/categories/${category.id}/${published ? "unpublish" : "publish"}`, { method: "POST" });
      await refreshSession();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function deleteCategory(category) {
    if (!(await adminConfirm({ title: "Hapus kategori?", message: `${category.name} dan seluruh Event di dalamnya akan disembunyikan.`, confirmLabel: "Hapus kategori", variant: "danger", icon: "trash-2" }))) return;
    try {
      await TalentaApi.request(`/admin/categories/${category.id}`, { method: "DELETE" });
      await refreshSession();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function activateEvent(event) {
    if (!(await adminConfirm({ title: "Aktifkan Event?", message: `${event.name} menjadi Event publik; Event aktif sebelumnya otomatis menjadi arsip.`, confirmLabel: "Jadikan aktif", icon: "check-circle" }))) return;
    try {
      await TalentaApi.request(`/admin/events/${event.id}/activate`, { method: "POST" });
      await openCategory(selectedCategory);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function deleteEvent(event) {
    if (!(await adminConfirm({ title: "Hapus Event?", message: `${event.name} akan disembunyikan dari kategori dan arsip.`, confirmLabel: "Hapus Event", variant: "danger", icon: "trash-2" }))) return;
    try {
      await TalentaApi.request(`/admin/events/${event.id}`, { method: "DELETE" });
      TalentaAdminAuth.clearCurrentEvent(event.id);
      await openCategory(selectedCategory);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function refreshSession() {
    session = (await TalentaApi.request("/admin/session")).data;
    window.TalentaAdminSession = Object.freeze(session);
    renderCategories();
  }

  function show() {
    session = window.TalentaAdminSession || session;
    if (!session) return;
    ensureUi().hidden = false;
    renderCategories();
  }

  function addSwitchButton() {
    if (document.getElementById("portalSwitchButton")) return;
    const link = document.createElement("a");
    link.id = "portalSwitchButton";
    link.className = "event-switch";
    link.href = `${location.pathname}?categories=1`;
    link.textContent = "Kategori & Event";
    document.getElementById("adminSidebar")?.append(link);
  }

  document.addEventListener("talenta:admin-ready", (event) => {
    session = event.detail.session;
    addSwitchButton();
    if (event.detail.interactive || !TalentaAdminAuth.currentEvent() || new URLSearchParams(location.search).has("categories")) show();
  });
  document.addEventListener("talenta:show-portals", show);
  window.TalentaPortalDashboard = Object.freeze({ show });
})();

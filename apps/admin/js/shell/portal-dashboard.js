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
      .event-dashboard__main{width:min(1080px,calc(100% - 40px));margin:auto;padding:56px 0 80px}.event-dashboard__intro{margin-bottom:28px}.event-dashboard__intro-heading{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:24px}.event-dashboard__intro-title{min-width:0}.event-dashboard__intro-actions{display:flex;justify-content:flex-end;gap:10px}.event-dashboard__intro-actions button{flex:none;white-space:nowrap}.event-dashboard__eyebrow{margin:0 0 8px;color:#1e5a9d;font-size:.8rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase}.event-dashboard h1{margin:0;overflow-wrap:anywhere;font-size:clamp(2rem,5vw,3.1rem)}.event-dashboard__description{max-width:650px;margin:12px 0 0;color:#5b6d83;line-height:1.6}.event-dashboard__status{margin:0 0 18px;color:#17623b}.event-dashboard__status:empty{display:none}.event-dashboard__status--error{color:#a1263a}.event-dashboard__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.event-dashboard__archive-grid{display:flex;flex-direction:column;gap:20px}.event-card--active,.event-dashboard__section-title,.event-dashboard__archive-grid{grid-column:1/-1}.event-dashboard__section-title{margin:14px 0 -6px;font-size:1.15rem;color:#173b65}
      .event-card{display:flex;flex-direction:column;padding:22px 24px;border:1px solid #dbe3ed;border-radius:18px;background:#fff;box-shadow:0 6px 20px rgba(19,49,83,.05);transition:border-color .2s,box-shadow .2s}.event-card:hover{border-color:#b5ceeb;box-shadow:0 10px 28px rgba(19,49,83,.09)}.event-card--active{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;min-height:0;border-color:#9dbde0;background:linear-gradient(135deg,#fff,#edf6ff)}.event-card--compact{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;min-height:0;padding:18px}.event-card__heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.event-card h2{margin:0;font-size:1.35rem;font-weight:700;color:#0f2c4d;line-height:1.3}.event-card__content{min-width:0}.event-card__content h2{margin-bottom:6px}.event-card__side{display:flex;align-items:center;justify-content:flex-end;gap:18px}.event-card__badges{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px}.event-card__badge{flex:none;padding:5px 9px;border-radius:999px;background:#eef2f7;color:#53657b;font-size:.73rem;font-weight:800}.event-card__badge--published,.event-card__badge--active,.event-card__badge--clean{background:#daf5e5;color:#126238}.event-card__badge--unpublished,.event-card__badge--archive{background:#edf1f6;color:#596c82}.event-card__badge--draft,.event-card__badge--preparation{background:#fff0cc;color:#815b00}.event-card__period{margin:0;color:#173b65;font-weight:800}.event-card__domain{margin:0 0 18px;color:#53657b;font-size:.9rem;font-weight:400}.event-card--category .event-card__domain{margin:0}.event-card__domain a{color:#1e5a9d;text-decoration:none;font-weight:600}.event-card__domain a:hover{text-decoration:underline}.event-card__note{margin:6px 0 0;color:#738499;font-size:.82rem}.event-card__buttons{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:auto;padding-top:4px}.event-card--active .event-card__buttons,.event-card--compact .event-card__buttons{align-self:stretch;flex-wrap:nowrap;margin:0;padding:0}.event-card--active .event-card__buttons,.event-card--compact .event-card__buttons{align-self:auto}.event-card__buttons>.event-dashboard__primary{flex:1 1 120px}.event-card--active .event-card__buttons>.event-dashboard__primary,.event-card--compact .event-card__buttons>.event-dashboard__primary{flex:none;min-width:145px}.event-card__menu{position:relative;flex:none}.event-card__menu summary{display:grid;place-items:center;min-width:20px;min-height:20px;padding:10px 12px;border:1px solid #b9cae0;border-radius:10px;background:#fff;cursor:pointer;font-weight:800;line-height:1;list-style:none}.event-card__menu summary::-webkit-details-marker{display:none}.event-card__menu[open] div{display:grid;position:absolute;right:0;z-index:2;min-width:170px;padding:8px;border:1px solid #dbe3ed;border-radius:10px;background:#fff;box-shadow:0 12px 30px rgba(19,49,83,.16)}.event-card__menu button{padding:9px;border:0;background:#fff;text-align:left;cursor:pointer}.event-card__menu .event-card__delete{color:#9d2940}.event-dashboard__empty{grid-column:1/-1;padding:44px;border:1px dashed #aebfd1;border-radius:18px;background:#fff;text-align:center;color:#5b6d83}
      .event-dialog{width:min(500px,calc(100% - 32px));max-height:calc(100vh - 48px);padding:0;border:0;border-radius:20px;box-shadow:0 25px 80px rgba(5,25,49,.3)}.event-dialog[open]{position:fixed;inset:50% auto auto 50%;transform:translate(-50%,-50%);overflow:auto}.event-dialog::backdrop{background:rgba(4,20,40,.66)}.event-dialog form{padding:30px}.event-dialog h2{margin:0}.event-dialog__help{margin:8px 0 22px;color:#61738a}.event-dialog label{display:block;margin:14px 0 6px;font-weight:700}.event-dialog input{box-sizing:border-box;width:100%;padding:12px 14px;border:1px solid #c3cfdd;border-radius:9px;font:inherit}.event-dialog input[readonly]{background:#f2f5f8;color:#53657b}.event-dialog__check{display:flex!important;align-items:center;gap:8px}.event-dialog__check input{width:18px}.event-dialog__batch[hidden]{display:none}.event-dialog__actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}.event-dialog__error{min-height:1.4em;margin:12px 0 0;color:#a1263a}.event-switch{box-sizing:border-box;display:block;margin:18px 16px 0;width:calc(100% - 32px);padding:10px;border:1px solid rgba(255,255,255,.25);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;font-weight:700;text-align:center;text-decoration:none;cursor:pointer}
      @media(max-width:700px){.event-dashboard__header{align-items:flex-start;flex-direction:column}.event-dashboard__grid{grid-template-columns:1fr}.event-dashboard__email{display:none}.event-card,.event-card--active,.event-card--compact{display:flex;align-items:stretch;gap:0}.event-card__heading,.event-card--active .event-card__heading{align-items:flex-start;flex-direction:column}.event-card__side{align-items:flex-start;flex-direction:column;gap:10px;margin-top:16px}.event-card__badges{justify-content:flex-start}.event-card__buttons,.event-card--active .event-card__buttons,.event-card--compact .event-card__buttons{align-self:auto;align-items:stretch;flex-direction:row;margin:16px 0 0}.event-card__side .event-card__buttons{margin:0}.event-card__buttons>.event-dashboard__primary,.event-card--active .event-card__buttons>.event-dashboard__primary{flex:1 1 auto}.event-card__menu{width:auto}}@media(max-width:560px){.event-dashboard__intro-heading{grid-template-columns:1fr;align-items:start}.event-dashboard__intro-actions{justify-content:flex-start}}
    `;
    document.head.append(style);
    root = document.createElement("section");
    root.className = "event-dashboard";
    root.hidden = true;
    root.innerHTML = `
      <header class="event-dashboard__header"><div class="event-dashboard__brand"><span class="event-dashboard__mark">TP</span><span>TalentaPanel</span></div><div class="event-dashboard__actions"><span class="event-dashboard__email" id="eventUserEmail"></span><button class="event-dashboard__logout" id="eventLogout" type="button">Keluar</button></div></header>
      <main class="event-dashboard__main"><div class="event-dashboard__intro"><div class="event-dashboard__intro-heading"><div class="event-dashboard__intro-title"><p class="event-dashboard__eyebrow" id="dashboardEyebrow">Workspace Admin</p><h1 id="dashboardTitle">Kategori Lomba</h1></div><div class="event-dashboard__intro-actions"><button class="event-dashboard__secondary" id="backToCategories" type="button" hidden>← Kembali ke Kategori</button><button class="event-dashboard__primary" id="dashboardCreate" type="button"></button></div></div><p class="event-dashboard__description" id="dashboardDescription"></p></div><p class="event-dashboard__status" id="eventStatus" role="status" aria-live="polite"></p><div class="event-dashboard__grid" id="eventGrid"></div></main>
      <dialog class="event-dialog" id="categoryDialog"><form id="categoryForm"><h2>Buat Kategori Lomba</h2><p class="event-dialog__help">Satu kategori memiliki satu subdomain tetap untuk seluruh periode.</p><label for="categoryName">Nama kategori</label><input id="categoryName" name="name" required maxlength="160"><label for="categorySlug">Slug subdomain</label><input id="categorySlug" name="slug" required maxlength="100" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="contoh: octal"><p class="event-dialog__error" id="categoryError"></p><div class="event-dialog__actions"><button class="event-dashboard__secondary" type="button" data-close="categoryDialog">Batal</button><button class="event-dashboard__primary" type="submit">Buat Kategori</button></div></form></dialog>
      <dialog class="event-dialog" id="eventDialog"><form id="eventForm"><h2>Buat Event/Periode</h2><p class="event-dialog__help">Nama ajang mengikuti Kategori. Event baru disiapkan sebagai draf sampai dipublikasikan dan diaktifkan.</p><label for="eventCategoryName">Nama ajang</label><input id="eventCategoryName" readonly><label for="eventPeriodYear">Tahun periode</label><input id="eventPeriodYear" name="periodYear" type="number" min="2000" max="2100" required><label class="event-dialog__check"><input id="eventBatchEnabled" name="batchEnabled" type="checkbox"> Ada beberapa penyelenggaraan pada tahun yang sama</label><div class="event-dialog__batch" id="eventBatchFields" hidden><label for="eventBatchLabel">Istilah publik</label><input id="eventBatchLabel" name="batchLabel" maxlength="40" value="Gelombang"><label for="eventBatchNumber">Nomor otomatis</label><input id="eventBatchNumber" readonly><label for="eventBatchNote">Catatan internal opsional</label><input id="eventBatchNote" name="batchNote" maxlength="240" placeholder="Contoh: Gelombang susulan"></div><p class="event-dialog__error" id="newEventError"></p><div class="event-dialog__actions"><button class="event-dashboard__secondary" type="button" data-close="eventDialog">Batal</button><button class="event-dashboard__primary" type="submit">Buat Event</button></div></form></dialog>`;
    document.body.append(root);
    document.getElementById("eventLogout").onclick = TalentaAdminAuth.logout;
    document.getElementById("backToCategories").onclick = showCategories;
    document.getElementById("dashboardCreate").onclick = openCreate;
    document.getElementById("categoryForm").onsubmit = createCategory;
    document.getElementById("eventForm").onsubmit = createEvent;
    document.getElementById("eventBatchEnabled").onchange = syncBatchFields;
    document.getElementById("eventPeriodYear").oninput = syncBatchFields;
    root
      .querySelectorAll("[data-close]")
      .forEach(
        (button) =>
          (button.onclick = () =>
            document.getElementById(button.dataset.close).close()),
      );
    return root;
  }

  const setStatus = (message, error = false) => {
    const node = document.getElementById("eventStatus");
    node.textContent = message;
    node.classList.toggle("event-dashboard__status--error", error);
  };
  const canManage = (item) => ["owner", "admin"].includes(item.role);
  const badge = (text, state) =>
    `<span class="event-card__badge event-card__badge--${state}">${text}</span>`;

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
      grid.innerHTML =
        '<div class="event-dashboard__empty">Belum ada kategori lomba.</div>';
      return;
    }
    session.categories.forEach((category) =>
      grid.append(categoryCard(category)),
    );
  }

  function categoryCard(category) {
    const card = document.createElement("article");
    card.className = "event-card";
    const state = category.publicationStatus || "draft";
    card.innerHTML = `<div class="event-card__heading"><h2></h2>${badge(state === "published" ? "Dipublikasikan" : "Nonaktif", state === "published" ? "published" : "unpublished")}</div><p class="event-card__domain"><a></a></p><div class="event-card__buttons"></div>`;
    card.querySelector("h2").textContent = category.name;
    const domainLink = card.querySelector(".event-card__domain a");
    const domainText =
      category.hostname || `${category.slug}.${TalentaConfig.publicBaseDomain}`;
    domainLink.textContent = domainText;
    domainLink.href =
      location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? `http://${location.host}/?site=${encodeURIComponent(category.slug)}`
        : category.hostname
          ? `https://${category.hostname}`
          : `https://${category.slug}.${TalentaConfig.publicBaseDomain}`;
    domainLink.target = "_blank";
    const buttons = card.querySelector(".event-card__buttons");
    buttons.append(
      action("Kelola Event", "event-dashboard__primary", () =>
        openCategory(category),
      ),
      action(
        state === "published" ? "Nonaktifkan" : "Publikasikan",
        "event-dashboard__secondary",
        () => toggleCategory(category),
      ),
      action("Hapus", "event-dashboard__secondary event-card__delete", () =>
        deleteCategory(category),
      ),
    );
    return card;
  }

  async function openCategory(category) {
    selectedCategory = category;
    TalentaAdminAuth.selectCategory(category);
    setStatus("Memuat event...");
    try {
      events = (
        await TalentaApi.request(`/admin/categories/${category.id}/events`)
      ).data;
      renderEvents();
      setStatus("");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  function renderEvents() {
    document.getElementById("dashboardEyebrow").textContent =
      selectedCategory.slug;
    document.getElementById("dashboardTitle").textContent =
      selectedCategory.name;
    document.getElementById("dashboardDescription").textContent =
      "Kelola periode aktif, persiapan Event berikutnya, dan arsip ajang dalam satu tempat.";
    document.getElementById("backToCategories").hidden = false;
    const create = document.getElementById("dashboardCreate");
    create.textContent = "+ Buat Event";
    create.disabled = !canManage(selectedCategory);
    const grid = document.getElementById("eventGrid");
    grid.replaceChildren();
    if (!events.length) {
      grid.innerHTML =
        '<div class="event-dashboard__empty">Belum ada Event/Periode dalam kategori ini.</div>';
      return;
    }
    const active = events.find((event) => event.isActive);
    if (active) grid.append(eventCard(active, true));
    const other = events.filter((event) => event !== active);
    if (other.length) {
      const title = document.createElement("h2");
      title.className = "event-dashboard__section-title";
      title.textContent = "Periode sebelumnya & persiapan";
      const archiveGrid = document.createElement("div");
      archiveGrid.className = "event-dashboard__archive-grid";
      other.forEach((event) => archiveGrid.append(eventCard(event, false)));
      grid.append(title, archiveGrid);
    }
    const pendingStatus = events.filter(
      (event) => !event.publicationStatusLoaded,
    );
    if (pendingStatus.length)
      void Promise.all(
        pendingStatus.map(async (event) => {
          try {
            const status = (
              await TalentaApi.request(
                `/admin/events/${event.id}/publication-status`,
              )
            ).data;
            Object.assign(event, status);
          } catch (_error) {
            event.publicationState = "unknown";
          } finally {
            event.publicationStatusLoaded = true;
          }
        }),
      ).then(() => {
        if (selectedCategory) renderEvents();
      });
  }

  function periodLabel(event) {
    if (!event.periodYear) return "Periode belum ditetapkan";
    return `Periode ${event.periodYear}${event.batchNumber ? ` · ${event.batchLabel || "Gelombang"} ${event.batchNumber}` : ""}`;
  }

  function eventCard(event, prominent) {
    const card = document.createElement("article");
    card.className = `event-card ${prominent ? "event-card--active" : "event-card--compact"}`;
    const operational = event.isActive
      ? ["Aktif", "active"]
      : event.isArchive
        ? ["Arsip", "archive"]
        : ["Persiapan", "preparation"];
    const workspace = event.draftChanged
      ? ["Ada draf", "draft"]
      : ["Draf bersih", "clean"];
    const publication = event.publishedVersion
      ? [`Publikasi v${event.publishedVersion}`, "published"]
      : ["Belum dipublikasikan", "unpublished"];
    card.innerHTML = `<div class="event-card__content"><h2></h2><p class="event-card__period"></p><p class="event-card__note"></p></div><div class="event-card__side"><div class="event-card__badges">${badge(...operational)}${badge(...workspace)}${badge(...publication)}</div><div class="event-card__buttons"></div></div>`;
    card.querySelector("h2").textContent = event.name;
    card.querySelector(".event-card__period").textContent = periodLabel(event);
    const note = card.querySelector(".event-card__note");
    note.textContent = event.batchNote || "";
    note.hidden = !event.batchNote;
    const buttons = card.querySelector(".event-card__buttons");
    buttons.append(
      action("Kelola Event", "event-dashboard__primary", () =>
        TalentaAdminAuth.selectEvent(event, selectedCategory),
      ),
    );
    const menu = document.createElement("details");
    menu.className = "event-card__menu";
    menu.innerHTML =
      '<summary aria-label="Tindakan Event lain">•••</summary><div></div>';
    const menuActions = menu.querySelector("div");
    if (!event.isActive) {
      const activate = action("Jadikan Aktif", "", () => activateEvent(event));
      activate.disabled =
        event.needsPeriodConfirmation ||
        (selectedCategory.publicationStatus === "published" &&
          !event.publishedVersion);
      activate.title = event.needsPeriodConfirmation
        ? "Tetapkan identitas periode terlebih dahulu"
        : activate.disabled
          ? "Publikasikan isi Event terlebih dahulu"
          : "";
      menuActions.append(activate);
    }
    menuActions.append(
      action("Hapus Event", "event-card__delete", () => deleteEvent(event)),
    );
    buttons.append(menu);
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
    if (selectedCategory) {
      document.getElementById("eventCategoryName").value =
        selectedCategory.name;
      document.getElementById("eventPeriodYear").value =
        new Date().getFullYear();
      syncBatchFields();
    }
    document.getElementById(id).showModal();
  }

  function syncBatchFields() {
    const enabled = document.getElementById("eventBatchEnabled").checked;
    const year = Number(document.getElementById("eventPeriodYear").value);
    const used = events
      .filter((event) => event.periodYear === year)
      .map((event) => event.batchNumber || (event.periodYear ? 1 : 0));
    document.getElementById("eventBatchFields").hidden = !enabled;
    document.getElementById("eventBatchNumber").value = String(
      Math.max(0, ...used) + 1,
    );
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
    await submit(
      event.currentTarget,
      async (body) => {
        await TalentaApi.request("/admin/categories", { method: "POST", body });
        await refreshSession();
      },
      "categoryDialog",
      "categoryError",
    );
  }

  async function createEvent(event) {
    event.preventDefault();
    await submit(
      event.currentTarget,
      async (formBody) => {
        const body = {
          periodYear: Number(formBody.periodYear),
          batchEnabled: formBody.batchEnabled === "on",
          batchLabel:
            formBody.batchEnabled === "on" ? formBody.batchLabel : undefined,
          batchNote: formBody.batchNote || undefined,
        };
        try {
          await TalentaApi.request(
            `/admin/categories/${selectedCategory.id}/events`,
            { method: "POST", body },
          );
        } catch (error) {
          if (
            error.status !== 409 ||
            error.details?.code !== "EVENT_YEAR_REQUIRES_BATCH_CONVERSION"
          )
            throw error;
          const existing = error.details.existingEvent;
          const confirmed = await adminConfirm({
            title: `Jadikan ${body.periodYear} beberapa gelombang?`,
            message: `${existing?.name || selectedCategory.name} ${body.periodYear} menjadi ${body.batchLabel || "Gelombang"} 1 dan Event baru menjadi ${body.batchLabel || "Gelombang"} 2. Nama publik Event lama baru berubah saat Event baru diaktifkan.`,
            confirmLabel: "Ya, buat gelombang 2",
            icon: "git-branch",
          });
          if (!confirmed) return;
          await TalentaApi.request(
            `/admin/categories/${selectedCategory.id}/events`,
            {
              method: "POST",
              body: {
                ...body,
                batchEnabled: true,
                batchLabel: body.batchLabel || "Gelombang",
                confirmBatchConversion: true,
              },
            },
          );
        }
        await openCategory(selectedCategory);
      },
      "eventDialog",
      "newEventError",
    );
  }

  async function toggleCategory(category) {
    const published = category.publicationStatus === "published";
    if (
      published &&
      !(await adminConfirm({
        title: "Nonaktifkan kategori?",
        message:
          "Subdomain tidak dapat diakses sampai kategori dipublikasikan kembali.",
        confirmLabel: "Nonaktifkan",
        variant: "danger",
        icon: "eye-off",
      }))
    )
      return;
    try {
      await TalentaApi.request(
        `/admin/categories/${category.id}/${published ? "unpublish" : "publish"}`,
        { method: "POST" },
      );
      await refreshSession();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function deleteCategory(category) {
    if (
      !(await adminConfirm({
        title: "Hapus kategori?",
        message: `${category.name} dan seluruh Event di dalamnya akan disembunyikan.`,
        confirmLabel: "Hapus kategori",
        variant: "danger",
        icon: "trash-2",
      }))
    )
      return;
    try {
      await TalentaApi.request(`/admin/categories/${category.id}`, {
        method: "DELETE",
      });
      await refreshSession();
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function activateEvent(event) {
    if (
      !(await adminConfirm({
        title: "Aktifkan Event?",
        message: `${event.name} menjadi Event aktif. Jika kategori sudah published, pengunjung langsung melihat snapshot publik Event ini; Event aktif sebelumnya otomatis menjadi arsip.`,
        confirmLabel: "Jadikan aktif",
        icon: "check-circle",
      }))
    )
      return;
    try {
      await TalentaApi.request(`/admin/events/${event.id}/activate`, {
        method: "POST",
      });
      await openCategory(selectedCategory);
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function deleteEvent(event) {
    if (
      !(await adminConfirm({
        title: "Hapus Event?",
        message: `${event.name} akan disembunyikan dari kategori dan arsip.`,
        confirmLabel: "Hapus Event",
        variant: "danger",
        icon: "trash-2",
      }))
    )
      return;
    try {
      await TalentaApi.request(`/admin/events/${event.id}`, {
        method: "DELETE",
      });
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
    if (
      event.detail.interactive ||
      !TalentaAdminAuth.currentEvent() ||
      new URLSearchParams(location.search).has("categories")
    )
      show();
  });
  document.addEventListener("talenta:show-portals", show);
  window.TalentaPortalDashboard = Object.freeze({ show });
})();

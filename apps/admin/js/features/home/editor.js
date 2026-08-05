const HOME_KEY = HOME_STATE_KEY;
const THEME_DEFAULTS = {
  primaryColor: "#1e4b8c",
  accentColor: "#ffffff",
};
const ICONS = [
  "arrow-right",
  "download",
  "external-link",
  "user-plus",
  "file-text",
  "send",
  "clipboard-list",
  "monitor",
  "laptop",
  "trophy",
  "calendar-days",
  "clock",
  "flag",
  "book-open",
];
const heroDefaults = {
  active: true,
  eyebrow: "PENDAFTARAN DIBUKA",
  title: "Olimpiade Sains Nusantara 2026",
  description:
    "Ajang talenta akademik bergengsi untuk siswa SD, SMP, dan SMA se-Indonesia. Asah kemampuan, raih prestasi, dan jadilah yang terbaik di tingkat nasional.",
  image: "../../../template/assets/images/garuda.png",
  imageAlt: "Garuda Logo",
  badges: [
    { label: "SD / MI", active: true },
    { label: "SMP / MTs", active: true },
    { label: "SMA / MA / SMK", active: true },
  ],
  buttons: [
    iconItem(
      "Daftar Sekarang",
      "https://infokhs.umm.ac.id/",
      "arrow-right",
      "primary",
      true,
    ),
    iconItem("Unduh Juknis", "unduh.html", "download", "outline", false),
  ],
};
const scheduleDefaults = {
  active: true,
  eyebrow: "Jadwal Penting",
  title: "Catat Tanggal Pentingnya",
  description:
    "Pastikan kamu tidak melewatkan setiap tahapan penting dalam ajang talenta ini.",
  cards: [
    scheduleItem("Pendaftaran", "15 Jul — 30 Agt 2026", "clipboard-list"),
    scheduleItem("Technical Meeting", "05 Sep 2026", "monitor"),
    scheduleItem("Simulasi CBT", "08 Sep 2026", "laptop"),
    scheduleItem("Pelaksanaan", "12 — 13 Sep 2026", "trophy"),
  ],
};
function iconItem(label, url, icon, style, newTab) {
  return {
    label,
    url,
    style,
    newTab,
    active: true,
    iconMode: "library",
    libraryIcon: icon,
    uploadedIcon: "",
    iconAlt: "",
  };
}
function scheduleItem(label, date, icon) {
  return {
    label,
    date,
    description: "",
    active: true,
    iconMode: "library",
    libraryIcon: icon,
    uploadedIcon: "",
    iconAlt: "",
  };
}
function loadState() {
  const old = getHomeAdminState();
  const hero = old.hero;
  if (
    !hero.image ||
    /(?:packages\/shared\/images|template\/assets\/images)\/garuda\.png$/.test(
      hero.image,
    )
  ) {
    hero.image = heroDefaults.image;
  }
  hero.buttons = (hero.buttons || heroDefaults.buttons).map((b, i) => ({
    ...(heroDefaults.buttons[i] || heroDefaults.buttons[0]),
    ...b,
    libraryIcon: b.libraryIcon || b.icon || "arrow-right",
  }));
  return {
    ...old,
    hero: { ...structuredClone(heroDefaults), ...hero },
    schedule: { ...structuredClone(scheduleDefaults), ...(old.schedule || {}) },
  };
}
let state = loadState();
async function hydrateHome() {
  try {
    const loaded = await TalentaHomeApi.load();
    const fresh = loadState();
    Object.keys(state).forEach(type => {
      if (typeof state[type] === 'object' && state[type] !== null) {
        Object.assign(state[type], fresh[type] || {}, loaded[type] || {});
      }
    });
    sync();
    renderAll();
    document.dispatchEvent(
      new CustomEvent("talenta:home-hydrated", { detail: state }),
    );
  } catch (error) {
    toast(error.message, true);
  }
}
let heroPreviewResizeObserver;
const scaledPreviewConfigs = new Map();
document.addEventListener("DOMContentLoaded", () => {
  const heroEditor = document.getElementById("hero-editor");
  const winnerEditor = document.getElementById("winner-highlight-editor");
  if (heroEditor && winnerEditor)
    heroEditor.insertAdjacentElement("afterend", winnerEditor);
  bind();
  sync();
  renderAll();
  setupHeroPreviewSizing();
  setupScaledPreview(
    "schedulePreviewFrame",
    "schedulePreview",
    "schedulePreview",
  );
  subscribeGlobalSettings(() => {
    renderHero();
    renderSchedule();
    renderPricing();
    renderBenefit();
    renderWinner();
    renderPartners();
  });
  lucide.createIcons();
  void hydrateHome();
});
function bind() {
  document.getElementById("sidebarToggle").onclick = () =>
    document
      .getElementById("adminSidebar")
      .classList.toggle("admin-sidebar--open");
  bindText(
    ["heroEyebrow", "heroTitle", "heroDescription", "heroImageAlt"],
    state.hero,
    renderHero,
  );
  bindText(
    ["scheduleEyebrow", "scheduleTitle", "scheduleDescription"],
    state.schedule,
    renderSchedule,
  );
  bindToggle("heroActive", state.hero, renderHero);
  bindToggle("scheduleActive", state.schedule, renderSchedule);
  bindImage("heroImage", 2, (data) => {
    state.hero.image = data;
    sync();
    renderHero();
  });
  const delBtn = document.getElementById("heroImageDelete");
  if (delBtn) {
    delBtn.onclick = () => {
      state.hero.image = "";
      sync();
      renderHero();
    };
  }
  document.getElementById("addBadge").onclick = () => {
    state.hero.badges.push({ label: "Badge baru", active: true });
    renderBadges();
    renderHero();
  };
  document.getElementById("addScheduleCard").onclick = () => {
    state.schedule.cards.push(
      scheduleItem("Tahapan baru", "Tanggal belum diatur", "calendar-days"),
    );
    renderScheduleCards();
    renderSchedule();
  };
  const saveHome = async () => {
    document.dispatchEvent(
      new CustomEvent("talenta:home-before-save", { detail: state }),
    );
    try {
      await TalentaHomeApi.save(state);
      const saved = saveHomeAdminState(state);
      Object.assign(state.winnerHighlight, saved.winnerHighlight);
      toast("Pengaturan Beranda tersimpan ke database.");
    } catch (error) {
      toast(error.message, true);
    }
  };
  document.getElementById("homeEditorForm").onsubmit = async (e) => {
    e.preventDefault();
    const submit = e.submitter;
    if (submit) submit.disabled = true;
    await saveHome();
    if (submit) submit.disabled = false;
  };
  window.TalentaHomeEditor = Object.freeze({ save: saveHome });
  document.getElementById("resetHome").onclick = async () => {
    const confirmed = await adminConfirm({
      title: "Reset seluruh Beranda?",
      message:
        "Hero, Highlight Pemenang, Jadwal, Biaya, Benefit, dan Mitra akan dikembalikan ke template awal.",
      confirmLabel: "Ya, reset Beranda",
      variant: "danger",
      icon: "rotate-ccw",
    });
    if (!confirmed) return;
    const baseline = resetHomeAdminState();
    try {
      if (window.TalentaHomeApi) await window.TalentaHomeApi.save(baseline);
    } catch (e) {
      console.warn("Gagal mereset pengaturan di database", e);
    }
    location.reload();
  };
  bindPreview("[data-preview]", "homePreviewFrame", "home-preview-frame");
  bindPreview(
    "[data-schedule-preview]",
    "schedulePreviewFrame",
    "schedule-preview-frame",
    "schedulePreview",
  );

  window.addEventListener("storage", (e) => {
    if (e.key === "talenta_home_editor_v1") {
      toast("Peringatan: Data Beranda baru saja diubah di tab atau perangkat lain. Harap muat ulang halaman untuk menghindari konflik timpa data.", true);
    }
  });
}
function bindText(ids, obj, render) {
  ids.forEach(
    (id) =>
      (document.getElementById(id).oninput = (e) => {
        obj[
          id
            .replace(/^(hero|schedule|winner)/, "")
            .replace(/^./, (c) => c.toLowerCase())
        ] = e.target.value;
        render();
      }),
  );
}
function bindToggle(id, obj, render) {
  document.getElementById(id).onchange = (e) => {
    obj.active = e.target.checked;
    e.target.parentElement.querySelector("em").textContent = e.target.checked
      ? "Aktif"
      : "Nonaktif";
    render();
  };
}
function bindImage(id, maxMb, done) {
  document.getElementById(id).onchange = async (e) => {
    const input = e.target;
    const file = input.files[0];
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast(`Maksimal ukuran gambar adalah ${maxMb}MB`, true);
      return;
    }
    input.disabled = true;
    try {
      const asset = await TalentaMedia.upload(file);
      done(TalentaMedia.url(asset));
      toast("Gambar berhasil diunggah");
    } catch (error) {
      toast(error.message || "Gagal mengunggah gambar", true);
    } finally {
      input.disabled = false;
    }
  };
}
function bindPreview(selector, frameId, prefix, dataName = "preview") {
  document.querySelectorAll(selector).forEach(
    (b) =>
      (b.onclick = () => {
        document
          .querySelectorAll(selector)
          .forEach((x) => x.classList.remove("preview-switch__btn--active"));
        b.classList.add("preview-switch__btn--active");
        const f = document.getElementById(frameId),
          mode = b.dataset[dataName];
        f.classList.remove(
          prefix + "--desktop",
          prefix + "--tablet",
          prefix + "--mobile",
        );
        f.classList.add(prefix + "--" + mode);
        if (frameId === "homePreviewFrame") {
          f.dataset.previewMode = mode;
          requestAnimationFrame(fitHeroPreview);
        } else if (scaledPreviewConfigs.has(frameId)) {
          f.dataset.previewMode = mode;
          requestAnimationFrame(() => fitScaledPreview(frameId));
        }
      }),
  );
}
function setupScaledPreview(frameId, rootId) {
  const frame = document.getElementById(frameId);
  const root = document.getElementById(rootId);
  if (!frame || !root) return;
  const oldConfig = scaledPreviewConfigs.get(frameId);
  oldConfig?.observer.disconnect();
  const observer = new ResizeObserver(() => fitScaledPreview(frameId));
  const config = {
    rootId,
    designWidths: { desktop: 1440, tablet: 753, mobile: 375 },
    observer,
  };
  scaledPreviewConfigs.set(frameId, config);
  frame.dataset.previewMode = frame.dataset.previewMode || "desktop";
  observer.observe(frame);
  observer.observe(root);
  requestAnimationFrame(() => fitScaledPreview(frameId));
}
function fitScaledPreview(frameId) {
  const frame = document.getElementById(frameId);
  const config = scaledPreviewConfigs.get(frameId);
  const root = config && document.getElementById(config.rootId);
  if (!frame || !root || !config) return;
  const mode = frame.dataset.previewMode || "desktop";
  const designWidth = config.designWidths[mode] || config.designWidths.desktop;
  const frameStyle = getComputedStyle(frame);
  const horizontalPadding =
    parseFloat(frameStyle.paddingLeft) + parseFloat(frameStyle.paddingRight);
  const verticalPadding =
    parseFloat(frameStyle.paddingTop) + parseFloat(frameStyle.paddingBottom);
  const availableWidth = Math.max(1, frame.clientWidth - horizontalPadding);
  const scale = Math.min(1, availableWidth / designWidth);
  root.style.setProperty("--public-preview-scale", String(scale));
  frame.style.height = `${Math.ceil(root.offsetHeight * scale + verticalPadding)}px`;
}
function setupHeroPreviewSizing() {
  const frame = document.getElementById("homePreviewFrame");
  frame.dataset.previewMode = "desktop";
  heroPreviewResizeObserver?.disconnect();
  heroPreviewResizeObserver = new ResizeObserver(() => fitHeroPreview());
  heroPreviewResizeObserver.observe(frame);
  heroPreviewResizeObserver.observe(document.getElementById("homePreview"));
  requestAnimationFrame(fitHeroPreview);
}
function fitHeroPreview() {
  const frame = document.getElementById("homePreviewFrame");
  const root = document.getElementById("homePreview");
  if (!frame || !root) return;
  const designWidths = { desktop: 1440, tablet: 753, mobile: 375 };
  const mode = frame.dataset.previewMode || "desktop";
  const designWidth = designWidths[mode] || designWidths.desktop;
  const frameStyle = getComputedStyle(frame);
  const horizontalPadding =
    parseFloat(frameStyle.paddingLeft) + parseFloat(frameStyle.paddingRight);
  const verticalPadding =
    parseFloat(frameStyle.paddingTop) + parseFloat(frameStyle.paddingBottom);
  const availableWidth = Math.max(1, frame.clientWidth - horizontalPadding);
  const scale = Math.min(1, availableWidth / designWidth);
  root.style.setProperty("--hero-preview-scale", String(scale));
  frame.style.height = `${Math.ceil(root.offsetHeight * scale + verticalPadding)}px`;
}
function sync() {
  const h = state.hero,
    s = state.schedule;
  Object.entries({
    heroActive: h.active,
    heroEyebrow: h.eyebrow,
    heroTitle: h.title,
    heroDescription: h.description,
    heroImageAlt: h.imageAlt,
    scheduleActive: s.active,
    scheduleEyebrow: s.eyebrow,
    scheduleTitle: s.title,
    scheduleDescription: s.description,
  }).forEach(([id, v]) => {
    const el = document.getElementById(id);
    if (el && el.type === "checkbox") el.checked = v;
    else if (el) el.value = v;
  });
  
  const preview = document.getElementById("heroImagePreview");
  const delBtn = document.getElementById("heroImageDelete");
  if (preview) {
    if (h.image) {
      preview.innerHTML = `<img src="${esc(h.image)}" alt="Pratinjau gambar utama">`;
    } else {
      preview.innerHTML = `<i data-lucide="image" style="width: 24px; height: 24px; color: var(--c-text-light);"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }
  if (delBtn) delBtn.hidden = !h.image;
}
function renderAll() {
  renderBadges();
  renderButtons();
  renderScheduleCards();
  renderSummaries();
  renderHero();
  renderSchedule();
}
function renderBadges() {
  const root = document.getElementById("badgeEditor");
  root.innerHTML = "";
  state.hero.badges.forEach((item, i) => {
    const el = document.createElement("div");
    el.className = "repeat-row";
    el.innerHTML = `<span class="repeat-row__grip"><i data-lucide="grip-vertical"></i></span><input class="form-input" value="${esc(item.label)}"><label class="admin-switch"><input type="checkbox" ${item.active ? "checked" : ""}><span></span><em>${item.active ? "Aktif" : "Nonaktif"}</em></label><button type="button" class="repeat-row__delete"><i data-lucide="trash-2"></i></button>`;
    el.querySelector(".form-input").oninput = (e) => {
      item.label = e.target.value;
      renderHero();
    };
    wireItemToggle(el, item, renderHero);
    el.querySelector("button").onclick = () =>
      removeItem(state.hero.badges, i, "badge", renderBadges, renderHero);
    root.appendChild(el);
  });
  icons();
}
function iconControl(item, uid) {
  return `<div class="icon-control"><div class="icon-control__preview" id="preview-${uid}">${iconMarkup(item)}</div><div class="icon-control__fields"><label>Sumber ikon</label><select class="form-input" data-icon-mode><option value="library" ${item.iconMode === "library" ? "selected" : ""}>Pustaka ikon</option><option value="upload" ${item.iconMode === "upload" ? "selected" : ""}>Upload sendiri</option></select><select class="form-input" data-library-icon>${ICONS.map((x) => `<option ${x === item.libraryIcon ? "selected" : ""}>${x}</option>`).join("")}</select><div class="icon-upload-row"><label class="btn btn--outline btn--sm">Upload ikon<input type="file" data-icon-upload accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>${item.uploadedIcon ? '<button type="button" class="icon-remove" data-icon-remove>Hapus upload</button>' : ""}</div><input class="form-input" data-icon-alt placeholder="Alt text ikon" value="${esc(item.iconAlt || "")}"></div></div>`;
}
function wireIcon(el, item, render) {
  const mode = el.querySelector("[data-icon-mode]"),
    library = el.querySelector("[data-library-icon]");
  const refresh = () => {
    el.querySelector(".icon-control__preview").innerHTML = iconMarkup(item);
    library.hidden = item.iconMode !== "library";
    render();
    icons();
  };
  mode.onchange = () => {
    item.iconMode = mode.value;
    refresh();
  };
  library.onchange = () => {
    item.libraryIcon = library.value;
    refresh();
  };
  el.querySelector("[data-icon-upload]").onchange = async (e) => {
    const input = e.target;
    if (!input.files[0]) return;
    input.disabled = true;
    try {
      const asset = await TalentaMedia.upload(input.files[0], {
        altText: item.iconAlt || "Ikon kustom Beranda",
      });
      item.uploadedIconAssetId = asset.assetId;
      item.uploadedIcon = TalentaMedia.url(asset);
      item.iconMode = "upload";
      mode.value = "upload";
      refresh();
      toast("Ikon berhasil diunggah.");
    } catch (error) {
      toast(error.message, true);
    } finally {
      input.disabled = false;
    }
  };
  el.querySelector("[data-icon-alt]").oninput = (e) =>
    (item.iconAlt = e.target.value);
  const remove = el.querySelector("[data-icon-remove]");
  if (remove)
    remove.onclick = () => {
      item.uploadedIcon = "";
      item.iconMode = "library";
      mode.value = "library";
      refresh();
    };
  library.hidden = item.iconMode !== "library";
}
function renderButtons() {
  const root = document.getElementById("buttonEditor");
  root.innerHTML = "";
  state.hero.buttons.forEach((btn, i) => {
    const el = document.createElement("div");
    el.className = "action-editor__card";
    el.innerHTML = `<div class="action-editor__title"><strong>Tombol ${i + 1}</strong>${toggleHtml(btn)}</div><div class="admin-form-grid"><div class="admin-field"><label>Teks tombol</label><input class="form-input" data-k="label" value="${esc(btn.label)}"></div><div class="admin-field"><label>URL tujuan</label><input class="form-input" data-k="url" value="${esc(btn.url)}"></div><div class="admin-field"><label>Gaya</label><select class="form-input" data-k="style"><option value="primary" ${btn.style === "primary" ? "selected" : ""}>Utama</option><option value="outline" ${btn.style === "outline" ? "selected" : ""}>Outline</option></select></div></div>${iconControl(btn, "hero-" + i)}<label class="editor-check"><input type="checkbox" data-newtab ${btn.newTab ? "checked" : ""}> Buka di tab baru</label>`;
    el.querySelectorAll("[data-k]").forEach(
      (x) =>
        (x.oninput = () => {
          btn[x.dataset.k] = x.value;
          renderHero();
        }),
    );
    wireItemToggle(el, btn, renderHero);
    el.querySelector("[data-newtab]").onchange = (e) =>
      (btn.newTab = e.target.checked);
    wireIcon(el, btn, renderHero);
    root.appendChild(el);
  });
  icons();
}
function renderScheduleCards() {
  const root = document.getElementById("scheduleCardEditor");
  root.innerHTML = "";
  state.schedule.cards.forEach((card, i) => {
    const el = document.createElement("article");
    el.className = "schedule-editor-card";
    el.innerHTML = `<div class="schedule-editor-card__head"><span class="admin-step">${String(i + 1).padStart(2, "0")}</span><strong>Kartu Jadwal</strong>${toggleHtml(card)}<button type="button" class="repeat-row__delete"><i data-lucide="trash-2"></i></button></div><div class="admin-form-grid"><div class="admin-field"><label>Nama tahapan</label><input class="form-input" data-k="label" value="${esc(card.label)}"></div><div class="admin-field"><label>Tanggal / waktu</label><input class="form-input" data-k="date" value="${esc(card.date)}"></div><div class="admin-field admin-field--wide"><label>Deskripsi opsional</label><input class="form-input" data-k="description" value="${esc(card.description)}" placeholder="Kosongkan jika tidak diperlukan"></div></div>${iconControl(card, "schedule-" + i)}`;
    el.querySelectorAll("[data-k]").forEach(
      (x) =>
        (x.oninput = () => {
          card[x.dataset.k] = x.value;
          renderSchedule();
        }),
    );
    wireItemToggle(el, card, renderSchedule);
    wireIcon(el, card, renderSchedule);
    el.querySelector(".repeat-row__delete").onclick = () =>
      removeItem(
        state.schedule.cards,
        i,
        "kartu jadwal",
        renderScheduleCards,
        renderSchedule,
      );
    root.appendChild(el);
  });
  icons();
}
function renderHero() {
  const root = document.getElementById("homePreview"),
    h = state.hero,
    t = theme();
  root.className = "hero hero-preview";
  applyTheme(root, t);
  if (!h.active) return disabled(root, "Hero");
  root.innerHTML = buildHomeHeroMarkup(h, {
    resolveAsset: (value, fallback) => value || fallback,
    resolveUrl: () => "#",
    renderIcon: heroPreviewIconMarkup,
    linkAttributes: () => ' data-hero-preview-link="true"',
  });
  root.querySelectorAll("[data-hero-preview-link]").forEach(
    (link) =>
      (link.onclick = (event) => {
        event.preventDefault();
      }),
  );
  root
    .querySelectorAll("img")
    .forEach((image) => (image.onload = () => fitHeroPreview()));
  requestAnimationFrame(fitHeroPreview);
  icons();
}
function renderSchedule() {
  const root = document.getElementById("schedulePreview"),
    s = state.schedule,
    t = theme();
  root.className = "section scaled-public-preview schedule-public-preview";
  applyTheme(root, t);
  if (!s.active) return disabled(root, "Jadwal Penting");
  root.innerHTML = buildHomeScheduleMarkup(s, {
    renderIcon: heroPreviewIconMarkup,
  });
  requestAnimationFrame(() => fitScaledPreview("schedulePreviewFrame"));
  icons();
}
function renderSummaries() {
  const data = [];
  document.getElementById("sectionSummaries").innerHTML = data
    .map(
      (x) =>
        `<section class="admin-card section-summary" id="${x[0]}"><span class="admin-step">${x[1]}</span><span class="section-summary__icon"><i data-lucide="${x[4]}"></i></span><div><h2>${x[2]}</h2><p>${x[3]}</p></div><span class="section-summary__next">Tahap berikutnya</span></section>`,
    )
    .join("");
}
function toggleHtml(x) {
  return `<label class="admin-switch"><input type="checkbox" ${x.active ? "checked" : ""}><span></span><em>${x.active ? "Aktif" : "Nonaktif"}</em></label>`;
}
function wireItemToggle(el, item, render) {
  const t = el.querySelector(".admin-switch input");
  t.onchange = () => {
    item.active = t.checked;
    t.parentElement.querySelector("em").textContent = t.checked
      ? "Aktif"
      : "Nonaktif";
    render();
  };
}
function iconMarkup(x) {
  if (x.iconMode === "upload" && x.uploadedIcon)
    return `<img src="${x.uploadedIcon}" alt="${esc(x.iconAlt || "Ikon kustom")}">`;
  return `<i data-lucide="${x.libraryIcon || x.icon || "circle"}"></i>`;
}
function heroPreviewIconMarkup(x, size = 18) {
  if (x.iconMode === "upload" && x.uploadedIcon)
    return `<img class="home-custom-icon" src="${x.uploadedIcon}" alt="${esc(x.iconAlt || "Ikon kustom")}" style="width:${size}px;height:${size}px">`;
  return `<i data-lucide="${x.libraryIcon || x.icon || "circle"}" style="width:${size}px;height:${size}px;stroke-width:1.5"></i>`;
}

async function removeItem(arr, i, name, ...renders) {
  const confirmed = await adminConfirm({
    title: `Hapus ${name}?`,
    message: `${name} ini akan dihapus dari perubahan Beranda saat ini.`,
    confirmLabel: "Ya, hapus",
    variant: "danger",
    icon: "trash-2",
  });
  if (!confirmed) return;
  arr.splice(i, 1);
  renders.forEach((f) => f());
}
function disabled(root, name) {
  root.innerHTML = `<div class="preview-disabled"><i data-lucide="eye-off"></i><strong>${name} dinonaktifkan</strong><span>Data tetap tersimpan dan dapat diaktifkan kembali.</span></div>`;
  icons();
}
function theme() {
  const globalTheme = getGlobalSettings().theme;
  return {
    ...THEME_DEFAULTS,
    ...globalTheme,
  };
}
function applyTheme(el, t) {
  applyGlobalThemeTokens(el, { theme: t });
}
function icons() {
  lucide.createIcons();
}
function esc(v = "") {
  return String(v).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}
function toast(msg, error = false) {
  const t = document.getElementById("adminToast");
  t.querySelector("span").textContent = msg;
  t.classList.toggle("admin-toast--error", error);
  t.classList.add("admin-toast--show");
  setTimeout(() => t.classList.remove("admin-toast--show"), 2800);
}

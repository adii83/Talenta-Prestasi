/* Pengaturan global tunggal untuk identitas, tema, navigasi, kontak, WhatsApp, dan footer. */
const GLOBAL_SETTINGS_KEY = "talenta_event_settings_v1";
const GLOBAL_SETTINGS_BASELINE = {
  version: 3,
  identity: {
    eventName: "Olimpiade Sains Nusantara",
    eventDescription:
      "Ajang talenta untuk mengembangkan prestasi peserta secara terukur dan transparan.",
    eventSlug: "osn2026",
    organizerName: "Talenta Prestasi Indonesia",
    logo: "",
  },
  theme: { primaryColor: "#1e4b8c", accentColor: "#ffffff" },
  navigation: { download: true, winners: true, archive: true, faq: true },
  contact: {
    email: "info@olimpiadesainsnusantara.id",
    whatsappDisplay: "+62 899-5452-222",
    whatsappNumber: "62899545222",
    whatsappMessage: "Halo kak, minta info tentang lomba ini",
    address: "Jl. Pendidikan No. 1, Jakarta",
  },
  footer: {
    brandName: "Olimpiade Sains Nusantara",
    description:
      "Ajang talenta tingkat nasional untuk siswa SD, SMP, dan SMA se-Indonesia. Diselenggarakan secara profesional dan transparan.",
    contactHeading: "Kontak",
    copyright: "© 2026 Olimpiade Sains Nusantara. Seluruh hak dilindungi.",
  },
};
function globalClone(v) {
  return JSON.parse(JSON.stringify(v));
}
function normalizeThemeHex(value, fallback) {
  const source = String(value || "")
    .trim()
    .toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(source)) return source;
  if (/^#[0-9a-f]{3}$/.test(source))
    return `#${source
      .slice(1)
      .split("")
      .map((character) => character.repeat(2))
      .join("")}`;
  return fallback;
}
function themeHexToRgb(value) {
  const hex = normalizeThemeHex(value, "#000000").slice(1);
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}
function mixThemeHex(color, target, targetWeight) {
  const sourceRgb = themeHexToRgb(color);
  const targetRgb = themeHexToRgb(target);
  return `#${sourceRgb
    .map((channel, index) =>
      Math.round(channel * (1 - targetWeight) + targetRgb[index] * targetWeight)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
function getGlobalThemePalette(settings = getGlobalSettings()) {
  const theme = settings.theme || settings || {};
  const primary = normalizeThemeHex(
    theme.primaryColor,
    GLOBAL_SETTINGS_BASELINE.theme.primaryColor,
  );
  const primaryRgb = themeHexToRgb(primary);
  const navy = mixThemeHex(primary, "#000000", 0.55);
  return {
    primary,
    primaryRgb: primaryRgb.join(" "),
    primaryDark: mixThemeHex(primary, "#000000", 0.28),
    primaryLight: mixThemeHex(primary, "#ffffff", 0.18),
    navy,
    navyRgb: themeHexToRgb(navy).join(" "),
    accent: "#ffffff",
  };
}
function normalizeWhatsappNumber(v = "") {
  let digits = String(v).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  return digits;
}
function normalizeGlobalSettings(source) {
  if (!source) return globalClone(GLOBAL_SETTINGS_BASELINE);
  if (source.version === 3) {
    const b = GLOBAL_SETTINGS_BASELINE;
    return {
      version: 3,
      identity: { ...b.identity, ...source.identity },
      theme: {
        primaryColor: source.theme?.primaryColor || b.theme.primaryColor,
        accentColor: "#ffffff",
      },
      navigation: { ...b.navigation, ...source.navigation },
      contact: { ...b.contact, ...source.contact },
      footer: { ...b.footer, ...source.footer },
    };
  }
  if (source.version === 2) {
    const migrated = { ...source, version: 3 };
    if (migrated.theme?.accentColor?.toLowerCase() === "#c89b3c")
      migrated.theme = { ...migrated.theme, accentColor: "#ffffff" };
    return normalizeGlobalSettings(migrated);
  }
  const b = globalClone(GLOBAL_SETTINGS_BASELINE),
    m = source.modules || {};
  b.identity = {
    ...b.identity,
    eventName: source.eventName || b.identity.eventName,
    eventDescription: source.eventDescription || b.identity.eventDescription,
    eventSlug: source.eventSlug || b.identity.eventSlug,
    organizerName: source.organizerName || b.identity.organizerName,
    logo: source.logo || "",
  };
  b.theme = {
    primaryColor: source.primaryColor || b.theme.primaryColor,
    accentColor: "#ffffff",
  };
  b.navigation = {
    download: m.documents !== false,
    winners: m.winners !== false,
    archive: m.archive !== false,
    faq: m.faq !== false,
  };
  b.contact.email = source.contactEmail || b.contact.email;
  b.contact.whatsappDisplay =
    source.contactWhatsapp || b.contact.whatsappDisplay;
  b.contact.whatsappNumber = normalizeWhatsappNumber(
    source.contactWhatsapp || b.contact.whatsappNumber,
  );
  return b;
}
function getGlobalSettings() {
  try {
    return normalizeGlobalSettings(
      JSON.parse(localStorage.getItem(GLOBAL_SETTINGS_KEY) || "null"),
    );
  } catch (e) {
    console.warn("Pengaturan global rusak; template awal digunakan.", e);
    return globalClone(GLOBAL_SETTINGS_BASELINE);
  }
}
function applyGlobalThemeTokens(target, settings = getGlobalSettings()) {
  if (!target) return;
  const palette = getGlobalThemePalette(settings);
  target.style.setProperty("--c-primary", palette.primary);
  target.style.setProperty("--c-primary-rgb", palette.primaryRgb);
  target.style.setProperty("--c-primary-dark", palette.primaryDark);
  target.style.setProperty("--c-primary-light", palette.primaryLight);
  target.style.setProperty("--c-accent", palette.accent);
  target.style.setProperty("--c-gold", palette.accent);
  target.style.setProperty("--c-rank", palette.primary);
  target.style.setProperty("--c-navy", palette.navy);
  target.style.setProperty("--c-navy-rgb", palette.navyRgb);
  target.style.setProperty("--preview-primary", palette.primary);
  target.style.setProperty("--preview-primary-rgb", palette.primaryRgb);
  target.style.setProperty("--preview-primary-dark", palette.primaryDark);
  target.style.setProperty("--preview-primary-light", palette.primaryLight);
  target.style.setProperty("--preview-accent", palette.accent);
  target.style.setProperty("--preview-navy", palette.navy);
  target.style.setProperty("--preview-navy-rgb", palette.navyRgb);
}
function subscribeGlobalSettings(callback) {
  const notify = () => callback(getGlobalSettings());
  window.addEventListener("talenta:settings", notify);
  window.addEventListener("storage", (event) => {
    if (event.key === GLOBAL_SETTINGS_KEY || event.key === null) notify();
  });
}
function saveGlobalSettings(v) {
  const s = normalizeGlobalSettings(v);
  s.contact.whatsappNumber = normalizeWhatsappNumber(
    s.contact.whatsappNumber || s.contact.whatsappDisplay,
  );
  localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(s));
  window.dispatchEvent(
    new CustomEvent("talenta:settings", { detail: globalClone(s) }),
  );
  return globalClone(s);
}
function resetGlobalSettings() {
  localStorage.removeItem(GLOBAL_SETTINGS_KEY);
  const baseline = getGlobalSettings();
  window.dispatchEvent(
    new CustomEvent("talenta:settings", { detail: globalClone(baseline) }),
  );
  return baseline;
}
function publicPageId(path = location.pathname) {
  const normalizedPath = `/${String(path)
    .split("?")[0]
    .split("#")[0]
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/index\.html$/i, "")}/`.replace(/^\/\/$/, "/");
  const basePath =
    typeof TalentaPaths !== "undefined" ? TalentaPaths.basePath : "";
  const routeMap = [
    ["template.home", "home"],
    ["template.download", "download"],
    ["template.winners", "winners"],
    ["template.archive", "archive"],
    ["template.archiveDetail", "archive"],
    ["template.faq", "faq"],
  ];
  if (typeof TalentaPaths !== "undefined") {
    const match = routeMap.find(
      ([routeId]) =>
        normalizedPath ===
        `${basePath}${TalentaPaths.routes[routeId]}`.replace(/\/+/g, "/"),
    );
    if (match) return match[1];
  }
  const fallback = [
    ["/apps/template/", "home"],
    ["/apps/template/unduh/", "download"],
    ["/apps/template/pemenang/", "winners"],
    ["/apps/template/arsip/", "archive"],
    ["/apps/template/arsip/detail/", "archive"],
    ["/apps/template/faq/", "faq"],
  ];
  return (
    fallback.find(([suffix]) => normalizedPath.endsWith(suffix))?.[1] || null
  );
}
function isPublicPageEnabled(id, s = getGlobalSettings()) {
  return id === "home" || id == null || s.navigation[id] !== false;
}
function getFirstEnabledPublicPage() {
  return typeof TalentaPaths !== "undefined"
    ? TalentaPaths.to("template.home")
    : "/apps/template/";
}
function buildWhatsappUrl(s = getGlobalSettings()) {
  const number = normalizeWhatsappNumber(
    s.contact.whatsappNumber || s.contact.whatsappDisplay,
  );
  return number
    ? `https://wa.me/${number}?text=${encodeURIComponent(s.contact.whatsappMessage || "")}`
    : "";
}

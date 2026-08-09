window.ADMIN_ROUTE_REGISTRY = Object.freeze({
  settings: { title: "Identitas & Tema", publicRoute: "publicSite.home" },
  home: {
    title: "Editor Beranda",
    publicRoute: "publicSite.home",
    editorRoute: "admin.homeEditor",
  },
  download: {
    title: "Editor Unduh",
    publicRoute: "publicSite.download",
    editorRoute: "admin.downloadEditor",
  },
  winners: {
    title: "Manajemen Pemenang",
    publicRoute: "publicSite.winners",
    editorRoute: "admin.winnersEditor",
  },
  archive: {
    title: "Manajemen Arsip",
    publicRoute: "publicSite.archive",
    editorRoute: "admin.archiveEditor",
  },
  faq: {
    title: "Manajemen FAQ",
    publicRoute: "publicSite.faq",
    editorRoute: "admin.faqEditor",
  },
});

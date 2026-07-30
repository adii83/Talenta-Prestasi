window.ADMIN_ROUTE_REGISTRY = Object.freeze({
  settings: { title: "Identitas & Tema", publicRoute: "template.home" },
  home: {
    title: "Editor Beranda",
    publicRoute: "template.home",
    editorRoute: "admin.homeEditor",
  },
  download: {
    title: "Editor Unduh",
    publicRoute: "template.download",
    editorRoute: "admin.downloadEditor",
  },
  winners: {
    title: "Manajemen Pemenang",
    publicRoute: "template.winners",
    editorRoute: "admin.winnersEditor",
  },
  archive: {
    title: "Manajemen Arsip",
    publicRoute: "template.archive",
    editorRoute: "admin.archiveEditor",
  },
  faq: {
    title: "Manajemen FAQ",
    publicRoute: "template.faq",
    editorRoute: "admin.faqEditor",
  },
});

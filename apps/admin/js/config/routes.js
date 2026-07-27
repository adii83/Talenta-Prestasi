window.ADMIN_ROUTE_REGISTRY = Object.freeze({
  settings: { title: "Identitas & Tema", publicRoute: "public.home" },
  home: {
    title: "Editor Beranda",
    publicRoute: "public.home",
    editorRoute: "admin.homeEditor",
  },
  download: {
    title: "Editor Unduh",
    publicRoute: "public.download",
    editorRoute: "admin.downloadEditor",
  },
  winners: {
    title: "Manajemen Pemenang",
    publicRoute: "public.winners",
    editorRoute: "admin.winnersEditor",
  },
  archive: {
    title: "Manajemen Arsip",
    publicRoute: "public.archive",
    editorRoute: "admin.archiveEditor",
  },
  faq: {
    title: "Manajemen FAQ",
    publicRoute: "public.faq",
    editorRoute: "admin.faqEditor",
  },
});

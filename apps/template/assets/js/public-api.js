(() => {
  const slug = () => TalentaConfig.siteSlug;
  async function load(page, detailSlug = "") {
    const suffix =
      page === "archiveDetail"
        ? `archives/${encodeURIComponent(detailSlug)}`
        : {
            home: "home",
            download: "downloads",
            faq: "faq",
            winners: "winners",
            archive: "archives",
          }[page];
    if (!suffix) throw new Error(`Halaman publik tidak dikenal: ${page}`);
    const payload = await TalentaApi.request(
      `/public/sites/${slug()}/${suffix}`,
      { auth: false },
    );
    window.dispatchEvent(
      new CustomEvent(`talenta:public:${page}`, { detail: payload.data }),
    );
    return payload.data;
  }
  async function bootstrap() {
    const payload = await TalentaApi.request(
      `/public/sites/${slug()}/bootstrap`,
      { auth: false },
    );
    window.dispatchEvent(
      new CustomEvent("talenta:public:bootstrap", { detail: payload.data }),
    );
    return payload.data;
  }
  window.TalentaPublic = Object.freeze({ load, bootstrap });
  void bootstrap().catch((error) =>
    console.error("Bootstrap API tidak tersedia; baseline ditampilkan.", error),
  );
})();

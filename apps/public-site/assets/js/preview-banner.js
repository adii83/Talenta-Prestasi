(() => {
  let banner;
  function show(detail) {
    if (!banner) {
      banner = document.createElement("aside");
      banner.className = "draft-preview-banner";
      banner.setAttribute("role", "status");
      banner.setAttribute("aria-live", "polite");
      document.body.prepend(banner);
    }
    banner.classList.toggle("draft-preview-banner--expired", detail.expired);
    banner.textContent = detail.expired
      ? "Sesi preview telah berakhir. Buka kembali halaman ini melalui Admin."
      : "Preview draf — hanya Anda yang dapat melihat versi ini. Berlaku maksimal 15 menit.";
  }
  addEventListener("talenta:preview", (event) => show(event.detail));
  if (window.TalentaPublic?.preview().active) show({ active: true });
})();

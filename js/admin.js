const STORAGE_KEY = "talenta_event_settings_v1";
const defaultModules = [
  [
    "benefit",
    "Benefit event",
    "Keunggulan dan fasilitas untuk peserta",
    true,
    "sparkles",
  ],
  [
    "schedule",
    "Jadwal kompetisi",
    "Linimasa pendaftaran hingga pengumuman",
    true,
    "calendar-days",
  ],
  [
    "documents",
    "Dokumen unduhan",
    "Juknis, silabus, dan materi lomba",
    true,
    "file-down",
  ],
  ["winners", "Pemenang", "Menu dan halaman daftar pemenang", false, "trophy"],
  [
    "winnerHighlight",
    "Highlight pemenang",
    "Kartu pemenang pilihan di beranda",
    false,
    "award",
  ],
  ["faq", "FAQ", "Pertanyaan yang sering diajukan", true, "circle-help"],
  ["archive", "Arsip event", "Riwayat kompetisi terdahulu", true, "archive"],
  [
    "whatsapp",
    "Tombol WhatsApp",
    "Akses cepat menuju kontak panitia",
    true,
    "message-circle",
  ],
];

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("eventSettingsForm");
  const moduleList = document.getElementById("moduleList");
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  const moduleState =
    saved?.modules ||
    Object.fromEntries(defaultModules.map(([id, , , active]) => [id, active]));

  defaultModules.forEach(([id, title, description, , icon]) => {
    const row = document.createElement("div");
    row.className = "admin-module";
    row.innerHTML = `<span class="admin-module__icon"><i data-lucide="${icon}"></i></span><span class="admin-module__copy"><strong>${title}</strong><small>${description}</small></span><label class="admin-switch"><input type="checkbox" id="module-${id}" data-module="${id}" ${moduleState[id] ? "checked" : ""}><span></span><em>${moduleState[id] ? "Aktif" : "Nonaktif"}</em></label>`;
    moduleList.appendChild(row);
  });

  if (saved) {
    [
      "eventName",
      "eventSlug",
      "organizerName",
      "contactEmail",
      "contactWhatsapp",
    ].forEach((id) => {
      if (saved[id]) document.getElementById(id).value = saved[id];
    });
    if (saved.primaryColor)
      document.getElementById("primaryColor").value = saved.primaryColor;
    if (saved.accentColor)
      document.getElementById("accentColor").value = saved.accentColor;
    if (saved.logo) setLogo(saved.logo);
  }

  const updatePreview = () => {
    const primary = document.getElementById("primaryColor").value;
    const accent = document.getElementById("accentColor").value;
    document.getElementById("primaryHex").textContent = primary.toUpperCase();
    document.getElementById("accentHex").textContent = accent.toUpperCase();
    document
      .getElementById("themePreview")
      .style.setProperty("--preview-primary", primary);
    document
      .getElementById("themePreview")
      .style.setProperty("--preview-accent", accent);
    document.getElementById("previewName").textContent =
      document.getElementById("eventName").value || "Nama Event";
    document.getElementById("previewDomain").textContent =
      `${document.getElementById("eventSlug").value || "event"}.talentaprestasi.id`;
  };

  ["eventName", "eventSlug", "primaryColor", "accentColor"].forEach((id) =>
    document.getElementById(id).addEventListener("input", updatePreview),
  );
  document
    .querySelectorAll("[data-module]")
    .forEach((input) =>
      input.addEventListener(
        "change",
        () =>
          (input.parentElement.querySelector("em").textContent = input.checked
            ? "Aktif"
            : "Nonaktif"),
      ),
    );
  document
    .getElementById("logoUploadButton")
    .addEventListener("click", () =>
      document.getElementById("eventLogo").click(),
    );
  document.getElementById("eventLogo").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file || file.size > 2 * 1024 * 1024)
      return showToast("Logo maksimal berukuran 2 MB.", true);
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    data.primaryColor = document.getElementById("primaryColor").value;
    data.accentColor = document.getElementById("accentColor").value;
    data.logo = document.querySelector("#logoPreview img")?.src || "";
    data.modules = Object.fromEntries(
      [...document.querySelectorAll("[data-module]")].map((input) => [
        input.dataset.module,
        input.checked,
      ]),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showToast("Perubahan berhasil disimpan.");
  });
  document.getElementById("resetSettings").addEventListener("click", () => {
    if (confirm("Reset seluruh pengaturan demonstrasi?")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });
  document
    .getElementById("sidebarToggle")
    .addEventListener("click", () =>
      document
        .getElementById("adminSidebar")
        .classList.toggle("admin-sidebar--open"),
    );
  updatePreview();
  lucide.createIcons();
});

function setLogo(source) {
  document.getElementById("logoPreview").innerHTML =
    `<img src="${source}" alt="Pratinjau logo event">`;
}
function showToast(message, error = false) {
  const toast = document.getElementById("adminToast");
  toast.querySelector("span").textContent = message;
  toast.classList.toggle("admin-toast--error", error);
  toast.classList.add("admin-toast--show");
  setTimeout(() => toast.classList.remove("admin-toast--show"), 3000);
}

/* ============================================================
   AJANG TALENTA — INTERACTIONS
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initAccordion();
  initAuthToggle();
  initDocFilter();
  initTabToggle();
  initUnduhTabs();
});

/* --- NAVIGATION --- */
function initNavigation() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  // Desktop nav
  document.querySelectorAll(".navbar__link").forEach((link) => {
    const href = link.getAttribute("href");
    if (
      href === currentPage ||
      (currentPage === "" && href === "index.html") ||
      (currentPage === "arsip-detail.html" && href === "arsip.html")
    ) {
      link.classList.add("navbar__link--active");
    }
  });

  // Mobile bottom nav
  document.querySelectorAll(".bottom-nav__item").forEach((item) => {
    const href = item.getAttribute("href");
    if (
      href === currentPage ||
      (currentPage === "" && href === "index.html") ||
      (currentPage === "arsip-detail.html" && href === "arsip.html")
    ) {
      item.classList.add("bottom-nav__item--active");
    }
  });
}

/* --- ACCORDION (FAQ) --- */
function initAccordion(root = document) {
  root.querySelectorAll(".accordion__trigger").forEach((trigger) => {
    if (trigger.dataset.accordionBound === "1") return;
    trigger.dataset.accordionBound = "1";
    trigger.setAttribute(
      "aria-expanded",
      trigger
        .closest(".accordion__item")
        .classList.contains("accordion__item--open")
        ? "true"
        : "false",
    );
    trigger.addEventListener("click", () => {
      const item = trigger.closest(".accordion__item");
      const content = item.querySelector(".accordion__content");
      const isOpen = item.classList.contains("accordion__item--open");
      const accordion = item.closest(".accordion");
      accordion.querySelectorAll(".accordion__item").forEach((other) => {
        other.classList.remove("accordion__item--open");
        other
          .querySelector(".accordion__trigger")
          ?.setAttribute("aria-expanded", "false");
        const otherContent = other.querySelector(".accordion__content");
        if (otherContent) otherContent.style.maxHeight = "0";
      });
      if (!isOpen) {
        item.classList.add("accordion__item--open");
        trigger.setAttribute("aria-expanded", "true");
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });
}

/* --- AUTH FORM TOGGLE (LOGIN / REGISTER) --- */
function initAuthToggle() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const showRegister = document.getElementById("showRegister");
  const showLogin = document.getElementById("showLogin");

  if (showRegister) {
    showRegister.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.style.display = "none";
      registerForm.style.display = "block";
    });
  }

  if (showLogin) {
    showLogin.addEventListener("click", (e) => {
      e.preventDefault();
      registerForm.style.display = "none";
      loginForm.style.display = "block";
    });
  }
}

/* --- DOCUMENT FILTER (UNDUH PAGE) --- */
function initDocFilter() {
  const filterSelect = document.getElementById("docCategoryFilter");
  if (!filterSelect) return;

  const docCards = document.querySelectorAll(".doc-card[data-category]");

  // Build filter options dynamically from data-category attributes
  const categories = new Set();
  docCards.forEach((card) => {
    const cat = card.getAttribute("data-category");
    if (cat) categories.add(cat);
  });

  // Clear existing options except "Semua"
  filterSelect.innerHTML = '<option value="all">Semua Kategori</option>';
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    filterSelect.appendChild(option);
  });

  filterSelect.addEventListener("change", () => {
    const selected = filterSelect.value;
    docCards.forEach((card) => {
      if (
        selected === "all" ||
        card.getAttribute("data-category") === selected
      ) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
  });
}

/* --- TAB TOGGLE (PERINGKAT / PEMENANG) --- */
function initTabToggle() {
  document.querySelectorAll(".tab-toggle").forEach((toggle) => {
    toggle.querySelectorAll(".tab-toggle__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggle
          .querySelectorAll(".tab-toggle__btn")
          .forEach((b) => b.classList.remove("tab-toggle__btn--active"));
        btn.classList.add("tab-toggle__btn--active");
      });
    });
  });
}

/* --- UNDUH TABS (DOKUMEN PER EVENT) --- */
function initUnduhTabs() {
  document.querySelectorAll(".unduh-tabs").forEach((tabContainer) => {
    const tabs = tabContainer.querySelectorAll(".unduh-tab");
    const panels =
      tabContainer.parentElement.querySelectorAll(".unduh-tab-panel");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.getAttribute("data-tab");

        // Deactivate all tabs and panels
        tabs.forEach((t) => t.classList.remove("unduh-tab--active"));
        panels.forEach((p) => p.classList.remove("unduh-tab-panel--active"));

        // Activate current
        tab.classList.add("unduh-tab--active");
        const targetPanel = document.getElementById(target);
        if (targetPanel) targetPanel.classList.add("unduh-tab-panel--active");
      });
    });
  });
}

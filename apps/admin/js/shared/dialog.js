/* Dialog konfirmasi UI bersama untuk shell dan seluruh editor Admin. */
(() => {
  if (window.adminConfirm) return;

  let activeResolve = null;
  let previousFocus = null;

  function ensureDialog() {
    let dialog = document.getElementById("adminConfirmDialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "adminConfirmDialog";
    dialog.className = "admin-confirm-dialog";
    dialog.setAttribute("aria-labelledby", "adminConfirmTitle");
    dialog.setAttribute("aria-describedby", "adminConfirmMessage");
    dialog.innerHTML = `
      <div class="admin-confirm-dialog__surface">
        <div class="admin-confirm-dialog__icon" data-dialog-icon>
          <i data-lucide="triangle-alert"></i>
        </div>
        <div class="admin-confirm-dialog__content">
          <p class="admin-confirm-dialog__eyebrow">Konfirmasi tindakan</p>
          <h2 id="adminConfirmTitle">Lanjutkan tindakan?</h2>
          <p id="adminConfirmMessage"></p>
        </div>
        <div class="admin-confirm-dialog__actions">
          <button type="button" class="btn btn--outline" data-dialog-cancel>
            Batal
          </button>
          <button type="button" class="btn btn--primary" data-dialog-confirm>
            Lanjutkan
          </button>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    const finish = (result) => {
      if (!activeResolve) return;
      const resolve = activeResolve;
      const focusTarget = previousFocus;
      activeResolve = null;
      dialog.close();
      document.body.classList.remove("admin-dialog-open");
      previousFocus = null;
      setTimeout(() => {
        focusTarget?.focus?.({ preventScroll: true });
        resolve(result);
      }, 0);
    };

    dialog
      .querySelector("[data-dialog-cancel]")
      .addEventListener("click", () => {
        finish(false);
      });
    dialog
      .querySelector("[data-dialog-confirm]")
      .addEventListener("click", () => finish(true));
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(false);
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) finish(false);
    });
    dialog._adminFinish = finish;
    return dialog;
  }

  function localConfirm(options = {}) {
    const config =
      typeof options === "string" ? { message: options } : options || {};
    const dialog = ensureDialog();
    if (activeResolve) dialog._adminFinish(false);

    const variant = config.variant === "danger" ? "danger" : "primary";
    const title =
      config.title ||
      (variant === "danger" ? "Konfirmasi perubahan" : "Lanjutkan tindakan?");
    const message =
      config.message ||
      "Pastikan tindakan ini memang ingin dilakukan sebelum melanjutkan.";
    const confirmLabel =
      config.confirmLabel ||
      (variant === "danger" ? "Ya, lanjutkan" : "Lanjutkan");
    const cancelLabel = config.cancelLabel || "Batal";
    const icon =
      config.icon || (variant === "danger" ? "triangle-alert" : "info");

    dialog.dataset.variant = variant;
    dialog.querySelector("#adminConfirmTitle").textContent = title;
    dialog.querySelector("#adminConfirmMessage").textContent = message;
    dialog.querySelector("[data-dialog-cancel]").textContent = cancelLabel;
    const confirmButton = dialog.querySelector("[data-dialog-confirm]");
    confirmButton.textContent = confirmLabel;
    confirmButton.classList.toggle(
      "admin-confirm-dialog__confirm--danger",
      variant === "danger",
    );
    dialog.querySelector("[data-dialog-icon]").innerHTML =
      `<i data-lucide="${icon}"></i>`;

    previousFocus = document.activeElement;
    document.body.classList.add("admin-dialog-open");
    dialog.showModal();
    window.lucide?.createIcons();

    return new Promise((resolve) => {
      activeResolve = resolve;
      requestAnimationFrame(() =>
        dialog.querySelector("[data-dialog-cancel]").focus(),
      );
    });
  }

  window.adminConfirm = (options) => {
    if (
      window.parent !== window &&
      typeof window.parent.adminConfirm === "function"
    )
      return window.parent.adminConfirm(options);
    return localConfirm(options);
  };
})();

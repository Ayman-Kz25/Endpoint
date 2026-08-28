const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebar-backdrop");
const toggleButton = document.getElementById("mobile-sidebar-button");

const MOBILE_BREAKPOINT = 768;

function isMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function openSidebar() {
  if (!sidebar || !isMobile()) {
    return;
  }

  sidebar.classList.remove("hidden");
  sidebar.classList.add("flex");

  backdrop?.classList.remove("hidden");

  toggleButton?.setAttribute("aria-expanded", "true");

  toggleButton?.setAttribute("aria-label", "Close navigation");

  document.body.classList.add("overflow-hidden");
}

export function closeSidebar() {
  if (!sidebar) {
    return;
  }

  sidebar.classList.add("hidden");
  sidebar.classList.remove("flex");

  backdrop?.classList.add("hidden");

  toggleButton?.setAttribute("aria-expanded", "false");

  toggleButton?.setAttribute("aria-label", "Open navigation");

  document.body.classList.remove("overflow-hidden");
}

export function toggleSidebar() {
  if (!isMobile()) {
    return;
  }

  if (sidebar?.classList.contains("hidden")) {
    openSidebar();
  } else {
    closeSidebar();
  }
}

export function initSidebar() {
  if (!sidebar || !toggleButton) {
    return;
  }

  toggleButton.addEventListener("click", toggleSidebar);

  backdrop?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  window.addEventListener("resize", () => {
    if (!isMobile()) {
      closeSidebar();
    }
  });
}

export default {
  openSidebar,
  closeSidebar,
  toggleSidebar,
};

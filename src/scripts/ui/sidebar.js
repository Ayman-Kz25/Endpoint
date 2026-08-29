// src/scripts/ui/sidebar.js

const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebar-backdrop");
const toggleButton = document.getElementById("mobile-sidebar-button");

const newRequestButton = document.getElementById("new-request-button");
const collectionsButton = document.getElementById("collections-button");
const historyButton = document.getElementById("history-button");
const environmentsButton = document.getElementById("environments-button");
const keyboardShortcutsButton = document.getElementById(
  "keyboard-shortcuts-button"
);

const MOBILE_BREAKPOINT = 768;

function isMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function dispatchNavigation(action) {
  document.dispatchEvent(
    new CustomEvent("sidebar:navigate", {
      detail: { action },
    })
  );

  // Close mobile sidebar after navigation.
  if (isMobile()) {
    closeSidebar();
  }
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
  toggleButton?.setAttribute("title", "Close navigation");

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
  toggleButton?.setAttribute("title", "Open navigation");

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
  if (!sidebar) {
    console.warn("Sidebar initialization failed: #sidebar not found");
    return;
  }

  toggleButton?.addEventListener("click", toggleSidebar);
  backdrop?.addEventListener("click", closeSidebar);

  newRequestButton?.addEventListener("click", () => {
    dispatchNavigation("new-request");
  });

  collectionsButton?.addEventListener("click", () => {
    dispatchNavigation("collections");
  });

  historyButton?.addEventListener("click", () => {
    dispatchNavigation("history");
  });

  environmentsButton?.addEventListener("click", () => {
    dispatchNavigation("environments");
  });

  keyboardShortcutsButton?.addEventListener("click", () => {
    dispatchNavigation("keyboard-shortcuts");
  });

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

  // console.log("Sidebar initialization successful");
}

export default {
  openSidebar,
  closeSidebar,
  toggleSidebar,
  initSidebar,
};

// src/scripts/ui/sidebar.js

/**
 * Sidebar UI
 *
 * Controls the application sidebar with responsive mobile behavior.
 */

import {
    getDOM,
    initDOM,
} from "./dom.js";

const SIDEBAR_ID = "sidebar";
const BACKDROP_ID = "sidebar-backdrop";
const TOGGLE_ID = "mobile-sidebar-button";

const state = {
    initialized: false,
    open: false,
    mobileBreakpoint: 768,
    cleanup: null,
    previousActiveElement: null,
};

let sidebar = null;
let backdrop = null;
let toggleButton = null;

// ============================================================
// Initialization
// ============================================================

export function initSidebar() {
    cleanupEvents();

    /*
     * Refresh DOM references.
     *
     * This is important when the application shell has
     * been rendered or replaced dynamically.
     */
    initDOM(document);

    cacheElements();

    if (!sidebar) {
        state.initialized = false;
        state.open = false;

        console.warn(
            "[Sidebar] Sidebar element was not found."
        );

        return createApi();
    }

    state.initialized = true;

    bindEvents();
    syncUI();

    return createApi();
}

// ============================================================
// DOM
// ============================================================

function cacheElements() {
    sidebar =
        getDOM("sidebar") ||
        document.getElementById(SIDEBAR_ID);

    backdrop =
        getDOM("sidebarBackdrop") ||
        document.getElementById(BACKDROP_ID);

    toggleButton =
        getDOM("mobileSidebarButton") ||
        document.getElementById(TOGGLE_ID);
}

// ============================================================
// Public API
// ============================================================

export function openSidebar() {
    ensureElements();

    if (!sidebar) {
        return false;
    }

    if (isMobileSidebar()) {
        if (!state.open) {
            state.previousActiveElement =
                document.activeElement;
        }

        state.open = true;
    }

    syncUI();

    return true;
}

export function closeSidebar({
    restoreFocus = true,
} = {}) {
    ensureElements();

    if (!sidebar) {
        return false;
    }

    const shouldRestoreFocus =
        restoreFocus &&
        isMobileSidebar() &&
        state.open;

    state.open = false;

    syncUI();

    if (shouldRestoreFocus) {
        const previous =
            state.previousActiveElement;

        requestAnimationFrame(() => {
            if (
                previous &&
                typeof previous.focus === "function" &&
                document.contains(previous)
            ) {
                previous.focus();
                return;
            }

            if (
                toggleButton &&
                typeof toggleButton.focus === "function"
            ) {
                toggleButton.focus();
            }
        });
    }

    state.previousActiveElement = null;

    return true;
}

export function toggleSidebar() {
    ensureElements();

    if (!sidebar) {
        return false;
    }

    if (!isMobileSidebar()) {
        syncUI();
        return true;
    }

    if (state.open) {
        closeSidebar();
        return false;
    }

    openSidebar();

    return state.open;
}

export function isSidebarOpen() {
    return Boolean(
        state.open &&
        isMobileSidebar()
    );
}

export function isMobileSidebar() {
    return (
        typeof window !== "undefined" &&
        window.innerWidth <
            state.mobileBreakpoint
    );
}

// ============================================================
// DOM Safety
// ============================================================

function ensureElements() {
    if (
        !sidebar ||
        !document.contains(sidebar)
    ) {
        initDOM(document);
        cacheElements();
    }
}

// ============================================================
// Events
// ============================================================

function bindEvents() {
    cleanupEvents();

    const handleToggle = (event) => {
        event.preventDefault();
        toggleSidebar();
    };

    const handleBackdropClick = (event) => {
        if (
            event.target !== backdrop
        ) {
            return;
        }

        closeSidebar();
    };

    const handleKeyDown = (event) => {
        if (
            event.key !== "Escape" ||
            !state.open ||
            !isMobileSidebar()
        ) {
            return;
        }

        event.preventDefault();

        closeSidebar();
    };

    const handleResize = () => {
        syncUI();
    };

    const handleNavigationClick = (event) => {
        if (
            !isMobileSidebar() ||
            !state.open
        ) {
            return;
        }

        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const button =
            target.closest("button, a");

        if (
            !button ||
            !sidebar?.contains(button)
        ) {
            return;
        }

        if (
            button === toggleButton ||
            button.closest(
                "[data-sidebar-ignore-close]"
            ) ||
            button.hasAttribute(
                "data-sidebar-ignore-close"
            )
        ) {
            return;
        }

        const isNavigationItem =
            button.matches(
                "a[href], [data-sidebar-nav]"
            );

        if (!isNavigationItem) {
            return;
        }

        closeSidebar({
            restoreFocus: false,
        });
    };

    toggleButton?.addEventListener(
        "click",
        handleToggle
    );

    backdrop?.addEventListener(
        "click",
        handleBackdropClick
    );

    sidebar?.addEventListener(
        "click",
        handleNavigationClick
    );

    document.addEventListener(
        "keydown",
        handleKeyDown
    );

    window.addEventListener(
        "resize",
        handleResize
    );

    state.cleanup = () => {
        toggleButton?.removeEventListener(
            "click",
            handleToggle
        );

        backdrop?.removeEventListener(
            "click",
            handleBackdropClick
        );

        sidebar?.removeEventListener(
            "click",
            handleNavigationClick
        );

        document.removeEventListener(
            "keydown",
            handleKeyDown
        );

        window.removeEventListener(
            "resize",
            handleResize
        );
    };
}

function cleanupEvents() {
    if (state.cleanup) {
        state.cleanup();
        state.cleanup = null;
    }
}

// ============================================================
// UI Synchronization
// ============================================================

function syncUI() {
    ensureElements();

    if (!sidebar) {
        return;
    }

    const mobile = isMobileSidebar();

    if (!mobile) {
        state.open = false;
        state.previousActiveElement = null;

        showDesktopSidebar();

        return;
    }

    if (state.open) {
        showMobileSidebar();
    } else {
        hideMobileSidebar();
    }
}

// ============================================================
// Desktop
// ============================================================

function showDesktopSidebar() {
    sidebar.hidden = false;

    sidebar.classList.remove("hidden");
    sidebar.classList.add("flex");

    sidebar.setAttribute(
        "aria-hidden",
        "false"
    );

    if (backdrop) {
        backdrop.hidden = true;
        backdrop.classList.add("hidden");

        backdrop.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    if (toggleButton) {
        toggleButton.setAttribute(
            "aria-expanded",
            "false"
        );

        toggleButton.setAttribute(
            "aria-label",
            "Open navigation"
        );

        toggleButton.setAttribute(
            "title",
            "Open navigation"
        );
    }

    document.body.classList.remove(
        "overflow-hidden"
    );
}

// ============================================================
// Mobile
// ============================================================

function showMobileSidebar() {
    sidebar.hidden = false;

    sidebar.classList.remove("hidden");
    sidebar.classList.add("flex");

    sidebar.setAttribute(
        "aria-hidden",
        "false"
    );

    if (backdrop) {
        backdrop.hidden = false;
        backdrop.classList.remove("hidden");

        backdrop.setAttribute(
            "aria-hidden",
            "false"
        );
    }

    if (toggleButton) {
        toggleButton.setAttribute(
            "aria-expanded",
            "true"
        );

        toggleButton.setAttribute(
            "aria-label",
            "Close navigation"
        );

        toggleButton.setAttribute(
            "title",
            "Close navigation"
        );
    }

    document.body.classList.add(
        "overflow-hidden"
    );
}

function hideMobileSidebar() {
    sidebar.hidden = true;

    sidebar.classList.add("hidden");
    sidebar.classList.remove("flex");

    sidebar.setAttribute(
        "aria-hidden",
        "true"
    );

    if (backdrop) {
        backdrop.hidden = true;
        backdrop.classList.add("hidden");

        backdrop.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    if (toggleButton) {
        toggleButton.setAttribute(
            "aria-expanded",
            "false"
        );

        toggleButton.setAttribute(
            "aria-label",
            "Open navigation"
        );

        toggleButton.setAttribute(
            "title",
            "Open navigation"
        );
    }

    document.body.classList.remove(
        "overflow-hidden"
    );
}

// ============================================================
// Focus
// ============================================================

export function focusSidebar() {
    ensureElements();

    if (!sidebar) {
        return false;
    }

    const target =
        sidebar.querySelector(
            [
                "button:not([disabled])",
                "a[href]",
                "input:not([disabled])",
                "select:not([disabled])",
                "textarea:not([disabled])",
                "[tabindex]:not([tabindex='-1'])",
            ].join(",")
        );

    if (!target) {
        return false;
    }

    target.focus();

    return true;
}

export function openSidebarAndFocus() {
    ensureElements();

    if (!isMobileSidebar()) {
        openSidebar();
        return true;
    }

    const opened = openSidebar();

    if (!opened) {
        return false;
    }

    requestAnimationFrame(() => {
        if (state.open) {
            focusSidebar();
        }
    });

    return true;
}

// ============================================================
// Breakpoint
// ============================================================

export function setSidebarBreakpoint(
    breakpoint
) {
    const value = Number(breakpoint);

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return;
    }

    state.mobileBreakpoint = value;

    syncUI();
}

export function getSidebarBreakpoint() {
    return state.mobileBreakpoint;
}

// ============================================================
// Destroy
// ============================================================

export function destroySidebar() {
    cleanupEvents();

    document.body.classList.remove(
        "overflow-hidden"
    );

    state.initialized = false;
    state.open = false;
    state.previousActiveElement = null;

    sidebar = null;
    backdrop = null;
    toggleButton = null;
}

// ============================================================
// API
// ============================================================

function createApi() {
    return {
        open: openSidebar,
        close: closeSidebar,
        toggle: toggleSidebar,
        isOpen: isSidebarOpen,
        isMobile: isMobileSidebar,
        focus: focusSidebar,
        openAndFocus: openSidebarAndFocus,
        setBreakpoint: setSidebarBreakpoint,
        getBreakpoint: getSidebarBreakpoint,
        sync: syncUI,
        destroy: destroySidebar,
    };
}

export default {
    initSidebar,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    isSidebarOpen,
    isMobileSidebar,
    focusSidebar,
    openSidebarAndFocus,
    setSidebarBreakpoint,
    getSidebarBreakpoint,
    destroySidebar,
};
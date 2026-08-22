// src/scripts/ui/sidebar.js

/**
 * Sidebar UI
 *
 * Controls the application sidebar, with responsive mobile behavior.
 *
 * Responsibilities:
 * - Open and close the sidebar
 * - Toggle the mobile sidebar
 * - Manage the mobile backdrop
 * - Manage aria-expanded / aria-hidden state
 * - Close on backdrop click
 * - Close on Escape
 * - Close on navigation item selection on mobile
 *
 * This module does not:
 * - Manage sidebar navigation business logic
 * - Render history items
 * - Manage application state
 */

const SIDEBAR_ID = "sidebar";
const BACKDROP_ID = "sidebar-backdrop";
const TOGGLE_ID = "mobile-sidebar-button";

const elements = {
    sidebar: null,
    backdrop: null,
    toggleButton: null,
};

const state = {
    initialized: false,
    open: false,
    mobileBreakpoint: 768,
    cleanup: null,
    previousActiveElement: null,
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the sidebar.
 *
 * @returns {Object} Sidebar API
 */
export function initSidebar() {
    cleanupEvents();

    cacheElements();

    if (!elements.sidebar) {
        state.initialized = false;
        state.open = false;
        return createApi();
    }

    state.initialized = true;

    bindEvents();
    syncUI();

    return createApi();
}

/**
 * Cache sidebar DOM elements.
 */
function cacheElements() {
    elements.sidebar = document.getElementById(SIDEBAR_ID);

    elements.backdrop =
        document.getElementById(BACKDROP_ID);

    elements.toggleButton =
        document.getElementById(TOGGLE_ID);
}

// ============================================================
// Public API
// ============================================================

/**
 * Open the sidebar.
 *
 * On desktop the sidebar is always visible, so opening it simply
 * synchronizes the UI without creating a mobile overlay.
 *
 * @returns {boolean}
 */
export function openSidebar() {
    if (!elements.sidebar) {
        cacheElements();
    }

    if (!elements.sidebar) {
        return false;
    }

    if (isMobileSidebar()) {
        state.previousActiveElement =
            document.activeElement;

        state.open = true;
    }

    syncUI();

    return true;
}

/**
 * Close the sidebar.
 *
 * @returns {boolean}
 */
export function closeSidebar({
    restoreFocus = true,
} = {}) {
    if (!elements.sidebar) {
        cacheElements();
    }

    if (!elements.sidebar) {
        return false;
    }

    const shouldRestoreFocus =
        restoreFocus &&
        isMobileSidebar() &&
        state.open;

    state.open = false;

    syncUI();

    if (
        shouldRestoreFocus &&
        state.previousActiveElement &&
        typeof state.previousActiveElement.focus === "function" &&
        document.contains(state.previousActiveElement)
    ) {
        requestAnimationFrame(() => {
            state.previousActiveElement?.focus();
        });
    } else if (
        shouldRestoreFocus &&
        elements.toggleButton
    ) {
        requestAnimationFrame(() => {
            elements.toggleButton?.focus();
        });
    }

    state.previousActiveElement = null;

    return true;
}

/**
 * Toggle the sidebar.
 *
 * @returns {boolean}
 */
export function toggleSidebar() {
    if (!elements.sidebar) {
        cacheElements();
    }

    if (!elements.sidebar) {
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

/**
 * Check whether the mobile sidebar is currently open.
 *
 * @returns {boolean}
 */
export function isSidebarOpen() {
    return Boolean(
        state.open && isMobileSidebar()
    );
}

/**
 * Return whether the current viewport is considered mobile.
 *
 * @returns {boolean}
 */
export function isMobileSidebar() {
    return window.innerWidth < state.mobileBreakpoint;
}

// ============================================================
// Event Binding
// ============================================================

/**
 * Bind sidebar events.
 */
function bindEvents() {
    cleanupEvents();

    const handleToggle = (event) => {
        event.preventDefault();
        toggleSidebar();
    };

    const handleBackdropClick = (event) => {
        if (event.target !== elements.backdrop) {
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
        if (!isMobileSidebar() || !state.open) {
            return;
        }

        const target = event.target;

        if (!(target instanceof Element)) {
            return;
        }

        const button = target.closest(
            "button, a"
        );

        if (!button || !elements.sidebar?.contains(button)) {
            return;
        }

        if (
            button === elements.toggleButton ||
            button.closest("[data-sidebar-ignore-close]") ||
            button.hasAttribute("data-sidebar-ignore-close")
        ) {
            return;
        }

        /*
         * Only close automatically for actual navigation items.
         *
         * Supported patterns:
         * - <a href="...">
         * - [data-sidebar-nav]
         *
         * Other sidebar controls remain usable.
         */
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

    elements.toggleButton?.addEventListener(
        "click",
        handleToggle
    );

    elements.backdrop?.addEventListener(
        "click",
        handleBackdropClick
    );

    elements.sidebar?.addEventListener(
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
        elements.toggleButton?.removeEventListener(
            "click",
            handleToggle
        );

        elements.backdrop?.removeEventListener(
            "click",
            handleBackdropClick
        );

        elements.sidebar?.removeEventListener(
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

/**
 * Remove previously bound events.
 */
function cleanupEvents() {
    if (state.cleanup) {
        state.cleanup();
        state.cleanup = null;
    }
}

// ============================================================
// UI Synchronization
// ============================================================

/**
 * Synchronize sidebar state with the DOM.
 */
function syncUI() {
    if (!elements.sidebar) {
        return;
    }

    const mobile = isMobileSidebar();

    if (!mobile) {
        /*
         * Desktop sidebar is always visible.
         *
         * Reset the mobile state here so switching back to mobile
         * does not unexpectedly reopen an old mobile session.
         */
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

/**
 * Show sidebar on desktop.
 */
function showDesktopSidebar() {
    elements.sidebar.classList.remove("hidden");
    elements.sidebar.classList.add("flex");

    elements.sidebar.setAttribute(
        "aria-hidden",
        "false"
    );

    elements.backdrop?.classList.add("hidden");

    elements.backdrop?.setAttribute(
        "aria-hidden",
        "true"
    );

    elements.toggleButton?.setAttribute(
        "aria-expanded",
        "false"
    );

    elements.toggleButton?.setAttribute(
        "aria-label",
        "Open navigation"
    );

    elements.toggleButton?.setAttribute(
        "title",
        "Open navigation"
    );

    /*
     * Critical:
     * Desktop must never inherit the mobile scroll lock.
     */
    document.body.classList.remove(
        "overflow-hidden"
    );
}

// ============================================================
// Mobile
// ============================================================

/**
 * Show sidebar on mobile.
 */
function showMobileSidebar() {
    elements.sidebar.classList.remove("hidden");
    elements.sidebar.classList.add("flex");

    elements.sidebar.setAttribute(
        "aria-hidden",
        "false"
    );

    elements.backdrop?.classList.remove("hidden");

    elements.backdrop?.setAttribute(
        "aria-hidden",
        "false"
    );

    elements.toggleButton?.setAttribute(
        "aria-expanded",
        "true"
    );

    elements.toggleButton?.setAttribute(
        "aria-label",
        "Close navigation"
    );

    elements.toggleButton?.setAttribute(
        "title",
        "Close navigation"
    );

    document.body.classList.add(
        "overflow-hidden"
    );
}

/**
 * Hide sidebar on mobile.
 */
function hideMobileSidebar() {
    elements.sidebar.classList.add("hidden");
    elements.sidebar.classList.remove("flex");

    elements.sidebar.setAttribute(
        "aria-hidden",
        "true"
    );

    elements.backdrop?.classList.add("hidden");

    elements.backdrop?.setAttribute(
        "aria-hidden",
        "true"
    );

    elements.toggleButton?.setAttribute(
        "aria-expanded",
        "false"
    );

    elements.toggleButton?.setAttribute(
        "aria-label",
        "Open navigation"
    );

    elements.toggleButton?.setAttribute(
        "title",
        "Open navigation"
    );

    document.body.classList.remove(
        "overflow-hidden"
    );
}

// ============================================================
// Focus Management
// ============================================================

/**
 * Focus the first useful element inside the sidebar.
 *
 * @returns {boolean}
 */
export function focusSidebar() {
    if (!elements.sidebar) {
        return false;
    }

    const target =
        elements.sidebar.querySelector(
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

/**
 * Open the sidebar and move focus into it.
 *
 * @returns {boolean}
 */
export function openSidebarAndFocus() {
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
// Breakpoint Configuration
// ============================================================

/**
 * Set the mobile breakpoint.
 *
 * @param {number} breakpoint
 */
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

/**
 * Get the current mobile breakpoint.
 *
 * @returns {number}
 */
export function getSidebarBreakpoint() {
    return state.mobileBreakpoint;
}

// ============================================================
// Destroy
// ============================================================

/**
 * Destroy the sidebar controller.
 *
 * Useful if the application shell is replaced dynamically.
 */
export function destroySidebar() {
    cleanupEvents();

    document.body.classList.remove(
        "overflow-hidden"
    );

    state.initialized = false;
    state.open = false;
    state.previousActiveElement = null;

    elements.sidebar = null;
    elements.backdrop = null;
    elements.toggleButton = null;
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
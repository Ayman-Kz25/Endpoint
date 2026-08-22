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
    cacheElements();

    if (!elements.sidebar) {
        return createApi();
    }

    bindEvents();
    syncUI();

    state.initialized = true;

    return createApi();
}

/**
 * Cache sidebar DOM elements.
 */
function cacheElements() {
    elements.sidebar =
        document.getElementById("sidebar");

    elements.backdrop =
        document.getElementById(
            "sidebar-backdrop"
        );

    elements.toggleButton =
        document.getElementById(
            "mobile-sidebar-button"
        );
}

// ============================================================
// Public API
// ============================================================

/**
 * Open the sidebar.
 *
 * @returns {boolean}
 */
export function openSidebar() {
    if (!elements.sidebar) {
        return false;
    }

    state.open = true;
    syncUI();

    return true;
}

/**
 * Close the sidebar.
 *
 * @returns {boolean}
 */
export function closeSidebar() {
    if (!elements.sidebar) {
        return false;
    }

    state.open = false;
    syncUI();

    return true;
}

/**
 * Toggle the sidebar.
 *
 * @returns {boolean}
 */
export function toggleSidebar() {
    if (state.open) {
        closeSidebar();
    } else {
        openSidebar();
    }

    return state.open;
}

/**
 * Check whether the sidebar is open.
 *
 * @returns {boolean}
 */
export function isSidebarOpen() {
    return state.open;
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
        if (
            event.target ===
            elements.backdrop
        ) {
            closeSidebar();
        }
    };

    const handleKeyDown = (event) => {
        if (
            event.key === "Escape" &&
            state.open
        ) {
            closeSidebar();

            elements.toggleButton?.focus();
        }
    };

    const handleResize = () => {
        syncUI();
    };

    const handleNavigationClick = (event) => {
        if (!isMobileSidebar()) {
            return;
        }

        const button =
            event.target.closest(
                "button, a"
            );

        if (!button) {
            return;
        }

        if (
            button.id ===
            "mobile-sidebar-button"
        ) {
            return;
        }

        closeSidebar();
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

    const mobile =
        isMobileSidebar();

    /*
     * Desktop:
     * The HTML uses md:flex, so the sidebar should remain
     * visible regardless of the mobile open state.
     */
    if (!mobile) {
        showDesktopSidebar();
        return;
    }

    if (state.open) {
        showMobileSidebar();
    } else {
        hideMobileSidebar();
    }
}

/**
 * Show sidebar on desktop.
 */
function showDesktopSidebar() {
    elements.sidebar.classList.remove(
        "hidden"
    );

    elements.sidebar.classList.add(
        "flex"
    );

    elements.sidebar.removeAttribute(
        "aria-hidden"
    );

    elements.backdrop?.classList.add(
        "hidden"
    );

    elements.backdrop?.setAttribute(
        "aria-hidden",
        "true"
    );

    elements.toggleButton?.setAttribute(
        "aria-expanded",
        "false"
    );
}

/**
 * Show sidebar on mobile.
 */
function showMobileSidebar() {
    elements.sidebar.classList.remove(
        "hidden"
    );

    elements.sidebar.classList.add(
        "flex"
    );

    elements.sidebar.setAttribute(
        "aria-hidden",
        "false"
    );

    elements.backdrop?.classList.remove(
        "hidden"
    );

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
    elements.sidebar.classList.add(
        "hidden"
    );

    elements.sidebar.classList.remove(
        "flex"
    );

    elements.sidebar.setAttribute(
        "aria-hidden",
        "true"
    );

    elements.backdrop?.classList.add(
        "hidden"
    );

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
            "button:not([disabled]), a[href]"
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
    const opened = openSidebar();

    if (!opened) {
        return false;
    }

    if (isMobileSidebar()) {
        requestAnimationFrame(() => {
            focusSidebar();
        });
    }

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
    const value =
        Number(breakpoint);

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
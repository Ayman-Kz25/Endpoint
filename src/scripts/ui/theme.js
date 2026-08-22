// src/scripts/ui/theme.js

import { createIcons, icons } from "lucide";

// ============================================================
// Constants
// ============================================================

const THEME_KEY = "endpoint-theme";

const THEMES = {
    LIGHT: "light",
    DARK: "dark",
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize application theme.
 *
 * Priority:
 * 1. Previously saved theme
 * 2. System preference
 * 3. Light theme fallback
 *
 * @returns {string} Active theme
 */
export function initializeTheme() {
    const savedTheme = getSavedTheme();
    const theme = savedTheme || getSystemTheme();

    applyTheme(theme, {
        persist: false,
    });

    const button = document.getElementById("theme-toggle");

    if (button && !button.dataset.themeBound) {
        button.addEventListener("click", toggleTheme);
        button.dataset.themeBound = "true";
    }

    return theme;
}

// ============================================================
// Theme Access
// ============================================================

/**
 * Get the currently active theme.
 *
 * @returns {"light"|"dark"}
 */
export function getTheme() {
    const theme =
        document.documentElement.dataset.theme;

    return isValidTheme(theme)
        ? theme
        : THEMES.LIGHT;
}

/**
 * Get the user's saved theme preference.
 *
 * @returns {"light"|"dark"|null}
 */
function getSavedTheme() {
    try {
        const savedTheme =
            localStorage.getItem(THEME_KEY);

        return isValidTheme(savedTheme)
            ? savedTheme
            : null;
    } catch {
        return null;
    }
}

/**
 * Get the operating system theme preference.
 *
 * @returns {"light"|"dark"}
 */
function getSystemTheme() {
    if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
    ) {
        return THEMES.LIGHT;
    }

    return window.matchMedia(
        "(prefers-color-scheme: dark)"
    ).matches
        ? THEMES.DARK
        : THEMES.LIGHT;
}

/**
 * Check whether a theme value is supported.
 *
 * @param {string|null|undefined} theme
 * @returns {boolean}
 */
function isValidTheme(theme) {
    return (
        theme === THEMES.LIGHT ||
        theme === THEMES.DARK
    );
}

// ============================================================
// Theme Mutation
// ============================================================

/**
 * Toggle between light and dark themes.
 *
 * @returns {string} New active theme
 */
export function toggleTheme() {
    const currentTheme = getTheme();

    const nextTheme =
        currentTheme === THEMES.LIGHT
            ? THEMES.DARK
            : THEMES.LIGHT;

    applyTheme(nextTheme, {
        persist: true,
    });

    return nextTheme;
}

/**
 * Set a specific theme.
 *
 * @param {"light"|"dark"} theme
 * @returns {string} Active theme
 */
export function setTheme(theme) {
    if (!isValidTheme(theme)) {
        return getTheme();
    }

    applyTheme(theme, {
        persist: true,
    });

    return theme;
}

/**
 * Apply a theme to the document.
 *
 * @param {"light"|"dark"} theme
 * @param {Object} options
 * @param {boolean} [options.persist=false]
 * @returns {string}
 */
function applyTheme(
    theme,
    { persist = false } = {}
) {
    if (!isValidTheme(theme)) {
        theme = THEMES.LIGHT;
    }

    document.documentElement.dataset.theme = theme;

    if (persist) {
        saveTheme(theme);
    }

    updateThemeIcon(theme);

    return theme;
}

/**
 * Save theme preference.
 *
 * @param {"light"|"dark"} theme
 */
function saveTheme(theme) {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // Ignore storage errors.
        // The theme still works for the current session.
    }
}

// ============================================================
// Theme Icon
// ============================================================

/**
 * Update the theme toggle icon and accessibility labels.
 *
 * The button displays the action the user can take next:
 * - Light theme -> moon icon / "Switch to dark theme"
 * - Dark theme -> sun icon / "Switch to light theme"
 *
 * @param {"light"|"dark"} theme
 */
function updateThemeIcon(theme) {
    const button =
        document.getElementById("theme-toggle");

    if (!button) {
        return;
    }

    const isDark = theme === THEMES.DARK;

    const iconName = isDark
        ? "sun"
        : "moon";

    const label = isDark
        ? "Switch to light theme"
        : "Switch to dark theme";

    let icon = button.querySelector(
        "[data-lucide]"
    );

    if (!icon) {
        icon = document.createElement("i");

        icon.className = "h-4 w-4";
        icon.setAttribute("aria-hidden", "true");

        button.replaceChildren(icon);
    }

    icon.setAttribute(
        "data-lucide",
        iconName
    );

    icon.setAttribute(
        "aria-hidden",
        "true"
    );

    button.setAttribute(
        "aria-label",
        label
    );

    button.setAttribute(
        "title",
        label
    );

    createIcons({
        icons,
        attrs: {
            class: "h-4 w-4",
        },
    });
}

// ============================================================
// System Theme Changes
// ============================================================

/**
 * Listen for operating-system theme changes.
 *
 * This only applies when the user has not explicitly selected
 * a theme and therefore has no saved theme preference.
 *
 * @returns {Function|null} Cleanup function
 */
export function watchSystemTheme() {
    if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
    ) {
        return null;
    }

    const mediaQuery = window.matchMedia(
        "(prefers-color-scheme: dark)"
    );

    const handleChange = () => {
        if (getSavedTheme()) {
            return;
        }

        applyTheme(
            mediaQuery.matches
                ? THEMES.DARK
                : THEMES.LIGHT,
            {
                persist: false,
            }
        );
    };

    mediaQuery.addEventListener(
        "change",
        handleChange
    );

    return () => {
        mediaQuery.removeEventListener(
            "change",
            handleChange
        );
    };
}

// ============================================================
// Storage
// ============================================================

/**
 * Clear the saved theme preference.
 *
 * After clearing it, the application follows the system
 * preference again.
 *
 * @returns {string} Theme applied after reset
 */
export function resetTheme() {
    try {
        localStorage.removeItem(THEME_KEY);
    } catch {
        // Ignore storage errors.
    }

    const systemTheme = getSystemTheme();

    applyTheme(systemTheme, {
        persist: false,
    });

    return systemTheme;
}

// ============================================================
// Default Export
// ============================================================

export default {
    initializeTheme,
    getTheme,
    toggleTheme,
    setTheme,
    watchSystemTheme,
    resetTheme,
};
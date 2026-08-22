// src/scripts/ui/loader.js

/**
 * Loader UI
 *
 * Provides a centralized loading-state controller for the application.
 *
 * Responsibilities:
 * - Show and hide request loading state
 * - Synchronize loading state with the global UI state
 * - Disable request actions while loading
 * - Update accessible loading attributes
 * - Control the response loading overlay
 *
 * This module does not:
 * - Execute requests
 * - Manage API state
 * - Render response data
 */

import state from "../core/state.js";

// ============================================================
// DOM References
// ============================================================

const elements = {
    loadingState: null,
    sendButton: null,
    saveButton: null,
    responseWorkspace: null,
};

// ============================================================
// Internal State
// ============================================================

const loaderState = {
    initialized: false,
    active: false,
    message: "Sending request...",
    previousSendText: null,
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the loader UI.
 *
 * @returns {Object} Loader API
 */
export function initLoader() {
    cacheElements();
    syncUI();

    loaderState.initialized = true;

    return createAPI();
}

/**
 * Cache loader-related DOM elements.
 */
function cacheElements() {
    elements.loadingState =
        document.getElementById(
            "response-loading-state"
        );

    elements.sendButton =
        document.getElementById(
            "send-request-button"
        );

    elements.saveButton =
        document.getElementById(
            "save-request-button"
        );

    elements.responseWorkspace =
        document.getElementById(
            "response-workspace"
        );
}

// ============================================================
// Public API
// ============================================================

/**
 * Start the loading state.
 *
 * @param {string} [message]
 * @returns {boolean}
 */
export function startLoading(
    message = "Sending request..."
) {
    loaderState.active = true;
    loaderState.message =
        String(message || "Loading...");

    state.ui.isLoading = true;

    syncUI();

    return true;
}

/**
 * Stop the loading state.
 *
 * @returns {boolean}
 */
export function stopLoading() {
    loaderState.active = false;

    state.ui.isLoading = false;

    syncUI();

    return true;
}

/**
 * Set the loading state explicitly.
 *
 * @param {boolean} loading
 * @param {string} [message]
 * @returns {boolean}
 */
export function setLoading(
    loading,
    message = "Sending request..."
) {
    if (loading) {
        return startLoading(message);
    }

    return stopLoading();
}

/**
 * Check whether loading is active.
 *
 * @returns {boolean}
 */
export function isLoading() {
    return loaderState.active;
}

/**
 * Get the current loading message.
 *
 * @returns {string}
 */
export function getLoadingMessage() {
    return loaderState.message;
}

// ============================================================
// UI Synchronization
// ============================================================

/**
 * Synchronize the loader state with the DOM.
 */
export function syncUI() {
    if (!elements.loadingState) {
        cacheElements();
    }

    const active =
        loaderState.active ||
        Boolean(state.ui?.isLoading);

    if (active) {
        showLoadingUI();
    } else {
        hideLoadingUI();
    }
}

/**
 * Show loading UI.
 */
function showLoadingUI() {
    if (elements.loadingState) {
        elements.loadingState.classList.remove(
            "hidden"
        );

        elements.loadingState.classList.add(
            "flex"
        );

        elements.loadingState.setAttribute(
            "aria-hidden",
            "false"
        );

        elements.loadingState.setAttribute(
            "aria-busy",
            "true"
        );

        updateLoadingMessage();
    }

    if (elements.sendButton) {
        if (
            loaderState.previousSendText === null
        ) {
            loaderState.previousSendText =
                getButtonText(
                    elements.sendButton
                );
        }

        elements.sendButton.disabled = true;

        elements.sendButton.setAttribute(
            "aria-busy",
            "true"
        );

        elements.sendButton.setAttribute(
            "aria-label",
            loaderState.message
        );

        updateSendButton();
    }

    if (elements.saveButton) {
        elements.saveButton.disabled = true;
        elements.saveButton.setAttribute(
            "aria-disabled",
            "true"
        );
    }

    if (elements.responseWorkspace) {
        elements.responseWorkspace.setAttribute(
            "aria-busy",
            "true"
        );
    }
}

/**
 * Hide loading UI.
 */
function hideLoadingUI() {
    if (elements.loadingState) {
        elements.loadingState.classList.add(
            "hidden"
        );

        elements.loadingState.classList.remove(
            "flex"
        );

        elements.loadingState.setAttribute(
            "aria-hidden",
            "true"
        );

        elements.loadingState.setAttribute(
            "aria-busy",
            "false"
        );
    }

    if (elements.sendButton) {
        elements.sendButton.disabled = false;

        elements.sendButton.setAttribute(
            "aria-busy",
            "false"
        );

        elements.sendButton.removeAttribute(
            "aria-label"
        );

        restoreSendButton();
    }

    if (elements.saveButton) {
        elements.saveButton.disabled = false;

        elements.saveButton.removeAttribute(
            "aria-disabled"
        );
    }

    if (elements.responseWorkspace) {
        elements.responseWorkspace.setAttribute(
            "aria-busy",
            "false"
        );
    }
}

/**
 * Update loading message inside the overlay.
 */
function updateLoadingMessage() {
    if (!elements.loadingState) {
        return;
    }

    const message =
        elements.loadingState.querySelector(
            "[data-loader-message]"
        );

    if (message) {
        message.textContent =
            loaderState.message;

        return;
    }

    /*
     * The supplied HTML does not currently expose
     * a dedicated message element, so update only the
     * visible text node while preserving the spinner.
     */
    const textElement =
        elements.loadingState.querySelector(
            "span"
        );

    if (textElement) {
        textElement.textContent =
            loaderState.message;

        return;
    }

    const textNodes =
        Array.from(
            elements.loadingState.childNodes
        ).filter(
            (node) =>
                node.nodeType ===
                Node.TEXT_NODE
        );

    const lastTextNode =
        textNodes[textNodes.length - 1];

    if (lastTextNode) {
        lastTextNode.textContent =
            ` ${loaderState.message}`;
    }
}

/**
 * Update the Send button while loading.
 */
function updateSendButton() {
    if (!elements.sendButton) {
        return;
    }

    const icon =
        elements.sendButton.querySelector(
           ("[data-lucide]")
        );

    if (icon) {
        icon.setAttribute(
            "data-lucide",
            "loader-circle"
        );

        icon.classList.add(
            "animate-spin"
        );
    }

    const label =
        elements.sendButton.querySelector(
            "span"
        );

    if (label) {
        label.textContent = "Sending...";
    }
}

/**
 * Restore the Send button after loading.
 */
function restoreSendButton() {
    if (!elements.sendButton) {
        return;
    }

    const icon =
        elements.sendButton.querySelector(
            "[data-lucide]"
        );

    if (icon) {
        icon.setAttribute(
            "data-lucide",
            "send"
        );

        icon.classList.remove(
            "animate-spin"
        );
    }

    const label =
        elements.sendButton.querySelector(
            "span"
        );

    if (label) {
        label.textContent =
            loaderState.previousSendText ||
            "Send";
    }

    loaderState.previousSendText = null;
}

// ============================================================
// Button Helpers
// ============================================================

/**
 * Get visible text from a button.
 *
 * @param {HTMLElement} button
 * @returns {string}
 */
function getButtonText(button) {
    const label =
        button.querySelector("span");

    if (label) {
        return label.textContent.trim();
    }

    return button.textContent.trim();
}

// ============================================================
// Promise Helper
// ============================================================

/**
 * Run an async operation while showing the loader.
 *
 * @param {Function} operation
 * @param {string} [message]
 * @returns {Promise<*>}
 */
export async function withLoading(
    operation,
    message = "Sending request..."
) {
    if (typeof operation !== "function") {
        throw new TypeError(
            "withLoading requires a function."
        );
    }

    startLoading(message);

    try {
        return await operation();
    } finally {
        stopLoading();
    }
}

// ============================================================
// Request Loading Helpers
// ============================================================

/**
 * Start request loading.
 *
 * Convenience alias for request-related code.
 *
 * @returns {boolean}
 */
export function startRequestLoading() {
    return startLoading(
        "Sending request..."
    );
}

/**
 * Stop request loading.
 *
 * @returns {boolean}
 */
export function stopRequestLoading() {
    return stopLoading();
}

// ============================================================
// Destroy
// ============================================================

/**
 * Destroy the loader state.
 */
export function destroyLoader() {
    stopLoading();

    loaderState.initialized = false;
    loaderState.message =
        "Sending request...";
    loaderState.previousSendText = null;

    elements.loadingState = null;
    elements.sendButton = null;
    elements.saveButton = null;
    elements.responseWorkspace = null;
}

// ============================================================
// API
// ============================================================

function createAPI() {
    return {
        start: startLoading,
        stop: stopLoading,
        set: setLoading,
        isLoading,
        getMessage: getLoadingMessage,
        sync: syncUI,
        withLoading,
        startRequest: startRequestLoading,
        stopRequest: stopRequestLoading,
        destroy: destroyLoader,
    };
}

export default {
    initLoader,
    startLoading,
    stopLoading,
    setLoading,
    isLoading,
    getLoadingMessage,
    syncUI,
    withLoading,
    startRequestLoading,
    stopRequestLoading,
    destroyLoader,
};
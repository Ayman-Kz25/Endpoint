/**
 * Loader UI
 *
 * Provides a small, centralized controller for application loading states.
 *
 * Responsibilities:
 * - Show and hide the request loading state
 * - Synchronize loading state with global UI state
 * - Disable request-related actions while loading
 * - Update accessible loading attributes
 * - Update the loading message
 * - Restore controlled UI state after loading
 *
 * This module does not:
 * - Execute requests
 * - Manage API state
 * - Render response data
 */

import state from "../core/state.js";

// ============================================================
// Constants
// ============================================================

const DEFAULT_LOADING_MESSAGE = "Sending request...";

const ELEMENT_IDS = {
    loadingState: "response-loading-state",
    sendButton: "send-request-button",
    saveButton: "save-request-button",
    responseWorkspace: "response-workspace",
};

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
    message: DEFAULT_LOADING_MESSAGE,

    sendButtonSnapshot: null,
    saveButtonSnapshot: null,
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the loader UI.
 *
 * Safe to call multiple times.
 *
 * @returns {Object} Loader API
 */
export function initLoader() {
    cacheElements();

    loaderState.initialized = true;

    syncUI();

    return createAPI();
}

/**
 * Cache loader-related DOM elements.
 *
 * This function is safe to call repeatedly because the application
 * may replace parts of the DOM dynamically.
 */
function cacheElements() {
    elements.loadingState =
        document.getElementById(ELEMENT_IDS.loadingState);

    elements.sendButton =
        document.getElementById(ELEMENT_IDS.sendButton);

    elements.saveButton =
        document.getElementById(ELEMENT_IDS.saveButton);

    elements.responseWorkspace =
        document.getElementById(ELEMENT_IDS.responseWorkspace);
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
    message = DEFAULT_LOADING_MESSAGE
) {
    cacheElements();

    if (!loaderState.active) {
        captureButtonStates();
    }

    loaderState.active = true;
    loaderState.message = normalizeMessage(message);

    syncGlobalLoadingState(true);
    syncUI();

    return true;
}

/**
 * Stop the loading state.
 *
 * @returns {boolean}
 */
export function stopLoading() {
    cacheElements();

    if (!loaderState.active) {
        syncGlobalLoadingState(false);
        syncUI();
        return false;
    }

    loaderState.active = false;

    syncGlobalLoadingState(false);
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
    message = DEFAULT_LOADING_MESSAGE
) {
    return loading
        ? startLoading(message)
        : stopLoading();
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
// Global State
// ============================================================

/**
 * Synchronize the application loading state.
 *
 * @param {boolean} loading
 */
function syncGlobalLoadingState(loading) {
    if (!state || typeof state !== "object") {
        return;
    }

    if (!state.ui || typeof state.ui !== "object") {
        state.ui = {};
    }

    state.ui.isLoading = Boolean(loading);
}

// ============================================================
// UI Synchronization
// ============================================================

/**
 * Synchronize the DOM with the current loader state.
 */
export function syncUI() {
    cacheElements();

    if (loaderState.active) {
        showLoadingUI();
    } else {
        hideLoadingUI();
    }
}

/**
 * Show the loading UI.
 */
function showLoadingUI() {
    const loadingState = elements.loadingState;

    if (loadingState) {
        loadingState.classList.remove("hidden");
        loadingState.setAttribute("aria-hidden", "false");
        loadingState.setAttribute("aria-busy", "true");

        updateLoadingMessage();
    }

    if (elements.sendButton) {
        applySendButtonLoadingState(
            elements.sendButton
        );
    }

    if (elements.saveButton) {
        applySaveButtonLoadingState(
            elements.saveButton
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
 * Hide the loading UI.
 */
function hideLoadingUI() {
    const loadingState = elements.loadingState;

    if (loadingState) {
        loadingState.classList.add("hidden");
        loadingState.setAttribute("aria-hidden", "true");
        loadingState.setAttribute("aria-busy", "false");
    }

    if (elements.responseWorkspace) {
        elements.responseWorkspace.setAttribute(
            "aria-busy",
            "false"
        );
    }

    restoreButtonStates();
}

// ============================================================
// Loading Message
// ============================================================

/**
 * Update the loading message.
 */
function updateLoadingMessage() {
    const loadingState = elements.loadingState;

    if (!loadingState) {
        return;
    }

    let messageElement =
        loadingState.querySelector(
            "[data-loader-message]"
        );

    if (!messageElement) {
        messageElement =
            loadingState.querySelector(
                "[data-loader-label], .loader-message"
            );
    }

    if (!messageElement) {
        messageElement =
            document.createElement("span");

        messageElement.className =
            "loader-message";

        messageElement.setAttribute(
            "data-loader-message",
            ""
        );

        loadingState.appendChild(
            messageElement
        );
    }

    messageElement.textContent =
        loaderState.message;
}

// ============================================================
// Button State
// ============================================================

/**
 * Capture button states before loading starts.
 */
function captureButtonStates() {
    loaderState.sendButtonSnapshot =
        elements.sendButton
            ? createButtonSnapshot(
                  elements.sendButton
              )
            : null;

    loaderState.saveButtonSnapshot =
        elements.saveButton
            ? createButtonSnapshot(
                  elements.saveButton
              )
            : null;
}

/**
 * Create a button state snapshot.
 *
 * @param {HTMLButtonElement} button
 * @returns {Object}
 */
function createButtonSnapshot(button) {
    const icon =
        button.querySelector("[data-lucide]");

    const label =
        getButtonLabelElement(button);

    return {
        disabled: button.disabled,
        ariaBusy:
            button.getAttribute("aria-busy"),
        ariaDisabled:
            button.getAttribute("aria-disabled"),
        ariaLabel:
            button.getAttribute("aria-label"),

        iconName:
            icon?.getAttribute("data-lucide") ?? null,

        iconClassName:
            icon?.className ?? null,

        labelText:
            label?.textContent ?? null,
    };
}

/**
 * Apply loading state to the Send button.
 *
 * @param {HTMLButtonElement} button
 */
function applySendButtonLoadingState(button) {
    button.disabled = true;

    button.setAttribute(
        "aria-busy",
        "true"
    );

    button.setAttribute(
        "aria-label",
        loaderState.message
    );

    const icon =
        button.querySelector("[data-lucide]");

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
        getButtonLabelElement(button);

    if (label) {
        label.textContent = "Sending...";
    }
}

/**
 * Apply loading state to the Save button.
 *
 * @param {HTMLButtonElement} button
 */
function applySaveButtonLoadingState(button) {
    button.disabled = true;

    button.setAttribute(
        "aria-busy",
        "true"
    );
}

/**
 * Restore button states captured before loading.
 */
function restoreButtonStates() {
    restoreButton(
        elements.sendButton,
        loaderState.sendButtonSnapshot
    );

    restoreButton(
        elements.saveButton,
        loaderState.saveButtonSnapshot
    );

    loaderState.sendButtonSnapshot = null;
    loaderState.saveButtonSnapshot = null;
}

/**
 * Restore a button from its snapshot.
 *
 * @param {HTMLButtonElement|null} button
 * @param {Object|null} snapshot
 */
function restoreButton(button, snapshot) {
    if (!button || !snapshot) {
        return;
    }

    button.disabled = snapshot.disabled;

    restoreAttribute(
        button,
        "aria-busy",
        snapshot.ariaBusy
    );

    restoreAttribute(
        button,
        "aria-disabled",
        snapshot.ariaDisabled
    );

    restoreAttribute(
        button,
        "aria-label",
        snapshot.ariaLabel
    );

    const icon =
        button.querySelector("[data-lucide]");

    if (icon) {
        if (snapshot.iconName !== null) {
            icon.setAttribute(
                "data-lucide",
                snapshot.iconName
            );
        } else {
            icon.removeAttribute(
                "data-lucide"
            );
        }

        if (snapshot.iconClassName !== null) {
            icon.className =
                snapshot.iconClassName;
        }
    }

    const label =
        getButtonLabelElement(button);

    if (
        label &&
        snapshot.labelText !== null
    ) {
        label.textContent =
            snapshot.labelText;
    }
}

/**
 * Restore an attribute to its original value.
 *
 * @param {HTMLElement} element
 * @param {string} name
 * @param {string|null} value
 */
function restoreAttribute(
    element,
    name,
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        element.removeAttribute(name);
        return;
    }

    element.setAttribute(
        name,
        value
    );
}

/**
 * Find the most appropriate label element inside a button.
 *
 * @param {HTMLElement} button
 * @returns {HTMLElement|null}
 */
function getButtonLabelElement(button) {
    return (
        button.querySelector(
            "[data-button-label]"
        ) ||
        button.querySelector(
            ".button-label"
        ) ||
        button.querySelector("span")
    );
}

// ============================================================
// Promise Helper
// ============================================================

/**
 * Run an async operation while displaying the loader.
 *
 * @param {Function} operation
 * @param {string} [message]
 * @returns {Promise<*>}
 */
export async function withLoading(
    operation,
    message = DEFAULT_LOADING_MESSAGE
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
// Request Helpers
// ============================================================

/**
 * Start request loading.
 *
 * @returns {boolean}
 */
export function startRequestLoading() {
    return startLoading(
        DEFAULT_LOADING_MESSAGE
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
 * Destroy the loader controller.
 */
export function destroyLoader() {
    cacheElements();

    loaderState.active = false;

    syncGlobalLoadingState(false);

    hideLoadingUI();

    loaderState.initialized = false;
    loaderState.message =
        DEFAULT_LOADING_MESSAGE;

    loaderState.sendButtonSnapshot = null;
    loaderState.saveButtonSnapshot = null;

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

// ============================================================
// Default Export
// ============================================================

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
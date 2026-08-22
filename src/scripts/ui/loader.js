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

    // Send button state captured immediately before loading.
    sendButtonSnapshot: null,

    // Save button state captured immediately before loading.
    saveButtonSnapshot: null,
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the loader UI.
 *
 * Safe to call more than once.
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
 * This is intentionally safe to call repeatedly because parts
 * of the application may be rendered dynamically.
 */
function cacheElements() {
    elements.loadingState =
        document.getElementById(
            ELEMENT_IDS.loadingState
        );

    elements.sendButton =
        document.getElementById(
            ELEMENT_IDS.sendButton
        );

    elements.saveButton =
        document.getElementById(
            ELEMENT_IDS.saveButton
        );

    elements.responseWorkspace =
        document.getElementById(
            ELEMENT_IDS.responseWorkspace
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
    message = DEFAULT_LOADING_MESSAGE
) {
    cacheElements();

    // Capture button state only on the first transition
    // into loading. Repeated calls must not overwrite it.
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

    loaderState.active = false;

    syncGlobalLoadingState(false);
    syncUI();

    restoreButtonStates();

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
// Global State Synchronization
// ============================================================

/**
 * Synchronize the application loading state.
 *
 * Handles state objects that may not yet have a ui property.
 *
 * @param {boolean} loading
 */
function syncGlobalLoadingState(loading) {
    if (!state || typeof state !== "object") {
        return;
    }

    if (
        !state.ui ||
        typeof state.ui !== "object"
    ) {
        state.ui = {};
    }

    state.ui.isLoading = Boolean(loading);
}

// ============================================================
// UI Synchronization
// ============================================================

/**
 * Synchronize the loader state with the DOM.
 *
 * @returns {void}
 */
export function syncUI() {
    cacheElements();

    const active = loaderState.active;

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
    cacheElements();

    if (elements.loadingState) {
        showElement(elements.loadingState);

        elements.loadingState.setAttribute(
            "aria-busy",
            "true"
        );

        updateLoadingMessage();
    }

    if (elements.sendButton) {
        applySendButtonLoadingState();
    }

    if (elements.saveButton) {
        applySaveButtonLoadingState();
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
    cacheElements();

    if (elements.loadingState) {
        hideElement(elements.loadingState);

        elements.loadingState.setAttribute(
            "aria-busy",
            "false"
        );
    }

    if (elements.responseWorkspace) {
        elements.responseWorkspace.setAttribute(
            "aria-busy",
            "false"
        );
    }

    restoreButtonStates();
}

/**
 * Show an element.
 *
 * @param {HTMLElement} element
 */
function showElement(element) {
    element.classList.remove("hidden");

    // Only use flex when the element is designed as a flex container.
    // If it already has a display utility, preserve that instead.
    if (
        !element.classList.contains("block") &&
        !element.classList.contains("grid") &&
        !element.classList.contains("inline-flex") &&
        !element.classList.contains("inline-block")
    ) {
        element.classList.add("flex");
    }

    element.setAttribute(
        "aria-hidden",
        "false"
    );
}

/**
 * Hide an element.
 *
 * @param {HTMLElement} element
 */
function hideElement(element) {
    element.classList.add("hidden");
    element.classList.remove("flex");

    element.setAttribute(
        "aria-hidden",
        "true"
    );
}

// ============================================================
// Loading Message
// ============================================================

/**
 * Update the loading message inside the overlay.
 */
function updateLoadingMessage() {
    const loadingState = elements.loadingState;

    if (!loadingState) {
        return;
    }

    const message =
        loadingState.querySelector(
            "[data-loader-message]"
        );

    if (message) {
        message.textContent =
            loaderState.message;
        return;
    }

    // Prefer a span only when it appears to be a dedicated
    // loader label. This avoids accidentally changing spinner
    // text or unrelated content.
    const label =
        loadingState.querySelector(
            '[data-loader-label], .loader-message'
        );

    if (label) {
        label.textContent =
            loaderState.message;
        return;
    }

    // If no dedicated message element exists, create one.
    // This gives the loader a reliable target for future updates.
    const generatedMessage =
        document.createElement("span");

    generatedMessage.setAttribute(
        "data-loader-message",
        ""
    );

    generatedMessage.className =
        "loader-message";

    generatedMessage.textContent =
        loaderState.message;

    loadingState.appendChild(
        generatedMessage
    );
}

// ============================================================
// Button State
// ============================================================

/**
 * Capture button state before entering loading mode.
 */
function captureButtonStates() {
    cacheElements();

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
 * Create a snapshot of a button's current state.
 *
 * @param {HTMLElement} button
 * @returns {Object}
 */
function createButtonSnapshot(button) {
    const icon =
        button.querySelector(
            "[data-lucide]"
        );

    const label =
        getButtonLabelElement(button);

    return {
        disabled: button.disabled,

        ariaBusy:
            button.getAttribute(
                "aria-busy"
            ),

        ariaDisabled:
            button.getAttribute(
                "aria-disabled"
            ),

        ariaLabel:
            button.getAttribute(
                "aria-label"
            ),

        iconName:
            icon?.getAttribute(
                "data-lucide"
            ) ?? null,

        iconClassName:
            icon?.className ?? null,

        labelText:
            label?.textContent ?? null,

        textContent:
            button.textContent.trim(),
    };
}

/**
 * Apply loading state to the Send button.
 */
function applySendButtonLoadingState() {
    const button = elements.sendButton;

    if (!button) {
        return;
    }

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
        button.querySelector(
            "[data-lucide]"
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
        getButtonLabelElement(button);

    if (label) {
        label.textContent = "Sending...";
    }
}

/**
 * Apply loading state to the Save button.
 */
function applySaveButtonLoadingState() {
    const button = elements.saveButton;

    if (!button) {
        return;
    }

    button.disabled = true;

    button.setAttribute(
        "aria-disabled",
        "true"
    );
}

/**
 * Restore button state captured before loading.
 */
function restoreButtonStates() {
    restoreSendButton();
    restoreSaveButton();
}

/**
 * Restore Send button.
 */
function restoreSendButton() {
    const button = elements.sendButton;
    const snapshot =
        loaderState.sendButtonSnapshot;

    if (!button) {
        loaderState.sendButtonSnapshot = null;
        return;
    }

    if (snapshot) {
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
            button.querySelector(
                "[data-lucide]"
            );

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

            if (
                snapshot.iconClassName !== null
            ) {
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

        loaderState.sendButtonSnapshot =
            null;

        return;
    }

    // No snapshot means the loader did not initiate
    // this loading cycle. Restore only the properties
    // this module owns.
    button.disabled = false;

    button.setAttribute(
        "aria-busy",
        "false"
    );

    button.removeAttribute(
        "aria-label"
    );

    const icon =
        button.querySelector(
            "[data-lucide]"
        );

    if (icon) {
        icon.classList.remove(
            "animate-spin"
        );
    }
}

/**
 * Restore Save button.
 */
function restoreSaveButton() {
    const button = elements.saveButton;
    const snapshot =
        loaderState.saveButtonSnapshot;

    if (!button) {
        loaderState.saveButtonSnapshot = null;
        return;
    }

    if (snapshot) {
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

        loaderState.saveButtonSnapshot =
            null;

        return;
    }

    button.disabled = false;

    button.removeAttribute(
        "aria-disabled"
    );
}

/**
 * Restore an attribute to its previous value.
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
        button.querySelector(
            "span"
        )
    );
}

// ============================================================
// Helpers
// ============================================================

/**
 * Normalize a loading message.
 *
 * @param {*} message
 * @returns {string}
 */
function normalizeMessage(message) {
    if (
        message === null ||
        message === undefined ||
        String(message).trim() === ""
    ) {
        return "Loading...";
    }

    return String(message);
}

// ============================================================
// Promise Helper
// ============================================================

/**
 * Run an async operation while showing the loader.
 *
 * The loader is always stopped when the operation completes,
 * whether it resolves or rejects.
 *
 * @param {Function} operation
 * @param {string} [message]
 * @returns {Promise<*>}
 */
export async function withLoading(
    operation,
    message = DEFAULT_LOADING_MESSAGE
) {
    if (
        typeof operation !==
        "function"
    ) {
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
 * Destroy the loader state.
 */
export function destroyLoader() {
    // Restore any UI controlled by this module before
    // removing our references.
    if (
        loaderState.active ||
        loaderState.sendButtonSnapshot ||
        loaderState.saveButtonSnapshot
    ) {
        loaderState.active = false;

        syncGlobalLoadingState(false);

        cacheElements();

        hideLoadingUI();
    } else {
        syncGlobalLoadingState(false);
    }

    loaderState.initialized = false;
    loaderState.active = false;
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
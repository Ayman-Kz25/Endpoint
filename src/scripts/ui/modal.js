// src/scripts/ui/modal.js

/**
 * Modal UI
 *
 * Provides a small, reusable modal system for the application.
 *
 * Responsibilities:
 * - Open and close modal dialogs
 * - Render modal content
 * - Handle Escape key
 * - Handle backdrop clicks
 * - Manage focus
 * - Keep modal-root synchronized
 *
 * This module does not:
 * - Manage application state
 * - Decide when a modal should open
 * - Perform API requests
 * - Initialize itself from main.js
 */

const ROOT_ID = "modal-root";

const state = {
    open: false,
    previousActiveElement: null,
    keydownHandler: null,
    config: null,
    instanceId: 0,
    bodyOverflowLocked: false,
    bodyHadOverflowHidden: false,
};

const elements = {
    root: null,
    overlay: null,
    dialog: null,
    closeButton: null,
};

// ============================================================
// DOM
// ============================================================

/**
 * Get the modal root.
 *
 * @returns {HTMLElement|null}
 */
function getRoot() {
    if (
        elements.root &&
        document.contains(elements.root)
    ) {
        return elements.root;
    }

    elements.root = document.getElementById(ROOT_ID);

    return elements.root;
}

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the modal module.
 *
 * @returns {Object} Modal API
 */
export function initModal() {
    const root = getRoot();

    if (!root) {
        console.warn(
            `[modal] #${ROOT_ID} was not found in the document.`
        );

        return {
            open: openModal,
            close: closeModal,
            isOpen: isModalOpen,
            setContent: setModalContent,
        };
    }

    root.setAttribute("aria-live", "polite");

    /*
     * Recover from a DOM replacement where the previous modal
     * instance no longer exists.
     */
    if (
        state.open &&
        !root.querySelector("[data-modal-dialog]")
    ) {
        resetState();
    }

    return {
        open: openModal,
        close: closeModal,
        isOpen: isModalOpen,
        setContent: setModalContent,
    };
}

// ============================================================
// Public API
// ============================================================

/**
 * Open a modal.
 *
 * @param {Object} options
 * @returns {Object|null}
 */
export function openModal(options = {}) {
    const root = getRoot();

    if (!root) {
        console.warn(
            `[modal] Cannot open modal because #${ROOT_ID} was not found.`
        );

        return null;
    }

    /*
     * Always close an existing modal before creating a new one.
     * Do not restore focus here because focus should move into
     * the newly opened modal instead.
     */
    if (state.open) {
        closeModal({
            restoreFocus: false,
            invokeOnClose: true,
        });
    }

    const config = normalizeOptions(options);

    state.instanceId += 1;

    const instanceId = state.instanceId;

    state.previousActiveElement =
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

    state.config = config;

    root.innerHTML = createModalMarkup(config);

    cacheModalElements();

    if (
        !elements.overlay ||
        !elements.dialog
    ) {
        resetState();
        return null;
    }

    /*
     * Store the configuration on the generated dialog.
     * This is required by backdrop handling and also provides
     * a useful reference for DOM-level integrations.
     */
    elements.dialog.__modalConfig = config;
    elements.dialog.__modalInstanceId = instanceId;

    state.open = true;

    bindModalEvents(config, instanceId);

    lockBodyScroll();

    requestAnimationFrame(() => {
        /*
         * Do not focus an obsolete modal after another modal
         * has already been opened.
         */
        if (
            state.open &&
            state.instanceId === instanceId &&
            elements.dialog
        ) {
            focusInitialElement();
        }
    });

    return {
        close: () => {
            if (state.instanceId !== instanceId) {
                return false;
            }

            return closeModal();
        },

        confirm: () => {
            if (state.instanceId !== instanceId) {
                return false;
            }

            return handleConfirm(config, instanceId);
        },

        cancel: () => {
            if (state.instanceId !== instanceId) {
                return false;
            }

            return handleCancel(config, instanceId);
        },

        setContent: (content) => {
            if (state.instanceId !== instanceId) {
                return false;
            }

            return setModalContent(content);
        },

        isOpen: () =>
            state.open &&
            state.instanceId === instanceId,
    };
}

/**
 * Close the currently open modal.
 *
 * @param {Object} [options]
 * @param {boolean} [options.restoreFocus=true]
 * @param {boolean} [options.invokeOnClose=true]
 * @returns {boolean}
 */
export function closeModal(options = {}) {
    const {
        restoreFocus = true,
        invokeOnClose = true,
    } = options;

    const root = getRoot();

    if (
        !state.open &&
        !root?.children.length
    ) {
        return false;
    }

    const config = state.config;
    const previousActiveElement =
        state.previousActiveElement;

    unbindModalEvents();

    if (root) {
        root.innerHTML = "";
    }

    elements.overlay = null;
    elements.dialog = null;
    elements.closeButton = null;

    state.open = false;
    state.config = null;

    unlockBodyScroll();

    if (
        invokeOnClose &&
        config?.onClose
    ) {
        try {
            config.onClose();
        } catch (error) {
            console.error(
                "[modal] Close callback failed:",
                error
            );
        }
    }

    state.previousActiveElement = null;

    if (
        restoreFocus &&
        previousActiveElement &&
        typeof previousActiveElement.focus === "function" &&
        document.contains(previousActiveElement)
    ) {
        requestAnimationFrame(() => {
            if (document.contains(previousActiveElement)) {
                previousActiveElement.focus();
            }
        });
    }

    return true;
}

/**
 * Check whether a modal is currently open.
 *
 * @returns {boolean}
 */
export function isModalOpen() {
    return Boolean(
        state.open &&
        elements.dialog &&
        document.contains(elements.dialog)
    );
}

/**
 * Replace the body content of the currently open modal.
 *
 * @param {string|HTMLElement|Node} content
 * @returns {boolean}
 */
export function setModalContent(content) {
    if (
        !state.open ||
        !elements.dialog ||
        !document.contains(elements.dialog)
    ) {
        return false;
    }

    const body = elements.dialog.querySelector(
        "[data-modal-body]"
    );

    if (!body) {
        return false;
    }

    body.replaceChildren();

    appendContent(body, content);

    return true;
}

// ============================================================
// Options
// ============================================================

/**
 * Normalize modal configuration.
 *
 * @param {Object} options
 * @returns {Object}
 */
function normalizeOptions(options = {}) {
    return {
        title:
            options.title != null
                ? String(options.title)
                : "",

        content:
            options.content ??
            options.body ??
            "",

        confirmText:
            options.confirmText != null
                ? String(options.confirmText)
                : "",

        cancelText:
            options.cancelText != null
                ? String(options.cancelText)
                : "",

        showClose:
            options.showClose !== false,

        closeOnBackdrop:
            options.closeOnBackdrop !== false,

        closeOnEscape:
            options.closeOnEscape !== false,

        onConfirm:
            typeof options.onConfirm === "function"
                ? options.onConfirm
                : null,

        onCancel:
            typeof options.onCancel === "function"
                ? options.onCancel
                : null,

        onClose:
            typeof options.onClose === "function"
                ? options.onClose
                : null,

        size: normalizeSize(options.size),

        danger:
            options.danger === true,

        labelledBy:
            options.labelledBy
                ? String(options.labelledBy)
                : "",
    };
}

/**
 * @param {string} size
 * @returns {string}
 */
function normalizeSize(size) {
    const sizes = {
        small: "max-w-sm",
        medium: "max-w-md",
        large: "max-w-lg",
        xlarge: "max-w-2xl",
    };

    return sizes[size] || sizes.medium;
}

// ============================================================
// Markup
// ============================================================

/**
 * Create modal HTML.
 *
 * @param {Object} config
 * @returns {string}
 */
function createModalMarkup(config) {
    const titleId = createId("modal-title");

    const closeButton = config.showClose
        ? `
            <button
                type="button"
                data-modal-close
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-raised hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Close dialog"
                title="Close"
            >
                <i
                    data-lucide="x"
                    class="h-4 w-4"
                    aria-hidden="true"
                ></i>
            </button>
        `
        : "";

    const titleMarkup = config.title
        ? `
            <h2
                id="${escapeAttribute(titleId)}"
                class="min-w-0 truncate pr-2 text-sm font-semibold"
            >
                ${escapeHtml(config.title)}
            </h2>
        `
        : "";

    const cancelButton = config.cancelText
        ? `
            <button
                type="button"
                data-modal-cancel
                class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition hover:bg-surface-raised focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
                ${escapeHtml(config.cancelText)}
            </button>
        `
        : "";

    const confirmButton = config.confirmText
        ? `
            <button
                type="button"
                data-modal-confirm
                class="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-white transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    config.danger
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-primary hover:bg-primary/90"
                }"
            >
                ${escapeHtml(config.confirmText)}
            </button>
        `
        : "";

    const footer =
        cancelButton || confirmButton
            ? `
                <div
                    data-modal-footer
                    class="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3"
                >
                    ${cancelButton}
                    ${confirmButton}
                </div>
            `
            : "";

    const labelledBy = config.title
        ? `aria-labelledby="${escapeAttribute(titleId)}"`
        : config.labelledBy
            ? `aria-labelledby="${escapeAttribute(
                  config.labelledBy
              )}"`
            : `aria-label="Dialog"`;

    return `
        <div
            data-modal-overlay
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
            role="presentation"
        >
            <div
                data-modal-dialog
                class="flex max-h-[calc(100vh-2rem)] w-full ${config.size} min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
                role="dialog"
                aria-modal="true"
                ${labelledBy}
                tabindex="-1"
            >
                <div
                    data-modal-header
                    class="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3"
                >
                    <div class="min-w-0">
                        ${titleMarkup}
                    </div>

                    ${closeButton}
                </div>

                <div
                    data-modal-body
                    class="min-h-0 min-w-0 flex-1 overflow-auto p-4"
                ></div>

                ${footer}
            </div>
        </div>
    `;
}

/**
 * Insert content into a container.
 *
 * Strings are treated as HTML intentionally.
 *
 * @param {HTMLElement} container
 * @param {string|HTMLElement|Node} content
 */
function appendContent(container, content) {
    if (content instanceof Node) {
        container.appendChild(content);
        return;
    }

    container.innerHTML = String(content ?? "");
}

// ============================================================
// Event Binding
// ============================================================

/**
 * Cache generated modal elements.
 */
function cacheModalElements() {
    elements.root = getRoot();

    elements.overlay =
        elements.root?.querySelector(
            "[data-modal-overlay]"
        ) || null;

    elements.dialog =
        elements.root?.querySelector(
            "[data-modal-dialog]"
        ) || null;

    elements.closeButton =
        elements.root?.querySelector(
            "[data-modal-close]"
        ) || null;
}

/**
 * Bind modal events.
 *
 * @param {Object} config
 * @param {number} instanceId
 */
function bindModalEvents(config, instanceId) {
    if (
        !elements.overlay ||
        !elements.dialog
    ) {
        return;
    }

    elements.closeButton?.addEventListener(
        "click",
        handleCloseClick
    );

    const cancelButton =
        elements.dialog.querySelector(
            "[data-modal-cancel]"
        );

    cancelButton?.addEventListener(
        "click",
        () => handleCancel(config, instanceId)
    );

    const confirmButton =
        elements.dialog.querySelector(
            "[data-modal-confirm]"
        );

    confirmButton?.addEventListener(
        "click",
        () => handleConfirm(config, instanceId)
    );

    elements.overlay.addEventListener(
        "mousedown",
        handleOverlayMouseDown
    );

    state.keydownHandler = (event) => {
        if (
            !state.open ||
            state.instanceId !== instanceId ||
            !elements.dialog
        ) {
            return;
        }

        if (
            event.key === "Escape" &&
            config.closeOnEscape
        ) {
            event.preventDefault();

            handleCancel(
                config,
                instanceId
            );

            return;
        }

        if (event.key === "Tab") {
            trapFocus(event);
        }
    };

    document.addEventListener(
        "keydown",
        state.keydownHandler
    );
}

/**
 * Remove global modal events.
 */
function unbindModalEvents() {
    if (state.keydownHandler) {
        document.removeEventListener(
            "keydown",
            state.keydownHandler
        );

        state.keydownHandler = null;
    }
}

// ============================================================
// Event Handlers
// ============================================================

/**
 * Handle close button click.
 */
function handleCloseClick() {
    closeModal();
}

/**
 * Handle backdrop interaction.
 *
 * @param {MouseEvent} event
 */
function handleOverlayMouseDown(event) {
    if (
        event.target !== elements.overlay
    ) {
        return;
    }

    const config =
        state.config ||
        elements.dialog?.__modalConfig;

    if (
        config?.closeOnBackdrop === false
    ) {
        return;
    }

    closeModal();
}

/**
 * Handle cancel action.
 *
 * @param {Object} config
 * @param {number} instanceId
 * @returns {boolean|undefined}
 */
function handleCancel(
    config,
    instanceId
) {
    if (
        state.instanceId !== instanceId ||
        !state.open
    ) {
        return false;
    }

    if (config.onCancel) {
        try {
            const result =
                config.onCancel();

            if (result === false) {
                return false;
            }
        } catch (error) {
            console.error(
                "[modal] Cancel callback failed:",
                error
            );

            return false;
        }
    }

    return closeModal();
}

/**
 * Handle confirm action.
 *
 * @param {Object} config
 * @param {number} instanceId
 * @returns {boolean|Promise|undefined}
 */
function handleConfirm(
    config,
    instanceId
) {
    if (
        state.instanceId !== instanceId ||
        !state.open
    ) {
        return false;
    }

    if (!config.onConfirm) {
        return closeModal();
    }

    let result;

    try {
        result = config.onConfirm();
    } catch (error) {
        console.error(
            "[modal] Confirm callback failed:",
            error
        );

        return false;
    }

    /*
     * Support native Promises and generic thenables.
     */
    if (
        result &&
        typeof result.then === "function"
    ) {
        return Promise.resolve(result)
            .then((value) => {
                /*
                 * The original modal may have already been
                 * closed or replaced while the async callback
                 * was running.
                 */
                if (
                    state.instanceId !== instanceId ||
                    !state.open
                ) {
                    return value;
                }

                if (value !== false) {
                    closeModal();
                }

                return value;
            })
            .catch((error) => {
                console.error(
                    "[modal] Confirm callback failed:",
                    error
                );

                return undefined;
            });
    }

    if (result !== false) {
        return closeModal();
    }

    return false;
}

// ============================================================
// Focus
// ============================================================

/**
 * Focus the first usable element inside the modal.
 */
function focusInitialElement() {
    if (!elements.dialog) {
        return;
    }

    const firstFocusable =
        getFocusableElements(
            elements.dialog
        )[0];

    if (firstFocusable) {
        firstFocusable.focus();
        return;
    }

    elements.dialog.focus();
}

/**
 * Keep keyboard focus inside the dialog.
 *
 * @param {KeyboardEvent} event
 */
function trapFocus(event) {
    if (!elements.dialog) {
        return;
    }

    const focusable =
        getFocusableElements(
            elements.dialog
        );

    if (!focusable.length) {
        event.preventDefault();
        elements.dialog.focus();
        return;
    }

    const first = focusable[0];
    const last =
        focusable[focusable.length - 1];

    /*
     * If focus somehow escaped the modal, put it back inside.
     */
    if (
        !elements.dialog.contains(
            document.activeElement
        )
    ) {
        event.preventDefault();
        first.focus();
        return;
    }

    if (
        event.shiftKey &&
        document.activeElement === first
    ) {
        event.preventDefault();
        last.focus();
        return;
    }

    if (
        !event.shiftKey &&
        document.activeElement === last
    ) {
        event.preventDefault();
        first.focus();
    }
}

/**
 * Get focusable descendants.
 *
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
function getFocusableElements(container) {
    return Array.from(
        container.querySelectorAll(`
            button:not([disabled]),
            [href],
            input:not([disabled]),
            select:not([disabled]),
            textarea:not([disabled]),
            [contenteditable="true"],
            [tabindex]:not([tabindex="-1"])
        `)
    ).filter((element) => {
        return (
            !element.hasAttribute("hidden") &&
            element.getAttribute(
                "aria-hidden"
            ) !== "true" &&
            isVisible(element)
        );
    });
}

/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isVisible(element) {
    const style =
        window.getComputedStyle(element);

    const rect =
        element.getBoundingClientRect();

    return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
    );
}

// ============================================================
// Body Scroll
// ============================================================

/**
 * Prevent background page scrolling while a modal is open.
 */
function lockBodyScroll() {
    if (state.bodyOverflowLocked) {
        return;
    }

    state.bodyOverflowLocked = true;

    state.bodyHadOverflowHidden =
        document.body.classList.contains(
            "overflow-hidden"
        );

    document.body.classList.add(
        "overflow-hidden"
    );
}

/**
 * Restore the body's original overflow state.
 */
function unlockBodyScroll() {
    if (!state.bodyOverflowLocked) {
        return;
    }

    if (!state.bodyHadOverflowHidden) {
        document.body.classList.remove(
            "overflow-hidden"
        );
    }

    state.bodyOverflowLocked = false;
    state.bodyHadOverflowHidden = false;
}

// ============================================================
// Helpers
// ============================================================

/**
 * Generate a unique DOM id.
 *
 * @param {string} prefix
 * @returns {string}
 */
function createId(prefix) {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return `${prefix}-${crypto.randomUUID()}`;
    }

    return `${prefix}-${Math.random()
        .toString(36)
        .slice(2, 11)}-${Date.now()}`;
}

/**
 * Escape text inserted into HTML.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Escape an HTML attribute value.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeAttribute(value) {
    return escapeHtml(value);
}

/**
 * Reset internal state without triggering callbacks.
 */
function resetState() {
    unbindModalEvents();

    elements.overlay = null;
    elements.dialog = null;
    elements.closeButton = null;

    state.open = false;
    state.config = null;
    state.previousActiveElement = null;

    unlockBodyScroll();
}

// ============================================================
// Exports
// ============================================================

export default {
    initModal,
    openModal,
    closeModal,
    isModalOpen,
    setModalContent,
};
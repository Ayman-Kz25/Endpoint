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
    if (elements.root && document.contains(elements.root)) {
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
 * This function only prepares the modal container. It does not
 * open a modal automatically.
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
            openModal,
            closeModal,
            isModalOpen,
            setModalContent,
        };
    }

    root.setAttribute("aria-live", "polite");

    return {
        openModal,
        closeModal,
        isModalOpen,
        setModalContent,
    };
}

// ============================================================
// Public API
// ============================================================

/**
 * Open a modal.
 *
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} [options.content]
 * @param {string|HTMLElement} [options.body]
 * @param {string} [options.confirmText]
 * @param {string} [options.cancelText]
 * @param {boolean} [options.showClose=true]
 * @param {boolean} [options.closeOnBackdrop=true]
 * @param {boolean} [options.closeOnEscape=true]
 * @param {Function} [options.onConfirm]
 * @param {Function} [options.onCancel]
 * @param {Function} [options.onClose]
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

    if (state.open) {
        closeModal();
    }

    const config = normalizeOptions(options);

    state.previousActiveElement = document.activeElement;

    root.innerHTML = createModalMarkup(config);

    cacheModalElements();

    if (!elements.overlay || !elements.dialog) {
        return null;
    }

    state.open = true;

    bindModalEvents(config);

    document.body.classList.add("overflow-hidden");

    requestAnimationFrame(() => {
        focusInitialElement();
    });

    return {
        close: () => closeModal(),
        confirm: () => handleConfirm(config),
        setContent: (content) => setModalContent(content),
    };
}

/**
 * Close the currently open modal.
 *
 * @param {Object} [options]
 * @param {boolean} [options.restoreFocus=true]
 * @returns {boolean}
 */
export function closeModal(options = {}) {
    const {
        restoreFocus = true,
    } = options;

    const root = getRoot();

    if (!state.open && !root?.children.length) {
        return false;
    }

    unbindModalEvents();

    if (root) {
        root.innerHTML = "";
    }

    elements.overlay = null;
    elements.dialog = null;
    elements.closeButton = null;

    state.open = false;

    document.body.classList.remove("overflow-hidden");

    if (
        restoreFocus &&
        state.previousActiveElement &&
        typeof state.previousActiveElement.focus === "function" &&
        document.contains(state.previousActiveElement)
    ) {
        requestAnimationFrame(() => {
            state.previousActiveElement.focus();
        });
    }

    state.previousActiveElement = null;

    return true;
}

/**
 * Check whether a modal is currently open.
 *
 * @returns {boolean}
 */
export function isModalOpen() {
    return state.open;
}

/**
 * Replace the body content of the currently open modal.
 *
 * @param {string|HTMLElement} content
 * @returns {boolean}
 */
export function setModalContent(content) {
    if (!elements.dialog) {
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
function normalizeOptions(options) {
    return {
        title: options.title || "",
        content: options.content ?? options.body ?? "",
        confirmText: options.confirmText || "",
        cancelText: options.cancelText || "",
        showClose: options.showClose !== false,
        closeOnBackdrop: options.closeOnBackdrop !== false,
        closeOnEscape: options.closeOnEscape !== false,
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
        danger: options.danger === true,
        labelledBy: options.labelledBy || "",
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

    const footer = cancelButton || confirmButton
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
            ? `aria-labelledby="${escapeAttribute(config.labelledBy)}"`
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
 * Insert content safely when it is an HTMLElement.
 * Strings are treated as HTML because modal callers may need
 * to render small custom forms.
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
        elements.root?.querySelector("[data-modal-overlay]") || null;

    elements.dialog =
        elements.root?.querySelector("[data-modal-dialog]") || null;

    elements.closeButton =
        elements.root?.querySelector("[data-modal-close]") || null;
}

/**
 * Bind modal events.
 *
 * @param {Object} config
 */
function bindModalEvents(config) {
    if (!elements.overlay || !elements.dialog) {
        return;
    }

    elements.closeButton?.addEventListener(
        "click",
        handleCloseClick
    );

    const cancelButton =
        elements.dialog.querySelector("[data-modal-cancel]");

    cancelButton?.addEventListener(
        "click",
        () => handleCancel(config)
    );

    const confirmButton =
        elements.dialog.querySelector("[data-modal-confirm]");

    confirmButton?.addEventListener(
        "click",
        () => handleConfirm(config)
    );

    elements.overlay.addEventListener(
        "mousedown",
        handleOverlayMouseDown
    );

    elements.dialog.addEventListener(
        "keydown",
        handleDialogKeydown
    );

    state.keydownHandler = (event) => {
        if (!state.open) {
            return;
        }

        if (event.key === "Escape" && config.closeOnEscape) {
            event.preventDefault();
            handleCancel(config);
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
    if (event.target !== elements.overlay) {
        return;
    }

    const config = elements.dialog?.__modalConfig;

    if (config?.closeOnBackdrop === false) {
        return;
    }

    closeModal();
}

/**
 * Handle cancel action.
 *
 * @param {Object} config
 */
function handleCancel(config) {
    if (config.onCancel) {
        const result = config.onCancel();

        if (result === false) {
            return;
        }
    }

    closeModal();
}

/**
 * Handle confirm action.
 *
 * @param {Object} config
 */
function handleConfirm(config) {
    if (!config.onConfirm) {
        closeModal();
        return;
    }

    const result = config.onConfirm();

    if (result instanceof Promise) {
        result
            .then((value) => {
                if (value !== false) {
                    closeModal();
                }
            })
            .catch((error) => {
                console.error(
                    "[modal] Confirm callback failed:",
                    error
                );
            });

        return;
    }

    if (result !== false) {
        closeModal();
    }
}

/**
 * Handle keyboard navigation inside the dialog.
 *
 * @param {KeyboardEvent} event
 */
function handleDialogKeydown(event) {
    if (event.key !== "Tab") {
        return;
    }

    trapFocus(event);
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

    const firstFocusable = getFocusableElements(
        elements.dialog
    )[0];

    if (firstFocusable) {
        firstFocusable.focus();
        return;
    }

    elements.dialog.focus();
}

/**
 * Keep keyboard focus inside the modal.
 *
 * @param {KeyboardEvent} event
 */
function trapFocus(event) {
    if (!elements.dialog) {
        return;
    }

    const focusable = getFocusableElements(
        elements.dialog
    );

    if (!focusable.length) {
        event.preventDefault();
        elements.dialog.focus();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
    }

    if (!event.shiftKey && document.activeElement === last) {
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
        container.querySelectorAll(
            `
            button:not([disabled]),
            [href],
            input:not([disabled]),
            select:not([disabled]),
            textarea:not([disabled]),
            [tabindex]:not([tabindex="-1"])
            `
        )
    ).filter((element) => {
        return (
            !element.hasAttribute("hidden") &&
            element.getAttribute("aria-hidden") !== "true" &&
            isVisible(element)
        );
    });
}

/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isVisible(element) {
    const style = window.getComputedStyle(element);

    return (
        style.display !== "none" &&
        style.visibility !== "hidden"
    );
}

// ============================================================
// Helpers
// ============================================================

/**
 * Generate a simple unique DOM id.
 *
 * @param {string} prefix
 * @returns {string}
 */
function createId(prefix) {
    return `${prefix}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
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
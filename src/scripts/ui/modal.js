// src/js/ui/modal.js

const ROOT_ID = "modal-root";

const state = {
    open: false,
    id: 0,
    config: null,
    previousFocus: null,
    keydownHandler: null,
    bodyOverflow: null,
};

const elements = {
    root: null,
    overlay: null,
    dialog: null,
};

export function initModal() {
    getRoot();
    recoverFromDomState();

    return createAPI();
}

export function openModal(options = {}) {
    const root = getRoot();

    if (!root) {
        console.warn(`[modal] #${ROOT_ID} was not found.`);
        return null;
    }

    if (state.open) {
        closeModal({ restoreFocus: false });
    }

    const config = normalizeOptions(options);
    const instanceId = ++state.id;

    state.config = config;
    state.previousFocus =
        document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

    root.replaceChildren();
    root.insertAdjacentHTML("beforeend", createMarkup(config));

    cacheElements();

    if (!elements.overlay || !elements.dialog) {
        resetState();
        return null;
    }

    state.open = true;

    bindEvents(config, instanceId);
    lockBodyScroll();

    requestAnimationFrame(() => {
        if (
            state.open &&
            state.id === instanceId &&
            elements.dialog &&
            document.contains(elements.dialog)
        ) {
            focusInitialElement();
        }
    });

    return createController(instanceId);
}

export function closeModal({
    restoreFocus = true,
    invokeOnClose = true,
} = {}) {
    const root = getRoot();
    const hasModal =
        state.open ||
        Boolean(root?.querySelector("[data-modal-dialog]"));

    if (!hasModal) {
        return false;
    }

    const config = state.config;
    const previousFocus = state.previousFocus;

    unbindEvents();

    root?.replaceChildren();

    elements.overlay = null;
    elements.dialog = null;

    state.open = false;
    state.config = null;
    state.previousFocus = null;

    unlockBodyScroll();

    if (invokeOnClose && typeof config?.onClose === "function") {
        try {
            config.onClose();
        } catch (error) {
            console.error("[modal] Close callback failed:", error);
        }
    }

    if (
        restoreFocus &&
        previousFocus &&
        document.contains(previousFocus)
    ) {
        requestAnimationFrame(() => {
            if (document.contains(previousFocus)) {
                previousFocus.focus();
            }
        });
    }

    return true;
}

export function isModalOpen() {
    return Boolean(
        state.open &&
        elements.dialog &&
        document.contains(elements.dialog)
    );
}

export function setModalContent(content) {
    if (!isModalOpen()) {
        return false;
    }

    const body = elements.dialog.querySelector("[data-modal-body]");

    if (!body) {
        return false;
    }

    body.replaceChildren();
    appendContent(body, content);

    return true;
}

function normalizeOptions(options) {
    const sizes = {
        small: "max-w-sm",
        medium: "max-w-md",
        large: "max-w-lg",
        xlarge: "max-w-2xl",
    };

    return {
        title: options.title != null ? String(options.title) : "",
        content: options.content ?? options.body ?? "",
        confirmText:
            options.confirmText != null
                ? String(options.confirmText)
                : "",
        cancelText:
            options.cancelText != null
                ? String(options.cancelText)
                : "",
        showClose: options.showClose !== false,
        closeOnBackdrop: options.closeOnBackdrop !== false,
        closeOnEscape: options.closeOnEscape !== false,
        danger: options.danger === true,
        size: sizes[options.size] || sizes.medium,
        labelledBy: options.labelledBy
            ? String(options.labelledBy)
            : "",
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
    };
}

function createMarkup(config) {
    const titleId = config.title
        ? createId("modal-title")
        : "";

    const accessibleName = config.title
        ? `aria-labelledby="${escapeAttribute(titleId)}"`
        : config.labelledBy
            ? `aria-labelledby="${escapeAttribute(config.labelledBy)}"`
            : `aria-label="Dialog"`;

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

    const title = config.title
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
                ${accessibleName}
                tabindex="-1"
            >
                <div
                    data-modal-header
                    class="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3"
                >
                    <div class="min-w-0">
                        ${title}
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

function appendContent(container, content) {
    if (content instanceof Node) {
        container.appendChild(content);
        return;
    }

    container.innerHTML = String(content ?? "");
}

function getRoot() {
    if (
        elements.root &&
        document.contains(elements.root)
    ) {
        return elements.root;
    }

    const root = document.getElementById(ROOT_ID);

    elements.root =
        root instanceof HTMLElement
            ? root
            : null;

    return elements.root;
}

function cacheElements() {
    const root = getRoot();

    elements.overlay =
        root?.querySelector("[data-modal-overlay]") || null;

    elements.dialog =
        root?.querySelector("[data-modal-dialog]") || null;
}

function bindEvents(config, instanceId) {
    if (!elements.overlay || !elements.dialog) {
        return;
    }

    elements.overlay.addEventListener(
        "mousedown",
        handleOverlayMouseDown
    );

    elements.dialog.addEventListener(
        "click",
        (event) => handleDialogClick(event, config, instanceId)
    );

    state.keydownHandler = (event) => {
        if (
            !state.open ||
            state.id !== instanceId ||
            !elements.dialog
        ) {
            return;
        }

        if (
            event.key === "Escape" &&
            config.closeOnEscape
        ) {
            event.preventDefault();
            handleCancel(config, instanceId);
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

function unbindEvents() {
    if (!state.keydownHandler) {
        return;
    }

    document.removeEventListener(
        "keydown",
        state.keydownHandler
    );

    state.keydownHandler = null;
}

function handleDialogClick(event, config, instanceId) {
    const target = event.target;

    if (!(target instanceof Element)) {
        return;
    }

    if (target.closest("[data-modal-close]")) {
        closeModal();
        return;
    }

    if (target.closest("[data-modal-cancel]")) {
        handleCancel(config, instanceId);
        return;
    }

    if (target.closest("[data-modal-confirm]")) {
        handleConfirm(config, instanceId);
    }
}

function handleOverlayMouseDown(event) {
    if (
        event.target !== elements.overlay ||
        state.config?.closeOnBackdrop === false
    ) {
        return;
    }

    closeModal();
}

function handleCancel(config, instanceId) {
    if (
        !state.open ||
        state.id !== instanceId
    ) {
        return false;
    }

    if (typeof config.onCancel === "function") {
        try {
            if (config.onCancel() === false) {
                return false;
            }
        } catch (error) {
            console.error("[modal] Cancel callback failed:", error);
            return false;
        }
    }

    return closeModal();
}

function handleConfirm(config, instanceId) {
    if (
        !state.open ||
        state.id !== instanceId
    ) {
        return false;
    }

    if (typeof config.onConfirm !== "function") {
        return closeModal();
    }

    let result;

    try {
        result = config.onConfirm();
    } catch (error) {
        console.error("[modal] Confirm callback failed:", error);
        return false;
    }

    if (result && typeof result.then === "function") {
        return Promise.resolve(result)
            .then((value) => {
                if (
                    state.open &&
                    state.id === instanceId &&
                    value !== false
                ) {
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

    return result === false
        ? false
        : closeModal();
}

function createController(instanceId) {
    return {
        close() {
            if (!isCurrentInstance(instanceId)) {
                return false;
            }

            return closeModal();
        },

        confirm() {
            if (!isCurrentInstance(instanceId)) {
                return false;
            }

            return handleConfirm(
                state.config,
                instanceId
            );
        },

        cancel() {
            if (!isCurrentInstance(instanceId)) {
                return false;
            }

            return handleCancel(
                state.config,
                instanceId
            );
        },

        setContent(content) {
            if (!isCurrentInstance(instanceId)) {
                return false;
            }

            return setModalContent(content);
        },

        isOpen() {
            return isCurrentInstance(instanceId);
        },
    };
}

function isCurrentInstance(instanceId) {
    return Boolean(
        state.open &&
        state.id === instanceId &&
        elements.dialog &&
        document.contains(elements.dialog)
    );
}

function focusInitialElement() {
    if (!elements.dialog) {
        return;
    }

    const focusable = getFocusableElements(elements.dialog);

    if (focusable.length) {
        focusable[0].focus();
        return;
    }

    elements.dialog.focus();
}

function trapFocus(event) {
    if (!elements.dialog) {
        return;
    }

    const focusable = getFocusableElements(elements.dialog);

    if (!focusable.length) {
        event.preventDefault();
        elements.dialog.focus();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (!elements.dialog.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
    }

    if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
    }

    if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
    }
}

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
            element.getAttribute("aria-hidden") !== "true" &&
            isVisible(element)
        );
    });
}

function isVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
    );
}

function lockBodyScroll() {
    if (!document.body || state.bodyOverflow !== null) {
        return;
    }

    state.bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
}

function unlockBodyScroll() {
    if (!document.body || state.bodyOverflow === null) {
        return;
    }

    document.body.style.overflow = state.bodyOverflow;
    state.bodyOverflow = null;
}

function recoverFromDomState() {
    const root = getRoot();

    if (!root) {
        resetState();
        return;
    }

    const dialog = root.querySelector("[data-modal-dialog]");

    if (state.open && !dialog) {
        resetState();
        return;
    }

    if (!state.open && dialog) {
        root.replaceChildren();
    }
}

function resetState() {
    unbindEvents();

    elements.overlay = null;
    elements.dialog = null;

    state.open = false;
    state.config = null;
    state.previousFocus = null;

    unlockBodyScroll();
}

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

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return escapeHtml(value);
}

function createAPI() {
    return {
        open: openModal,
        close: closeModal,
        isOpen: isModalOpen,
        setContent: setModalContent,
    };
}

export default {
    initModal,
    openModal,
    closeModal,
    isModalOpen,
    setModalContent,
};
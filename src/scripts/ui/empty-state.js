/**
 * Empty State UI
 *
 * Provides small, reusable helpers for showing and hiding empty-state
 * elements throughout the application.
 *
 * Responsibilities:
 * - Show/hide empty-state elements
 * - Update empty-state text
 * - Toggle an empty state based on whether data exists
 * - Keep DOM manipulation isolated from feature modules
 *
 * This module does not:
 * - Fetch data
 * - Manage application state
 * - Create modals
 * - Render feature-specific content
 */

// ============================================================
// Defaults
// ============================================================

const DEFAULT_EMPTY_MESSAGE = "Nothing to show yet.";

// ============================================================
// Helpers
// ============================================================

/**
 * Resolve an element from either a DOM element or selector.
 *
 * Supports:
 * - HTMLElement
 * - Element ID
 * - CSS selector
 *
 * @param {HTMLElement|string|null} target
 * @returns {HTMLElement|null}
 */
function resolveElement(target) {
    if (!target) {
        return null;
    }

    if (target instanceof HTMLElement) {
        return target;
    }

    if (typeof target !== "string") {
        return null;
    }

    // Preserve convenient ID-based usage.
    const byId = document.getElementById(target);

    if (byId instanceof HTMLElement) {
        return byId;
    }

    // Also support CSS selectors.
    try {
        const element = document.querySelector(target);

        return element instanceof HTMLElement
            ? element
            : null;
    } catch {
        return null;
    }
}

/**
 * Find the text element inside an empty-state container.
 *
 * Looks for common selectors first, then falls back to the container itself.
 *
 * @param {HTMLElement} container
 * @returns {HTMLElement}
 */
function getMessageElement(container) {
    return (
        container.querySelector("[data-empty-message]") ||
        container.querySelector(".empty-state-message") ||
        container.querySelector("p") ||
        container
    );
}

/**
 * Normalize an empty-state message.
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
        return DEFAULT_EMPTY_MESSAGE;
    }

    return String(message);
}

// ============================================================
// Visibility
// ============================================================

/**
 * Show an empty-state element.
 *
 * @param {HTMLElement|string} target
 * @returns {HTMLElement|null}
 */
export function showEmptyState(target) {
    const element = resolveElement(target);

    if (!element) {
        return null;
    }

    element.classList.remove("hidden");
    element.removeAttribute("aria-hidden");

    return element;
}

/**
 * Hide an empty-state element.
 *
 * @param {HTMLElement|string} target
 * @returns {HTMLElement|null}
 */
export function hideEmptyState(target) {
    const element = resolveElement(target);

    if (!element) {
        return null;
    }

    element.classList.add("hidden");
    element.setAttribute("aria-hidden", "true");

    return element;
}

/**
 * Toggle an empty-state element.
 *
 * @param {HTMLElement|string} target
 * @param {boolean} show
 * @returns {HTMLElement|null}
 */
export function toggleEmptyState(target, show) {
    return Boolean(show)
        ? showEmptyState(target)
        : hideEmptyState(target);
}

// ============================================================
// Content
// ============================================================

/**
 * Set the message displayed by an empty-state element.
 *
 * @param {HTMLElement|string} target
 * @param {string} message
 * @returns {HTMLElement|null}
 */
export function setEmptyStateMessage(
    target,
    message = DEFAULT_EMPTY_MESSAGE
) {
    const element = resolveElement(target);

    if (!element) {
        return null;
    }

    const messageElement = getMessageElement(element);

    messageElement.textContent = normalizeMessage(message);

    return element;
}

/**
 * Get the current empty-state message.
 *
 * @param {HTMLElement|string} target
 * @returns {string}
 */
export function getEmptyStateMessage(target) {
    const element = resolveElement(target);

    if (!element) {
        return "";
    }

    return getMessageElement(element).textContent.trim();
}

// ============================================================
// Data Helpers
// ============================================================

/**
 * Show or hide an empty state based on whether a collection has items.
 *
 * @param {HTMLElement|string} target
 * @param {Array} items
 * @returns {boolean} True when the collection is empty.
 */
export function updateEmptyState(target, items) {
    const hasItems =
        Array.isArray(items) && items.length > 0;

    toggleEmptyState(target, !hasItems);

    return !hasItems;
}

/**
 * Show an empty state when a collection has no items.
 *
 * @param {HTMLElement|string} target
 * @param {Array} items
 * @returns {boolean} True when the collection is empty.
 */
export function showIfEmpty(target, items) {
    return updateEmptyState(target, items);
}

/**
 * Hide an empty state when a collection has items.
 *
 * @param {HTMLElement|string} target
 * @param {Array} items
 * @returns {boolean} True when the collection is empty.
 */
export function hideIfNotEmpty(target, items) {
    return updateEmptyState(target, items);
}

// ============================================================
// Factory
// ============================================================

/**
 * Create a standard empty-state element.
 *
 * The returned element is hidden by default.
 *
 * @param {Object} options
 * @param {string} [options.message]
 * @param {string} [options.className]
 * @param {boolean} [options.hidden=true]
 * @returns {HTMLDivElement}
 */
export function createEmptyState({
    message = DEFAULT_EMPTY_MESSAGE,
    className = "",
    hidden = true,
} = {}) {
    const element = document.createElement("div");

    element.className = [
        "empty-state",
        "px-4",
        "py-8",
        "text-center",
        className,
    ]
        .filter(Boolean)
        .join(" ");

    element.setAttribute("data-empty-state", "");

    const text = document.createElement("p");

    text.className =
        "empty-state-message text-xs text-muted-foreground";

    text.setAttribute("data-empty-message", "");
    text.textContent = normalizeMessage(message);

    element.appendChild(text);

    // Always normalize visibility + accessibility together.
    if (hidden) {
        hideEmptyState(element);
    } else {
        showEmptyState(element);
    }

    return element;
}

// ============================================================
// DOM Initialization
// ============================================================

/**
 * Initialize an existing empty-state element.
 *
 * Adds the expected accessibility attributes and optionally
 * sets its initial message/visibility.
 *
 * If `visible` is not supplied, the existing `hidden` class
 * is used to determine the accessibility state.
 *
 * @param {HTMLElement|string} target
 * @param {Object} options
 * @param {string} [options.message]
 * @param {boolean} [options.visible]
 * @returns {HTMLElement|null}
 */
export function initEmptyState(
    target,
    {
        message,
        visible,
    } = {}
) {
    const element = resolveElement(target);

    if (!element) {
        return null;
    }

    element.setAttribute("data-empty-state", "");

    if (message !== undefined) {
        setEmptyStateMessage(element, message);
    }

    if (visible !== undefined) {
        toggleEmptyState(element, visible);
    } else {
        // Normalize accessibility state to match the existing
        // visual state instead of leaving stale aria attributes.
        const isHidden = element.classList.contains("hidden");

        if (isHidden) {
            element.setAttribute("aria-hidden", "true");
        } else {
            element.removeAttribute("aria-hidden");
        }
    }

    return element;
}

/**
 * Initialize all empty-state elements currently in the document.
 *
 * @returns {HTMLElement[]}
 */
export function initEmptyStates() {
    const elements = Array.from(
        document.querySelectorAll("[data-empty-state]")
    );

    elements.forEach((element) => {
        initEmptyState(element);
    });

    return elements;
}

// ============================================================
// Default Export
// ============================================================

export default {
    showEmptyState,
    hideEmptyState,
    toggleEmptyState,
    setEmptyStateMessage,
    getEmptyStateMessage,
    updateEmptyState,
    showIfEmpty,
    hideIfNotEmpty,
    createEmptyState,
    initEmptyState,
    initEmptyStates,
};
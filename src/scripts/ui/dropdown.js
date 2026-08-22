// src/scripts/ui/dropdown.js

/**
 * Dropdown UI
 *
 * Provides a small, reusable dropdown manager for the application.
 *
 * Responsibilities:
 * - Open and close dropdowns
 * - Position dropdowns relative to trigger elements
 * - Handle outside clicks
 * - Handle Escape
 * - Manage aria-expanded
 * - Support dynamically rendered dropdown content
 *
 * This module does not:
 * - Decide what dropdown content should contain
 * - Persist application state
 * - Handle business logic
 */

const state = {
    root: null,
    active: null,
    trigger: null,
    cleanup: null,
};

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the dropdown system.
 *
 * @param {HTMLElement|string} root
 * @returns {Object} Dropdown API
 */
export function initDropdown(root = "#dropdown-root") {
    state.root = resolveElement(root);

    if (!state.root) {
        return {
            open: () => null,
            close: () => {},
            toggle: () => null,
            isOpen: () => false,
            getActive: () => null,
        };
    }

    return {
        open: openDropdown,
        close: closeDropdown,
        toggle: toggleDropdown,
        isOpen: isDropdownOpen,
        getActive: getActiveDropdown,
    };
}

// ============================================================
// Open / Close
// ============================================================

/**
 * Open a dropdown.
 *
 * @param {Object} options
 * @param {HTMLElement|string} options.trigger
 * @param {string|HTMLElement} options.content
 * @param {string} [options.id]
 * @param {string} [options.placement="bottom-start"]
 * @param {number} [options.offset=6]
 * @param {boolean} [options.closeOnSelect=true]
 * @returns {HTMLElement|null}
 */
export function openDropdown(options = {}) {
    if (!state.root) {
        state.root = document.getElementById("dropdown-root");
    }

    if (!state.root) {
        return null;
    }

    const trigger = resolveElement(options.trigger);

    if (!trigger) {
        return null;
    }

    closeDropdown();

    const dropdown = createDropdownElement(options);

    if (!dropdown) {
        return null;
    }

    state.root.appendChild(dropdown);

    state.trigger = trigger;
    state.active = {
        element: dropdown,
        trigger,
        options,
    };

    setTriggerExpanded(trigger, true);

    positionDropdown(dropdown, trigger, options);

    bindActiveEvents();

    return dropdown;
}

/**
 * Close the currently open dropdown.
 */
export function closeDropdown() {
    if (!state.active) {
        return;
    }

    const {
        element,
        trigger,
    } = state.active;

    if (element?.parentNode) {
        element.parentNode.removeChild(element);
    }

    setTriggerExpanded(trigger, false);

    if (state.cleanup) {
        state.cleanup();
        state.cleanup = null;
    }

    state.active = null;
    state.trigger = null;
}

/**
 * Toggle a dropdown.
 *
 * @param {Object} options
 * @returns {HTMLElement|null}
 */
export function toggleDropdown(options = {}) {
    const trigger = resolveElement(options.trigger);

    if (!trigger) {
        return null;
    }

    if (
        state.active &&
        state.active.trigger === trigger
    ) {
        closeDropdown();
        return null;
    }

    return openDropdown(options);
}

/**
 * Check whether a dropdown is currently open.
 *
 * @returns {boolean}
 */
export function isDropdownOpen() {
    return Boolean(state.active);
}

/**
 * Get the currently active dropdown.
 *
 * @returns {Object|null}
 */
export function getActiveDropdown() {
    return state.active;
}

// ============================================================
// Element Creation
// ============================================================

/**
 * Create the dropdown DOM element.
 *
 * @param {Object} options
 * @returns {HTMLElement|null}
 */
function createDropdownElement(options) {
    const dropdown = document.createElement("div");

    dropdown.id =
        options.id ||
        `dropdown-${Date.now()}`;

    dropdown.setAttribute("role", "menu");
    dropdown.setAttribute("tabindex", "-1");

    dropdown.className =
        options.className ||
        [
            "fixed",
            "z-50",
            "min-w-40",
            "max-w-[calc(100vw-1rem)]",
            "overflow-hidden",
            "rounded-md",
            "border",
            "border-border",
            "bg-surface",
            "p-1",
            "shadow-lg",
            "outline-none",
        ].join(" ");

    if (typeof options.content === "string") {
        dropdown.innerHTML = options.content;
    } else if (options.content instanceof HTMLElement) {
        dropdown.appendChild(options.content);
    } else {
        return null;
    }

    if (options.closeOnSelect !== false) {
        bindSelectionHandling(dropdown);
    }

    return dropdown;
}

// ============================================================
// Positioning
// ============================================================

/**
 * Position the dropdown relative to its trigger.
 *
 * @param {HTMLElement} dropdown
 * @param {HTMLElement} trigger
 * @param {Object} options
 */
function positionDropdown(
    dropdown,
    trigger,
    options = {}
) {
    const placement =
        options.placement || "bottom-start";

    const offset =
        Number.isFinite(options.offset)
            ? options.offset
            : 6;

    const triggerRect =
        trigger.getBoundingClientRect();

    const dropdownRect =
        dropdown.getBoundingClientRect();

    const viewportWidth =
        document.documentElement.clientWidth;

    const viewportHeight =
        document.documentElement.clientHeight;

    let top = 0;
    let left = 0;

    switch (placement) {
        case "bottom-end":
            top =
                triggerRect.bottom +
                offset;

            left =
                triggerRect.right -
                dropdownRect.width;

            break;

        case "top-start":
            top =
                triggerRect.top -
                dropdownRect.height -
                offset;

            left =
                triggerRect.left;

            break;

        case "top-end":
            top =
                triggerRect.top -
                dropdownRect.height -
                offset;

            left =
                triggerRect.right -
                dropdownRect.width;

            break;

        case "right-start":
            top =
                triggerRect.top;

            left =
                triggerRect.right +
                offset;

            break;

        case "left-start":
            top =
                triggerRect.top;

            left =
                triggerRect.left -
                dropdownRect.width -
                offset;

            break;

        case "bottom-start":
        default:
            top =
                triggerRect.bottom +
                offset;

            left =
                triggerRect.left;

            break;
    }

    const margin = 8;

    if (
        placement.startsWith("bottom") &&
        top + dropdownRect.height >
            viewportHeight - margin
    ) {
        const alternativeTop =
            triggerRect.top -
            dropdownRect.height -
            offset;

        if (alternativeTop >= margin) {
            top = alternativeTop;
        }
    }

    if (
        placement.startsWith("top") &&
        top < margin
    ) {
        top =
            triggerRect.bottom +
            offset;
    }

    if (
        placement.startsWith("right") &&
        left + dropdownRect.width >
            viewportWidth - margin
    ) {
        const alternativeLeft =
            triggerRect.left -
            dropdownRect.width -
            offset;

        if (alternativeLeft >= margin) {
            left = alternativeLeft;
        }
    }

    if (
        placement.startsWith("left") &&
        left < margin
    ) {
        left =
            triggerRect.right +
            offset;
    }

    left = Math.max(
        margin,
        Math.min(
            left,
            viewportWidth -
                dropdownRect.width -
                margin
        )
    );

    top = Math.max(
        margin,
        Math.min(
            top,
            viewportHeight -
                dropdownRect.height -
                margin
        )
    );

    dropdown.style.top = `${Math.round(top)}px`;
    dropdown.style.left = `${Math.round(left)}px`;
}

// ============================================================
// Event Handling
// ============================================================

/**
 * Bind global events for the active dropdown.
 */
function bindActiveEvents() {
    const handlePointerDown = (event) => {
        if (!state.active) {
            return;
        }

        const {
            element,
            trigger,
        } = state.active;

        if (
            element.contains(event.target) ||
            trigger.contains(event.target)
        ) {
            return;
        }

        closeDropdown();
    };

    const handleKeyDown = (event) => {
        if (!state.active) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();

            const trigger =
                state.active.trigger;

            closeDropdown();

            trigger?.focus();

            return;
        }

        if (
            event.key === "ArrowDown" ||
            event.key === "ArrowUp"
        ) {
            handleArrowNavigation(event);
        }
    };

    const handleViewportChange = () => {
        if (!state.active) {
            return;
        }

        positionDropdown(
            state.active.element,
            state.active.trigger,
            state.active.options
        );
    };

    document.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    document.addEventListener(
        "keydown",
        handleKeyDown
    );

    window.addEventListener(
        "resize",
        handleViewportChange
    );

    window.addEventListener(
        "scroll",
        handleViewportChange,
        true
    );

    state.cleanup = () => {
        document.removeEventListener(
            "pointerdown",
            handlePointerDown
        );

        document.removeEventListener(
            "keydown",
            handleKeyDown
        );

        window.removeEventListener(
            "resize",
            handleViewportChange
        );

        window.removeEventListener(
            "scroll",
            handleViewportChange,
            true
        );
    };
}

/**
 * Close the dropdown when a menu item is selected.
 *
 * @param {HTMLElement} dropdown
 */
function bindSelectionHandling(dropdown) {
    dropdown.addEventListener(
        "click",
        (event) => {
            const item =
                event.target.closest(
                    '[role="menuitem"], [data-dropdown-item]'
                );

            if (!item) {
                return;
            }

            if (
                item.hasAttribute(
                    "data-dropdown-keep-open"
                )
            ) {
                return;
            }

            closeDropdown();
        }
    );
}

/**
 * Handle keyboard navigation between menu items.
 *
 * @param {KeyboardEvent} event
 */
function handleArrowNavigation(event) {
    const dropdown =
        state.active?.element;

    if (!dropdown) {
        return;
    }

    const items = Array.from(
        dropdown.querySelectorAll(
            '[role="menuitem"]:not([aria-disabled="true"]), [data-dropdown-item]:not([aria-disabled="true"])'
        )
    ).filter((item) => {
        const style =
            window.getComputedStyle(item);

        return (
            style.display !== "none" &&
            style.visibility !== "hidden"
        );
    });

    if (!items.length) {
        return;
    }

    event.preventDefault();

    const currentIndex =
        items.indexOf(
            document.activeElement
        );

    let nextIndex;

    if (event.key === "ArrowDown") {
        nextIndex =
            currentIndex < 0
                ? 0
                : (currentIndex + 1) %
                  items.length;
    } else {
        nextIndex =
            currentIndex < 0
                ? items.length - 1
                : (currentIndex - 1 + items.length) %
                  items.length;
    }

    items[nextIndex].focus();
}

// ============================================================
// Helpers
// ============================================================

/**
 * Resolve an element from an element or selector.
 *
 * @param {HTMLElement|string|null} value
 * @returns {HTMLElement|null}
 */
function resolveElement(value) {
    if (!value) {
        return null;
    }

    if (value instanceof HTMLElement) {
        return value;
    }

    if (
        typeof value === "string"
    ) {
        try {
            return document.querySelector(value);
        } catch {
            return null;
        }
    }

    return null;
}

/**
 * Set aria-expanded on a trigger.
 *
 * @param {HTMLElement|null} trigger
 * @param {boolean} expanded
 */
function setTriggerExpanded(
    trigger,
    expanded
) {
    if (!trigger) {
        return;
    }

    trigger.setAttribute(
        "aria-expanded",
        String(expanded)
    );
}

/**
 * Resolve the global dropdown root.
 *
 * @returns {HTMLElement|null}
 */
export function getDropdownRoot() {
    if (state.root) {
        return state.root;
    }

    state.root =
        document.getElementById(
            "dropdown-root"
        );

    return state.root;
}

/**
 * Remove all dropdowns and reset the manager.
 */
export function destroyDropdown() {
    closeDropdown();

    if (state.root) {
        state.root.innerHTML = "";
    }

    state.root = null;
}

// ============================================================
// Convenience API
// ============================================================

/**
 * Create a dropdown item.
 *
 * This helper keeps generated dropdown markup consistent.
 *
 * @param {Object} options
 * @param {string} options.label
 * @param {string} [options.icon]
 * @param {string} [options.value]
 * @param {string} [options.className]
 * @param {boolean} [options.disabled=false]
 * @returns {string}
 */
export function createDropdownItem({
    label = "",
    icon = "",
    value = "",
    className = "",
    disabled = false,
} = {}) {
    const safeLabel =
        escapeHtml(label);

    const safeValue =
        escapeHtml(value);

    const iconMarkup = icon
        ? `
            <i
                data-lucide="${escapeHtml(icon)}"
                class="h-4 w-4 shrink-0"
                aria-hidden="true"
            ></i>
        `
        : "";

    return `
        <button
            type="button"
            role="menuitem"
            data-dropdown-item
            ${safeValue ? `data-value="${safeValue}"` : ""}
            ${
                disabled
                    ? 'aria-disabled="true" disabled'
                    : ""
            }
            class="${[
                "flex",
                "w-full",
                "items-center",
                "gap-2",
                "rounded-sm",
                "px-2.5",
                "py-2",
                "text-left",
                "text-xs",
                "text-foreground",
                "transition",
                "hover:bg-surface-raised",
                "focus:bg-surface-raised",
                "focus:outline-none",
                disabled
                    ? "pointer-events-none opacity-50"
                    : "",
                className,
            ]
                .filter(Boolean)
                .join(" ")}"
        >
            ${iconMarkup}
            <span class="min-w-0 flex-1 truncate">
                ${safeLabel}
            </span>
        </button>
    `;
}

/**
 * Escape HTML content used in generated dropdown markup.
 *
 * @param {*} value
 * @returns {string}
 */
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ============================================================
// Default Export
// ============================================================

export default {
    initDropdown,
    openDropdown,
    closeDropdown,
    toggleDropdown,
    isDropdownOpen,
    getActiveDropdown,
    getDropdownRoot,
    destroyDropdown,
    createDropdownItem,
};
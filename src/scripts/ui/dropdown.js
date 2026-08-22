// src/scripts/ui/dropdown.js

/**
 * Dropdown UI
 *
 * Provides a reusable dropdown manager for the application.
 *
 * Responsibilities:
 * - Open and close dropdowns
 * - Position dropdowns relative to trigger elements
 * - Handle outside clicks
 * - Handle Escape
 * - Manage aria-expanded / aria-controls
 * - Support dynamically rendered dropdown content
 * - Support keyboard navigation
 *
 * This module does not:
 * - Decide what dropdown content should contain
 * - Persist application state
 * - Handle business logic
 */

const DEFAULT_ROOT_SELECTOR = "#dropdown-root";
const DEFAULT_PLACEMENT = "bottom-start";
const DEFAULT_OFFSET = 6;
const VIEWPORT_MARGIN = 8;

const state = {
    root: null,
    active: null,
    trigger: null,
    cleanup: null,
};

/**
 * Initialize the dropdown system.
 *
 * @param {HTMLElement|string} root
 * @returns {Object} Dropdown API
 */
export function initDropdown(root = DEFAULT_ROOT_SELECTOR) {
    const resolvedRoot = resolveElement(root);

    // Clean up an existing manager before replacing its root.
    if (state.root !== resolvedRoot && state.active) {
        closeDropdown();
    }

    state.root = resolvedRoot;

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
 * @param {boolean} [options.focusFirst=false]
 * @returns {HTMLElement|null}
 */
export function openDropdown(options = {}) {
    ensureRoot();

    if (!state.root || !document.body.contains(state.root)) {
        state.root = resolveElement(DEFAULT_ROOT_SELECTOR);
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
    setTriggerControls(trigger, dropdown.id);

    // Position after the element has been inserted into the DOM.
    positionDropdown(dropdown, trigger, options);

    bindActiveEvents();

    // Focus is useful for keyboard navigation, but preserve the
    // caller's choice when explicitly disabled.
    if (options.focusFirst === true) {
        requestAnimationFrame(() => {
            if (!state.active || state.active.element !== dropdown) {
                return;
            }

            focusFirstMenuItem(dropdown);
        });
    }

    // Content can change size after insertion, especially when icons
    // or asynchronously-rendered content are involved.
    requestAnimationFrame(() => {
        if (!state.active || state.active.element !== dropdown) {
            return;
        }

        positionDropdown(dropdown, trigger, options);
    });

    return dropdown;
}

/**
 * Close the currently open dropdown.
 */
export function closeDropdown() {
    if (!state.active) {
        cleanupActiveEvents();

        state.trigger = null;

        return;
    }

    const {
        element,
        trigger,
    } = state.active;

    cleanupActiveEvents();

    if (element?.parentNode) {
        element.parentNode.removeChild(element);
    }

    setTriggerExpanded(trigger, false);
    setTriggerControls(trigger, null);

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

    return openDropdown({
        ...options,
        trigger,
    });
}

/**
 * Check whether a dropdown is currently open.
 *
 * @returns {boolean}
 */
export function isDropdownOpen() {
    return Boolean(
        state.active &&
        state.active.element?.isConnected
    );
}

/**
 * Get the currently active dropdown.
 *
 * @returns {Object|null}
 */
export function getActiveDropdown() {
    return state.active;
}

/* ============================================================
 * Element Creation
 * ============================================================ */

/**
 * Create the dropdown DOM element.
 *
 * @param {Object} options
 * @returns {HTMLElement|null}
 */
function createDropdownElement(options = {}) {
    const dropdown = document.createElement("div");

    dropdown.id =
        options.id ||
        createUniqueDropdownId();

    dropdown.setAttribute("role", "menu");
    dropdown.setAttribute("tabindex", "-1");

    dropdown.className =
        options.className ||
        [
            "fixed",
            "z-50",
            "min-w-40",
            "max-w-[calc(100vw-1rem)]",
            "max-h-[calc(100vh-1rem)]",
            "overflow-y-auto",
            "overflow-x-hidden",
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
    } else if (
        options.content instanceof HTMLElement
    ) {
        dropdown.appendChild(options.content);
    } else if (
        options.content instanceof DocumentFragment
    ) {
        dropdown.appendChild(options.content);
    } else {
        return null;
    }

    if (options.closeOnSelect !== false) {
        bindSelectionHandling(dropdown);
    }

    return dropdown;
}

/* ============================================================
 * Positioning
 * ============================================================ */

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
    if (!dropdown || !trigger) {
        return;
    }

    if (
        !dropdown.isConnected ||
        !trigger.isConnected
    ) {
        return;
    }

    const placement =
        typeof options.placement === "string"
            ? options.placement
            : DEFAULT_PLACEMENT;

    const offset =
        Number.isFinite(Number(options.offset))
            ? Number(options.offset)
            : DEFAULT_OFFSET;

    const triggerRect =
        trigger.getBoundingClientRect();

    const dropdownRect =
        dropdown.getBoundingClientRect();

    const viewportWidth =
        document.documentElement.clientWidth ||
        window.innerWidth;

    const viewportHeight =
        document.documentElement.clientHeight ||
        window.innerHeight;

    const margin = VIEWPORT_MARGIN;

    const dropdownWidth = dropdownRect.width;
    const dropdownHeight = dropdownRect.height;

    let top;
    let left;

    switch (placement) {
        case "bottom-end":
            top = triggerRect.bottom + offset;
            left = triggerRect.right - dropdownWidth;
            break;

        case "top-start":
            top =
                triggerRect.top -
                dropdownHeight -
                offset;

            left = triggerRect.left;
            break;

        case "top-end":
            top =
                triggerRect.top -
                dropdownHeight -
                offset;

            left =
                triggerRect.right -
                dropdownWidth;

            break;

        case "right-start":
            top = triggerRect.top;
            left = triggerRect.right + offset;
            break;

        case "right-end":
            top =
                triggerRect.bottom -
                dropdownHeight;

            left = triggerRect.right + offset;
            break;

        case "left-start":
            top = triggerRect.top;

            left =
                triggerRect.left -
                dropdownWidth -
                offset;

            break;

        case "left-end":
            top =
                triggerRect.bottom -
                dropdownHeight;

            left =
                triggerRect.left -
                dropdownWidth -
                offset;

            break;

        case "bottom-start":
        default:
            top = triggerRect.bottom + offset;
            left = triggerRect.left;
            break;
    }

    /*
     * Vertical collision handling.
     */

    const fitsBelow =
        triggerRect.bottom +
        offset +
        dropdownHeight <=
        viewportHeight - margin;

    const fitsAbove =
        triggerRect.top -
        offset -
        dropdownHeight >=
        margin;

    if (
        placement.startsWith("bottom") &&
        !fitsBelow &&
        fitsAbove
    ) {
        top =
            triggerRect.top -
            dropdownHeight -
            offset;
    } else if (
        placement.startsWith("top") &&
        !fitsAbove &&
        fitsBelow
    ) {
        top = triggerRect.bottom + offset;
    }

    /*
     * Horizontal collision handling.
     */

    const fitsRight =
        triggerRect.right +
        offset +
        dropdownWidth <=
        viewportWidth - margin;

    const fitsLeft =
        triggerRect.left -
        offset -
        dropdownWidth >=
        margin;

    if (
        placement.startsWith("right") &&
        !fitsRight &&
        fitsLeft
    ) {
        left =
            triggerRect.left -
            dropdownWidth -
            offset;
    } else if (
        placement.startsWith("left") &&
        !fitsLeft &&
        fitsRight
    ) {
        left = triggerRect.right + offset;
    }

    /*
     * Final viewport clamping.
     *
     * This prevents menus from becoming inaccessible when the
     * dropdown is larger than the available viewport.
     */

    const maxLeft = Math.max(
        margin,
        viewportWidth -
            dropdownWidth -
            margin
    );

    const maxTop = Math.max(
        margin,
        viewportHeight -
            dropdownHeight -
            margin
    );

    left = clamp(
        left,
        margin,
        maxLeft
    );

    top = clamp(
        top,
        margin,
        maxTop
    );

    dropdown.style.top =
        `${Math.round(top)}px`;

    dropdown.style.left =
        `${Math.round(left)}px`;
}

/* ============================================================
 * Event Handling
 * ============================================================ */

/**
 * Bind global events for the active dropdown.
 */
function bindActiveEvents() {
    cleanupActiveEvents();

    const handlePointerDown = (event) => {
        if (!state.active) {
            return;
        }

        const {
            element,
            trigger,
        } = state.active;

        const target = event.target;

        if (!(target instanceof Node)) {
            return;
        }

        if (
            element.contains(target) ||
            trigger.contains(target)
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

            if (
                trigger &&
                typeof trigger.focus === "function"
            ) {
                trigger.focus();
            }

            return;
        }

        if (
            event.key === "ArrowDown" ||
            event.key === "ArrowUp"
        ) {
            if (isTextInputElement(
                document.activeElement
            )) {
                return;
            }

            handleArrowNavigation(event);
        }

        if (event.key === "Home") {
            if (isTextInputElement(
                document.activeElement
            )) {
                return;
            }

            focusMenuItemAtIndex(0, event);
        }

        if (event.key === "End") {
            if (isTextInputElement(
                document.activeElement
            )) {
                return;
            }

            const items = getFocusableMenuItems();

            focusMenuItemAtIndex(
                items.length - 1,
                event
            );
        }
    };

    const handleViewportChange = () => {
        if (!state.active) {
            return;
        }

        const {
            element,
            trigger,
            options,
        } = state.active;

        positionDropdown(
            element,
            trigger,
            options
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
 * Remove active global event handlers.
 */
function cleanupActiveEvents() {
    if (typeof state.cleanup === "function") {
        state.cleanup();
    }

    state.cleanup = null;
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
            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const item = target.closest(
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

            if (
                item.getAttribute("aria-disabled") ===
                "true" ||
                item.hasAttribute("disabled")
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
    const items = getFocusableMenuItems();

    if (!items.length) {
        return;
    }

    event.preventDefault();

    const currentIndex =
        items.indexOf(document.activeElement);

    let nextIndex;

    if (event.key === "ArrowDown") {
        nextIndex =
            currentIndex < 0
                ? 0
                : (
                    currentIndex + 1
                ) % items.length;
    } else {
        nextIndex =
            currentIndex < 0
                ? items.length - 1
                : (
                    currentIndex -
                    1 +
                    items.length
                ) % items.length;
    }

    items[nextIndex].focus();
}

/**
 * Focus a specific menu item.
 *
 * @param {number} index
 * @param {KeyboardEvent} event
 */
function focusMenuItemAtIndex(index, event) {
    const items = getFocusableMenuItems();

    if (!items.length) {
        return;
    }

    event.preventDefault();

    const safeIndex = clamp(
        index,
        0,
        items.length - 1
    );

    items[safeIndex].focus();
}

/**
 * Get currently focusable menu items.
 *
 * @returns {HTMLElement[]}
 */
function getFocusableMenuItems() {
    const dropdown =
        state.active?.element;

    if (!dropdown) {
        return [];
    }

    return Array.from(
        dropdown.querySelectorAll(
            '[role="menuitem"], [data-dropdown-item]'
        )
    ).filter((item) => {
        if (!(item instanceof HTMLElement)) {
            return false;
        }

        if (
            item.getAttribute("aria-disabled") ===
            "true"
        ) {
            return false;
        }

        if (item.hasAttribute("disabled")) {
            return false;
        }

        const style =
            window.getComputedStyle(item);

        if (
            style.display === "none" ||
            style.visibility === "hidden"
        ) {
            return false;
        }

        return item.getClientRects().length > 0;
    });
}

/**
 * Focus the first menu item.
 *
 * @param {HTMLElement} dropdown
 */
function focusFirstMenuItem(dropdown) {
    const items = getMenuItems(dropdown);

    if (items.length) {
        items[0].focus();
    } else {
        dropdown.focus();
    }
}

/**
 * Get focusable menu items from a specific dropdown.
 *
 * @param {HTMLElement} dropdown
 * @returns {HTMLElement[]}
 */
function getMenuItems(dropdown) {
    return Array.from(
        dropdown.querySelectorAll(
            '[role="menuitem"], [data-dropdown-item]'
        )
    ).filter((item) => {
        if (!(item instanceof HTMLElement)) {
            return false;
        }

        if (
            item.getAttribute("aria-disabled") ===
            "true"
        ) {
            return false;
        }

        if (item.hasAttribute("disabled")) {
            return false;
        }

        const style =
            window.getComputedStyle(item);

        return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            item.getClientRects().length > 0
        );
    });
}

/* ============================================================
 * Helpers
 * ============================================================ */

/**
 * Ensure the global dropdown root exists.
 */
function ensureRoot() {
    if (
        state.root &&
        document.documentElement.contains(
            state.root
        )
    ) {
        return state.root;
    }

    state.root = resolveElement(
        DEFAULT_ROOT_SELECTOR
    );

    return state.root;
}

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

    if (typeof value === "string") {
        try {
            const element =
                document.querySelector(value);

            return element instanceof HTMLElement
                ? element
                : null;
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
 * Set aria-controls on a trigger.
 *
 * @param {HTMLElement|null} trigger
 * @param {string|null} id
 */
function setTriggerControls(
    trigger,
    id
) {
    if (!trigger) {
        return;
    }

    if (id) {
        trigger.setAttribute(
            "aria-controls",
            id
        );
    } else {
        trigger.removeAttribute(
            "aria-controls"
        );
    }
}

/**
 * Resolve the global dropdown root.
 *
 * @returns {HTMLElement|null}
 */
export function getDropdownRoot() {
    return ensureRoot();
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
    state.active = null;
    state.trigger = null;
    state.cleanup = null;
}

/**
 * Create a unique dropdown ID.
 *
 * @returns {string}
 */
function createUniqueDropdownId() {
    return `dropdown-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
}

/**
 * Clamp a number between min and max.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.min(
        Math.max(value, min),
        max
    );
}

/**
 * Determine whether an element is a text input.
 *
 * @param {Element|null} element
 * @returns {boolean}
 */
function isTextInputElement(element) {
    if (!(element instanceof HTMLElement)) {
        return false;
    }

    const tagName =
        element.tagName.toLowerCase();

    if (
        tagName === "textarea" ||
        tagName === "select"
    ) {
        return true;
    }

    if (tagName !== "input") {
        return false;
    }

    const type =
        element.getAttribute("type") ||
        "text";

    return ![
        "button",
        "checkbox",
        "radio",
        "range",
        "submit",
        "reset",
        "file",
        "color",
        "hidden",
    ].includes(type);
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

/* ============================================================
 * Convenience API
 * ============================================================ */

/**
 * Create a dropdown item.
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

    const safeIcon =
        escapeHtml(icon);

    const iconMarkup = icon
        ? `
            <i
                data-lucide="${safeIcon}"
                class="h-4 w-4 shrink-0"
                aria-hidden="true"
            ></i>
        `
        : "";

    const classes = [
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
        .join(" ");

    return `
        <button
            type="button"
            role="menuitem"
            data-dropdown-item
            ${safeValue
                ? `data-value="${safeValue}"`
                : ""}
            ${
                disabled
                    ? 'aria-disabled="true" disabled'
                    : ""
            }
            class="${classes}"
        >
            ${iconMarkup}

            <span class="min-w-0 flex-1 truncate">
                ${safeLabel}
            </span>
        </button>
    `;
}

/* ============================================================
 * Default Export
 * ============================================================ */

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
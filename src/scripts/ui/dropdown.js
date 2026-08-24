/**
 * Dropdown UI
 *
 * Reusable dropdown manager for application UI.
 *
 * Responsibilities:
 * - Open and close dropdowns
 * - Position dropdowns relative to triggers
 * - Handle outside interaction
 * - Handle Escape
 * - Manage ARIA attributes
 * - Support dynamic dropdown content
 * - Support keyboard navigation
 *
 * This module does not:
 * - decide dropdown business logic
 * - persist application state
 * - execute application actions
 */

const DEFAULT_ROOT_SELECTOR = "#dropdown-root";
const DEFAULT_PLACEMENT = "bottom-start";
const DEFAULT_OFFSET = 6;
const VIEWPORT_MARGIN = 8;

const state = {
    root: null,
    active: null,
    cleanup: null,
};

// ============================================================
// Initialization
// ============================================================

export function initDropdown(
    root = DEFAULT_ROOT_SELECTOR,
) {
    const nextRoot = resolveElement(root);

    if (
        state.active &&
        state.root !== nextRoot
    ) {
        closeDropdown();
    }

    state.root = nextRoot;

    return {
        open: openDropdown,
        close: closeDropdown,
        toggle: toggleDropdown,
        isOpen: isDropdownOpen,
        getActive: getActiveDropdown,
        destroy: destroyDropdown,
    };
}

// ============================================================
// Open
// ============================================================

export function openDropdown(options = {}) {
    const root = ensureRoot();

    if (!root) {
        return null;
    }

    const trigger =
        resolveElement(options.trigger);

    if (!trigger) {
        return null;
    }

    closeDropdown();

    const dropdown =
        createDropdownElement(options);

    if (!dropdown) {
        return null;
    }

    root.appendChild(dropdown);

    state.active = {
        element: dropdown,
        trigger,
        options,
    };

    setTriggerExpanded(trigger, true);
    setTriggerControls(
        trigger,
        dropdown.id,
    );

    positionDropdown(
        dropdown,
        trigger,
        options,
    );

    bindActiveEvents();

    if (options.focusFirst === true) {
        requestAnimationFrame(() => {
            if (
                state.active?.element !==
                dropdown
            ) {
                return;
            }

            focusFirstMenuItem(dropdown);
        });
    }

    requestAnimationFrame(() => {
        if (
            state.active?.element !==
            dropdown
        ) {
            return;
        }

        positionDropdown(
            dropdown,
            trigger,
            options,
        );
    });

    return dropdown;
}

// ============================================================
// Close
// ============================================================

export function closeDropdown() {
    const active = state.active;

    cleanupActiveEvents();

    if (!active) {
        return;
    }

    const {
        element,
        trigger,
    } = active;

    if (element?.isConnected) {
        element.remove();
    }

    setTriggerExpanded(
        trigger,
        false,
    );

    setTriggerControls(
        trigger,
        null,
    );

    state.active = null;
}

// ============================================================
// Toggle
// ============================================================

export function toggleDropdown(options = {}) {
    const trigger =
        resolveElement(options.trigger);

    if (!trigger) {
        return null;
    }

    if (
        state.active?.trigger === trigger
    ) {
        closeDropdown();
        return null;
    }

    return openDropdown({
        ...options,
        trigger,
    });
}

export function isDropdownOpen() {
    return Boolean(
        state.active?.element?.isConnected,
    );
}

export function getActiveDropdown() {
    return state.active;
}

// ============================================================
// Creation
// ============================================================

function createDropdownElement(
    options = {},
) {
    const dropdown =
        document.createElement("div");

    dropdown.id =
        typeof options.id === "string" &&
        options.id.trim()
            ? options.id.trim()
            : createUniqueDropdownId();

    dropdown.setAttribute(
        "role",
        "menu",
    );

    dropdown.setAttribute(
        "tabindex",
        "-1",
    );

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

    appendDropdownContent(
        dropdown,
        options.content,
    );

    if (
        options.closeOnSelect !== false
    ) {
        bindSelectionHandling(
            dropdown,
        );
    }

    return dropdown;
}

function appendDropdownContent(
    dropdown,
    content,
) {
    if (typeof content === "string") {
        dropdown.innerHTML = content;
        return;
    }

    if (
        content instanceof HTMLElement ||
        content instanceof DocumentFragment
    ) {
        dropdown.appendChild(content);
        return;
    }

    throw new TypeError(
        "Dropdown content must be a string, HTMLElement, or DocumentFragment.",
    );
}

// ============================================================
// Positioning
// ============================================================

function positionDropdown(
    dropdown,
    trigger,
    options = {},
) {
    if (
        !dropdown?.isConnected ||
        !trigger?.isConnected
    ) {
        return;
    }

    const placement =
        typeof options.placement === "string"
            ? options.placement
            : DEFAULT_PLACEMENT;

    const offset =
        Number.isFinite(
            Number(options.offset),
        )
            ? Number(options.offset)
            : DEFAULT_OFFSET;

    const triggerRect =
        trigger.getBoundingClientRect();

    const dropdownRect =
        dropdown.getBoundingClientRect();

    const viewportWidth =
        document.documentElement
            .clientWidth ||
        window.innerWidth;

    const viewportHeight =
        document.documentElement
            .clientHeight ||
        window.innerHeight;

    const width = dropdownRect.width;
    const height = dropdownRect.height;

    let top = triggerRect.bottom + offset;
    let left = triggerRect.left;

    switch (placement) {
        case "bottom-end":
            top = triggerRect.bottom + offset;
            left = triggerRect.right - width;
            break;

        case "top-start":
            top = triggerRect.top - height - offset;
            left = triggerRect.left;
            break;

        case "top-end":
            top = triggerRect.top - height - offset;
            left = triggerRect.right - width;
            break;

        case "right-start":
            top = triggerRect.top;
            left = triggerRect.right + offset;
            break;

        case "right-end":
            top = triggerRect.bottom - height;
            left = triggerRect.right + offset;
            break;

        case "left-start":
            top = triggerRect.top;
            left = triggerRect.left - width - offset;
            break;

        case "left-end":
            top = triggerRect.bottom - height;
            left = triggerRect.left - width - offset;
            break;

        case "bottom-start":
        default:
            top = triggerRect.bottom + offset;
            left = triggerRect.left;
            break;
    }

    const fitsBelow =
        triggerRect.bottom +
            offset +
            height <=
        viewportHeight -
            VIEWPORT_MARGIN;

    const fitsAbove =
        triggerRect.top -
            offset -
            height >=
        VIEWPORT_MARGIN;

    if (
        placement.startsWith("bottom") &&
        !fitsBelow &&
        fitsAbove
    ) {
        top =
            triggerRect.top -
            height -
            offset;
    }

    if (
        placement.startsWith("top") &&
        !fitsAbove &&
        fitsBelow
    ) {
        top =
            triggerRect.bottom +
            offset;
    }

    const fitsRight =
        triggerRect.right +
            offset +
            width <=
        viewportWidth -
            VIEWPORT_MARGIN;

    const fitsLeft =
        triggerRect.left -
            offset -
            width >=
        VIEWPORT_MARGIN;

    if (
        placement.startsWith("right") &&
        !fitsRight &&
        fitsLeft
    ) {
        left =
            triggerRect.left -
            width -
            offset;
    }

    if (
        placement.startsWith("left") &&
        !fitsLeft &&
        fitsRight
    ) {
        left =
            triggerRect.right +
            offset;
    }

    const maxLeft = Math.max(
        VIEWPORT_MARGIN,
        viewportWidth -
            width -
            VIEWPORT_MARGIN,
    );

    const maxTop = Math.max(
        VIEWPORT_MARGIN,
        viewportHeight -
            height -
            VIEWPORT_MARGIN,
    );

    left = clamp(
        left,
        VIEWPORT_MARGIN,
        maxLeft,
    );

    top = clamp(
        top,
        VIEWPORT_MARGIN,
        maxTop,
    );

    dropdown.style.left =
        `${Math.round(left)}px`;

    dropdown.style.top =
        `${Math.round(top)}px`;
}

// ============================================================
// Events
// ============================================================

function bindActiveEvents() {
    cleanupActiveEvents();

    const handlePointerDown = (
        event,
    ) => {
        const active = state.active;

        if (!active) {
            return;
        }

        const target = event.target;

        if (!(target instanceof Node)) {
            return;
        }

        if (
            active.element.contains(target) ||
            active.trigger.contains(target)
        ) {
            return;
        }

        closeDropdown();
    };

    const handleKeyDown = (event) => {
        const active = state.active;

        if (!active) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();

            const trigger =
                active.trigger;

            closeDropdown();

            trigger?.focus?.();

            return;
        }

        if (
            isTextInputElement(
                document.activeElement,
            )
        ) {
            return;
        }

        switch (event.key) {
            case "ArrowDown":
            case "ArrowUp":
                handleArrowNavigation(event);
                break;

            case "Home":
                focusMenuItemAtIndex(
                    0,
                    event,
                );
                break;

            case "End": {
                const items =
                    getFocusableMenuItems();

                focusMenuItemAtIndex(
                    items.length - 1,
                    event,
                );

                break;
            }

            default:
                break;
        }
    };

    const handleViewportChange = () => {
        const active = state.active;

        if (!active) {
            return;
        }

        positionDropdown(
            active.element,
            active.trigger,
            active.options,
        );
    };

    document.addEventListener(
        "pointerdown",
        handlePointerDown,
    );

    document.addEventListener(
        "keydown",
        handleKeyDown,
    );

    window.addEventListener(
        "resize",
        handleViewportChange,
    );

    window.addEventListener(
        "scroll",
        handleViewportChange,
        true,
    );

    state.cleanup = () => {
        document.removeEventListener(
            "pointerdown",
            handlePointerDown,
        );

        document.removeEventListener(
            "keydown",
            handleKeyDown,
        );

        window.removeEventListener(
            "resize",
            handleViewportChange,
        );

        window.removeEventListener(
            "scroll",
            handleViewportChange,
            true,
        );
    };
}

function cleanupActiveEvents() {
    state.cleanup?.();
    state.cleanup = null;
}

// ============================================================
// Selection
// ============================================================

function bindSelectionHandling(
    dropdown,
) {
    dropdown.addEventListener(
        "click",
        (event) => {
            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const item = target.closest(
                '[role="menuitem"], [data-dropdown-item]',
            );

            if (!item) {
                return;
            }

            if (
                item.hasAttribute(
                    "data-dropdown-keep-open",
                )
            ) {
                return;
            }

            if (
                item.getAttribute(
                    "aria-disabled",
                ) === "true" ||
                item.hasAttribute("disabled")
            ) {
                return;
            }

            closeDropdown();
        },
    );
}

// ============================================================
// Keyboard Navigation
// ============================================================

function handleArrowNavigation(
    event,
) {
    const items =
        getFocusableMenuItems();

    if (!items.length) {
        return;
    }

    event.preventDefault();

    const currentIndex =
        items.indexOf(
            document.activeElement,
        );

    const nextIndex =
        event.key === "ArrowDown"
            ? currentIndex < 0
                ? 0
                : (currentIndex + 1) %
                  items.length
            : currentIndex < 0
                ? items.length - 1
                : (
                    currentIndex -
                    1 +
                    items.length
                ) % items.length;

    items[nextIndex].focus();
}

function focusMenuItemAtIndex(
    index,
    event,
) {
    const items =
        getFocusableMenuItems();

    if (!items.length) {
        return;
    }

    event.preventDefault();

    const safeIndex = clamp(
        index,
        0,
        items.length - 1,
    );

    items[safeIndex].focus();
}

function focusFirstMenuItem(
    dropdown,
) {
    const items =
        getMenuItems(dropdown);

    if (items.length) {
        items[0].focus();
        return;
    }

    dropdown.focus();
}

// ============================================================
// Menu Items
// ============================================================

function getFocusableMenuItems() {
    return getMenuItems(
        state.active?.element,
    );
}

function getMenuItems(dropdown) {
    if (!dropdown) {
        return [];
    }

    return Array.from(
        dropdown.querySelectorAll(
            '[role="menuitem"], [data-dropdown-item]',
        ),
    ).filter(isFocusableMenuItem);
}

function isFocusableMenuItem(
    item,
) {
    if (!(item instanceof HTMLElement)) {
        return false;
    }

    if (
        item.getAttribute(
            "aria-disabled",
        ) === "true"
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
}

// ============================================================
// Root
// ============================================================

function ensureRoot() {
    if (
        state.root &&
        document.documentElement.contains(
            state.root,
        )
    ) {
        return state.root;
    }

    state.root =
        resolveElement(
            DEFAULT_ROOT_SELECTOR,
        );

    return state.root;
}

export function getDropdownRoot() {
    return ensureRoot();
}

// ============================================================
// Destroy
// ============================================================

export function destroyDropdown() {
    closeDropdown();

    if (state.root) {
        state.root.replaceChildren();
    }

    state.root = null;
}

// ============================================================
// ARIA
// ============================================================

function setTriggerExpanded(
    trigger,
    expanded,
) {
    if (!trigger) {
        return;
    }

    trigger.setAttribute(
        "aria-expanded",
        String(expanded),
    );
}

function setTriggerControls(
    trigger,
    id,
) {
    if (!trigger) {
        return;
    }

    if (id) {
        trigger.setAttribute(
            "aria-controls",
            id,
        );
    } else {
        trigger.removeAttribute(
            "aria-controls",
        );
    }
}

// ============================================================
// Helpers
// ============================================================

function resolveElement(value) {
    if (!value) {
        return null;
    }

    if (value instanceof HTMLElement) {
        return value;
    }

    if (typeof value !== "string") {
        return null;
    }

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

function createUniqueDropdownId() {
    return `dropdown-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
}

function clamp(
    value,
    min,
    max,
) {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.min(
        Math.max(value, min),
        max,
    );
}

function isTextInputElement(
    element,
) {
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

// ============================================================
// Dropdown Item Factory
// ============================================================

export function createDropdownItem({
    label = "",
    icon = "",
    value = "",
    className = "",
    disabled = false,
} = {}) {
    const safeLabel =
        escapeHtml(label);

    const safeIcon =
        escapeHtml(icon);

    const safeValue =
        escapeHtml(value);

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

    const iconMarkup = icon
        ? `
            <i
                data-lucide="${safeIcon}"
                class="h-4 w-4 shrink-0"
                aria-hidden="true"
            ></i>
        `
        : "";

    const valueAttribute = safeValue
        ? `data-value="${safeValue}"`
        : "";

    const disabledAttributes = disabled
        ? 'aria-disabled="true" disabled'
        : "";

    return `
        <button
            type="button"
            role="menuitem"
            data-dropdown-item
            ${valueAttribute}
            ${disabledAttributes}
            class="${classes}"
        >
            ${iconMarkup}

            <span class="min-w-0 flex-1 truncate">
                ${safeLabel}
            </span>
        </button>
    `;
}

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
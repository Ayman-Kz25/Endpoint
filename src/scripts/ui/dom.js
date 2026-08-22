// src/scripts/ui/dom.js

/**
 * DOM Utilities
 *
 * Centralizes access to application DOM elements.
 *
 * Responsibilities:
 * - Cache important application elements
 * - Provide safe element lookup helpers
 * - Expose grouped DOM references for UI features
 * - Avoid repeated document.getElementById() calls
 *
 * This module does not:
 * - Mutate application state
 * - Bind application events
 * - Render feature-specific UI
 */

/* ============================================================
 * Element References
 * ============================================================ */

const elements = {
    /* Application shell */
    app: null,
    header: null,
    mainContent: null,

    /* Workspace */
    workspaceTitle: null,
    workspaceSubtitle: null,

    /* Header actions */
    mobileSidebarButton: null,
    searchButton: null,
    themeToggle: null,
    settingsButton: null,

    /* Sidebar */
    sidebar: null,
    sidebarBackdrop: null,
    newRequestButton: null,
    collectionsButton: null,
    historyButton: null,
    environmentsButton: null,
    recentRequestsSection: null,
    recentRequestsList: null,
    recentRequestsEmpty: null,
    clearRecentButton: null,
    keyboardShortcutsButton: null,

    /* Request toolbar */
    requestWorkspace: null,
    requestToolbar: null,
    requestMethod: null,
    requestUrl: null,
    saveRequestButton: null,
    sendRequestButton: null,

    /* Request tabs */
    requestTabs: null,
    requestTabParams: null,
    requestTabHeaders: null,
    requestTabBody: null,
    requestTabAuth: null,

    /* Request panels */
    requestPanel: null,
    requestPanelParams: null,
    requestPanelHeaders: null,
    requestPanelBody: null,
    requestPanelAuth: null,

    /* Query parameters */
    addQueryParamButton: null,
    queryParamsList: null,
    queryParamsEmpty: null,

    /* Headers */
    addHeaderButton: null,
    headersList: null,
    headersEmpty: null,

    /* Request body */
    formatBodyButton: null,
    bodyValidationStatus: null,
    jsonEditor: null,

    /* Authentication */
    authType: null,
    authFields: null,

    /* Response */
    responseWorkspace: null,
    responseStatus: null,
    responseDuration: null,
    responseSize: null,

    copyResponseButton: null,
    downloadResponseButton: null,
    generateCodeButton: null,

    /* Response tabs */
    responseTabs: null,
    responseTabPretty: null,
    responseTabRaw: null,
    responseTabHeaders: null,

    /* Response panels */
    responsePanelPretty: null,
    responsePanelRaw: null,
    responsePanelHeaders: null,

    /* Response content */
    responseEmptyState: null,
    responseLoadingState: null,
    responsePretty: null,
    responseRaw: null,
    responseHeadersList: null,

    /* Global UI */
    modalRoot: null,
    dropdownRoot: null,
    liveRegion: null,
};

/* ============================================================
 * Element ID Map
 * ============================================================ */

const elementIds = {
    app: "app",
    header: "app-header",
    mainContent: "main-content",

    workspaceTitle: "workspace-title",
    workspaceSubtitle: "workspace-subtitle",

    mobileSidebarButton: "mobile-sidebar-button",
    searchButton: "search-button",
    themeToggle: "theme-toggle",
    settingsButton: "settings-button",

    sidebar: "sidebar",
    sidebarBackdrop: "sidebar-backdrop",
    newRequestButton: "new-request-button",
    collectionsButton: "collections-button",
    historyButton: "history-button",
    environmentsButton: "environments-button",
    recentRequestsSection: "recent-requests-section",
    recentRequestsList: "recent-requests-list",
    recentRequestsEmpty: "recent-requests-empty",
    clearRecentButton: "clear-recent-button",
    keyboardShortcutsButton: "keyboard-shortcuts-button",

    requestWorkspace: "request-workspace",
    requestToolbar: "request-toolbar",
    requestMethod: "request-method",
    requestUrl: "request-url",
    saveRequestButton: "save-request-button",
    sendRequestButton: "send-request-button",

    requestTabs: "request-tabs",
    requestTabParams: "request-tab-params",
    requestTabHeaders: "request-tab-headers",
    requestTabBody: "request-tab-body",
    requestTabAuth: "request-tab-auth",

    requestPanel: "request-panel",
    requestPanelParams: "request-panel-params",
    requestPanelHeaders: "request-panel-headers",
    requestPanelBody: "request-panel-body",
    requestPanelAuth: "request-panel-auth",

    addQueryParamButton: "add-query-param-button",
    queryParamsList: "query-params-list",
    queryParamsEmpty: "query-params-empty",

    addHeaderButton: "add-header-button",
    headersList: "headers-list",
    headersEmpty: "headers-empty",

    formatBodyButton: "format-body-button",
    bodyValidationStatus: "body-validation-status",
    jsonEditor: "json-editor",

    authType: "auth-type",
    authFields: "auth-fields",

    responseWorkspace: "response-workspace",
    responseStatus: "response-status",
    responseDuration: "response-duration",
    responseSize: "response-size",

    copyResponseButton: "copy-response-button",
    downloadResponseButton: "download-response-button",
    generateCodeButton: "generate-code-button",

    responseTabs: "response-tabs",
    responseTabPretty: "response-tab-pretty",
    responseTabRaw: "response-tab-raw",
    responseTabHeaders: "response-tab-headers",

    responsePanelPretty: "response-panel-pretty",
    responsePanelRaw: "response-panel-raw",
    responsePanelHeaders: "response-panel-headers",

    responseEmptyState: "response-empty-state",
    responseLoadingState: "response-loading-state",
    responsePretty: "response-pretty",
    responseRaw: "response-raw",
    responseHeadersList: "response-headers-list",

    modalRoot: "modal-root",
    dropdownRoot: "dropdown-root",
    liveRegion: "live-region",
};

/* ============================================================
 * Initialization
 * ============================================================ */

/**
 * Cache all known application DOM elements.
 *
 * Safe to call more than once.
 *
 * @param {ParentNode} root
 * @returns {Object}
 */
export function initDOM(root = document) {
    if (!root) {
        return elements;
    }

    Object.entries(elementIds).forEach(([key, id]) => {
        elements[key] = root.getElementById
            ? root.getElementById(id)
            : root.querySelector(`#${escapeSelector(id)}`);
    });

    return elements;
}

/**
 * Alias for initDOM().
 *
 * @param {ParentNode} root
 * @returns {Object}
 */
export function cacheDOM(root = document) {
    return initDOM(root);
}

/* ============================================================
 * Generic DOM Helpers
 * ============================================================ */

/**
 * Get an element by ID.
 *
 * @param {string} id
 * @param {ParentNode} root
 * @returns {HTMLElement|null}
 */
export function getElement(id, root = document) {
    if (!id || !root) {
        return null;
    }

    if (typeof root.getElementById === "function") {
        return root.getElementById(id);
    }

    return root.querySelector(`#${escapeSelector(id)}`);
}

/**
 * Query a single element.
 *
 * @param {string} selector
 * @param {ParentNode} root
 * @returns {Element|null}
 */
export function query(selector, root = document) {
    if (!selector || !root?.querySelector) {
        return null;
    }

    return root.querySelector(selector);
}

/**
 * Query multiple elements.
 *
 * @param {string} selector
 * @param {ParentNode} root
 * @returns {Element[]}
 */
export function queryAll(selector, root = document) {
    if (!selector || !root?.querySelectorAll) {
        return [];
    }

    return Array.from(root.querySelectorAll(selector));
}

/**
 * Escape an ID before using it inside a CSS selector.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeSelector(value) {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
        return CSS.escape(value);
    }

    return String(value).replace(
        /([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,
        "\\$1"
    );
}

/* ============================================================
 * State Helpers
 * ============================================================ */

/**
 * Check whether the DOM has been initialized.
 *
 * @returns {boolean}
 */
export function isDOMReady() {
    return Boolean(elements.app);
}

/**
 * Check whether an element exists.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function hasElement(id) {
    return Boolean(getElement(id));
}

/**
 * Return all cached DOM references.
 *
 * @returns {Object}
 */
export function getElements() {
    return elements;
}

/**
 * Get a cached DOM element.
 *
 * @param {keyof typeof elements} name
 * @returns {HTMLElement|null}
 */
export function getDOM(name) {
    return elements[name] || null;
}

/* ============================================================
 * Request UI Helpers
 * ============================================================ */

/**
 * Get request tab buttons.
 *
 * @returns {HTMLElement[]}
 */
export function getRequestTabElements() {
    return queryAll(
        "[data-tab]",
        elements.requestTabs || document
    );
}

/**
 * Get request tab panels.
 *
 * @returns {HTMLElement[]}
 */
export function getRequestPanelElements() {
    return queryAll(
        "[data-panel]",
        elements.requestPanel || document
    );
}

/* ============================================================
 * Response UI Helpers
 * ============================================================ */

/**
 * Get response tab buttons.
 *
 * @returns {HTMLElement[]}
 */
export function getResponseTabElements() {
    return queryAll(
        "[data-response-tab]",
        elements.responseTabs || document
    );
}

/**
 * Get response tab panels.
 *
 * @returns {HTMLElement[]}
 */
export function getResponsePanelElements() {
    return queryAll(
        "[data-response-panel]",
        elements.responseWorkspace || document
    );
}

/* ============================================================
 * Visibility Helpers
 * ============================================================ */

/**
 * Show an element.
 *
 * Uses the hidden attribute as the source of truth.
 *
 * @param {Element|null} element
 */
export function show(element) {
    if (!element) {
        return;
    }

    element.hidden = false;
    element.classList.remove("hidden");
}

/**
 * Hide an element.
 *
 * @param {Element|null} element
 */
export function hide(element) {
    if (!element) {
        return;
    }

    element.hidden = true;
    element.classList.add("hidden");
}

/**
 * Toggle element visibility.
 *
 * @param {Element|null} element
 * @param {boolean} visible
 */
export function setVisible(element, visible) {
    if (visible) {
        show(element);
    } else {
        hide(element);
    }
}

/* ============================================================
 * Attribute Helpers
 * ============================================================ */

/**
 * Set an attribute if the element exists.
 *
 * @param {Element|null} element
 * @param {string} name
 * @param {string} value
 */
export function setAttribute(element, name, value) {
    if (!element || !name) {
        return;
    }

    element.setAttribute(name, String(value));
}

/**
 * Remove an attribute if the element exists.
 *
 * @param {Element|null} element
 * @param {string} name
 */
export function removeAttribute(element, name) {
    if (!element || !name) {
        return;
    }

    element.removeAttribute(name);
}

/**
 * Set aria-expanded.
 *
 * @param {Element|null} element
 * @param {boolean} expanded
 */
export function setExpanded(element, expanded) {
    if (!element) {
        return;
    }

    element.setAttribute(
        "aria-expanded",
        String(Boolean(expanded))
    );
}

/**
 * Set aria-selected.
 *
 * @param {Element|null} element
 * @param {boolean} selected
 */
export function setSelected(element, selected) {
    if (!element) {
        return;
    }

    element.setAttribute(
        "aria-selected",
        String(Boolean(selected))
    );
}

/* ============================================================
 * Content Helpers
 * ============================================================ */

/**
 * Safely set text content.
 *
 * @param {Element|null} element
 * @param {unknown} value
 */
export function setText(element, value) {
    if (!element) {
        return;
    }

    element.textContent =
        value === null || value === undefined
            ? ""
            : String(value);
}

/**
 * Safely set HTML content.
 *
 * Use this only when the HTML has already been sanitized or
 * is generated entirely by the application.
 *
 * @param {Element|null} element
 * @param {string} html
 */
export function setHTML(element, html = "") {
    if (!element) {
        return;
    }

    element.innerHTML = String(html);
}

/**
 * Clear an element.
 *
 * @param {Element|null} element
 */
export function clear(element) {
    if (!element) {
        return;
    }

    element.replaceChildren();
}

/* ============================================================
 * Class Helpers
 * ============================================================ */

/**
 * Add classes to an element.
 *
 * @param {Element|null} element
 * @param {...string} classNames
 */
export function addClass(element, ...classNames) {
    if (!element || !classNames.length) {
        return;
    }

    element.classList.add(
        ...classNames.filter(Boolean)
    );
}

/**
 * Remove classes from an element.
 *
 * @param {Element|null} element
 * @param {...string} classNames
 */
export function removeClass(element, ...classNames) {
    if (!element || !classNames.length) {
        return;
    }

    element.classList.remove(
        ...classNames.filter(Boolean)
    );
}

/**
 * Toggle a class.
 *
 * @param {Element|null} element
 * @param {string} className
 * @param {boolean|undefined} force
 */
export function toggleClass(
    element,
    className,
    force
) {
    if (!element || !className) {
        return false;
    }

    return element.classList.toggle(
        className,
        force
    );
}

/* ============================================================
 * Event Helpers
 * ============================================================ */

/**
 * Add an event listener safely.
 *
 * @param {EventTarget|null} element
 * @param {string} eventName
 * @param {EventListener} handler
 * @param {AddEventListenerOptions|boolean} options
 * @returns {Function|null} Cleanup function
 */
export function on(
    element,
    eventName,
    handler,
    options
) {
    if (
        !element ||
        !eventName ||
        typeof handler !== "function"
    ) {
        return null;
    }

    element.addEventListener(
        eventName,
        handler,
        options
    );

    return () => {
        element.removeEventListener(
            eventName,
            handler,
            options
        );
    };
}

/**
 * Add a delegated event listener.
 *
 * @param {EventTarget|null} element
 * @param {string} eventName
 * @param {string} selector
 * @param {(event: Event, matched: Element) => void} handler
 * @returns {Function|null} Cleanup function
 */
export function delegate(
    element,
    eventName,
    selector,
    handler
) {
    if (
        !element ||
        !eventName ||
        !selector ||
        typeof handler !== "function"
    ) {
        return null;
    }

    const listener = (event) => {
        const target =
            event.target instanceof Element
                ? event.target.closest(selector)
                : null;

        if (!target || !element.contains(target)) {
            return;
        }

        handler(event, target);
    };

    element.addEventListener(
        eventName,
        listener
    );

    return () => {
        element.removeEventListener(
            eventName,
            listener
        );
    };
}

/* ============================================================
 * Form Helpers
 * ============================================================ */

/**
 * Get the current value of a form control.
 *
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|null} element
 * @param {string} fallback
 * @returns {string}
 */
export function getValue(
    element,
    fallback = ""
) {
    if (!element) {
        return fallback;
    }

    return element.value ?? fallback;
}

/**
 * Set the value of a form control.
 *
 * @param {HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|null} element
 * @param {unknown} value
 */
export function setValue(element, value) {
    if (!element || !("value" in element)) {
        return;
    }

    element.value =
        value === null || value === undefined
            ? ""
            : String(value);
}

/**
 * Get checkbox state.
 *
 * @param {HTMLInputElement|null} element
 * @param {boolean} fallback
 * @returns {boolean}
 */
export function isChecked(
    element,
    fallback = false
) {
    if (!element || !("checked" in element)) {
        return fallback;
    }

    return Boolean(element.checked);
}

/**
 * Set checkbox state.
 *
 * @param {HTMLInputElement|null} element
 * @param {boolean} checked
 */
export function setChecked(element, checked) {
    if (!element || !("checked" in element)) {
        return;
    }

    element.checked = Boolean(checked);
}

/* ============================================================
 * Focus Helpers
 * ============================================================ */

/**
 * Focus an element safely.
 *
 * @param {HTMLElement|null} element
 * @param {FocusOptions} options
 */
export function focus(element, options = {}) {
    if (!element || typeof element.focus !== "function") {
        return;
    }

    element.focus(options);
}

/**
 * Select the contents of a text input.
 *
 * @param {HTMLInputElement|HTMLTextAreaElement|null} element
 */
export function selectInput(element) {
    if (!element || typeof element.select !== "function") {
        return;
    }

    element.select();
}

/* ============================================================
 * Accessibility Helpers
 * ============================================================ */

/**
 * Announce a message to screen readers.
 *
 * @param {string} message
 */
export function announce(message) {
    const liveRegion =
        elements.liveRegion ||
        getElement("live-region");

    if (!liveRegion) {
        return;
    }

    liveRegion.textContent = "";

    // Allow assistive technologies to detect a new announcement.
    requestAnimationFrame(() => {
        liveRegion.textContent =
            message === null || message === undefined
                ? ""
                : String(message);
    });
}

/* ============================================================
 * Export
 * ============================================================ */

export default {
    initDOM,
    cacheDOM,

    getElement,
    query,
    queryAll,

    isDOMReady,
    hasElement,
    getElements,
    getDOM,

    getRequestTabElements,
    getRequestPanelElements,
    getResponseTabElements,
    getResponsePanelElements,

    show,
    hide,
    setVisible,

    setAttribute,
    removeAttribute,
    setExpanded,
    setSelected,

    setText,
    setHTML,
    clear,

    addClass,
    removeClass,
    toggleClass,

    on,
    delegate,

    getValue,
    setValue,
    isChecked,
    setChecked,

    focus,
    selectInput,

    announce,
};
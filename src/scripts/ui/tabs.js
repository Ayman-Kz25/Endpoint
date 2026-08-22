// src/scripts/ui/tabs.js

/**
 * Tabs UI
 *
 * Generic tab controller used by request and response tab groups.
 *
 * Responsibilities:
 * - Initialize tab groups
 * - Switch between tabs
 * - Update aria-selected state
 * - Show/hide associated panels
 * - Support keyboard navigation
 * - Keep tab state accessible to other modules
 *
 * Expected markup:
 *
 * <div role="tablist">
 *   <button
 *     role="tab"
 *     data-tab="params"
 *     aria-controls="request-panel-params"
 *     aria-selected="true"
 *   >
 *     Params
 *   </button>
 * </div>
 *
 * <section
 *   id="request-panel-params"
 *   role="tabpanel"
 * >
 * </section>
 *
 * The module supports both:
 * - data-tab / data-panel
 * - data-response-tab / data-response-panel
 *
 * It can also initialize a specific tab container directly.
 */

// ============================================================
// Constants
// ============================================================

const SELECTORS = {
    tabLists: '[role="tablist"]',
    tabs: '[role="tab"]',
    panels: '[role="tabpanel"]',
};

const CLASSES = {
    active:
        "border-primary text-foreground",
    inactive:
        "border-transparent text-muted-foreground",
};

// ============================================================
// Internal State
// ============================================================

const groups = new Map();

let initialized = false;

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize all tab groups in the document.
 *
 * This does not assume any particular tab implementation.
 * It discovers tablists using [role="tablist"].
 *
 * @returns {Object} Tabs API
 */
export function initTabs() {
    if (initialized) {
        return createApi();
    }

    const tabLists = document.querySelectorAll(
        SELECTORS.tabLists
    );

    tabLists.forEach((tabList) => {
        initTabList(tabList);
    });

    initialized = true;

    return createApi();
}

/**
 * Initialize a single tab list.
 *
 * @param {HTMLElement|string} tabList
 * @returns {Object|null}
 */
export function initTabList(tabList) {
    const element =
        typeof tabList === "string"
            ? document.querySelector(tabList)
            : tabList;

    if (!(element instanceof HTMLElement)) {
        return null;
    }

    if (!element.matches(SELECTORS.tabLists)) {
        return null;
    }

    const tabs = Array.from(
        element.querySelectorAll(
            SELECTORS.tabs
        )
    );

    if (!tabs.length) {
        return null;
    }

    const existing = groups.get(element);

    if (existing) {
        destroyTabList(element);
    }

    const group = {
        element,
        tabs,
        activeTab: null,
        handlers: new Map(),
    };

    groups.set(element, group);

    tabs.forEach((tab) => {
        bindTabEvents(group, tab);
    });

    const initialTab = findInitialTab(tabs);

    if (initialTab) {
        activateTab(initialTab, {
            focus: false,
            updateUrl: false,
        });
    }

    return {
        activate: (tab) => activateTab(tab),
        getActive: () => getActiveTab(element),
        getTabs: () => [...group.tabs],
        destroy: () => destroyTabList(element),
    };
}

/**
 * Initialize a tab list after it has been dynamically inserted.
 *
 * @param {HTMLElement|string} tabList
 * @returns {Object|null}
 */
export function refreshTabs(tabList) {
    return initTabList(tabList);
}

// ============================================================
// Binding
// ============================================================

/**
 * Bind events for a single tab.
 *
 * @param {Object} group
 * @param {HTMLElement} tab
 */
function bindTabEvents(group, tab) {
    const clickHandler = () => {
        activateTab(tab);
    };

    const keydownHandler = (event) => {
        handleTabKeydown(event, group);
    };

    tab.addEventListener(
        "click",
        clickHandler
    );

    tab.addEventListener(
        "keydown",
        keydownHandler
    );

    group.handlers.set(tab, {
        clickHandler,
        keydownHandler,
    });
}

/**
 * Remove events from a tab list.
 *
 * @param {HTMLElement} tabList
 */
export function destroyTabList(tabList) {
    const group = groups.get(tabList);

    if (!group) {
        return false;
    }

    group.tabs.forEach((tab) => {
        const handlers = group.handlers.get(tab);

        if (!handlers) {
            return;
        }

        tab.removeEventListener(
            "click",
            handlers.clickHandler
        );

        tab.removeEventListener(
            "keydown",
            handlers.keydownHandler
        );
    });

    groups.delete(tabList);

    return true;
}

// ============================================================
// Activation
// ============================================================

/**
 * Activate a tab.
 *
 * @param {HTMLElement|string} tab
 * @param {Object} [options]
 * @param {boolean} [options.focus=true]
 * @param {boolean} [options.updateUrl=false]
 * @returns {boolean}
 */
export function activateTab(tab, options = {}) {
    const {
        focus = true,
        updateUrl = false,
    } = options;

    const tabElement =
        resolveTab(tab);

    if (!tabElement) {
        return false;
    }

    const tabList =
        tabElement.closest(
            SELECTORS.tabLists
        );

    if (!tabList) {
        return false;
    }

    const group = groups.get(tabList);

    if (!group) {
        initTabList(tabList);

        return activateTab(
            tabElement,
            options
        );
    }

    if (!group.tabs.includes(tabElement)) {
        return false;
    }

    const panelId =
        getPanelId(tabElement);

    const panel =
        panelId
            ? document.getElementById(panelId)
            : null;

    if (!panel) {
        console.warn(
            `[tabs] No panel found for tab "${tabElement.id || getTabName(tabElement)}".`
        );
    }

    group.tabs.forEach((currentTab) => {
        const active =
            currentTab === tabElement;

        updateTabState(
            currentTab,
            active
        );

        const currentPanelId =
            getPanelId(currentTab);

        if (!currentPanelId) {
            return;
        }

        const currentPanel =
            document.getElementById(
                currentPanelId
            );

        if (currentPanel) {
            updatePanelState(
                currentPanel,
                active
            );
        }
    });

    group.activeTab = tabElement;

    if (focus) {
        tabElement.focus();
    }

    if (updateUrl) {
        updateUrlHash(tabElement);
    }

    dispatchTabChange(
        tabElement,
        panel
    );

    return true;
}

/**
 * Set a tab without requiring the caller to know its DOM element.
 *
 * @param {string} tabName
 * @param {HTMLElement|string} tabList
 * @param {Object} [options]
 * @returns {boolean}
 */
export function setActiveTab(
    tabName,
    tabList = null,
    options = {}
) {
    const group =
        resolveGroup(tabList);

    if (!group) {
        return false;
    }

    const tab =
        group.tabs.find(
            (item) =>
                getTabName(item) === tabName
        );

    if (!tab) {
        return false;
    }

    return activateTab(
        tab,
        options
    );
}

/**
 * Get the currently active tab.
 *
 * @param {HTMLElement|string} [tabList]
 * @returns {HTMLElement|null}
 */
export function getActiveTab(tabList = null) {
    const group =
        resolveGroup(tabList);

    if (!group) {
        return null;
    }

    return (
        group.activeTab ||
        group.tabs.find(
            (tab) =>
                tab.getAttribute(
                    "aria-selected"
                ) === "true"
        ) ||
        null
    );
}

/**
 * Get the active tab name.
 *
 * @param {HTMLElement|string} [tabList]
 * @returns {string|null}
 */
export function getActiveTabName(
    tabList = null
) {
    const tab =
        getActiveTab(tabList);

    return tab
        ? getTabName(tab)
        : null;
}

// ============================================================
// Tab State
// ============================================================

/**
 * Update tab accessibility and visual state.
 *
 * @param {HTMLElement} tab
 * @param {boolean} active
 */
function updateTabState(
    tab,
    active
) {
    tab.setAttribute(
        "aria-selected",
        String(active)
    );

    tab.setAttribute(
        "tabindex",
        active ? "0" : "-1"
    );

    tab.classList.toggle(
        CLASSES.active.split(" ")[0],
        active
    );

    tab.classList.toggle(
        CLASSES.active.split(" ")[1],
        active
    );

    tab.classList.toggle(
        CLASSES.inactive.split(" ")[0],
        !active
    );

    tab.classList.toggle(
        CLASSES.inactive.split(" ")[1],
        !active
    );
}

/**
 * Update panel visibility and accessibility.
 *
 * @param {HTMLElement} panel
 * @param {boolean} active
 */
function updatePanelState(
    panel,
    active
) {
    panel.classList.toggle(
        "hidden",
        !active
    );

    panel.setAttribute(
        "aria-hidden",
        String(!active)
    );

    panel.tabIndex = active ? 0 : -1;
}

// ============================================================
// Keyboard Navigation
// ============================================================

/**
 * Handle keyboard interaction with tabs.
 *
 * Supported:
 * - ArrowLeft
 * - ArrowRight
 * - ArrowUp
 * - ArrowDown
 * - Home
 * - End
 * - Enter
 * - Space
 *
 * @param {KeyboardEvent} event
 * @param {Object} group
 */
function handleTabKeydown(
    event,
    group
) {
    const currentTab =
        event.currentTarget;

    const currentIndex =
        group.tabs.indexOf(
            currentTab
        );

    if (currentIndex === -1) {
        return;
    }

    let nextIndex = null;

    switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
            nextIndex =
                (currentIndex + 1) %
                group.tabs.length;
            break;

        case "ArrowLeft":
        case "ArrowUp":
            nextIndex =
                (currentIndex - 1 +
                    group.tabs.length) %
                group.tabs.length;
            break;

        case "Home":
            nextIndex = 0;
            break;

        case "End":
            nextIndex =
                group.tabs.length - 1;
            break;

        case "Enter":
        case " ":
        case "Spacebar":
            event.preventDefault();

            activateTab(
                currentTab
            );

            return;

        default:
            return;
    }

    event.preventDefault();

    const nextTab =
        group.tabs[nextIndex];

    if (!nextTab) {
        return;
    }

    activateTab(
        nextTab,
        {
            focus: true,
            updateUrl: false,
        }
    );
}

// ============================================================
// Discovery
// ============================================================

/**
 * Find the initial tab.
 *
 * Priority:
 * 1. aria-selected="true"
 * 2. first tab without disabled
 * 3. first tab
 *
 * @param {HTMLElement[]} tabs
 * @returns {HTMLElement|null}
 */
function findInitialTab(tabs) {
    const selected =
        tabs.find(
            (tab) =>
                tab.getAttribute(
                    "aria-selected"
                ) === "true" &&
                !isDisabled(tab)
        );

    if (selected) {
        return selected;
    }

    return (
        tabs.find(
            (tab) => !isDisabled(tab)
        ) ||
        tabs[0] ||
        null
    );
}

/**
 * Resolve a tab argument.
 *
 * @param {HTMLElement|string} tab
 * @returns {HTMLElement|null}
 */
function resolveTab(tab) {
    if (tab instanceof HTMLElement) {
        return tab;
    }

    if (typeof tab !== "string") {
        return null;
    }

    const byId =
        document.getElementById(tab);

    if (byId?.matches(SELECTORS.tabs)) {
        return byId;
    }

    const selector =
        `[data-tab="${escapeSelectorValue(tab)}"],` +
        `[data-response-tab="${escapeSelectorValue(tab)}"]`;

    return document.querySelector(
        selector
    );
}

/**
 * Resolve a tab group.
 *
 * @param {HTMLElement|string|null} tabList
 * @returns {Object|null}
 */
function resolveGroup(tabList) {
    if (tabList instanceof HTMLElement) {
        return groups.get(tabList) || null;
    }

    if (typeof tabList === "string") {
        const element =
            document.querySelector(tabList);

        return element
            ? groups.get(element) || null
            : null;
    }

    const active =
        document.activeElement;

    const activeList =
        active?.closest(
            SELECTORS.tabLists
        );

    if (activeList) {
        return groups.get(
            activeList
        ) || null;
    }

    const first =
        groups.values().next().value;

    return first || null;
}

/**
 * Get the associated panel id.
 *
 * Supports aria-controls and data-panel relationships.
 *
 * @param {HTMLElement} tab
 * @returns {string|null}
 */
function getPanelId(tab) {
    const ariaControls =
        tab.getAttribute(
            "aria-controls"
        );

    if (ariaControls) {
        return ariaControls;
    }

    const tabName =
        getTabName(tab);

    if (!tabName) {
        return null;
    }

    const panel =
        tab.closest(
            SELECTORS.tabLists
        )?.parentElement?.querySelector(
            `[data-panel="${escapeSelectorValue(tabName)}"], ` +
            `[data-response-panel="${escapeSelectorValue(tabName)}"]`
        );

    return panel?.id || null;
}

/**
 * Get the logical tab name.
 *
 * @param {HTMLElement} tab
 * @returns {string|null}
 */
function getTabName(tab) {
    return (
        tab.dataset.tab ||
        tab.dataset.responseTab ||
        null
    );
}

/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isDisabled(element) {
    return (
        element.disabled ||
        element.getAttribute(
            "aria-disabled"
        ) === "true"
    );
}

// ============================================================
// Events
// ============================================================

/**
 * Notify application code that a tab changed.
 *
 * @param {HTMLElement} tab
 * @param {HTMLElement|null} panel
 */
function dispatchTabChange(
    tab,
    panel
) {
    const event =
        new CustomEvent(
            "tabs:change",
            {
                bubbles: true,
                detail: {
                    tab,
                    panel,
                    name: getTabName(tab),
                    tabList:
                        tab.closest(
                            SELECTORS.tabLists
                        ),
                },
            }
        );

    tab.dispatchEvent(event);
}

/**
 * Optionally synchronize the tab with the URL hash.
 *
 * @param {HTMLElement} tab
 */
function updateUrlHash(tab) {
    const name =
        getTabName(tab);

    if (!name) {
        return;
    }

    try {
        history.replaceState(
            null,
            "",
            `#tab-${encodeURIComponent(name)}`
        );
    } catch {
        // Ignore environments where history manipulation
        // is unavailable.
    }
}

// ============================================================
// Utilities
// ============================================================

/**
 * Escape a value used inside a CSS attribute selector.
 *
 * @param {string} value
 * @returns {string}
 */
function escapeSelectorValue(value) {
    if (
        typeof CSS !== "undefined" &&
        typeof CSS.escape === "function"
    ) {
        return CSS.escape(value);
    }

    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll('"', '\\"');
}

/**
 * Create the public API.
 *
 * @returns {Object}
 */
function createApi() {
    return {
        initTabList,
        refreshTabs,
        activateTab,
        setActiveTab,
        getActiveTab,
        getActiveTabName,
        destroyTabList,
    };
}

// ============================================================
// Exports
// ============================================================

export default {
    initTabs,
    initTabList,
    refreshTabs,
    activateTab,
    setActiveTab,
    getActiveTab,
    getActiveTabName,
    destroyTabList,
};
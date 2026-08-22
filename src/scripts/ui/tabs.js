// src/scripts/ui/tabs.js

import {
    getDOM,
    getRequestTabElements,
    getRequestPanelElements,
    getResponseTabElements,
    getResponsePanelElements,
    setSelected,
    setVisible,
} from "./dom.js";

/**
 * Tabs UI
 *
 * Controls the request and response tab interfaces using
 * the DOM elements cached by dom.js.
 *
 * Supported groups:
 *
 * Request:
 *   requestTabs
 *   requestTabParams
 *   requestTabHeaders
 *   requestTabBody
 *   requestTabAuth
 *
 *   requestPanelParams
 *   requestPanelHeaders
 *   requestPanelBody
 *   requestPanelAuth
 *
 * Response:
 *   responseTabs
 *   responseTabPretty
 *   responseTabRaw
 *   responseTabHeaders
 *
 *   responsePanelPretty
 *   responsePanelRaw
 *   responsePanelHeaders
 */

const GROUPS = {
    request: {
        tabsKey: "requestTabs",
        tabs: [
            "requestTabParams",
            "requestTabHeaders",
            "requestTabBody",
            "requestTabAuth",
        ],
        panels: [
            "requestPanelParams",
            "requestPanelHeaders",
            "requestPanelBody",
            "requestPanelAuth",
        ],
        defaultTab: "requestTabParams",
    },

    response: {
        tabsKey: "responseTabs",
        tabs: [
            "responseTabPretty",
            "responseTabRaw",
            "responseTabHeaders",
        ],
        panels: [
            "responsePanelPretty",
            "responsePanelRaw",
            "responsePanelHeaders",
        ],
        defaultTab: "responseTabPretty",
    },
};

const ACTIVE_CLASSES = [
    "border-primary",
    "text-foreground",
];

const INACTIVE_CLASSES = [
    "border-transparent",
    "text-muted-foreground",
];

const groups = new Map();

let initialized = false;

/**
 * Initialize request and response tabs.
 *
 * @returns {Object}
 */
export function initTabs() {
    if (initialized) {
        return createApi();
    }

    initRequestTabs();
    initResponseTabs();

    initialized = true;

    return createApi();
}

/**
 * Initialize request tabs.
 *
 * @returns {Object|null}
 */
export function initRequestTabs() {
    return initGroup("request");
}

/**
 * Initialize response tabs.
 *
 * @returns {Object|null}
 */
export function initResponseTabs() {
    return initGroup("response");
}

/**
 * Initialize one known tab group.
 *
 * @param {"request"|"response"} groupName
 * @returns {Object|null}
 */
function initGroup(groupName) {
    const config = GROUPS[groupName];

    if (!config) {
        return null;
    }

    const tabList = getDOM(config.tabsKey);

    if (!tabList) {
        console.warn(
            `[tabs] Missing DOM element: ${config.tabsKey}`
        );

        return null;
    }

    const tabs = config.tabs
        .map((key) => getDOM(key))
        .filter(Boolean);

    const panels = config.panels
        .map((key) => getDOM(key))
        .filter(Boolean);

    if (!tabs.length) {
        console.warn(
            `[tabs] No tabs found for ${groupName} tab group`
        );

        return null;
    }

    const existing = groups.get(groupName);

    if (existing) {
        destroyGroup(groupName);
    }

    const group = {
        name: groupName,
        tabList,
        tabs,
        panels,
        activeTab: null,
        handlers: new Map(),
    };

    groups.set(groupName, group);

    prepareTabList(group);

    tabs.forEach((tab) => {
        bindTab(group, tab);
    });

    const initialTab = findInitialTab(
        group,
        config.defaultTab
    );

    if (initialTab) {
        activateTab(initialTab, {
            focus: false,
            dispatch: false,
        });
    }

    return createGroupApi(groupName);
}

/**
 * Prepare the tablist for accessibility.
 *
 * @param {Object} group
 */
function prepareTabList(group) {
    group.tabList.setAttribute(
        "role",
        "tablist"
    );

    group.tabs.forEach((tab) => {
        tab.setAttribute(
            "role",
            "tab"
        );

        if (!tab.hasAttribute("aria-selected")) {
            tab.setAttribute(
                "aria-selected",
                "false"
            );
        }

        if (!tab.hasAttribute("tabindex")) {
            tab.setAttribute(
                "tabindex",
                "-1"
            );
        }
    });

    group.panels.forEach((panel) => {
        panel.setAttribute(
            "role",
            "tabpanel"
        );
    });
}

/**
 * Bind events to a tab.
 *
 * @param {Object} group
 * @param {HTMLElement} tab
 */
function bindTab(group, tab) {
    const clickHandler = (event) => {
        event.preventDefault();

        activateTab(tab);
    };

    const keydownHandler = (event) => {
        handleKeyboardNavigation(
            event,
            group,
            tab
        );
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
 * Destroy one tab group.
 *
 * @param {"request"|"response"} groupName
 * @returns {boolean}
 */
export function destroyGroup(groupName) {
    const group = groups.get(groupName);

    if (!group) {
        return false;
    }

    group.handlers.forEach(
        (handlers, tab) => {
            tab.removeEventListener(
                "click",
                handlers.clickHandler
            );

            tab.removeEventListener(
                "keydown",
                handlers.keydownHandler
            );
        }
    );

    groups.delete(groupName);

    return true;
}

/**
 * Destroy all tab groups.
 */
export function destroyTabs() {
    destroyGroup("request");
    destroyGroup("response");

    initialized = false;
}

/**
 * Activate a tab.
 *
 * @param {HTMLElement|string} tab
 * @param {Object} options
 * @param {boolean} options.focus
 * @param {boolean} options.dispatch
 * @returns {boolean}
 */
export function activateTab(
    tab,
    {
        focus = true,
        dispatch = true,
    } = {}
) {
    const tabElement = resolveTab(tab);

    if (!tabElement) {
        return false;
    }

    const group = findGroupForTab(tabElement);

    if (!group) {
        return false;
    }

    if (!group.tabs.includes(tabElement)) {
        return false;
    }

    const panel = getPanelForTab(
        group,
        tabElement
    );

    group.tabs.forEach((currentTab) => {
        const active =
            currentTab === tabElement;

        updateTabState(
            currentTab,
            active
        );
    });

    group.panels.forEach((currentPanel) => {
        const active =
            currentPanel === panel;

        updatePanelState(
            currentPanel,
            active
        );
    });

    group.activeTab = tabElement;

    if (focus) {
        tabElement.focus();
    }

    if (dispatch) {
        dispatchTabChange(
            group,
            tabElement,
            panel
        );
    }

    return true;
}

/**
 * Set an active tab by logical name.
 *
 * Examples:
 *
 *   setActiveTab("params", "request")
 *   setActiveTab("headers", "request")
 *   setActiveTab("pretty", "response")
 *
 * @param {string} tabName
 * @param {"request"|"response"|HTMLElement|string|null} groupName
 * @param {Object} options
 * @returns {boolean}
 */
export function setActiveTab(
    tabName,
    groupName = null,
    options = {}
) {
    const group = resolveGroup(groupName);

    if (!group) {
        return false;
    }

    const normalizedName =
        normalizeTabName(tabName);

    const tab = group.tabs.find(
        (item) =>
            getTabName(item) === normalizedName
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
 * Get the active tab.
 *
 * @param {"request"|"response"|HTMLElement|string|null} groupName
 * @returns {HTMLElement|null}
 */
export function getActiveTab(
    groupName = null
) {
    const group = resolveGroup(groupName);

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
 * @param {"request"|"response"|HTMLElement|string|null} groupName
 * @returns {string|null}
 */
export function getActiveTabName(
    groupName = null
) {
    const tab = getActiveTab(groupName);

    return tab
        ? getTabName(tab)
        : null;
}

/**
 * Refresh a tab group.
 *
 * Useful if HTML is dynamically replaced.
 *
 * @param {"request"|"response"|HTMLElement|string} groupName
 * @returns {Object|null}
 */
export function refreshTabs(
    groupName = null
) {
    if (
        groupName === "request" ||
        groupName === "response"
    ) {
        return initGroup(groupName);
    }

    if (
        groupName instanceof HTMLElement
    ) {
        const requestTabs =
            getDOM("requestTabs");

        const responseTabs =
            getDOM("responseTabs");

        if (groupName === requestTabs) {
            return initGroup("request");
        }

        if (groupName === responseTabs) {
            return initGroup("response");
        }
    }

    return initTabs();
}

/**
 * Find the initial tab.
 *
 * @param {Object} group
 * @param {string} defaultTabKey
 * @returns {HTMLElement|null}
 */
function findInitialTab(
    group,
    defaultTabKey
) {
    const selected = group.tabs.find(
        (tab) =>
            tab.getAttribute(
                "aria-selected"
            ) === "true" &&
            !isDisabled(tab)
    );

    if (selected) {
        return selected;
    }

    const defaultTab =
        getDOM(defaultTabKey);

    if (
        defaultTab &&
        group.tabs.includes(defaultTab) &&
        !isDisabled(defaultTab)
    ) {
        return defaultTab;
    }

    return (
        group.tabs.find(
            (tab) => !isDisabled(tab)
        ) ||
        group.tabs[0] ||
        null
    );
}

/**
 * Update tab state.
 *
 * @param {HTMLElement} tab
 * @param {boolean} active
 */
function updateTabState(
    tab,
    active
) {
    setSelected(
        tab,
        active
    );

    tab.setAttribute(
        "tabindex",
        active ? "0" : "-1"
    );

    ACTIVE_CLASSES.forEach(
        (className) => {
            tab.classList.toggle(
                className,
                active
            );
        }
    );

    INACTIVE_CLASSES.forEach(
        (className) => {
            tab.classList.toggle(
                className,
                !active
            );
        }
    );

    tab.classList.toggle(
        "active",
        active
    );
}

/**
 * Update panel state.
 *
 * @param {HTMLElement} panel
 * @param {boolean} active
 */
function updatePanelState(
    panel,
    active
) {
    setVisible(
        panel,
        active
    );

    panel.setAttribute(
        "aria-hidden",
        String(!active)
    );

    panel.setAttribute(
        "tabindex",
        active ? "0" : "-1"
    );
}

/**
 * Resolve a tab from an element, ID,
 * or logical name.
 *
 * @param {HTMLElement|string} value
 * @returns {HTMLElement|null}
 */
function resolveTab(value) {
    if (
        value instanceof HTMLElement
    ) {
        return value;
    }

    if (
        typeof value !== "string"
    ) {
        return null;
    }

    const allTabs = [
        ...getRequestTabElements(),
        ...getResponseTabElements(),
    ];

    const normalized =
        normalizeTabName(value);

    return (
        allTabs.find(
            (tab) =>
                tab.id === value
        ) ||
        allTabs.find(
            (tab) =>
                getTabName(tab) === normalized
        ) ||
        null
    );
}

/**
 * Resolve a group.
 *
 * @param {string|HTMLElement|null} value
 * @returns {Object|null}
 */
function resolveGroup(value) {
    if (
        value === "request" ||
        value === "response"
    ) {
        return groups.get(value) || null;
    }

    if (
        value instanceof HTMLElement
    ) {
        for (const group of groups.values()) {
            if (
                group.tabList === value ||
                group.tabs.includes(value)
            ) {
                return group;
            }
        }

        return null;
    }

    if (
        typeof value === "string"
    ) {
        for (const group of groups.values()) {
            if (
                group.tabList.id === value
            ) {
                return group;
            }
        }
    }

    const activeElement =
        document.activeElement;

    if (
        activeElement instanceof HTMLElement
    ) {
        const activeGroup =
            findGroupForTab(
                activeElement
            );

        if (activeGroup) {
            return activeGroup;
        }
    }

    return (
        groups.get("request") ||
        groups.get("response") ||
        null
    );
}

/**
 * Find which group owns a tab.
 *
 * @param {HTMLElement} tab
 * @returns {Object|null}
 */
function findGroupForTab(tab) {
    for (const group of groups.values()) {
        if (group.tabs.includes(tab)) {
            return group;
        }
    }

    return null;
}

/**
 * Find a panel belonging to a tab.
 *
 * First uses aria-controls if the HTML
 * provides it. Otherwise maps DOM references
 * directly based on the known group structure.
 *
 * @param {Object} group
 * @param {HTMLElement} tab
 * @returns {HTMLElement|null}
 */
function getPanelForTab(
    group,
    tab
) {
    const controls =
        tab.getAttribute(
            "aria-controls"
        );

    if (controls) {
        const panel =
            document.getElementById(
                controls
            );

        if (panel) {
            return panel;
        }
    }

    const index =
        group.tabs.indexOf(tab);

    if (index === -1) {
        return null;
    }

    return group.panels[index] || null;
}

/**
 * Get logical tab name.
 *
 * Supports:
 *
 * data-tab="params"
 * data-response-tab="pretty"
 *
 * It also understands common ID names
 * from dom.js.
 *
 * @param {HTMLElement} tab
 * @returns {string|null}
 */
function getTabName(tab) {
    if (!tab) {
        return null;
    }

    if (tab.dataset.tab) {
        return normalizeTabName(
            tab.dataset.tab
        );
    }

    if (tab.dataset.responseTab) {
        return normalizeTabName(
            tab.dataset.responseTab
        );
    }

    const id = tab.id || "";

    const knownNames = [
        "params",
        "headers",
        "body",
        "auth",
        "pretty",
        "raw",
    ];

    for (const name of knownNames) {
        if (
            id
                .toLowerCase()
                .includes(name)
        ) {
            return name;
        }
    }

    return null;
}

/**
 * Normalize a tab name.
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeTabName(value) {
    if (
        typeof value !== "string"
    ) {
        return "";
    }

    return value
        .trim()
        .toLowerCase()
        .replace(
            /^(request|response)-?/,
            ""
        )
        .replace(
            /-?(tab|panel)$/,
            ""
        );
}

/**
 * Handle keyboard navigation.
 *
 * @param {KeyboardEvent} event
 * @param {Object} group
 * @param {HTMLElement} currentTab
 */
function handleKeyboardNavigation(
    event,
    group,
    currentTab
) {
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
                (currentIndex -
                    1 +
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
        }
    );
}

/**
 * Dispatch tabs:change.
 *
 * @param {Object} group
 * @param {HTMLElement} tab
 * @param {HTMLElement|null} panel
 */
function dispatchTabChange(
    group,
    tab,
    panel
) {
    const event =
        new CustomEvent(
            "tabs:change",
            {
                bubbles: true,

                detail: {
                    group:
                        group.name,

                    tab,

                    panel,

                    name:
                        getTabName(tab),

                    tabList:
                        group.tabList,
                },
            }
        );

    tab.dispatchEvent(
        event
    );
}

/**
 * Check whether a tab is disabled.
 *
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isDisabled(element) {
    return Boolean(
        element.disabled ||
        element.getAttribute(
            "aria-disabled"
        ) === "true"
    );
}

/**
 * Create API for one group.
 *
 * @param {string} groupName
 * @returns {Object|null}
 */
function createGroupApi(
    groupName
) {
    return {
        activate: (tab, options) =>
            activateTab(
                tab,
                options
            ),

        getActive: () =>
            getActiveTab(
                groupName
            ),

        getActiveName: () =>
            getActiveTabName(
                groupName
            ),

        getTabs: () => {
            const group =
                groups.get(
                    groupName
                );

            return group
                ? [...group.tabs]
                : [];
        },

        destroy: () =>
            destroyGroup(
                groupName
            ),
    };
}

/**
 * Create public API.
 *
 * @returns {Object}
 */
function createApi() {
    return {
        initTabs,
        initRequestTabs,
        initResponseTabs,
        refreshTabs,
        activateTab,
        setActiveTab,
        getActiveTab,
        getActiveTabName,
        destroyGroup,
        destroyTabs,
    };
}

export default {
    initTabs,
    initRequestTabs,
    initResponseTabs,
    refreshTabs,
    activateTab,
    setActiveTab,
    getActiveTab,
    getActiveTabName,
    destroyGroup,
    destroyTabs,
};
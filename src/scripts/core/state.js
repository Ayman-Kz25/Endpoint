/**
 * Application State
 *
 * This module contains the single in-memory source of truth
 * for the application.
 *
 * This module does not:
 * - manipulate the DOM
 * - make HTTP requests
 * - write to localStorage
 * - emit events
 * - render UI
 *
 * Other modules may read or update this state.
 */

import {
    DEFAULT_REQUEST,
    DEFAULT_REQUEST_TAB,
    DEFAULT_RESPONSE_TAB,
    DEFAULT_AUTH,
    THEMES,
} from "./constants.js";

// ============================================================
// Factory Helpers
// ============================================================

/**
 * Create a fresh request state.
 *
 * Fresh arrays and objects are created every time so state
 * sections do not accidentally share references.
 *
 * @returns {Object}
 */
export function createDefaultRequest() {
    return {
        method: DEFAULT_REQUEST.method,
        url: DEFAULT_REQUEST.url,

        params: [],
        headers: [],

        body: DEFAULT_REQUEST.body,

        auth: {
            type: DEFAULT_AUTH.type,
            fields: {},
        },
    };
}

/**
 * Create a fresh response state.
 *
 * @returns {Object}
 */
export function createDefaultResponse() {
    return {
        ok: false,

        status: null,
        statusText: "",

        duration: null,

        size: null,
        sizeFormatted: "0 B",

        data: null,
        raw: "",

        headers: [],

        url: "",
        redirected: false,

        contentType: "",

        error: null,
    };
}

/**
 * Create a fresh application state.
 *
 * Keeping this in a factory makes resetting the entire
 * application state possible without sharing mutable
 * references with the initial state.
 *
 * @returns {Object}
 */
export function createInitialState() {
    return {
        // ------------------------------------------------------
        // Workspace
        // ------------------------------------------------------

        workspace: {
            title: "Workspace",
            subtitle: "HTTP Request Workspace",
        },

        // ------------------------------------------------------
        // Request
        // ------------------------------------------------------

        request: createDefaultRequest(),

        // ------------------------------------------------------
        // Request UI
        // ------------------------------------------------------

        requestUI: {
            activeTab: DEFAULT_REQUEST_TAB,
        },

        // ------------------------------------------------------
        // Response
        // ------------------------------------------------------

        response: createDefaultResponse(),

        // ------------------------------------------------------
        // Response UI
        // ------------------------------------------------------

        responseUI: {
            activeTab: DEFAULT_RESPONSE_TAB,
        },

        // ------------------------------------------------------
        // General UI
        // ------------------------------------------------------

        ui: {
            sidebarOpen: false,

            theme: THEMES.DARK,

            modal: null,

            dropdown: null,

            isLoading: false,
        },

        // ------------------------------------------------------
        // History
        // ------------------------------------------------------

        history: {
            requests: [],
        },

        // ------------------------------------------------------
        // Environment
        // ------------------------------------------------------

        environment: {
            active: null,
            variables: {},
        },
    };
}

// ============================================================
// Application State
// ============================================================

const state = createInitialState();

export default state;
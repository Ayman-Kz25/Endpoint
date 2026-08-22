//src/scripts/core/state.js

import {
    DEFAULT_HTTP_METHOD,
    DEFAULT_REQUEST_TAB,
    DEFAULT_RESPONSE_TAB,
    DEFAULT_AUTH_TYPE,
    THEMES,
} from "./constants.js";

const state = {
    workspace: {
        title: "Workspace",
        subtitle: "HTTP Request Workspace",
    },

    request: {
        method: DEFAULT_HTTP_METHOD,
        url: "",
        params: [],
        headers: [],
        body: "",
        auth: {
            type: DEFAULT_AUTH_TYPE,
            fields: {},
        },
    },

    requestUI: {
        activeTab: DEFAULT_REQUEST_TAB,
    },

    response: {
        status: null,
        statusText: "",
        duration: null,
        size: null,
        data: null,
        raw: "",
        headers: [],
    },

    responseUI: {
        activeTab: DEFAULT_RESPONSE_TAB,
    },

    ui: {
        sidebarOpen: false,
        theme: THEMES.DARK,
        modal: null,
        dropdown: null,
        isLoading: false,
    },

    history: {
        requests: [],
    },

    environment: {
        active: null,
        variables: {},
    },
};

export default state;
//src/scripts/core/state.js

const state = {

    // Workspace
    workspace: {
        title: "Workspace",
        subtitle: "HTTP Request Workspace",
    },

    // Request
    request: {
        method: "GET",
        url: "",
        params: [],
        headers: [],
        body: "",
        auth: {
            type: "none",
            fields: {},
        },
    },

    // Request UI
    requestUI: {
        activeTab: "params",
    },

    // Response
    response: {
        status: null,
        statusText: "",
        duration: null,
        size: null,
        data: null,
        raw: "",
        headers: [],
    },

    // Response UI
    responseUI: {
        activeTab: "pretty",
    },

    // Application UI
    ui: {
        sidebarOpen: false,
        theme: "dark",
        modal: null,
        dropdown: null,
        isLoading: false,
    },

    // History
    history: {
        requests: [],
    },

    // Environment
    environment: {
        active: null,
        variables: {},
    },
};

export default state;
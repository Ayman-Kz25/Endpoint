// src/scripts/core/state.js

import {
  DEFAULT_AUTH,
  DEFAULT_REQUEST,
  DEFAULT_REQUEST_TAB,
  DEFAULT_RESPONSE_TAB,
  THEMES,
} from "./constants.js";

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

export function createDefaultResponse() {
  return {
    OK: false,
    status: null,
    statusText: "",
    duration: null,
    size: null,
    data: null,
    raw: "",
    headers: [],
    url: "",
    error: null,
  };
}

export function createInitialState() {
  return {
    request: createDefaultRequest(),
    requestUI: {
      activeTab: DEFAULT_REQUEST_TAB,
    },
    response: createDefaultResponse(),
    reponseUI: {
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
      request: [],
    },
  };
}

const state = createInitialState();

export default state;

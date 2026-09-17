import { deepClone, uid } from './utils.js';
import { storage } from './storage.js';

const data = storage.load();

const blank = () => ({
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  auth: {
    type: 'none'
  },
  body: {
    type: 'none',
    content: ''
  },
  scripts: {
    pre: '',
    post: ''
  },
  mode: 'live'
});

export const state = {
  request: blank(),
  response: null,

  collections: data.collections || [],
  history: data.history || [],
  environments: data.environments || [],

  settings: Object.assign(
    {
      theme: 'dark',
      historyEnabled: true,
      maxHistory: 100,
      activeEnvironment: ''
    },
    data.settings || {}
  ),

  ui: {
    sidebar: true,
    requestTab: 'params',
    responseTab: 'body',
    globalSearch: '',
    commandOpen: false,
    modal: null,
    loading: false,
    requestSplit: 52
  },

  tabs: [],
  activeTab: null,

  undo: [],
  redo: []
};


/* ---------------------------------------------------------
   Restore workspace
--------------------------------------------------------- */

if (
  data.workspace &&
  Array.isArray(data.workspace.tabs) &&
  data.workspace.tabs.length
) {
  state.tabs = data.workspace.tabs;

  state.activeTab =
    data.workspace.activeTab ||
    state.tabs[0].id;

  const active =
    state.tabs.find(
      tab => tab.id === state.activeTab
    );

  if (active) {
    state.request =
      deepClone(active.request || blank());

    state.response =
      deepClone(active.response || null);
  }

} else {

  const id = uid('tab');

  state.tabs = [
    {
      id,
      name: 'New Request',
      request: blank(),
      response: null,
      savedRef: null,
      dirty: false
    }
  ];

  state.activeTab = id;

  state.request =
    deepClone(state.tabs[0].request);

  state.response = null;
}


/* ---------------------------------------------------------
   Events
--------------------------------------------------------- */

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);

  return () => {
    listeners.delete(fn);
  };
}

export function emit() {
  for (const fn of listeners) {
    try {
      fn(state);
    } catch (error) {
      console.error(
        'Endpoint state listener failed:',
        error
      );
    }
  }
}


/* ---------------------------------------------------------
   Request state
--------------------------------------------------------- */

export function setRequest(
  patch,
  { history = true } = {}
) {
  if (history) {
    state.undo.push(
      deepClone(state.request)
    );

    if (state.undo.length > 100) {
      state.undo.shift();
    }
  }

  state.redo = [];

  Object.assign(
    state.request,
    patch
  );

  syncTab();

  emit();
}


export function replaceRequest(
  request,
  { history = true } = {}
) {
  if (history) {
    state.undo.push(
      deepClone(state.request)
    );

    if (state.undo.length > 100) {
      state.undo.shift();
    }
  }

  state.redo = [];

  state.request =
    deepClone(request || blank());

  syncTab();

  emit();
}


/* ---------------------------------------------------------
   Active tab synchronization
--------------------------------------------------------- */

export function syncTab() {
  const tab =
    state.tabs.find(
      item => item.id === state.activeTab
    );

  if (!tab) {
    return;
  }

  tab.request =
    deepClone(state.request);

  tab.response =
    deepClone(state.response);
}


/* ---------------------------------------------------------
   Dirty state
--------------------------------------------------------- */

export function markDirty(value = true) {
  const tab =
    state.tabs.find(
      item => item.id === state.activeTab
    );

  if (tab) {
    tab.dirty = value;
  }

  /*
   * Do NOT call syncTab() here.
   *
   * syncTab() copies request/response but should not
   * be necessary just to change the dirty flag.
   */

  emit();
}


/* ---------------------------------------------------------
   Tabs
--------------------------------------------------------- */

export function newTab(
  request = null,
  name = 'New Request'
) {
  const id = uid('tab');

  const nextRequest =
    request
      ? deepClone(request)
      : blank();

  const tab = {
    id,
    name,
    request: nextRequest,
    response: null,
    savedRef: null,
    dirty: false
  };

  state.tabs.push(tab);

  state.activeTab = id;

  state.request =
    deepClone(nextRequest);

  state.response = null;

  state.undo = [];
  state.redo = [];

  emit();
}


export function activateTab(id) {
  const tab =
    state.tabs.find(
      item => item.id === id
    );

  if (!tab) {
    return;
  }

  state.activeTab = id;

  state.request =
    deepClone(tab.request || blank());

  state.response =
    deepClone(tab.response || null);

  state.undo = [];
  state.redo = [];

  emit();
}


export function closeTab(id) {
  const index =
    state.tabs.findIndex(
      item => item.id === id
    );

  if (index < 0) {
    return;
  }

  const tab =
    state.tabs[index];

  if (
    tab.dirty &&
    !confirm(
      'This tab has unsaved changes. Close anyway?'
    )
  ) {
    return;
  }

  state.tabs.splice(index, 1);

  if (!state.tabs.length) {
    newTab();
    return;
  }

  if (state.activeTab === id) {
    const nextIndex =
      Math.max(0, index - 1);

    activateTab(
      state.tabs[nextIndex].id
    );
  } else {
    emit();
  }
}


/* ---------------------------------------------------------
   Undo / redo
--------------------------------------------------------- */

export function undo() {
  if (!state.undo.length) {
    return;
  }

  state.redo.push(
    deepClone(state.request)
  );

  state.request =
    state.undo.pop();

  syncTab();
  emit();
}


export function redo() {
  if (!state.redo.length) {
    return;
  }

  state.undo.push(
    deepClone(state.request)
  );

  state.request =
    state.redo.pop();

  syncTab();
  emit();
}


/* ---------------------------------------------------------
   Persistence
--------------------------------------------------------- */

export function persist() {
  storage.save(
    'settings',
    state.settings
  );

  storage.save(
    'environments',
    state.environments
  );

  storage.save(
    'collections',
    state.collections
  );

  storage.save(
    'history',
    state.history
  );

  storage.save(
    'workspace',
    {
      tabs: state.tabs,
      activeTab: state.activeTab
    }
  );
}


/* ---------------------------------------------------------
   Environments
--------------------------------------------------------- */

export function activeEnv() {
  if (!Array.isArray(state.environments)) {
    return null;
  }

  return (
    state.environments.find(
      environment =>
        environment.name ===
        state.settings.activeEnvironment
    ) ||
    state.environments[0] ||
    null
  );
}


export function vars() {
  const environment =
    activeEnv();

  if (!environment) {
    return {};
  }

  const variables =
    Array.isArray(environment.variables)
      ? environment.variables
      : [];

  return Object.fromEntries(
    variables
      .filter(
        variable =>
          variable.enabled !== false &&
          variable.key
      )
      .map(
        variable => [
          variable.key,
          variable.currentValue ?? ''
        ]
      )
  );
}

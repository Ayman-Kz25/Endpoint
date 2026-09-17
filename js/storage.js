const PREFIX = "endpoint.";
const KEYS = [
  "settings",
  "environments",
  "collections",
  "history",
  "workspace",
];
const DEFAULT = {
  version: 1,
  settings: {
    theme: "dark",
    activeEnvironment: "Development",
    historyEnabled: true,
    maxHistory: 100,
    autoFormat: true,
    fontSize: 13,
    wordWrap: false,
  },
  environments: [
    {
      id: "env_dev",
      name: "Development",
      variables: [
        {
          id: "v1",
          key: "baseUrl",
          initialValue: "https://jsonplaceholder.typicode.com",
          currentValue: "https://jsonplaceholder.typicode.com",
          secret: false,
          enabled: true,
        },
        {
          id: "v2",
          key: "userId",
          initialValue: "1",
          currentValue: "1",
          secret: false,
          enabled: true,
        },
      ],
      active: true,
      isDefault: true,
    },
  ],
  collections: [
    {
      id: "col_demo",
      name: "Demo API",
      folders: [],
      requests: [
        {
          id: "req_users",
          name: "Get Users",
          folderId: null,
          request: {
            method: "GET",
            url: "{{baseUrl}}/users",
            params: [],
            headers: [
              {
                id: "h1",
                key: "Accept",
                value: "application/json",
                enabled: true,
              },
            ],
            auth: { type: "none" },
            body: { type: "none", content: "" },
          },
        },
        {
          id: "req_login",
          name: "Create User",
          folderId: null,
          request: {
            method: "POST",
            url: "{{baseUrl}}/users",
            params: [],
            headers: [
              {
                id: "h2",
                key: "Content-Type",
                value: "application/json",
                enabled: true,
              },
            ],
            auth: { type: "none" },
            body: {
              type: "json",
              content:
                '{\n  "name": "Endpoint User",\n  "email": "dev@example.test"\n}',
            },
          },
        },
      ],
      favorite: false,
    },
  ],
  history: [],
  workspace: { tabs: [], activeTab: null },
};
function read(k) {
  try {
    const x = localStorage.getItem(PREFIX + k);
    return x ? JSON.parse(x) : null;
  } catch {
    return null;
  }
}
function write(k, v) {
  try {
    localStorage.setItem(PREFIX + k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
}
function mergeDefaults() {
  return {
    settings: read("settings") || DEFAULT.settings,
    environments: read("environments") || DEFAULT.environments,
    collections: read("collections") || DEFAULT.collections,
    history: read("history") || DEFAULT.history,
    workspace: read("workspace") || DEFAULT.workspace,
  };
}
export const storage = {
  load: mergeDefaults,
  save: (k, v) => write(k, v),
  clear: () => KEYS.forEach((k) => localStorage.removeItem(PREFIX + k)),
  defaults: DEFAULT,
};

import {
  state,
  setRequest,
  markDirty,
  vars
} from './state.js';

import {
  uid,
  esc,
  parseURL,
  extractParams,
  paramsToURL,
  headersToObject,
  resolveVars,
  unresolvedVars,
  parseHeaders
} from './utils.js';

export const METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'TRACE'
];

export function effectiveURL() {
  return paramsToURL(
    state.request.url,
    state.request.params,
    vars()
  );
}

export function addRow(kind) {
  const arr = [...(state.request[kind] || [])];

  if (kind === 'params') {
    arr.push({
      id: uid('p'),
      key: '',
      value: '',
      description: '',
      enabled: true
    });
  } else {
    arr.push({
      id: uid('h'),
      key: '',
      value: '',
      enabled: true
    });
  }

  setRequest({
    [kind]: arr
  });

  markDirty();
}

export function updateRow(kind, id, patch) {
  const arr = state.request[kind].map(function (x) {
    return x.id === id
      ? { ...x, ...patch }
      : x;
  });

  setRequest({
    [kind]: arr
  });

  markDirty();
}

export function removeRow(kind, id) {
  setRequest({
    [kind]: state.request[kind].filter(function (x) {
      return x.id !== id;
    })
  });

  markDirty();
}

export function syncParamsFromURL() {
  const p = extractParams(state.request.url);

  if (p.length) {
    setRequest(
      { params: p },
      { history: false }
    );
  }
}

export function bodyContentType() {
  const type = state.request.body
    ? state.request.body.type
    : '';

  if (type === 'json') {
    return 'application/json';
  }

  if (type === 'form-urlencoded') {
    return 'application/x-www-form-urlencoded';
  }

  if (type === 'xml') {
    return 'application/xml';
  }

  if (type === 'html') {
    return 'text/html';
  }

  if (type === 'text') {
    return 'text/plain';
  }

  return '';
}

export function ensureContentType() {
  const ct = bodyContentType();

  if (!ct) {
    return;
  }

  const hs = [...state.request.headers];

  const i = hs.findIndex(function (h) {
    return h.key.toLowerCase() === 'content-type';
  });

  if (i >= 0) {
    hs[i] = {
      ...hs[i],
      value: ct
    };
  } else {
    hs.push({
      id: uid('h'),
      key: 'Content-Type',
      value: ct,
      enabled: true
    });
  }

  setRequest(
    { headers: hs },
    { history: false }
  );
}

export function renderRequest() {
  const r = state.request;

  const tabs = [
    'params',
    'auth',
    'headers',
    'body',
    'scripts'
  ];

  return `
    <div class="flex flex-col h-full">

      <div class="flex gap-1 border-b border-line px-3 overflow-x-auto">
        ${tabs.map(function (t) {
          const active =
            state.ui.requestTab === t
              ? 'active'
              : '';

          const count =
            t === 'params' && r.params.length
              ? ' <span class="text-muted">(' +
                r.params.length +
                ')</span>'
              : '';

          return `
            <button
              class="tab ${active}"
              data-req-tab="${t}"
            >
              ${t.charAt(0).toUpperCase() + t.slice(1)}
              ${count}
            </button>
          `;
        }).join('')}
      </div>

      <div
        class="flex-1 min-h-0 overflow-auto scroll p-3"
        id="request-pane"
      >
        ${renderPane()}
      </div>

    </div>
  `;
}

function renderPane() {
  const r = state.request;

  if (state.ui.requestTab === 'params') {
    return rows(
      'params',
      r.params,
      ['Key', 'Value', 'Description']
    );
  }

  if (state.ui.requestTab === 'headers') {
    return rows(
      'headers',
      r.headers,
      ['Header', 'Value']
    );
  }

  if (state.ui.requestTab === 'auth') {
    return authPane(r.auth);
  }

  if (state.ui.requestTab === 'body') {
    return bodyPane(r.body);
  }

  return scriptsPane(r.scripts);
}

function rows(kind, arr, heads) {
  const isParams = kind === 'params';

  const gridClass = isParams
    ? 'grid-cols-[30px_1fr_1fr_1fr_32px]'
    : 'grid-cols-[30px_1fr_1fr_32px]';

  const description =
    isParams
      ? 'Query parameters are synchronized into the URL.'
      : 'Request headers are sent only when enabled.';

  const addLabel =
    isParams
      ? 'parameter'
      : 'header';

  const header =
    arr.length
      ? `
        <div class="grid ${gridClass} gap-2 px-2 py-1.5 bg-panel2 text-[10px] uppercase tracking-wider text-muted">
          ${heads.map(function (h) {
            return `<span>${h}</span>`;
          }).join('')}
          <span></span>
        </div>
      `
      : '';

  const rowsHtml = arr.map(function (x) {
    const opacity =
      x.enabled === false
        ? 'opacity-50'
        : '';

    const value = esc(x.value || '');

    let middle = '';

    if (isParams) {
      middle = `
        <input
          class="input px-2 py-1.5 rounded text-xs mono"
          value="${value}"
          placeholder="value"
          data-row-field="${kind}:${x.id}:value"
        >

        <input
          class="input px-2 py-1.5 rounded text-xs"
          value="${esc(x.description || '')}"
          placeholder="description"
          data-row-field="${kind}:${x.id}:description"
        >
      `;
    } else {
      middle = `
        <input
          class="input px-2 py-1.5 rounded text-xs mono"
          value="${value}"
          placeholder="value"
          data-row-field="${kind}:${x.id}:value"
        >
      `;
    }

    return `
      <div
        class="grid ${gridClass} gap-2 p-2 border-t border-line items-center"
      >

        <input
          type="checkbox"
          ${x.enabled !== false ? 'checked' : ''}
          data-row-field="${kind}:${x.id}:enabled"
        >

        <input
          class="input px-2 py-1.5 rounded text-xs mono ${opacity}"
          value="${esc(x.key || '')}"
          placeholder="${isParams ? 'key' : 'Header'}"
          data-row-field="${kind}:${x.id}:key"
        >

        ${middle}

        <button
          class="btn btn-danger iconbtn"
          data-row-delete="${kind}:${x.id}"
        >
          ×
        </button>

      </div>
    `;
  }).join('');

  return `
    <div class="flex items-center justify-between mb-2">

      <div class="text-xs text-muted">
        ${description}
      </div>

      <button
        class="btn"
        data-row-add="${kind}"
      >
        + Add ${addLabel}
      </button>

    </div>

    <div class="border border-line rounded-lg overflow-hidden">
      ${header}
      ${rowsHtml}
    </div>
  `;
}

function authPane(a) {
  a = a || { type: 'none' };

  let extra = '';

  if (a.type === 'bearer') {
    extra = field(
      'Token',
      a.token,
      'auth-token',
      'password'
    );
  }

  if (a.type === 'basic') {
    extra =
      field(
        'Username',
        a.username,
        'auth-user'
      ) +
      field(
        'Password',
        a.password,
        'auth-pass',
        'password'
      );
  }

  if (a.type === 'apikey') {
    extra =
      field(
        'Key',
        a.key,
        'auth-key'
      ) +
      `
        <label class="text-xs text-muted">
          Add to

          <select
            class="input w-full mt-1 px-2 py-2 rounded"
            data-auth-location
          >
            <option
              value="header"
              ${a.location === 'header' ? 'selected' : ''}
            >
              Header
            </option>

            <option
              value="query"
              ${a.location === 'query' ? 'selected' : ''}
            >
              Query parameter
            </option>
          </select>
        </label>
      `;
  }

  if (a.type === 'oauth2') {
    extra =
      `
        <div class="border border-line rounded-lg p-3 text-xs text-muted">
          OAuth configuration is stored as data only.
          A browser-only app cannot safely complete every
          provider's flow without provider-specific
          redirect/CORS support.

          Configure Authorization URL, Token URL,
          Client ID, Scope and Grant Type here, then use
          a future proxy/backend adapter for token exchange.
        </div>
      ` +
      field(
        'Authorization URL',
        a.authorizationUrl,
        'oauth-auth'
      ) +
      field(
        'Token URL',
        a.tokenUrl,
        'oauth-token'
      ) +
      field(
        'Client ID',
        a.clientId,
        'oauth-client'
      ) +
      field(
        'Client Secret',
        a.clientSecret,
        'oauth-secret',
        'password'
      ) +
      field(
        'Scope',
        a.scope,
        'oauth-scope'
      );
  }

  return `
    <div class="max-w-2xl space-y-4">

      <label class="text-xs text-muted">
        Authentication

        <select
          class="input w-full mt-1 px-2 py-2 rounded"
          data-auth-type
        >

          <option
            value="none"
            ${a.type === 'none' ? 'selected' : ''}
          >
            No Auth
          </option>

          <option
            value="bearer"
            ${a.type === 'bearer' ? 'selected' : ''}
          >
            Bearer Token
          </option>

          <option
            value="basic"
            ${a.type === 'basic' ? 'selected' : ''}
          >
            Basic Auth
          </option>

          <option
            value="apikey"
            ${a.type === 'apikey' ? 'selected' : ''}
          >
            API Key
          </option>

          <option
            value="oauth2"
            ${a.type === 'oauth2' ? 'selected' : ''}
          >
            OAuth 2.0 (configuration)
          </option>

        </select>
      </label>

      ${extra}

    </div>
  `;
}

function field(label, value, key, type) {
  type = type || 'text';

  return `
    <label class="text-xs text-muted block">

      ${label}

      <input
        type="${type}"
        class="input w-full mt-1 px-2 py-2 rounded mono"
        value="${esc(value || '')}"
        data-${key}
      >

    </label>
  `;
}

function bodyPane(b) {
  b = b || {
    type: 'none',
    content: ''
  };

  const types = [
    'none',
    'json',
    'text',
    'xml',
    'html',
    'form-urlencoded',
    'multipart',
    'javascript'
  ];

  const buttons = types.map(function (t) {
    return `
      <button
        class="btn ${b.type === t ? 'btn-primary' : ''}"
        data-body-type="${t}"
      >
        ${t}
      </button>
    `;
  }).join('');

  if (b.type === 'none') {
    return `
      <div class="flex gap-2 mb-3">
        ${buttons}
      </div>

      <div class="text-sm text-muted border border-dashed border-line rounded-lg p-8 text-center">
        No request body.
      </div>
    `;
  }

  if (b.type === 'multipart') {
    return `
      <div class="flex gap-2 mb-3">
        ${buttons}
      </div>

      <div class="text-sm text-muted border border-line rounded-lg p-4">
        Multipart editor: use the key/value table below.
        Files are never transmitted until you press Send.
      </div>
    `;
  }

  return `
    <div class="flex gap-2 mb-3">
      ${buttons}
    </div>

    <div class="relative">

      <div class="flex justify-between mb-1">

        <span class="text-xs text-muted">
          ${b.type === 'json' ? 'JSON editor' : 'Raw body'}
        </span>

        <div class="flex gap-1">

          <button
            class="btn"
            data-body-format
          >
            Format
          </button>

          <button
            class="btn"
            data-body-minify
          >
            Minify
          </button>

          <button
            class="btn"
            data-body-clear
          >
            Clear
          </button>

        </div>
      </div>

      <textarea
        id="body-editor"
        class="input code-editor w-full rounded-lg p-3 min-h-[280px]"
        spellcheck="false"
      >${esc(b.content || '')}</textarea>

      <div
        id="body-error"
        class="text-xs text-red-400 mt-1"
      ></div>

    </div>
  `;
}

function scriptsPane(s) {
  s = s || {};

  return `
    <div class="space-y-4">

      <div>

        <div class="text-xs text-muted mb-1">
          Pre-request script
          (stored, not executed automatically)
        </div>

        <textarea
          class="input code-editor w-full rounded-lg p-3 min-h-[130px]"
          data-script="pre"
        >${esc(s.pre || '')}</textarea>

      </div>

      <div>

        <div class="text-xs text-muted mb-1">
          Post-response script
          (stored, not executed automatically)
        </div>

        <textarea
          class="input code-editor w-full rounded-lg p-3 min-h-[130px]"
          data-script="post"
        >${esc(s.post || '')}</textarea>

      </div>

      <div class="text-xs text-muted">
        Scripts are intentionally not executed by the browser app.
        Imported project data is treated as untrusted.
      </div>

    </div>
  `;
}

export function bindRequest(root) {

  root.addEventListener('click', function (e) {

    const tabEl =
      e.target.closest('[data-req-tab]');

    const tab =
      tabEl
        ? tabEl.dataset.reqTab
        : null;

    if (tab) {
      state.ui.requestTab = tab;
      emitAndRender(root);
      return;
    }

    const addEl =
      e.target.closest('[data-row-add]');

    const add =
      addEl
        ? addEl.dataset.rowAdd
        : null;

    if (add) {
      addRow(add);
    }

    const deleteEl =
      e.target.closest('[data-row-delete]');

    const del =
      deleteEl
        ? deleteEl.dataset.rowDelete
        : null;

    if (del) {
      const parts = del.split(':');
      removeRow(parts[0], parts[1]);
    }

    const bodyTypeEl =
      e.target.closest('[data-body-type]');

    const bt =
      bodyTypeEl
        ? bodyTypeEl.dataset.bodyType
        : null;

    if (bt) {
      setRequest({
        body: {
          ...state.request.body,
          type: bt
        }
      });

      if (bt !== 'none') {
        ensureContentType();
      }

      markDirty();
    }

    if (e.target.closest('[data-body-format]')) {
      formatBody();
    }

    if (e.target.closest('[data-body-minify]')) {
      minifyBody();
    }

    if (e.target.closest('[data-body-clear]')) {
      setRequest({
        body: {
          ...state.request.body,
          content: ''
        }
      });

      markDirty();
    }

  });

  root.addEventListener('change', function (e) {

    const rowEl =
      e.target.closest('[data-row-field]');

    const f =
      rowEl
        ? rowEl.dataset.rowField
        : null;

    if (f) {

      const parts = f.split(':');

      const kind = parts[0];
      const id = parts[1];
      const fieldName = parts[2];

      updateRow(
        kind,
        id,
        {
          [fieldName]:
            e.target.type === 'checkbox'
              ? e.target.checked
              : e.target.value
        }
      );

      return;
    }

    if (e.target.matches('[data-auth-type]')) {
      setRequest({
        auth: {
          ...state.request.auth,
          type: e.target.value
        }
      });

      markDirty();
      return;
    }

    const d = e.target.dataset;

    const map = {
      authToken: 'token',
      authUser: 'username',
      authPass: 'password',
      authKey: 'key',
      authLocation: 'location',
      oauthAuth: 'authorizationUrl',
      oauthToken: 'tokenUrl',
      oauthClient: 'clientId',
      oauthSecret: 'clientSecret',
      oauthScope: 'scope'
    };

    Object.entries(map).forEach(function (entry) {

      const el = entry[0];
      const key = entry[1];

      if (d[el] !== undefined) {

        setRequest({
          auth: {
            ...state.request.auth,
            [key]: e.target.value
          }
        });

        markDirty();
      }

    });

    if (d.script) {

      setRequest({
        scripts: {
          ...state.request.scripts,
          [d.script]: e.target.value
        }
      });

      markDirty();
    }

  });

  root.addEventListener('input', function (e) {

    if (e.target.id !== 'body-editor') {
      return;
    }

    setRequest(
      {
        body: {
          ...state.request.body,
          content: e.target.value
        }
      },
      {
        history: false
      }
    );

    markDirty(false);

    const err =
      e.target.parentElement.querySelector('#body-error');

    if (
      state.request.body.type === 'json' &&
      err
    ) {

      try {
        JSON.parse(e.target.value);
        err.textContent = '';
      } catch (ex) {
        err.textContent = ex.message;
      }

    }

  });

}

function formatBody() {

  if (state.request.body.type !== 'json') {
    return;
  }

  try {

    const x =
      JSON.parse(state.request.body.content);

    setRequest({
      body: {
        ...state.request.body,
        content: JSON.stringify(x, null, 2)
      }
    });

    markDirty();

  } catch (e) {
    // Invalid JSON is displayed by the editor validation.
  }
}

function minifyBody() {

  if (state.request.body.type !== 'json') {
    return;
  }

  try {

    const x =
      JSON.parse(state.request.body.content);

    setRequest({
      body: {
        ...state.request.body,
        content: JSON.stringify(x)
      }
    });

    markDirty();

  } catch (e) {
    // Invalid JSON is displayed by the editor validation.
  }
}

function emitAndRender(root) {
  import('./state.js').then(function (m) {
    m.emit();
  });
}

export function prepareRequest() {

  const r =
    structuredClone(state.request);

  const v = vars();

  r.url =
    resolveVars(
      r.url,
      v
    );

  r.params =
    r.params
      .filter(function (p) {
        return (
          p.enabled !== false &&
          p.key.trim()
        );
      })
      .map(function (p) {
        return {
          ...p,
          key: resolveVars(p.key, v),
          value: resolveVars(p.value, v)
        };
      });

  r.headers =
    r.headers
      .filter(function (h) {
        return (
          h.enabled !== false &&
          h.key.trim()
        );
      })
      .map(function (h) {
        return {
          ...h,
          key: h.key.trim(),
          value: resolveVars(h.value, v)
        };
      });

  if (
    r.auth.type === 'bearer' &&
    r.auth.token
  ) {
    r.headers.push({
      key: 'Authorization',
      value:
        'Bearer ' +
        resolveVars(r.auth.token, v),
      enabled: true
    });
  }

  if (
    r.auth.type === 'basic' &&
    r.auth.username
  ) {

    const username =
      resolveVars(
        r.auth.username,
        v
      );

    const password =
      resolveVars(
        r.auth.password || '',
        v
      );

    r.headers.push({
      key: 'Authorization',
      value:
        'Basic ' +
        btoa(
          username + ':' + password
        ),
      enabled: true
    });
  }

  if (
    r.auth.type === 'apikey' &&
    r.auth.location === 'header'
  ) {
    r.headers.push({
      key: r.auth.key,
      value:
        resolveVars(
          r.auth.value || '',
          v
        ),
      enabled: true
    });
  }

  if (r.body.type === 'json') {

    try {
      JSON.parse(r.body.content);
    } catch (e) {
      throw new Error(
        'Invalid JSON body: ' +
        e.message
      );
    }

  }

  const unresolved =
    unresolvedVars(r.url);

  if (unresolved.length) {
    throw new Error(
      'Unresolved environment variable(s): ' +
      unresolved.join(', ')
    );
  }

  return r;
}
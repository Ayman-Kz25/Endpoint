import {
  state,
  setRequest,
  markDirty,
  vars
} from './state.js';

import {
  uid,
  esc,
  extractParams,
  paramsToURL,
  resolveVars,
  unresolvedVars
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
  const arr = Array.isArray(state.request[kind])
    ? state.request[kind].slice()
    : [];

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
  const source = Array.isArray(state.request[kind])
    ? state.request[kind]
    : [];

  const arr = source.map(function (item) {
    if (item.id === id) {
      return Object.assign({}, item, patch);
    }

    return item;
  });

  setRequest({
    [kind]: arr
  });

  markDirty();
}

export function removeRow(kind, id) {
  const source = Array.isArray(state.request[kind])
    ? state.request[kind]
    : [];

  setRequest({
    [kind]: source.filter(function (item) {
      return item.id !== id;
    })
  });

  markDirty();
}

export function syncParamsFromURL() {
  const params = extractParams(state.request.url);

  if (params.length) {
    setRequest(
      {
        params: params
      },
      {
        history: false
      }
    );
  }
}

export function bodyContentType() {
  const body = state.request.body || {};
  const type = body.type || '';

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
  const contentType = bodyContentType();

  if (!contentType) {
    return;
  }

  const headers = Array.isArray(state.request.headers)
    ? state.request.headers.slice()
    : [];

  let index = -1;

  for (let i = 0; i < headers.length; i += 1) {
    const key = String(headers[i].key || '').toLowerCase();

    if (key === 'content-type') {
      index = i;
      break;
    }
  }

  if (index >= 0) {
    headers[index] = Object.assign(
      {},
      headers[index],
      {
        value: contentType
      }
    );
  } else {
    headers.push({
      id: uid('h'),
      key: 'Content-Type',
      value: contentType,
      enabled: true
    });
  }

  setRequest(
    {
      headers: headers
    },
    {
      history: false
    }
  );
}

export function renderRequest() {
  const request = state.request;

  const tabs = [
    'params',
    'auth',
    'headers',
    'body',
    'scripts'
  ];

  const tabHtml = tabs.map(function (tab) {
    const active =
      state.ui.requestTab === tab
        ? 'active'
        : '';

    let count = '';

    if (
      tab === 'params' &&
      Array.isArray(request.params) &&
      request.params.length
    ) {
      count =
        ' <span class="text-muted">(' +
        request.params.length +
        ')</span>';
    }

    return (
      '<button class="tab ' +
      active +
      '" data-req-tab="' +
      tab +
      '">' +
      tab.charAt(0).toUpperCase() +
      tab.slice(1) +
      count +
      '</button>'
    );
  }).join('');

  return (
    '<div class="flex flex-col h-full">' +
      '<div class="flex gap-1 border-b border-line px-3 overflow-x-auto">' +
        tabHtml +
      '</div>' +

      '<div ' +
        'class="flex-1 min-h-0 overflow-auto scroll p-3" ' +
        'id="request-pane">' +
        renderPane() +
      '</div>' +
    '</div>'
  );
}

function renderPane() {
  const request = state.request;

  if (state.ui.requestTab === 'params') {
    return rows(
      'params',
      request.params || [],
      ['Key', 'Value', 'Description']
    );
  }

  if (state.ui.requestTab === 'headers') {
    return rows(
      'headers',
      request.headers || [],
      ['Header', 'Value']
    );
  }

  if (state.ui.requestTab === 'auth') {
    return authPane(request.auth || {});
  }

  if (state.ui.requestTab === 'body') {
    return bodyPane(request.body || {});
  }

  return scriptsPane(request.scripts || {});
}

function rows(kind, arr, heads) {
  const isParams = kind === 'params';

  const gridClass = isParams
    ? 'grid-cols-[30px_1fr_1fr_1fr_32px]'
    : 'grid-cols-[30px_1fr_1fr_32px]';

  const description = isParams
    ? 'Query parameters are synchronized into the URL.'
    : 'Request headers are sent only when enabled.';

  const addLabel = isParams
    ? 'parameter'
    : 'header';

  let header = '';

  if (arr.length) {
    header =
      '<div class="grid ' +
      gridClass +
      ' gap-2 px-2 py-1.5 bg-panel2 text-[10px] uppercase tracking-wider text-muted">' +
      heads.map(function (head) {
        return '<span>' + head + '</span>';
      }).join('') +
      '<span></span>' +
      '</div>';
  }

  const rowHtml = arr.map(function (item) {
    const disabledClass =
      item.enabled === false
        ? 'opacity-50'
        : '';

    let extra = '';

    if (isParams) {
      extra =
        '<input ' +
          'class="input px-2 py-1.5 rounded text-xs mono" ' +
          'value="' + esc(item.value || '') + '" ' +
          'placeholder="value" ' +
          'data-row-field="' +
            kind + ':' +
            item.id +
            ':value">' +

        '<input ' +
          'class="input px-2 py-1.5 rounded text-xs" ' +
          'value="' + esc(item.description || '') + '" ' +
          'placeholder="description" ' +
          'data-row-field="' +
            kind + ':' +
            item.id +
            ':description">';
    } else {
      extra =
        '<input ' +
          'class="input px-2 py-1.5 rounded text-xs mono" ' +
          'value="' + esc(item.value || '') + '" ' +
          'placeholder="value" ' +
          'data-row-field="' +
            kind + ':' +
            item.id +
            ':value">';
    }

    return (
      '<div class="grid ' +
        gridClass +
        ' gap-2 p-2 border-t border-line items-center">' +

        '<input ' +
          'type="checkbox" ' +
          (item.enabled !== false ? 'checked' : '') +
          ' data-row-field="' +
            kind + ':' +
            item.id +
            ':enabled">' +

        '<input ' +
          'class="input px-2 py-1.5 rounded text-xs mono ' +
            disabledClass +
          '" ' +
          'value="' + esc(item.key || '') + '" ' +
          'placeholder="' +
            (isParams ? 'key' : 'Header') +
          '" ' +
          'data-row-field="' +
            kind + ':' +
            item.id +
            ':key">' +

        extra +

        '<button ' +
          'class="btn btn-danger iconbtn" ' +
          'data-row-delete="' +
            kind + ':' +
            item.id +
          '">' +
          '×' +
        '</button>' +

      '</div>'
    );
  }).join('');

  return (
    '<div class="flex items-center justify-between mb-2">' +

      '<div class="text-xs text-muted">' +
        description +
      '</div>' +

      '<button ' +
        'class="btn" ' +
        'data-row-add="' +
          kind +
        '">' +
        '+ Add ' +
        addLabel +
      '</button>' +

    '</div>' +

    '<div class="border border-line rounded-lg overflow-hidden">' +
      header +
      rowHtml +
    '</div>'
  );
}

function authPane(auth) {
  const a = auth || {};

  if (!a.type) {
    a.type = 'none';
  }

  let extra = '';

  if (a.type === 'bearer') {
    extra =
      field(
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

      '<label class="text-xs text-muted">' +
        'Add to' +

        '<select ' +
          'class="input w-full mt-1 px-2 py-2 rounded" ' +
          'data-auth-location>' +

          '<option value="header" ' +
            (a.location === 'header' ? 'selected' : '') +
          '>' +
            'Header' +
          '</option>' +

          '<option value="query" ' +
            (a.location === 'query' ? 'selected' : '') +
          '>' +
            'Query parameter' +
          '</option>' +

        '</select>' +

      '</label>';
  }

  if (a.type === 'oauth2') {
    extra =
      '<div class="border border-line rounded-lg p-3 text-xs text-muted">' +
        'OAuth configuration is stored as data only. ' +
        'A browser-only app cannot safely complete every ' +
        'provider flow without provider-specific redirect/CORS ' +
        'support. Configure Authorization URL, Token URL, Client ID, ' +
        'Scope and Grant Type here, then use a future proxy/backend ' +
        'adapter for token exchange.' +
      '</div>' +

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

  return (
    '<div class="max-w-2xl space-y-4">' +

      '<label class="text-xs text-muted">' +
        'Authentication' +

        '<select ' +
          'class="input w-full mt-1 px-2 py-2 rounded" ' +
          'data-auth-type>' +

          '<option value="none" ' +
            (a.type === 'none' ? 'selected' : '') +
          '>' +
            'No Auth' +
          '</option>' +

          '<option value="bearer" ' +
            (a.type === 'bearer' ? 'selected' : '') +
          '>' +
            'Bearer Token' +
          '</option>' +

          '<option value="basic" ' +
            (a.type === 'basic' ? 'selected' : '') +
          '>' +
            'Basic Auth' +
          '</option>' +

          '<option value="apikey" ' +
            (a.type === 'apikey' ? 'selected' : '') +
          '>' +
            'API Key' +
          '</option>' +

          '<option value="oauth2" ' +
            (a.type === 'oauth2' ? 'selected' : '') +
          '>' +
            'OAuth 2.0 (configuration)' +
          '</option>' +

        '</select>' +
      '</label>' +

      extra +

    '</div>'
  );
}

function field(label, value, key, type) {
  const inputType = type || 'text';

  return (
    '<label class="text-xs text-muted block">' +
      label +

      '<input ' +
        'type="' + inputType + '" ' +
        'class="input w-full mt-1 px-2 py-2 rounded mono" ' +
        'value="' + esc(value || '') + '" ' +
        'data-' + key +
      '>' +

    '</label>'
  );
}

function bodyPane(body) {
  const b = body || {};

  if (!b.type) {
    b.type = 'none';
  }

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

  const buttons = types.map(function (type) {
    return (
      '<button ' +
        'class="btn ' +
          (b.type === type ? 'btn-primary' : '') +
        '" ' +
        'data-body-type="' +
          type +
        '">' +
        type +
      '</button>'
    );
  }).join('');

  if (b.type === 'none') {
    return (
      '<div class="flex gap-2 mb-3">' +
        buttons +
      '</div>' +

      '<div class="text-sm text-muted border border-dashed border-line rounded-lg p-8 text-center">' +
        'No request body.' +
      '</div>'
    );
  }

  if (b.type === 'multipart') {
    return (
      '<div class="flex gap-2 mb-3">' +
        buttons +
      '</div>' +

      '<div class="text-sm text-muted border border-line rounded-lg p-4">' +
        'Multipart editor: use the key/value table below. ' +
        'Files are never transmitted until you press Send.' +
      '</div>'
    );
  }

  return (
    '<div class="flex gap-2 mb-3">' +
      buttons +
    '</div>' +

    '<div class="relative">' +

      '<div class="flex justify-between mb-1">' +

        '<span class="text-xs text-muted">' +
          (b.type === 'json'
            ? 'JSON editor'
            : 'Raw body') +
        '</span>' +

        '<div class="flex gap-1">' +

          '<button ' +
            'class="btn" ' +
            'data-body-format>' +
            'Format' +
          '</button>' +

          '<button ' +
            'class="btn" ' +
            'data-body-minify>' +
            'Minify' +
          '</button>' +

          '<button ' +
            'class="btn" ' +
            'data-body-clear>' +
            'Clear' +
          '</button>' +

        '</div>' +

      '</div>' +

      '<textarea ' +
        'id="body-editor" ' +
        'class="input code-editor w-full rounded-lg p-3 min-h-[280px]" ' +
        'spellcheck="false">' +
        esc(b.content || '') +
      '</textarea>' +

      '<div ' +
        'id="body-error" ' +
        'class="text-xs text-red-400 mt-1">' +
      '</div>' +

    '</div>'
  );
}

function scriptsPane(scripts) {
  const s = scripts || {};

  return (
    '<div class="space-y-4">' +

      '<div>' +

        '<div class="text-xs text-muted mb-1">' +
          'Pre-request script ' +
          '(stored, not executed automatically)' +
        '</div>' +

        '<textarea ' +
          'class="input code-editor w-full rounded-lg p-3 min-h-[130px]" ' +
          'data-script="pre">' +
          esc(s.pre || '') +
        '</textarea>' +

      '</div>' +

      '<div>' +

        '<div class="text-xs text-muted mb-1">' +
          'Post-response script ' +
          '(stored, not executed automatically)' +
        '</div>' +

        '<textarea ' +
          'class="input code-editor w-full rounded-lg p-3 min-h-[130px]" ' +
          'data-script="post">' +
          esc(s.post || '') +
        '</textarea>' +

      '</div>' +

      '<div class="text-xs text-muted">' +
        'Scripts are intentionally not executed by the browser app. ' +
        'Imported project data is treated as untrusted.' +
      '</div>' +

    '</div>'
  );
}

export function bindRequest(root) {

  root.addEventListener(
    'click',
    function (event) {

      const tabElement =
        event.target.closest('[data-req-tab]');

      if (tabElement) {
        state.ui.requestTab =
          tabElement.dataset.reqTab;

        emitAndRender(root);
        return;
      }

      const addElement =
        event.target.closest('[data-row-add]');

      if (addElement) {
        addRow(addElement.dataset.rowAdd);
      }

      const deleteElement =
        event.target.closest('[data-row-delete]');

      if (deleteElement) {
        const parts =
          deleteElement.dataset.rowDelete.split(':');

        removeRow(
          parts[0],
          parts[1]
        );
      }

      const bodyElement =
        event.target.closest('[data-body-type]');

      if (bodyElement) {

        const body =
          state.request.body || {};

        setRequest({
          body: Object.assign(
            {},
            body,
            {
              type: bodyElement.dataset.bodyType
            }
          )
        });

        if (
          bodyElement.dataset.bodyType !== 'none'
        ) {
          ensureContentType();
        }

        markDirty();
      }

      if (
        event.target.closest('[data-body-format]')
      ) {
        formatBody();
      }

      if (
        event.target.closest('[data-body-minify]')
      ) {
        minifyBody();
      }

      if (
        event.target.closest('[data-body-clear]')
      ) {
        setRequest({
          body: Object.assign(
            {},
            state.request.body || {},
            {
              content: ''
            }
          )
        });

        markDirty();
      }
    }
  );


  root.addEventListener(
    'change',
    function (event) {

      const rowElement =
        event.target.closest('[data-row-field]');

      if (rowElement) {

        const parts =
          rowElement.dataset.rowField.split(':');

        const value =
          event.target.type === 'checkbox'
            ? event.target.checked
            : event.target.value;

        const patch = {};

        patch[parts[2]] = value;

        updateRow(
          parts[0],
          parts[1],
          patch
        );

        return;
      }


      if (
        event.target.matches('[data-auth-type]')
      ) {

        setRequest({
          auth: Object.assign(
            {},
            state.request.auth || {},
            {
              type: event.target.value
            }
          )
        });

        markDirty();
        return;
      }


      const dataset =
        event.target.dataset;

      const authMap = {
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

      Object.keys(authMap).forEach(function (elementKey) {

        if (
          dataset[elementKey] !== undefined
        ) {

          const auth =
            Object.assign(
              {},
              state.request.auth || {}
            );

          auth[authMap[elementKey]] =
            event.target.value;

          setRequest({
            auth: auth
          });

          markDirty();
        }
      });


      if (dataset.script) {

        const scripts =
          Object.assign(
            {},
            state.request.scripts || {}
          );

        scripts[dataset.script] =
          event.target.value;

        setRequest({
          scripts: scripts
        });

        markDirty();
      }
    }
  );


  root.addEventListener(
    'input',
    function (event) {

      if (
        event.target.id !== 'body-editor'
      ) {
        return;
      }

      setRequest(
        {
          body: Object.assign(
            {},
            state.request.body || {},
            {
              content: event.target.value
            }
          )
        },
        {
          history: false
        }
      );

      markDirty(false);

      const errorElement =
        event.target.parentElement.querySelector(
          '#body-error'
        );

      if (
        state.request.body &&
        state.request.body.type === 'json' &&
        errorElement
      ) {

        try {
          JSON.parse(event.target.value);
          errorElement.textContent = '';
        } catch (error) {
          errorElement.textContent =
            error.message;
        }
      }
    }
  );
}

function formatBody() {

  if (
    !state.request.body ||
    state.request.body.type !== 'json'
  ) {
    return;
  }

  try {

    const parsed =
      JSON.parse(
        state.request.body.content
      );

    setRequest({
      body: Object.assign(
        {},
        state.request.body,
        {
          content:
            JSON.stringify(
              parsed,
              null,
              2
            )
        }
      )
    });

    markDirty();

  } catch (error) {
    // Invalid JSON is handled by the editor.
  }
}

function minifyBody() {

  if (
    !state.request.body ||
    state.request.body.type !== 'json'
  ) {
    return;
  }

  try {

    const parsed =
      JSON.parse(
        state.request.body.content
      );

    setRequest({
      body: Object.assign(
        {},
        state.request.body,
        {
          content:
            JSON.stringify(parsed)
        }
      )
    });

    markDirty();

  } catch (error) {
    // Invalid JSON is handled by the editor.
  }
}

function emitAndRender(root) {
  import('./state.js').then(function (module) {
    module.emit();
  });
}

export function prepareRequest() {

  const request =
    typeof structuredClone === 'function'
      ? structuredClone(state.request)
      : JSON.parse(
          JSON.stringify(state.request)
        );

  const variables = vars();

  request.url =
    resolveVars(
      request.url,
      variables
    );

  request.params =
    (request.params || [])
      .filter(function (param) {
        return (
          param.enabled !== false &&
          String(param.key || '').trim()
        );
      })
      .map(function (param) {
        return Object.assign(
          {},
          param,
          {
            key: resolveVars(
              param.key,
              variables
            ),
            value: resolveVars(
              param.value,
              variables
            )
          }
        );
      });

  request.headers =
    (request.headers || [])
      .filter(function (header) {
        return (
          header.enabled !== false &&
          String(header.key || '').trim()
        );
      })
      .map(function (header) {
        return Object.assign(
          {},
          header,
          {
            key: String(
              header.key || ''
            ).trim(),
            value: resolveVars(
              header.value,
              variables
            )
          }
        );
      });


  const auth =
    request.auth || {};


  if (
    auth.type === 'bearer' &&
    auth.token
  ) {

    request.headers.push({
      key: 'Authorization',
      value:
        'Bearer ' +
        resolveVars(
          auth.token,
          variables
        ),
      enabled: true
    });
  }


  if (
    auth.type === 'basic' &&
    auth.username
  ) {

    const username =
      resolveVars(
        auth.username,
        variables
      );

    const password =
      resolveVars(
        auth.password || '',
        variables
      );

    request.headers.push({
      key: 'Authorization',
      value:
        'Basic ' +
        btoa(
          username +
          ':' +
          password
        ),
      enabled: true
    });
  }


  if (
    auth.type === 'apikey' &&
    auth.location === 'header'
  ) {

    request.headers.push({
      key: auth.key,
      value:
        resolveVars(
          auth.value || '',
          variables
        ),
      enabled: true
    });
  }


  if (
    request.body &&
    request.body.type === 'json'
  ) {

    try {
      JSON.parse(
        request.body.content
      );
    } catch (error) {

      throw new Error(
        'Invalid JSON body: ' +
        error.message
      );
    }
  }


  const unresolved =
    unresolvedVars(request.url);

  if (unresolved.length) {

    throw new Error(
      'Unresolved environment variable(s): ' +
      unresolved.join(', ')
    );
  }

  return request;
}

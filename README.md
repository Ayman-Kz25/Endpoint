# Endpoint — API Command Desk

A browser-native, modular API request builder and HTTP debugging workspace built with HTML5, Tailwind CSS, and vanilla ES modules.

## Run locally

Because ES modules are used, serve the directory over HTTP rather than opening `index.html` with `file://`.

```bash
cd endpoint
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Tailwind and Google Fonts are loaded from CDNs in the provided `index.html`. For an air-gapped deployment, vendor those assets locally.

## Architecture

```text
UI
 ↓
state.js / application events
 ↓
request-builder.js / response-viewer.js
 ↓
api-client.js
 ↓
browser fetch()
 ↓
storage.js
```

Core modules:
- `state.js` — centralized state, tabs, undo/redo, persistence orchestration.
- `request-builder.js` — request domain model, params, headers, auth, body.
- `api-client.js` — browser HTTP adapter and timing/response normalization.
- `response-viewer.js` — response inspection.
- `collections.js`, `history.js`, `environments.js` — workspace features.
- `import-export.js` — versioned JSON workspace schema and safe cURL parsing.
- `code-generator.js` — cURL, JavaScript Fetch, Python Requests.
- `keyboard.js`, `theme.js`, `notifications.js` — UX services.

## Browser/CORS limitation

Endpoint cannot bypass browser CORS policy. Requests to servers that do not permit the browser origin can fail as a network/TypeError. The HTTP adapter is isolated behind `request(config)` so a future server-side proxy can be introduced without rewriting the request builder or response UI.

The browser implementation uses `fetch`, `AbortController`, and a 30-second client timeout. Precise DNS/TCP/TLS phase timing is intentionally not fabricated because browsers do not expose it to ordinary page JavaScript.

## Security

- API responses are treated as untrusted data.
- HTML preview uses a sandboxed iframe and does not execute application-context JavaScript.
- Imported workspace data is validated for the supported schema and does not execute scripts.
- Pre/post request scripts are stored as data only; they are not automatically executed.
- Credentials are not included in history previews, although full request history may contain request values by design.
- localStorage is not a secure credential vault. Do not use it for high-value secrets on shared or compromised machines.
- Response HTML is escaped before ordinary rendering.
- File upload is not implemented as an automatic/background operation. Multipart data is only sent after an explicit Send action.

## Workspace schema

Exports use:

```json
{
  "schema": "endpoint.workspace",
  "version": 1,
  "exportedAt": "...",
  "collections": [],
  "environments": [],
  "history": [],
  "settings": {}
}
```

## Extensibility

The `api-client.js` adapter is the intended seam for a future backend/proxy transport. Additional code generators can be added beside `code-generator.js`. Persistence can later move from `storage.js` to IndexedDB or a remote workspace service.

## Supported browser targets

Current Chrome/Edge, Firefox, and Safari releases with ES modules, fetch, AbortController, URL, FormData, and localStorage.

## Important feature notes

- OAuth 2.0 is configuration-only in the browser implementation; provider-specific flows require redirect and token-exchange handling appropriate to the provider and deployment.
- Browser `fetch()` does not expose all raw response metadata (notably forbidden headers/cookies).
- Multipart file fields are represented in the request model but are intentionally conservative in this implementation; files should only be attached through an explicit user-facing file control before sending.

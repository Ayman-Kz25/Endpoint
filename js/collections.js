import {
  state,
  emit,
  persist,
  newTab,
  markDirty,
} from "./state.js";

import {
  uid,
  esc,
} from "./utils.js";

export function saveCurrent(name) {
  let c = state.collections[0];

  if (!c) {
    c = {
      id: uid("col"),
      name: "My Collection",
      folders: [],
      requests: [],
    };

    state.collections.push(c);
  }

  const t = state.tabs.find(
    (x) => x.id === state.activeTab
  );

  const existing = t?.savedRef
    ? c.requests.find(
        (x) => x.id === t.savedRef
      )
    : null;

  if (existing) {
    existing.request = structuredClone(state.request);
    existing.name = t.name;
    t.dirty = false;
  } else {
    const item = {
      id: uid("req"),
      name:
        name ||
        `${state.request.method} ${safePath(
          state.request.url
        )}`,
      folderId: null,
      request: structuredClone(state.request),
    };

    c.requests.push(item);

    if (t) {
      t.savedRef = item.id;
      t.name = item.name;
      t.dirty = false;
    }
  }

  persist();
  emit();
}

function safePath(u) {
  try {
    return new URL(u).pathname || "/";
  } catch {
    return "/request";
  }
}

export function renderPanel() {
  return `
    <div class="h-full overflow-auto scroll">

      <!-- Collection Header -->
      <div class="p-3 border-b border-line flex items-center justify-between">

        <div>
          <div class="font-semibold text-sm flex items-center gap-2">
            <i
              class="fa-solid fa-folder"
              aria-hidden="true"
            ></i>
            Collections
          </div>

          <div class="text-xs text-muted">
            ${state.collections.length} collection(s)
          </div>
        </div>

        <button
          class="btn btn-primary"
          data-col-new
          type="button"
          title="Create collection"
        >
          <i
            class="fa-solid fa-plus"
            aria-hidden="true"
          ></i>
          <span>Collection</span>
        </button>

      </div>

      <!-- Collections -->
      ${state.collections
        .map(
          (c) => `
            <section class="border-b border-line">

              <!-- Collection Row -->
              <div class="px-3 py-2 flex items-center gap-2 group">

                <button
                  type="button"
                  class="iconbtn btn btn-ghost"
                  title="Toggle collection"
                  aria-label="Toggle collection"
                >
                  <i
                    class="fa-solid fa-chevron-down"
                    aria-hidden="true"
                  ></i>
                </button>

                <input
                  class="input flex-1 px-2 py-1 rounded text-xs font-semibold"
                  data-col-name="${c.id}"
                  value="${esc(c.name)}"
                  aria-label="Collection name"
                >

                <span class="text-[10px] text-muted">
                  ${c.requests.length}
                </span>

                <!-- Delete Collection -->
                <button
                  type="button"
                  class="btn btn-danger iconbtn opacity-0 group-hover:opacity-100"
                  data-col-del-collection="${c.id}"
                  title="Delete collection"
                  aria-label="Delete collection"
                >
                  <i
                    class="fa-regular fa-trash-can"
                    aria-hidden="true"
                  ></i>
                </button>

              </div>

              <!-- Requests -->
              ${c.requests
                .map(
                  (r) => `
                    <div
                      class="tree-item pl-7 pr-2 py-2 flex items-center gap-2 group"
                    >

                      <!-- Open Request -->
                      <button
                        type="button"
                        class="text-left flex-1 min-w-0"
                        data-col-open="${c.id}:${r.id}"
                      >
                        <div class="flex gap-2 items-center">

                          <span
                            class="method method-${r.request.method}"
                          >
                            ${r.request.method}
                          </span>

                          <span class="text-xs truncate">
                            ${esc(r.name)}
                          </span>

                        </div>

                        <div
                          class="text-[10px] text-muted mono truncate mt-1"
                        >
                          ${esc(r.request.url)}
                        </div>
                      </button>

                      <!-- Duplicate Request -->
                      <button
                        type="button"
                        class="btn iconbtn opacity-0 group-hover:opacity-100"
                        data-col-dup="${c.id}:${r.id}"
                        title="Duplicate request"
                        aria-label="Duplicate request"
                      >
                        <i
                          class="fa-regular fa-copy"
                          aria-hidden="true"
                        ></i>
                      </button>

                      <!-- Delete Request -->
                      <button
                        type="button"
                        class="btn btn-danger iconbtn opacity-0 group-hover:opacity-100"
                        data-col-del="${c.id}:${r.id}"
                        title="Delete request"
                        aria-label="Delete request"
                      >
                        <i
                          class="fa-regular fa-trash-can"
                          aria-hidden="true"
                        ></i>
                      </button>

                    </div>
                  `
                )
                .join("")}

            </section>
          `
        )
        .join("")}

    </div>
  `;
}


export function bindPanel(root) {
  root.addEventListener("click", (e) => {

    /* ---------------------------------------------
       New Collection
       --------------------------------------------- */

    if (e.target.closest("[data-col-new]")) {
      state.collections.push({
        id: uid("col"),
        name: "New Collection",
        folders: [],
        requests: [],
      });

      persist();
      emit();

      return;
    }


    /* ---------------------------------------------
       Delete Collection
       --------------------------------------------- */

    const deleteCollectionButton =
      e.target.closest("[data-col-del-collection]");

    const collectionId =
      deleteCollectionButton?.dataset.colDelCollection;

    if (collectionId) {
      const collection = state.collections.find(
        (c) => c.id === collectionId
      );

      if (!collection) {
        return;
      }

      const requestCount = collection.requests.length;

      const message = requestCount
        ? `Delete "${collection.name}" and its ${requestCount} saved request(s)?`
        : `Delete "${collection.name}"?`;

      if (!confirm(message)) {
        return;
      }

      state.collections = state.collections.filter(
        (c) => c.id !== collectionId
      );

      persist();
      emit();

      return;
    }


    /* ---------------------------------------------
       Open Request
       --------------------------------------------- */

    const openButton = e.target.closest("[data-col-open]");
    const op = openButton?.dataset.colOpen;

    if (op) {
      const [ci, ri] = op.split(":");

      const r = state.collections
        .find((c) => c.id === ci)
        ?.requests.find((x) => x.id === ri);

      if (r) {
        newTab(r.request, r.name);

        const t = state.tabs.find(
          (x) => x.id === state.activeTab
        );

        if (t) {
          t.savedRef = r.id;
        }

        emit();
      }

      return;
    }


    /* ---------------------------------------------
       Duplicate Request
       --------------------------------------------- */

    const dupButton = e.target.closest("[data-col-dup]");
    const dup = dupButton?.dataset.colDup;

    if (dup) {
      const [ci, ri] = dup.split(":");

      const c = state.collections.find(
        (x) => x.id === ci
      );

      const r = c?.requests.find(
        (x) => x.id === ri
      );

      if (r) {
        const n = structuredClone(r);

        n.id = uid("req");
        n.name = `${r.name} Copy`;

        c.requests.push(n);

        persist();
        emit();
      }

      return;
    }


    /* ---------------------------------------------
       Delete Request
       --------------------------------------------- */

    const delButton = e.target.closest("[data-col-del]");
    const del = delButton?.dataset.colDel;

    if (del) {
      const [ci, ri] = del.split(":");

      const c = state.collections.find(
        (x) => x.id === ci
      );

      if (
        c &&
        confirm("Delete saved request?")
      ) {
        c.requests = c.requests.filter(
          (r) => r.id !== ri
        );

        persist();
        emit();
      }
    }
  });


  /* -----------------------------------------------
     Collection Name
     ----------------------------------------------- */

  root.addEventListener("change", (e) => {
    const id = e.target.dataset.colName;

    if (!id) {
      return;
    }

    const c = state.collections.find(
      (x) => x.id === id
    );

    if (c) {
      c.name = e.target.value;

      persist();
      emit();
    }
  });
}

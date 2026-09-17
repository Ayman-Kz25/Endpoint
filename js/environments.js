import { state, emit, persist, activeEnv } from "./state.js";
import { uid, esc, resolveVars } from "./utils.js";

/* Environment Helpers */
export function environmentVars() {
  const env = activeEnv();
  const variables = env?.variables || [];

  return Object.fromEntries(
    variables
      .filter((variable) => variable.enabled !== false)
      .filter((variable) => variable.key?.trim())
      .map((variable) => [variable.key.trim(), variable.currentValue ?? ""]),
  );
}

/* Activate an environment by name */
export function setActive(name) {
  const environment = (state.environments || []).find(
    (env) => env.name === name,
  );

  if (!environment) return;

  state.settings.activeEnvironment = environment.name;

  state.environments.forEach((env) => {
    env.active = env.id === environment.id;
  });

  persist();
  emit();
}

export function addEnvironment(name = "New Environment") {
  const environments = state.environments || [];

  const baseName = name.trim() || "New Environment";

  const existingNames = new Set(
    environments.map((env) => (env.name || "").trim().toLowerCase()),
  );

  let finalName = baseName;
  let counter = 2;

  while (existingNames.has(finalName.toLowerCase())) {
    finalName = `${baseName} ${counter}`;
    counter += 1;
  }

  const environment = {
    id: uid("env"),
    name: finalName,
    variables: [],
    active: false,
    isDefault: false,
  };

  environments.push(environment);
  state.environments = environments;

  if (!state.settings.activeEnvironment) {
    state.settings.activeEnvironment = finalName;
    environment.active = true;
  }

  persist();
  emit();
}

export function deleteEnvironment(envId) {
  const environments = state.environments || [];

  const environment = environments.find((env) => env.id === envId);

  if (!environment) return;

  if (environment.isDefault === true) {
    window.alert(
      `"${environment.name}" is the default environment and cannot be deleted.`,
    );

    return;
  }

  const variableCount = environment.variables?.length || 0;

  const variableMessage =
    variableCount > 0
      ? `\n\nThis will also delete ${variableCount} ${
          variableCount === 1 ? "variable" : "variables"
        }.`
      : "";

  const confirmed = window.confirm(
    `Delete environment "${environment.name}"?${variableMessage}`,
  );

  if (!confirmed) return;

  const wasActive = state.settings.activeEnvironment === environment.name;

  state.environments = environments.filter((env) => env.id !== envId);

  if (wasActive) {
    const fallback =
      state.environments.find((env) => env.isDefault === true) ||
      state.environments[0];

    if (fallback) {
      state.settings.activeEnvironment = fallback.name;

      state.environments.forEach((env) => {
        env.active = env.id === fallback.id;
      });
    } else {
      state.settings.activeEnvironment = "";
    }
  }

  persist();
  emit();
}

/* Add a variable to an environment */
export function addVariable(envId) {
  const environment = state.environments.find((env) => env.id === envId);

  if (!environment) return;

  environment.variables = environment.variables || [];

  const existingKeys = new Set(
    environment.variables.map((variable) => variable.key?.toLowerCase()),
  );

  let key = "newVariable";
  let counter = 2;

  while (existingKeys.has(key.toLowerCase())) {
    key = `newVariable${counter}`;
    counter += 1;
  }

  environment.variables.push({
    id: uid("v"),
    key,
    initialValue: "",
    currentValue: "",
    secret: false,
    enabled: true,
  });

  persist();
  emit();
}

/* Delete a variable */
export function deleteVariable(envId, variableId) {
  const environment = state.environments.find((env) => env.id === envId);

  if (!environment) return;

  const variable = environment.variables?.find(
    (item) => item.id === variableId,
  );

  if (!variable) return;

  const confirmed = window.confirm(
    `Delete variable "${variable.key || "Unnamed variable"}"?`,
  );

  if (!confirmed) return;

  environment.variables = (environment.variables || []).filter(
    (item) => item.id !== variableId,
  );

  persist();
  emit();
}

export function resolve(value) {
  return resolveVars(value ?? "", environmentVars());
}

/* Variable Rendering */
function renderVariable(environment, variable) {
  const variableId = `${environment.id}:${variable.id}`;
  const isSecret = variable.secret === true;

  return `
    <div
      data-variable-row="${esc(variableId)}"
      class="mb-2"
      style="
        display: grid;
        grid-template-columns: 24px minmax(0, 1fr) minmax(0, 1fr) 40px 34px;
        gap: 8px;
        align-items: center;
        width: 100%;
      "
    >

      <!-- Enabled -->
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
        "
      >
        <input
          type="checkbox"
          data-var-enabled="${esc(variableId)}"
          ${variable.enabled !== false ? "checked" : ""}
          title="Enable variable"
          aria-label="Enable variable"
        >
      </div>

      <!-- Key -->
      <input
        class="input px-2 py-1 rounded text-xs mono"
        style="
          width: 100%;
          min-width: 0;
        "
        data-var-key="${esc(variableId)}"
        value="${esc(variable.key || "")}"
        placeholder="variable"
        title="Variable name"
        aria-label="Variable name"
        autocomplete="off"
        spellcheck="false"
      >

      <!-- Value -->
      <input
        class="input px-2 py-1 rounded text-xs mono"
        style="
          width: 100%;
          min-width: 0;
        "
        data-var-value="${esc(variableId)}"
        value="${esc(variable.currentValue || "")}"
        type="${isSecret ? "password" : "text"}"
        placeholder="value"
        title="Variable value"
        aria-label="Variable value"
        autocomplete="off"
        spellcheck="false"
      >

      <!-- Secret -->
      <button
        type="button"
        class="btn iconbtn"
        style="
          width: 40px;
          min-width: 40px;
        "
        data-var-toggle-secret="${esc(variableId)}"
        title="${isSecret ? "Show value" : "Hide value"}"
        aria-label="${isSecret ? "Show value" : "Hide value"}"
      >
        <i
          class="fa-solid ${isSecret ? "fa-eye-slash" : "fa-eye"}"
          aria-hidden="true"
        ></i>
      </button>

      <!-- Delete -->
      <button
        type="button"
        class="btn btn-danger iconbtn"
        style="
          width: 34px;
          min-width: 34px;
        "
        data-var-delete="${esc(variableId)}"
        title="Delete variable"
        aria-label="Delete variable"
      >
        <i
          class="fa-regular fa-trash-can"
          aria-hidden="true"
        ></i>
      </button>

    </div>
  `;
}

/* Environment Rendering */
function renderEnvironment(environment) {
  const isActive = environment.name === state.settings.activeEnvironment;

  const variables = environment.variables || [];

  const canDelete = environment.isDefault !== true;

  const variableHtml = variables.length
    ? variables
        .map((variable) => renderVariable(environment, variable))
        .join("")
    : `
      <div class="empty-state py-5">
        <i
          class="fa-solid fa-list"
          aria-hidden="true"
        ></i>

        <div class="text-xs">
          No variables in this environment.
        </div>

        <div class="text-xs text-muted">
          Add a variable to use values such as {{baseUrl}}.
        </div>
      </div>
    `;

  return `
    <section
      class="w-full border border-line rounded-lg overflow-hidden bg-panel"
      data-environment="${esc(environment.id)}"
    >

      <!-- Environment header -->
      <div
        class="px-3 py-2 bg-panel2 border-b border-line flex items-center gap-2 min-w-0"
      >

        <i
          class="fa-solid fa-layer-group text-muted shrink-0"
          aria-hidden="true"
        ></i>

        <!-- Environment name -->
        <input
          class="input flex-1 min-w-0 w-full px-2 py-1 text-sm rounded"
          data-env-name="${esc(environment.id)}"
          value="${esc(environment.name || "")}"
          placeholder="Environment name"
          title="Environment name"
          aria-label="Environment name"
          autocomplete="off"
        >

        <!-- Variable count -->
        <span
          class="hidden sm:inline-flex items-center gap-1 text-xs text-muted whitespace-nowrap shrink-0"
          title="${variables.length} ${
            variables.length === 1 ? "variable" : "variables"
          }"
        >
          ${variables.length}
          <i
            class="fa-solid fa-list"
            aria-hidden="true"
          ></i>
        </span>

        <!-- Active / Use -->
        <button
          type="button"
          class="btn shrink-0 ${isActive ? "btn-primary" : ""}"
          data-env-use="${esc(environment.name || "")}"
          title="${
            isActive ? "Currently active environment" : "Use this environment"
          }"
          aria-label="${
            isActive
              ? `Active environment: ${environment.name}`
              : `Use environment: ${environment.name}`
          }"
        >
          <i
            class="fa-solid ${isActive ? "fa-circle-check" : "fa-play"}"
            aria-hidden="true"
          ></i>

          <span class="hidden sm:inline">
            ${isActive ? "Active" : "Use"}
          </span>
        </button>

        <!-- Delete -->
        ${
          canDelete
            ? `
              <button
                type="button"
                class="btn btn-danger iconbtn shrink-0"
                data-env-delete="${esc(environment.id)}"
                title="Delete environment"
                aria-label="Delete environment: ${esc(environment.name)}"
              >
                <i
                  class="fa-regular fa-trash-can"
                  aria-hidden="true"
                ></i>
              </button>
            `
            : `
              <span
                class="iconbtn text-muted shrink-0"
                title="Default environment cannot be deleted"
                aria-label="Default environment cannot be deleted"
              >
                <i
                  class="fa-solid fa-lock"
                  aria-hidden="true"
                ></i>
              </span>
            `
        }

      </div>

      <!-- Variables -->
      <div class="p-2 min-w-0">

        ${
          variables.length
            ? `
      <div
        class="mb-2"
        style="
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr) minmax(0, 1fr) 40px 34px;
          gap: 8px;
          align-items: center;
          width: 100%;
        "
      >
        <span></span>

        <span
          class="text-[10px] uppercase tracking-wide text-muted"
        >
          Key
        </span>

        <span
          class="text-[10px] uppercase tracking-wide text-muted"
        >
          Value
        </span>

        <span
          class="text-[10px] uppercase tracking-wide text-muted text-center"
          title="Secret"
        >
          <i
            class="fa-solid fa-lock"
            aria-hidden="true"
          ></i>
        </span>

        <span></span>
      </div>
    `
            : ""
        }

        <!-- Variable rows -->
        <div class="min-w-0">
          ${variableHtml}
        </div>

        <!-- Add variable -->
        <button
          type="button"
          class="btn w-full mt-2"
          data-var-add="${esc(environment.id)}"
          title="Add variable"
        >
          <i
            class="fa-solid fa-plus"
            aria-hidden="true"
          ></i>

          Variable
        </button>

      </div>

    </section>
  `;
}

/* Render complete environments panel. */
export function renderPanel() {
  const environments = state.environments || [];

  return `
    <div class="w-full max-w-5xl mx-auto space-y-4">

      <!-- Panel header -->
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >

        <div class="min-w-0">

          <div
            class="text-sm font-semibold flex items-center gap-2"
          >
            <i
              class="fa-solid fa-layer-group"
              aria-hidden="true"
            ></i>

            Environments
          </div>

          <div class="text-xs text-muted mt-1">
            Variables resolve at send time.
          </div>

        </div>

        <button
          type="button"
          class="btn btn-primary shrink-0 self-start sm:self-auto"
          data-action="env-add"
          title="Create environment"
        >
          <i
            class="fa-solid fa-plus"
            aria-hidden="true"
          ></i>

          Environment
        </button>

      </div>

      ${
        environments.length
          ? `
            <!-- Environment cards -->
            <div class="w-full space-y-3">
              ${environments.map(renderEnvironment).join("")}
            </div>
          `
          : `
            <!-- Empty state -->
            <div class="empty-state py-10">
              <i
                class="fa-solid fa-box-open"
                aria-hidden="true"
              ></i>

              <div>
                No environments yet.
              </div>

              <div class="text-xs text-muted">
                Create an environment to store API variables.
              </div>
            </div>
          `
      }

    </div>
  `;
}

/* Helpers */
function getVariableFromIdentifier(identifier) {
  if (!identifier) return null;

  const separator = identifier.indexOf(":");

  if (separator === -1) return null;

  const environmentId = identifier.slice(0, separator);
  const variableId = identifier.slice(separator + 1);

  const environment = state.environments.find(
    (env) => env.id === environmentId,
  );

  if (!environment) return null;

  const variable = environment.variables?.find(
    (item) => item.id === variableId,
  );

  if (!variable) return null;

  return {
    environment,
    variable,
    environmentId,
    variableId,
  };
}

/* Event Binding */
export function bindPanel(root) {
  if (!root) return;

  if (root.dataset.environmentsBound === "true") {
    return;
  }

  root.dataset.environmentsBound = "true";

  /* Click Events */
  root.addEventListener("click", (event) => {
    /* Add environment */
    const addEnvironmentButton = event.target.closest(
      '[data-action="env-add"]',
    );

    if (addEnvironmentButton) {
      addEnvironment();
      return;
    }

    /* Activate environment */
    const useButton = event.target.closest("[data-env-use]");

    if (useButton) {
      const name = useButton.dataset.envUse;

      if (name) {
        setActive(name);
      }

      return;
    }

    /* Delete environment */
    const deleteEnvironmentButton = event.target.closest("[data-env-delete]");

    if (deleteEnvironmentButton) {
      const envId = deleteEnvironmentButton.dataset.envDelete;

      if (envId) {
        deleteEnvironment(envId);
      }

      return;
    }

    /* Add variable */
    const addVariableButton = event.target.closest("[data-var-add]");

    if (addVariableButton) {
      const envId = addVariableButton.dataset.varAdd;

      if (envId) {
        addVariable(envId);
      }

      return;
    }

    /* Delete variable */
    const deleteVariableButton = event.target.closest("[data-var-delete]");

    if (deleteVariableButton) {
      const identifier = deleteVariableButton.dataset.varDelete;

      const result = getVariableFromIdentifier(identifier);

      if (!result) return;

      deleteVariable(result.environmentId, result.variableId);

      return;
    }

    /* Toggle secret visibility */
    const toggleSecretButton = event.target.closest("[data-var-toggle-secret]");

    if (toggleSecretButton) {
      const identifier = toggleSecretButton.dataset.varToggleSecret;

      const input = root.querySelector(
        `[data-var-value="${CSS.escape(identifier)}"]`,
      );

      if (!input) return;
    
      const currentlyHidden = input.type === "password";

      input.type = currentlyHidden ? "text" : "password";

      toggleSecretButton.title = currentlyHidden ? "Hide value" : "Show value";

      toggleSecretButton.setAttribute(
        "aria-label",
        currentlyHidden ? "Hide value" : "Show value",
      );

      const icon = toggleSecretButton.querySelector("i");

      if (icon) {
        icon.classList.toggle("fa-eye", !currentlyHidden);

        icon.classList.toggle("fa-eye-slash", currentlyHidden);
      }

      return;
    }
  });

  /* Change Events */
  root.addEventListener("change", (event) => {
    const target = event.target;

    if (!target?.dataset) return;

    const dataset = target.dataset;

    /* Environment name */
    if (dataset.envName) {
      const environment = state.environments.find(
        (env) => env.id === dataset.envName,
      );

      if (environment) {
        const oldName = environment.name;

        const newName = target.value.trim();

        if (!newName) {
          target.value = oldName;
        } else if (newName !== oldName) {
          const duplicate = state.environments.some(
            (env) =>
              env.id !== environment.id &&
              (env.name || "").trim().toLowerCase() === newName.toLowerCase(),
          );

          if (duplicate) {
            window.alert(`An environment named "${newName}" already exists.`);

            target.value = oldName;
          } else {
            environment.name = newName;

            /*
             * The active environment is referenced by name.
             * Keep that reference synchronized after rename.
             */
            if (state.settings.activeEnvironment === oldName) {
              state.settings.activeEnvironment = newName;
            }
          }
        }
      }
    }

    /* Variable enabled */
    if (dataset.varEnabled) {
      const result = getVariableFromIdentifier(dataset.varEnabled);

      if (result) {
        result.variable.enabled = target.checked;
      }
    }

    /* Variable secret */
    if (dataset.varSecret) {
      const result = getVariableFromIdentifier(dataset.varSecret);

      if (result) {
        result.variable.secret = target.checked;
      }
    }

    /* Variable key */
    if (dataset.varKey) {
      const result = getVariableFromIdentifier(dataset.varKey);

      if (result) {
        result.variable.key = target.value;
      }
    }

    /* Variable value */
    if (dataset.varValue) {
      const result = getVariableFromIdentifier(dataset.varValue);

      if (result) {
        result.variable.currentValue = target.value;
      }
    }

    persist();
    emit();
  });
}

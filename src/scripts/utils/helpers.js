// src/scripts/utils/helpers.js

/**
 * General-purpose helpers used throughout the application.
 */

/**
 * Generate a reasonably unique ID.
 *
 * @param {string} [prefix="id"]
 * @returns {string}
 */
export function generateId(prefix = "id") {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${random}`;
}

/**
 * Safely execute a function and return a fallback when it throws.
 *
 * @template T
 * @param {() => T} callback
 * @param {T} [fallback]
 * @returns {T}
 */
export function tryCatch(callback, fallback = null) {
  try {
    return callback();
  } catch {
    return fallback;
  }
}

/**
 * Safely execute an async function and return a fallback on failure.
 *
 * @template T
 * @param {() => Promise<T>} callback
 * @param {T} [fallback]
 * @returns {Promise<T>}
 */
export async function tryCatchAsync(callback, fallback = null) {
  try {
    return await callback();
  } catch {
    return fallback;
  }
}

/**
 * Return a promise that resolves after the specified delay.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms = 0) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });
}

/**
 * Debounce a function.
 *
 * @param {Function} callback
 * @param {number} [delay=250]
 * @returns {Function & {cancel: Function}}
 */
export function debounce(callback, delay = 250) {
  let timeoutId = null;

  const debounced = function (...args) {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      timeoutId = null;
      callback.apply(this, args);
    }, Math.max(0, delay));
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Throttle a function.
 *
 * @param {Function} callback
 * @param {number} [interval=100]
 * @returns {Function & {cancel: Function}}
 */
export function throttle(callback, interval = 100) {
  let lastRun = 0;
  let timeoutId = null;
  let lastArgs = null;
  let lastThis = null;

  const throttled = function (...args) {
    const now = Date.now();
    const remaining = Math.max(0, interval - (now - lastRun));

    lastArgs = args;
    lastThis = this;

    if (remaining === 0) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      lastRun = now;

      const context = lastThis;
      const argumentsList = lastArgs;

      lastThis = null;
      lastArgs = null;

      callback.apply(context, argumentsList);
      return;
    }

    if (timeoutId === null) {
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        lastRun = Date.now();

        const context = lastThis;
        const argumentsList = lastArgs;

        lastThis = null;
        lastArgs = null;

        callback.apply(context, argumentsList);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }

    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

/**
 * Wait until the DOM is ready.
 *
 * @param {Function} callback
 */
export function onDOMReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, {
      once: true,
    });
    return;
  }

  callback();
}

/**
 * Query a single DOM element.
 *
 * @template {Element} T
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {T|null}
 */
export function $(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Query multiple DOM elements and return a real array.
 *
 * @template {Element} T
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {T[]}
 */
export function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Convert an arbitrary value to a safe string.
 *
 * @param {*} value
 * @param {string} [fallback=""]
 * @returns {string}
 */
export function toString(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return String(value);
  } catch {
    return fallback;
  }
}

/**
 * Check whether a value is a plain object.
 *
 * @param {*} value
 * @returns {boolean}
 */
export function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

/**
 * Deep-clone JSON-compatible application data.
 *
 * Uses structuredClone when available and falls back to JSON
 * serialization for JSON-compatible values.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
export function deepClone(value) {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      // Fall through to JSON cloning.
    }
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

/**
 * Remove empty values from an object.
 *
 * Useful for request parameters and headers.
 *
 * @param {Object} object
 * @param {Object} [options]
 * @param {boolean} [options.keepZero=true]
 * @param {boolean} [options.keepFalse=true]
 * @returns {Object}
 */
export function removeEmptyValues(
  object,
  { keepZero = true, keepFalse = true } = {},
) {
  if (!isPlainObject(object)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false;
      }

      if (typeof value === "string" && value.trim() === "") {
        return false;
      }

      if (value === 0 && !keepZero) {
        return false;
      }

      if (value === false && !keepFalse) {
        return false;
      }

      return true;
    }),
  );
}

/**
 * Convert an array of key/value rows into an object.
 *
 * Duplicate keys use the last non-empty value.
 *
 * @param {Array} rows
 * @returns {Object}
 */
export function rowsToObject(rows = []) {
  if (!Array.isArray(rows)) {
    return {};
  }

  return rows.reduce((result, row) => {
    if (!row || typeof row !== "object") {
      return result;
    }

    const key = toString(row.key).trim();

    if (!key) {
      return result;
    }

    result[key] = row.value ?? "";

    return result;
  }, {});
}

/**
 * Convert an object into key/value rows.
 *
 * @param {Object} object
 * @returns {Array<{id: string, key: string, value: string, enabled: boolean}>}
 */
export function objectToRows(object = {}) {
  if (!isPlainObject(object)) {
    return [];
  }

  return Object.entries(object).map(([key, value]) => ({
    id: generateId("row"),
    key,
    value: toString(value),
    enabled: true,
  }));
}

/**
 * Normalize a request method.
 *
 * @param {*} method
 * @returns {string}
 */
export function normalizeMethod(method) {
  const value = toString(method, "GET").trim().toUpperCase();

  const allowedMethods = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ];

  return allowedMethods.includes(value) ? value : "GET";
}

/**
 * Normalize a URL without changing its query string.
 *
 * @param {*} url
 * @returns {string}
 */
export function normalizeUrl(url) {
  return toString(url).trim();
}

/**
 * Parse a URL safely.
 *
 * @param {string} value
 * @param {string} [base]
 * @returns {URL|null}
 */
export function parseUrl(value, base) {
  const url = toString(value).trim();

  if (!url) {
    return null;
  }

  try {
    return new URL(url, base);
  } catch {
    return null;
  }
}

/**
 * Read the current value of an input/select/textarea.
 *
 * @param {string|Element|null} target
 * @param {ParentNode} [root=document]
 * @returns {string}
 */
export function getFieldValue(target, root = document) {
  const element =
    typeof target === "string" ? $(target, root) : target;

  if (
    !element ||
    !("value" in element)
  ) {
    return "";
  }

  return toString(element.value);
}

/**
 * Set the value of an input/select/textarea.
 *
 * @param {string|Element|null} target
 * @param {*} value
 * @param {ParentNode} [root=document]
 * @returns {boolean}
 */
export function setFieldValue(target, value, root = document) {
  const element =
    typeof target === "string" ? $(target, root) : target;

  if (!element || !("value" in element)) {
    return false;
  }

  element.value = value ?? "";
  return true;
}

/**
 * Toggle an element's hidden state.
 *
 * @param {Element|string|null} target
 * @param {boolean} hidden
 * @param {ParentNode} [root=document]
 * @returns {boolean}
 */
export function setHidden(target, hidden, root = document) {
  const element =
    typeof target === "string" ? $(target, root) : target;

  if (!element) {
    return false;
  }

  element.classList.toggle("hidden", Boolean(hidden));
  return true;
}

/**
 * Toggle an element's disabled state.
 *
 * @param {HTMLButtonElement|HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|string|null} target
 * @param {boolean} disabled
 * @param {ParentNode} [root=document]
 * @returns {boolean}
 */
export function setDisabled(target, disabled, root = document) {
  const element =
    typeof target === "string" ? $(target, root) : target;

  if (!element || !("disabled" in element)) {
    return false;
  }

  element.disabled = Boolean(disabled);
  return true;
}

/**
 * Safely dispatch a custom DOM event.
 *
 * @param {string} name
 * @param {*} detail
 * @param {EventTarget} [target=document]
 * @returns {boolean}
 */
export function emit(name, detail = undefined, target = document) {
  if (!target || typeof target.dispatchEvent !== "function") {
    return false;
  }

  return target.dispatchEvent(
    new CustomEvent(name, {
      detail,
      bubbles: true,
    }),
  );
}

/**
 * Wait for a custom DOM event once.
 *
 * @param {string} name
 * @param {EventTarget} [target=document]
 * @param {number} [timeout=0]
 * @returns {Promise<CustomEvent>}
 */
export function waitForEvent(name, target = document, timeout = 0) {
  return new Promise((resolve, reject) => {
    let timeoutId = null;

    const cleanup = () => {
      target.removeEventListener(name, handler);

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };

    const handler = (event) => {
      cleanup();
      resolve(event);
    };

    target.addEventListener(name, handler, {
      once: true,
    });

    if (timeout > 0) {
      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for "${name}" event.`));
      }, timeout);
    }
  });
}

/**
 * Copy an object while replacing undefined values with null.
 *
 * @param {*} value
 * @returns {*}
 */
export function stripUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        stripUndefined(item),
      ]),
    );
  }

  return value === undefined ? null : value;
}

/**
 * Return a value when it is defined, otherwise use the fallback.
 *
 * @template T
 * @param {T|undefined|null} value
 * @param {T} fallback
 * @returns {T}
 */
export function defaultValue(value, fallback) {
  return value === undefined || value === null ? fallback : value;
}

/**
 * Clamp a number between minimum and maximum values.
 *
 * @param {*} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return min;
  }

  return Math.min(Math.max(numericValue, min), max);
}

/**
 * Check whether an object has a property.
 *
 * @param {Object} object
 * @param {string} key
 * @returns {boolean}
 */
export function hasOwn(object, key) {
  return (
    object !== null &&
    object !== undefined &&
    Object.prototype.hasOwnProperty.call(object, key)
  );
}
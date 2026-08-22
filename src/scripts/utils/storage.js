// src/scripts/utils/storage.js

/**
 * Storage utilities.
 *
 * Provides a small safe wrapper around localStorage and sessionStorage.
 * All JSON operations are handled consistently and storage errors are
 * caught so UI modules do not crash when browser storage is unavailable.
 */

// ============================================================
// Constants
// ============================================================

export const STORAGE_TYPES = {
    LOCAL: "local",
    SESSION: "session",
};

const DEFAULT_STORAGE_TYPE = STORAGE_TYPES.LOCAL;

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Get a storage instance safely.
 *
 * @param {"local"|"session"} type
 * @returns {Storage|null}
 */
function getStorage(type = DEFAULT_STORAGE_TYPE) {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        if (type === STORAGE_TYPES.SESSION) {
            return window.sessionStorage;
        }

        return window.localStorage;
    } catch {
        return null;
    }
}

/**
 * Validate a storage type.
 *
 * @param {*} type
 * @returns {"local"|"session"}
 */
function normalizeStorageType(type) {
    return type === STORAGE_TYPES.SESSION
        ? STORAGE_TYPES.SESSION
        : STORAGE_TYPES.LOCAL;
}

/**
 * Safely serialize a value.
 *
 * @param {*} value
 * @returns {string|null}
 */
function serialize(value) {
    try {
        return JSON.stringify(value);
    } catch {
        return null;
    }
}

/**
 * Safely parse JSON.
 *
 * @param {string} value
 * @returns {*}
 */
function deserialize(value) {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

// ============================================================
// Availability
// ============================================================

/**
 * Check whether browser storage is available.
 *
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function isStorageAvailable(
    type = DEFAULT_STORAGE_TYPE
) {
    const storage = getStorage(
        normalizeStorageType(type)
    );

    if (!storage) {
        return false;
    }

    const testKey = "__endpoint_storage_test__";

    try {
        storage.setItem(testKey, "1");
        storage.removeItem(testKey);

        return true;
    } catch {
        return false;
    }
}

// ============================================================
// Read
// ============================================================

/**
 * Get a raw string value from storage.
 *
 * @param {string} key
 * @param {"local"|"session"} type
 * @returns {string|null}
 */
export function getItem(
    key,
    type = DEFAULT_STORAGE_TYPE
) {
    if (!key) {
        return null;
    }

    const storage = getStorage(
        normalizeStorageType(type)
    );

    if (!storage) {
        return null;
    }

    try {
        return storage.getItem(String(key));
    } catch {
        return null;
    }
}

/**
 * Get a JSON value from storage.
 *
 * @param {string} key
 * @param {*} fallback
 * @param {"local"|"session"} type
 * @returns {*}
 */
export function getJson(
    key,
    fallback = null,
    type = DEFAULT_STORAGE_TYPE
) {
    const value = getItem(key, type);

    if (value === null) {
        return fallback;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

/**
 * Get a JSON object from storage.
 *
 * Returns the fallback when the stored value is not a plain object.
 *
 * @param {string} key
 * @param {Object} fallback
 * @param {"local"|"session"} type
 * @returns {Object}
 */
export function getObject(
    key,
    fallback = {},
    type = DEFAULT_STORAGE_TYPE
) {
    const value = getJson(key, fallback, type);

    if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return fallback;
    }

    return value;
}

/**
 * Get a JSON array from storage.
 *
 * @param {string} key
 * @param {Array} fallback
 * @param {"local"|"session"} type
 * @returns {Array}
 */
export function getArray(
    key,
    fallback = [],
    type = DEFAULT_STORAGE_TYPE
) {
    const value = getJson(key, fallback, type);

    return Array.isArray(value)
        ? value
        : fallback;
}

// ============================================================
// Write
// ============================================================

/**
 * Store a raw string value.
 *
 * @param {string} key
 * @param {*} value
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function setItem(
    key,
    value,
    type = DEFAULT_STORAGE_TYPE
) {
    if (!key) {
        return false;
    }

    const storage = getStorage(
        normalizeStorageType(type)
    );

    if (!storage) {
        return false;
    }

    try {
        storage.setItem(
            String(key),
            String(value)
        );

        return true;
    } catch {
        return false;
    }
}

/**
 * Store a JSON value.
 *
 * @param {string} key
 * @param {*} value
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function setJson(
    key,
    value,
    type = DEFAULT_STORAGE_TYPE
) {
    if (!key) {
        return false;
    }

    const serialized = serialize(value);

    if (serialized === null) {
        return false;
    }

    return setItem(
        key,
        serialized,
        type
    );
}

/**
 * Store a JSON object.
 *
 * @param {string} key
 * @param {Object} value
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function setObject(
    key,
    value,
    type = DEFAULT_STORAGE_TYPE
) {
    if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return false;
    }

    return setJson(
        key,
        value,
        type
    );
}

/**
 * Store a JSON array.
 *
 * @param {string} key
 * @param {Array} value
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function setArray(
    key,
    value,
    type = DEFAULT_STORAGE_TYPE
) {
    if (!Array.isArray(value)) {
        return false;
    }

    return setJson(
        key,
        value,
        type
    );
}

// ============================================================
// Remove
// ============================================================

/**
 * Remove an item from storage.
 *
 * @param {string} key
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function removeItem(
    key,
    type = DEFAULT_STORAGE_TYPE
) {
    if (!key) {
        return false;
    }

    const storage = getStorage(
        normalizeStorageType(type)
    );

    if (!storage) {
        return false;
    }

    try {
        storage.removeItem(String(key));

        return true;
    } catch {
        return false;
    }
}

/**
 * Check whether a key exists.
 *
 * @param {string} key
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function hasItem(
    key,
    type = DEFAULT_STORAGE_TYPE
) {
    if (!key) {
        return false;
    }

    const storage = getStorage(
        normalizeStorageType(type)
    );

    if (!storage) {
        return false;
    }

    try {
        return storage.getItem(String(key)) !== null;
    } catch {
        return false;
    }
}

// ============================================================
// Clear
// ============================================================

/**
 * Clear all items from a storage area.
 *
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function clear(
    type = DEFAULT_STORAGE_TYPE
) {
    const storage = getStorage(
        normalizeStorageType(type)
    );

    if (!storage) {
        return false;
    }

    try {
        storage.clear();

        return true;
    } catch {
        return false;
    }
}

/**
 * Remove multiple keys.
 *
 * @param {string[]} keys
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function removeItems(
    keys = [],
    type = DEFAULT_STORAGE_TYPE
) {
    if (!Array.isArray(keys)) {
        return false;
    }

    const storage = getStorage(
        normalizeStorageType(type)
    );

    if (!storage) {
        return false;
    }

    try {
        keys.forEach((key) => {
            if (key) {
                storage.removeItem(String(key));
            }
        });

        return true;
    } catch {
        return false;
    }
}

// ============================================================
// Keys
// ============================================================

/**
 * Get all keys from storage.
 *
 * @param {"local"|"session"} type
 * @returns {string[]}
 */
export function getKeys(
    type = DEFAULT_STORAGE_TYPE
) {
    const storage = getStorage(
        normalizeStorageType(type)
    );

    if (!storage) {
        return [];
    }

    try {
        const keys = [];

        for (let index = 0; index < storage.length; index += 1) {
            const key = storage.key(index);

            if (key !== null) {
                keys.push(key);
            }
        }

        return keys;
    } catch {
        return [];
    }
}

/**
 * Get the number of stored items.
 *
 * @param {"local"|"session"} type
 * @returns {number}
 */
export function getSize(
    type = DEFAULT_STORAGE_TYPE
) {
    const storage = getStorage(
        normalizeStorageType(type)
    );

    if (!storage) {
        return 0;
    }

    try {
        return storage.length;
    } catch {
        return 0;
    }
}

// ============================================================
// Namespace Helpers
// ============================================================

/**
 * Build a namespaced storage key.
 *
 * Example:
 * createStorageKey("history", "items")
 * -> "endpoint:history:items"
 *
 * @param {string} namespace
 * @param {string} key
 * @returns {string}
 */
export function createStorageKey(
    namespace,
    key
) {
    const parts = [
        "endpoint",
        namespace,
        key,
    ]
        .filter(
            (part) =>
                part !== null &&
                part !== undefined &&
                String(part).trim() !== ""
        )
        .map((part) => String(part).trim());

    return parts.join(":");
}

/**
 * Remove all keys belonging to a namespace.
 *
 * Example:
 * clearNamespace("history")
 *
 * Removes:
 * endpoint:history:items
 * endpoint:history:settings
 * etc.
 *
 * @param {string} namespace
 * @param {"local"|"session"} type
 * @returns {boolean}
 */
export function clearNamespace(
    namespace,
    type = DEFAULT_STORAGE_TYPE
) {
    if (!namespace) {
        return false;
    }

    const prefix = createStorageKey(
        namespace,
        ""
    ).replace(/:$/, ":");

    const keys = getKeys(type);

    try {
        keys
            .filter((key) => key.startsWith(prefix))
            .forEach((key) => {
                removeItem(key, type);
            });

        return true;
    } catch {
        return false;
    }
}

// ============================================================
// Storage Wrapper
// ============================================================

/**
 * Create a storage instance bound to one storage area.
 *
 * This is useful for feature modules that repeatedly access
 * the same storage type.
 *
 * @param {"local"|"session"} type
 * @returns {Object}
 */
export function createStorage(
    type = DEFAULT_STORAGE_TYPE
) {
    const storageType = normalizeStorageType(type);

    return {
        type: storageType,

        available() {
            return isStorageAvailable(storageType);
        },

        get(key, fallback = null) {
            return getJson(
                key,
                fallback,
                storageType
            );
        },

        getString(key, fallback = null) {
            const value = getItem(
                key,
                storageType
            );

            return value === null
                ? fallback
                : value;
        },

        getObject(key, fallback = {}) {
            return getObject(
                key,
                fallback,
                storageType
            );
        },

        getArray(key, fallback = []) {
            return getArray(
                key,
                fallback,
                storageType
            );
        },

        set(key, value) {
            return setJson(
                key,
                value,
                storageType
            );
        },

        setString(key, value) {
            return setItem(
                key,
                value,
                storageType
            );
        },

        setObject(key, value) {
            return setObject(
                key,
                value,
                storageType
            );
        },

        setArray(key, value) {
            return setArray(
                key,
                value,
                storageType
            );
        },

        has(key) {
            return hasItem(
                key,
                storageType
            );
        },

        remove(key) {
            return removeItem(
                key,
                storageType
            );
        },

        clear() {
            return clear(storageType);
        },

        keys() {
            return getKeys(storageType);
        },

        size() {
            return getSize(storageType);
        },
    };
}

// ============================================================
// Default Instances
// ============================================================

/**
 * Preconfigured localStorage wrapper.
 */
export const localStore = createStorage(
    STORAGE_TYPES.LOCAL
);

/**
 * Preconfigured sessionStorage wrapper.
 */
export const sessionStore = createStorage(
    STORAGE_TYPES.SESSION
);

// ============================================================
// Default Export
// ============================================================

export default {
    STORAGE_TYPES,

    isStorageAvailable,

    getItem,
    getJson,
    getObject,
    getArray,

    setItem,
    setJson,
    setObject,
    setArray,

    removeItem,
    removeItems,
    hasItem,

    clear,

    getKeys,
    getSize,

    createStorageKey,
    clearNamespace,

    createStorage,

    localStore,
    sessionStore,
};
/**
 * Application Event Bus.
 *
 * Allows modules to communicate without creating direct
 * dependencies between each other.
 *
 * Example:
 *
 * import events from "./events.js";
 *
 * const unsubscribe = events.on("request:changed", (payload) => {
 *     console.log(payload);
 * });
 *
 * events.emit("request:changed", {
 *     field: "url",
 *     value: "https://example.com",
 * });
 *
 * unsubscribe();
 */

// ============================================================
// Event Store
// ============================================================

const listeners = new Map();

// ============================================================
// Helpers
// ============================================================

function validateEventName(eventName) {
    if (
        typeof eventName !== "string" ||
        !eventName.trim()
    ) {
        throw new TypeError(
            "Event name must be a non-empty string.",
        );
    }
}

function validateCallback(callback) {
    if (typeof callback !== "function") {
        throw new TypeError(
            "Event listener must be a function.",
        );
    }
}

// ============================================================
// Event Bus
// ============================================================

const events = {
    /**
     * Register an event listener.
     *
     * @param {string} eventName
     * @param {Function} callback
     * @returns {Function} unsubscribe function
     */
    on(eventName, callback) {
        validateEventName(eventName);
        validateCallback(callback);

        if (!listeners.has(eventName)) {
            listeners.set(eventName, new Set());
        }

        listeners.get(eventName).add(callback);

        return () => {
            this.off(eventName, callback);
        };
    },

    /**
     * Register a listener that runs once.
     *
     * @param {string} eventName
     * @param {Function} callback
     * @returns {Function} unsubscribe function
     */
    once(eventName, callback) {
        validateEventName(eventName);
        validateCallback(callback);

        const wrapper = (payload) => {
            this.off(eventName, wrapper);
            callback(payload);
        };

        return this.on(eventName, wrapper);
    },

    /**
     * Remove an event listener.
     *
     * @param {string} eventName
     * @param {Function} callback
     */
    off(eventName, callback) {
        const eventListeners = listeners.get(eventName);

        if (!eventListeners) {
            return;
        }

        eventListeners.delete(callback);

        if (eventListeners.size === 0) {
            listeners.delete(eventName);
        }
    },

    /**
     * Emit an event.
     *
     * @param {string} eventName
     * @param {*} payload
     */
    emit(eventName, payload = undefined) {
        validateEventName(eventName);

        const eventListeners = listeners.get(eventName);

        if (!eventListeners) {
            return;
        }

        // Copy the Set so listeners can safely unsubscribe
        // while the event is being dispatched.
        [...eventListeners].forEach((callback) => {
            try {
                callback(payload);
            } catch (error) {
                console.error(
                    `[Events] Error while handling "${eventName}"`,
                    error,
                );
            }
        });
    },

    /**
     * Remove every listener for an event.
     *
     * @param {string} eventName
     */
    clear(eventName) {
        validateEventName(eventName);
        listeners.delete(eventName);
    },

    /**
     * Remove all registered listeners.
     */
    clearAll() {
        listeners.clear();
    },

    /**
     * Check whether an event has listeners.
     *
     * @param {string} eventName
     * @returns {boolean}
     */
    has(eventName) {
        return this.listenerCount(eventName) > 0;
    },

    /**
     * Get the number of listeners for an event.
     *
     * @param {string} eventName
     * @returns {number}
     */
    listenerCount(eventName) {
        return listeners.get(eventName)?.size ?? 0;
    },
};

export default events;
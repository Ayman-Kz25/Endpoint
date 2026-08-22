/**
 //src/scripts/core/events.js

 * Application Event Bus
 *
 * Provides a simple way for different parts of the application
 * to communicate without creating direct dependencies between them.
 *
 * Example:
 *
 * import events from "./events.js";
 *
 * events.on("request:changed", (data) => {
 *     console.log(data);
 * });
 *
 * events.emit("request:changed", {
 *     field: "url",
 *     value: "https://example.com",
 * });
 */

// ============================================================
// Event Store
// ============================================================

const listeners = new Map();

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
        if (typeof eventName !== "string" || !eventName.trim()) {
            throw new TypeError("Event name must be a non-empty string.");
        }

        if (typeof callback !== "function") {
            throw new TypeError("Event listener must be a function.");
        }

        if (!listeners.has(eventName)) {
            listeners.set(eventName, new Set());
        }

        listeners.get(eventName).add(callback);

        return () => {
            this.off(eventName, callback);
        };
    },

    /**
     * Register a listener that runs only once.
     *
     * @param {string} eventName
     * @param {Function} callback
     * @returns {Function} unsubscribe function
     */
    once(eventName, callback) {
        if (typeof eventName !== "string" || !eventName.trim()) {
            throw new TypeError("Event name must be a non-empty string.");
        }

        if (typeof callback !== "function") {
            throw new TypeError("Event listener must be a function.");
        }

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
        const eventListeners = listeners.get(eventName);

        if (!eventListeners) {
            return;
        }

        // Create a copy so listeners can safely remove themselves
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
     * Remove all listeners for an event.
     *
     * @param {string} eventName
     */
    clear(eventName) {
        if (!eventName) {
            return;
        }

        listeners.delete(eventName);
    },

    /**
     * Remove every registered listener.
     *
     * Useful when resetting the application or during testing.
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
        const eventListeners = listeners.get(eventName);

        return Boolean(eventListeners && eventListeners.size > 0);
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
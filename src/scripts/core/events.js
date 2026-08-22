//stc/scripts/core/events.js

const listeners = new Map();

const events = {

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

    emit(eventName, payload = undefined) {
        const eventListeners = listeners.get(eventName);

        if (!eventListeners) {
            return;
        }

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

    clear(eventName) {
        if (!eventName) {
            return;
        }

        listeners.delete(eventName);
    },

    clearAll() {
        listeners.clear();
    },

    has(eventName) {
        const eventListeners = listeners.get(eventName);

        return Boolean(eventListeners && eventListeners.size > 0);
    },

    listenerCount(eventName) {
        return listeners.get(eventName)?.size ?? 0;
    },
};

export default events;
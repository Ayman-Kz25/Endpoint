// src/scripts/core/events.js

const listeners = new Map();

const events = {
    on(eventName, callback) {
        if(!listeners.has(eventName)){
            listeners.set(eventName, new Set());
        }

        listeners.get(eventName).add(callback);

        return () => {
            this.off(eventName, callback);
        };
    },

    off(eventName, callback) {
        const eventListeners = listeners.get(eventName);

        if(!eventListeners){
            return;
        }

        eventListeners.delete(callback);

        if(eventListeners.size === 0){
            listeners.delete(eventName);
        }
    },

    emit(eventName, payload){
        const eventListeners = listeners.get(eventName);

        if(!eventListeners){
            return;
        }

        [...eventListeners].forEach((callback) => {
            callback(payload);
        });
    },
};

export default events;
class EventEmitter {
    constructor() {
        /** @type {Object<string,Function[]>} */
        this.events = {};
    }

    /**
     * @param {string} event
     * @param {Function} listener
     */
    on(event, listener) {
        if (typeof this.events[event] !== 'object') {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    /**
     * @param {string} event
     * @param {Function} listener
     */
    removeListener(event, listener) {
        if (typeof this.events[event] === 'object') {
            const idx = this.events[event].indexOf(listener);
            if (idx > -1) {
                this.events[event].splice(idx, 1);
            }
        }
    }

    /**
     * @param {string} event
     * @param args
     */
    emit(event, ...args) {
        if (typeof this.events[event] === 'object') {
            this.events[event].forEach(listener => listener.apply(this, args));
        }
    }

    /**
     * @param {string} event
     * @param {Function} listener
     */
    once(event, listener) {
        const self = this;
        const fn = (...args) => {
            self.removeListener(event, fn);
            listener.apply(this, args);
        };
        const remove = this.on(event, fn);
    }
}
M$ = async function () {

    /**
     * A simple event emitter implementation.<br>
     * Apply a ES6's new data structure Set.
     *
     * @class
     * @author ianva
     * @see https://gist.github.com/mudge/5830382#gistcomment-2691957
     */
    class EventEmitter {

        constructor() {
            this.events = {};
        }

        /**
         *
         * @param {string} ventName
         * @return {Set<function>}
         * @private
         */
        _getEventListByName(eventName) {
            if (typeof this.events[eventName] === 'undefined') {
                this.events[eventName] = new Set();
            }
            return this.events[eventName];
        }

        /**
         *
         * @param {string} eventName
         * @param {function} fn
         */
        on(eventName, fn) {
            this._getEventListByName(eventName).add(fn);
        }

        /**
         *
         * @param {string} eventName
         * @param {function} fn
         */
        once(eventName, fn) {

            const self = this;

            const onceFn = function (...args) {
                self.removeListener(eventName, onceFn);
                fn.apply(self, args);
            };
            this.on(eventName, onceFn);

        }

        /**
         *
         * @param {string} eventName
         * @param {*[]} args
         */
        emit(eventName, ...args) {

            this._getEventListByName(eventName).forEach(function (fn) {

                fn.apply(this, args);

            }.bind(this));

        }

        /**
         *
         * @param {string} eventName
         * @param {function} fn
         */
        removeListener(eventName, fn) {
            this._getEventListByName(eventName).delete(fn);
        }
    }

    return {EventEmitter};
};

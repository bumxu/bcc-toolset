/**
 */
class ArrayView {
    /**
     * @param {string[]} array
     */
    constructor(array) {
        /** @type string[] */
        this._array = array;
    }

    /**
     * @param {number} i
     * @return {string}
     */
    $(i) {
        return this.get(i);
    }

    /**
     * @param {number} i
     * @return {string}
     */
    get(i) {
        return this._array[i];
    }

    /**
     * @callback mapCallback
     * @param {string} value
     * @param {number} index
     * @param {string[]} array
     */

    /**
     * @param {mapCallback} callback
     * @param {*} [thisArg]
     */
    map(callback, thisArg) {
        return this._array.map(callback);
    }

    /**
     * @callback filterCallback
     * @param {string} value
     * @param {number} index
     * @param {string[]} array
     * @return {boolean}
     */

    /**
     * @param {filterCallback} callbackfn
     * @param {*} [thisArg]
     */
    filter(callbackfn, thisArg) {
        return this._array.filter(callbackfn);
    }

    /**
     * Devuelve una copia del array interno.
     *
     * @return {string[]}
     */
    array() {
        return [...this._array];
    }

    /**
     * @return {number}
     */
    get length() {
        return this._array.length;
    }
}
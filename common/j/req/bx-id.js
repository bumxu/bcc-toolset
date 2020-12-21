/*
 *  bx-id :: v.19.1
 *  Juande Martos
 *  bumxu.com © 2019
 */

M$= function () {
    // Cache de elementos de la UI
    const uiCache = new Map();

    const IDFn = function () {
        // El ID se forma con la combinación de los args.
        const id = [...arguments].join('');

        // Si el elemento está en la cache, devolverlo
        let node = uiCache.get(id);
        if (node != null) {
            return node;
        }

        // Si el elemento no está en cache, buscarlo en la UI
        node = document.querySelector(`#${ id }`);
        // El elemento DEBE existir
        if (node == null) {
            throw new Error(`Elemento de la interfaz no encontrado: #${ id }.`);
        }

        // Guardaar en cache y devolver
        uiCache.set(id, node);
        return node;
    };

    IDFn.pre = function (prefix) {
        IDFn[prefix] = prefix;
    };

    return {ID: IDFn};
};

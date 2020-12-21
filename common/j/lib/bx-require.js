/*
 *  bx-require :: v.19.2
 *  Juande Martos
 *  bumxu.com © 2018
 */

(function () {
    // Sección HEAD del documento
    const HEAD = document.querySelector('head');
    // Elementos precargados
    const cache = new Map();

    /**
     * Deja el entorno preparado para la cargar de otro móduo.
     */
    const resetEnv = function () {
        //window.module = {exports: {}};
        window.M$ = null;
    };

    const loadScript = function (path) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.onload = function () {
                resolve();
            };
            script.src = path;
            HEAD.appendChild(script);
        });
    };

    const loadString = function (path) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function (aEvt) {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        let mx = {exports: {}};

                        // language=JavaScript
                        eval(`
                            (function (module) {
                                ${ xhr.responseText }
                            })(mx);
                        `);

                        resolve(mx);
                    } else {
                        throw new Error('Error loading script. Status: ' + xhr.status);
                    }
                }
            };
            xhr.open('GET', path);
            xhr.send();
        });
    };

    /**
     * Implementación primitiva de un método require() para la carga dinámica de scripts como módulos.<br>
     * Devuelve un determinado elemento exportado por el módulo especificado.
     *
     * @param {string} path    - Ruta del archivo requerido.
     * @param {string} element - De los elementos exportados dentro del módulo, cuál va a devolverse.
     */
    const require = function (path, element) {
        return new Promise(async (resolve, reject) => {
            // Si ya se ha cargado anteriormente, devolver
            let cached = cache.get(path);
            if (cached == null) {
                // Si es la primera vez que se requiere el elemento,
                // cargar el script dinámicamente
                await loadScript(path);
                // Añadir a la cache
                cached = await window.M$();
                cache.set(path, cached);
                // Limpiar el entorno
                resetEnv();

                console.debug(`[bx-require] Modulo cargado dinámicamente: "${ path }" para obtener el elemento "${ element }".`);
            } else {
                console.debug(`[bx-require] Modulo obtenido de cache: "${ path }" para obtener el elemento "${ element }".`);
            }

            // Devolver el elemento correspondiente, o un nuevo objeto con todo (*)
            if (element === '*') {
                resolve(Object.assign({}, cached));
            } else {
                const $element = cached[element];
                if ($element == null) {
                    throw new Error(`No se ha podido obtener el elemento "${ element }" del módulo en "${ path }".`);
                }

                resolve($element);
            }
        });
    };

    // Inicialización del entorno para los módulos
    resetEnv();

    window.require = require;
})();

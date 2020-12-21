/**
 * Representación de cada una de las filas (líneas) que componen una tabla de decisión a partir de la entrada en
 * texto plano proporcionada por el usuario.
 */
class DTRow {
    /**
     * Crea un nuevo objeto para los datos de entrada especificados.
     *
     * @param {DecisionTable} table   - Tabla a la que va a pertenecer esta fila.
     * @param {string}        line    - Contenido en texto plano de la línea a la que va a representar.
     * @param {number}        numLine - Número de la línea dentro de la entrada.
     */
    constructor(table, line, numLine) {
        /** @type {DecisionTable} */
        this._table = table;

        /** @type {string} */
        this._line = line;
        /** @type {number} */
        this._numLine = numLine;
        /** @type {Atom[]} */
        this._atoms = [];

        /** @type {string[]} */
        this._cxPackedKey = [];
        /** @type {string[]} */
        this._cxPacked = [];

        this._parse(line);
    }

    /**
     * Lee y valida el contenido de la línea de texto de entrada.
     *
     * @param {string} line - Contenido en texto plano de la línea a la que representa está fila.
     * @private
     */
    _parse(line) {
        // Descomponer...
        let cols = line.indexOf('"') > -1 ? DTRow._splitRowAdvanced(line) : DTRow._splitRowSimple(line);

        // Quitar los operadores =
        cols.forEach((col, i, self) => {
            self[i] = col.replace(/^=/, '');
        });

        // Si tiene operadores IN hace falta atomizar
        if (cols.some(DTRow._hasOperatorIN)) {
            DTRow._atomize(cols).forEach((atom) => {
                this._atoms.push({
                    cols: atom,
                    meta: {}
                });
            });
        } else {
            this._atoms.push({
                cols: cols,
                meta: {}
            });
        }
    }

    /**
     * Genera una cadena de texto única para la fila.
     *
     * @param {string[]} atom - Átomo a empaquetar (todas sus columnas).
     * @return {string}
     * @private
     */
    _pack(atom) {
        let output = '//';

        // Obtenemos la cabecera con un orden consistente y nos quedamos con las columnas no ignoradas
        const header = this._table.getSortedHeader(true);
        // Añadimos cada elemento al paquete
        for (let h of header) {
            output += this._table.getColName(h) + '=>' + atom[h] + '//';
        }

        return output;
    }

    /**
     * Genera una cadena de texto única para la clave de esta fila.
     *
     * @param {string[]} atom - Átomo a empaquetar (todas sus columnas).
     * @return {string}
     * @private
     */
    _packKey(atom) {
        let output = '//';

        // Obtenemos la cabecera con un orden consistente y nos quedamos con las columnas clave no ignoradas
        const header = this._table.getSortedHeader(true).filter((v) => this._table.isKeyCol(v));
        // Añadimos cada elemento al paquete
        for (let h of header) {
            output += this._table.getColName(h) + '=>' + atom[h] + '//';
        }

        return output;
    }

    /**
     * @param {cbEachAtom} fn
     */
    forEachAtom(fn) {
        this._atoms.forEach((v, i) => fn(v, i));
    }

    /**
     * Invalida las caches de la fila.<br>
     * Usar si se ha cambiado la cabecera, las columnas clave o ignoradas.
     *
     * @internal
     */
    _invalidateCache() {
        this._cxPackedKey = [];
        this._cxPacked = [];
    }

    // /**
    //  * @param {number} atomIdx
    //  * @param {string|number} col
    //  */
    // getValue(atomIdx, col) {
    //     return this._atoms[this._table.g];
    // }

    /**
     * @param {number} atomIdx
     * @return {string}
     */
    getPacked(atomIdx) {
        if (this._cxPacked[atomIdx] == null) {
            this._cxPacked[atomIdx] = this._pack(this._atoms[atomIdx].cols);
        }
        return this._cxPacked[atomIdx];
    }

    /**
     * @param {number} atomIdx
     * @return {string}
     */
    getPackedKey(atomIdx) {
        if (this._cxPackedKey[atomIdx] == null) {
            this._cxPackedKey[atomIdx] = this._packKey(this._atoms[atomIdx].cols);
        }
        return this._cxPackedKey[atomIdx];
    }

    /**
     * @param {number} atomIdx
     * @return {ArrayView}
     */
    getAtom(atomIdx) {
        const atom = this._atoms[atomIdx];
        return atom !== undefined
            ? new ArrayView(atom.cols) // clone
            : null;
    }

    /* /**
      * @param {number}  atomIdx
      *
     getText(atomIdx) {
         if (atomIdx != null) {
             return this._atoms[atomIdx].cols.filter((v,i)=>!this.table.isIgnoredCol(i))
         }
     }

     /**
      * @param {number}  atomIdx
      *
     getBrText(atomIdx) {

     }*/

    getHash(atomIdx) {
        return md5(this.getPacked(atomIdx));
    }

    get table() {
        return this._table;
    }

    get line() {
        return this._line;
    }

    /**
     * Devuelve el número de línea (la cabecera es 0, la primera fila es 1, ...) en el que se localiza esta fila en el texto de entrada.
     *
     * @return {number}
     */
    get numLine() {
        return this._numLine;
    }

    get atomCount() {
        return this._atoms.length;
    }

    /**
     * @param {string[]} srow
     * @return string[][]
     * @static
     * @private
     */
    static _atomize(srow) {
        // Descomponemos cada columna
        /** @type {string[][]} */
        const row = srow.map((col) => {
            if (DTRow._hasOperatorIN(col)) {
                return col.slice(3, -1).split(/\s*,\s*/);
            } else {
                return [col];
            }
        });

        // Calcular el tamaño final de la estructura como el producto
        // de los componentes de cada columna
        const count = row.reduce((size, col) => size * col.length, 1);
        // Generar la estructura matricial
        /** @type {string[][]} */
        let atoms = new Array(count);
        atoms = atoms.fill(null).map(() => []);

        // Inicialmente el número de repeticiones es 1
        let repeat = 1;
        // Tratar cada una de las columnas, en orden inverso
        for (let c = row.length - 1; c >= 0; c--) {
            const col = row[c];

            // Recorrer la estructura, insertando el valor que corresponda
            for (let i = 0, member = 0; i < count;) {
                for (let r = 0; r < repeat; r++) {
                    atoms[i][c] = col[member];
                    i++;
                }
                member++;
                if (member >= col.length) member = 0;
            }

            // Ajustar el siguiente número de repeticiones
            repeat = repeat * col.length;
        }

        // Añadimos un pequeño hash para acelerar la búsqueda
        //for (const atom of atoms) {
        //    atom[Row.HASH_KEY] = Row.hash(atom);
        //}

        // Añadimos referencia a esta fila
        //this[REF_KEY] = this;

        // Cachear
        //this.atomsCache = atoms;

        // console.log(atoms);
        return atoms;
    }

    /**
     *
     * @param {string} str
     * @return {string[]}
     * @private
     */
    static _splitRowSimple(str) {
        return str.split('\t');
    }

    /**
     *
     * @param {string} str
     * @return {string[]}
     * @private
     */
    static _splitRowAdvanced(str) {
        let quoted = false;
        let col = '';
        let split = [];

        for (let char of str) {
            if (char === '\t') {
                if (quoted) {
                    col += char;
                } else {
                    split.push(col);
                    col = '';
                }
            } else {
                if (char === '"') {
                    quoted = !quoted;
                }
                col += char;
            }
        }
        split.push(col);

        return split;
    }

    /**
     * @param {string} col
     * @return {boolean}
     * @static
     * @private
     */
    static _hasOperatorIN(col) {
        return col.slice(0, 3) === 'IN(' && col.slice(-1) === ')';
    }
}

/**
 * @typedef {Object} Atom
 * @property {string[]} cols
 * @property {AtomMeta} meta
 */

/**
 * @typedef {Object} AtomMeta
 * @property {string} [fullHash]
 */

/**
 * @callback cbEachAtom
 * @param {Atom} atom
 * @param {number} index
 * @return {void}
 */

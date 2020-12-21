class AppNG {
    constructor() {
        /** @type {Map<string,FilterRule[]>} */
        this._filter = new Map();
    }

    checkup() {
        /** @type {string[]} */
        let log = [];

        const a = xui.dtInputA.getModel();
        const b = xui.dtInputB.getModel();

        if (a != null && b != null) {
            const kA = a.getSortedHeader().filter(idx => a.isKeyCol(idx)).map(idx => a.getColName(idx));
            const kB = b.getSortedHeader().filter(idx => b.isKeyCol(idx)).map(idx => b.getColName(idx));

            // Clave distinta
            if (kA.length !== kB.length) {
                log.push(`El número de columnas clave en A (${kA.length}) es distinto del de B (${kB.length}), el uso de índices va a ser ineficiente.`);
            } else if (kA.join('//') !== kB.join('//')) {
                log.push('Las columnas clave en A no son las mismas que en B, el uso de índices va a ser ineficiente.');
            }

            const hA = a.getSortedHeader(true).map(idx => a.getColName(idx));
            const hB = b.getSortedHeader(true).map(idx => b.getColName(idx));

            // Cabecera distinta
            if (hA.length !== hB.length) {
                log.push(`El número de columnas no ignoradas en A (${hA.length}) es distinto del de B (${hB.length}), se encontrarán diferencias en todas las filas.`);
            } else if (hA.join('//') !== hB.join('//')) {
                log.push('Las columnas no ignoradas en A no son las mismas que en B, la diferencia va ser completa.');
            }
        } else {
            log.push('Una de las entradas no es válida.');
        }

        return log;
    }

    rebuildFilter() {
        console.debug('Procesando reglas del filtro...');
        const lines = xui.cmFilter.getValue().split('\n');

        this._filter.clear();

        for (let i = 0; i < lines.length; i++) {
            try {
                const line = lines[i].replace(/\s+#.*/, '').replace(/^\s+/, '');

                if (!/^[\t ]*[^\s#]+[\t ]+[^\s#]+(([\t ]*)(#.*?))?[\t ]*$/.test(line)) {
                    console.debug(`· Fila ${i} no válida.`);
                    continue;
                }

                const part = line.split(/[\t ]+/);
                const negative = part[0][0] === '!';
                const field = negative ? part[0].substring(1) : part[0];
                const raw = part[1];
                const regex = new RegExp(raw);

                if (!this._filter.has(field))
                    this._filter.set(field, []);

                this._filter.get(field).push({
                    rx: regex,
                    ne: negative
                });

                console.debug(`· [${field}] ${negative ? '!' : '='}> ${regex}`);
            } catch (err) {
                console.debug(`· Error interpretando la fila ${i}: ${err.message}`);
                // TODO
                /*out01 = `<div class="report-unit">`;
                out01 += `<span class="msg err">La expresión regular del filtro en la línea ${ i } no es válida.</span>`;
                out01 += `</div>`;*/
                //$report01.innerHTML = out01;
                //$report02.innerHTML = out01;
            }
        }
    }

    /**
     * Realiza la comparación de las dos tablas de decisión.
     *
     * @return {DiffOutput}
     */
    getDiff() {
        /** @type {Object<number,{row: DTRow, atomIdx: number}[]>} */
        let onlyInA = {};
        /** @type {Object<number,{row: DTRow, atomIdx: number}[]>} */
        let onlyInB = {};
        /** @type {{rowA: DTRow, atomIdxA: number, rowB: DTRow, atomIdxB: number}[]} */
        let conflicts = [];

        console.debug('Comparando...');

        // Pasada 1
        xapp.dTableA.forEachRow((row, rowIdx) => {
            let rowAtomsOnlyIn = 0;

            row.forEachAtom((atom, atomIdx) => {
                if (!this.isFiltered(xapp.dTableA, atom.cols)) {
                    if (!xapp.dTableB.contains(row, atomIdx)) {
                        if (!xapp.dTableB.containsKey(row, atomIdx)) {
                            if (onlyInA[row.numLine] == null) {
                                onlyInA[row.numLine] = [];
                            }
                            onlyInA[row.numLine].push({ row, atomIdx });

                            console.debug(`· Un átomo de A:${row.numLine} no está en B.`);
                        } else {
                            const entry = xapp.dTableB.getByPackedKey(row.getPackedKey(atomIdx));
                            conflicts.push({
                                rowA: row, atomIdxA: atomIdx,
                                rowB: entry.row, atomIdxB: entry.atomIdx
                            });

                            console.debug(`· Hay diferencias entre A:${row.numLine} y B:${entry.row.numLine}.`);
                        }
                    }
                }
            });


        });
        // Pasada 2
        xapp.dTableB.forEachRow((row, rowIdx) => {
            row.forEachAtom((atom, atomIdx) => {
                if (!this.isFiltered(xapp.dTableB, atom.cols)) {
                    if (!xapp.dTableA.contains(row, atomIdx)) {
                        if (!xapp.dTableA.containsKey(row, atomIdx)) {
                            if (onlyInB[row.numLine] == null) {
                                onlyInB[row.numLine] = [];
                            }
                            onlyInB[row.numLine].push({ row, atomIdx });

                            console.debug(`· Un átomo de B:${row.numLine} no está en A.`);
                        }
                    }
                }
            });
        });

        return { onlyInA, onlyInB, conflicts };
    }

    /**
     * Devuelve TRUE si el átomo debe ignorarse.
     *
     * @param {DecisionTable} dt
     * @param {string[]} atom
     * @return {boolean}
     */
    isFiltered(dt, atom) {
        //const colNames = dt.get Object.keys(atom);

        // if (!isFilterActive()) {
        //    return false;
        //}

        for (let c = 0; c < dt.getColCount(true); c++) {
            const colName = dt.getColName(c);
            const filterEntries = this._filter.get(colName);

            // Si no se filtra por está columna, continuar con la siguiente
            if (filterEntries === undefined)
                continue;

            // Comprobar cada entrada
            for (let entry of filterEntries) {
                const rxMatch = entry.rx.test(atom[c]);
                if ((!entry.ne && !rxMatch) || (entry.ne && rxMatch)) {
                    return true;
                }
            }
        }

        return false;
    };
}

/**
 * @type {AppNG}
 * @global
 */
const xng = new AppNG();

/**
 * @typedef {Object} FilterRule
 * @property {RegExp}  rx - Expresión regular de la regla.
 * @property {boolean} ne - Indica si la regla es negativa.
 */
/**
 * @typedef {Object} DiffOutput
 * @property {DiffMissingEntry} onlyInA
 * @property {DiffMissingEntry} onlyInB
 * @property {DiffConflictEntry[]} conflicts
 */
/**
 * @typedef {Object<number,{row: DTRow, atomIdx: number}[]>} DiffMissingEntry
 */
/**
 * @typedef {{rowA: DTRow, atomIdxA: number, rowB: DTRow, atomIdxB: number}} DiffConflictEntry
 */

class DecisionTable {
    /**
     * @param {string} rawData
     * @private
     */
    constructor(rawData = '') {
        /** @type {?Kt} */
        this._knownTable = null;

        /** @type {string[]} */
        this._header = [];
        /** @type {Set<number>} */
        this._keyColumns = new Set();
        /** @type {Set<number>} */
        this._ignoredColumns = new Set();

        /** @type {?boolean} */
        this._isRule = null;
        /** @type {boolean} */
        this._bodyParsed = false;

        /** @type {string[]} */
        this._body = null;
        /** @type {DTRow[]} */
        this._rows = [];
        /** @type {Set<string>} */
        this._rowIndex = new Set();
        /** @type {Map<string,{row: DTRow, atomIdx: number}>} */
        this._keyIndex = new Map();
        /** @type {Map<number,DTRow>} */
        this._lineIndex = new Map();

        /** @type {Map<string,{row: DTRow, atomIdx: number}[]>} */
        this._duplicatedKeys = new Map();

        ////

        // Guardar las líneas para procesar a posteriori
        this._body = rawData.split('\n');

        // Procesar la cabecera
        this._parseHeader(this._body[0]);
    }

    /**
     * @param {string} line
     * @private
     */
    _parseHeader(line) {
        // Si la cabecera empieza por <, descartamos directamente para mejorar el rendimiento
        if (line[0] === '<') {
            throw new Error('La primera línea no es una cabecera válida, comienza por <.');
        }

        // Permitimos nombres en minúscula, pero lo evaluamos todo en mayúscula
        line = line.toUpperCase();

        // Intentamos detectar si la línea no es realmente la cabecera
        if (!/^([A-Z0-9]*\w*[A-Z0-9])(\t[A-Z0-9]*\w*[A-Z0-9])*$/.test(line) || /\b(TRUE|FALSE|\d)\b/.test(line)) {
            throw new Error('La primera línea no es una cabecera válida, debe estar compuesta por los nombres de las columnas separados por tabulaciones.');
        }

        // Separamos las columnas
        this._header = line.split(/\t/);
        // Intentamos reconocer la tabla
        this._knownTable = KnownTables.recognize(this._header);

        if (this._knownTable != null) {
            // Marcar las columnas clave de la tabla conocida
            for (let k of this._knownTable.key) {
                this._keyColumns.add(this._header.indexOf(this._knownTable.col[k]));
            }
            // } else {
            //     // Marcar todas las columnas como clave
            //     this._header.forEach((name, idx) => this._keyColumns.add(idx));
        }
    }

    parseRows() {
        // Si ya está hecho, abortar
        if (this._bodyParsed)
            return;

        // Procesar cada una de las líneas, omitiendo la cabecera
        for (let l = 1; l < this._body.length; l++) {
            this._parseRow(this._body[l], l);
        }

        // Si en el recorrido de las filas no se ha detectado
        // que es una regla, marcar como tabla
        if (this._isRule == null) {
            this._isRule = false;
        }

        // Marcar como hecho
        this._bodyParsed = true;

        // Ahora sí, construir los índices
        this._rebuildIndexes();
    }

    /**
     * @param {string} line
     * @param {number} nth
     * @private
     */
    _parseRow(line, nth) {
        if (this._isRule == null && DecisionTable.RX_ISRULE.test(line)) {
            this._isRule = true;
        }

        const row = new DTRow(this, line, nth);
        this._rows.push(row);
    };

    /**
     * @private
     */
    _requireBody() {
        if (!this._bodyParsed) {
            throw new Error('El contenido de la tabla aún no ha sido procesado.');
        }
    }

    _rebuildIndexes() {
        this._rowIndex.clear();
        this._keyIndex.clear();
        this._lineIndex.clear();
        this._duplicatedKeys.clear();

        for (let row of this._rows) {
            for (let i = 0; i < row.atomCount; i++) {
                const pkt = row.getPacked(i);
                const kpkt = row.getPackedKey(i);

                // TODO Duplicados...
                this._rowIndex.add(row.getPacked(i));

                // TOD- Duplicated keys...
                const k = row.getPackedKey(i);
                if (this._keyIndex.has(k)) {
                    if (!this._duplicatedKeys.has(k)) {
                        const r0 = this._keyIndex.get(k);
                        this._duplicatedKeys.set(k, [r0]);
                    }
                    this._duplicatedKeys.get(k).push({ row, atomIdx: i });
                } else {
                    this._keyIndex.set(row.getPackedKey(i), { row, atomIdx: i });
                }

                this._lineIndex.set(row.numLine, row);
            }
        }
    }

    /**
     * @param {boolean} excludeIgnored
     * @return {string[]}
     */
    getHeader(excludeIgnored = false) {
        let header = this._header;

        if (excludeIgnored)
            header = header.filter((v, i) => !this.isIgnoredCol(i));

        return header;
    }

    /**
     * Devuelve una lista con los índices de las columnas de la tabla en un orden siempre idéntico.
     *
     * @param {boolean} excludeIgnored - Si se informa a TRUE se excluyen las columnas ignoradas.
     * @return {number[]}
     */
    getSortedHeader(excludeIgnored = false) {
        // TODO: Cache
        // (Clonamos el array, ya que .sort() lo modifica!)
        let header = [...this._header];

        if (excludeIgnored)
            header = header.filter((v, i) => !this.isIgnoredCol(i));

        return header.sort().map(v => this.getColIndex(v));
    }

    /**
     * @param {cbEachRow} fn
     */
    forEachRow(fn) {
        this._requireBody();
        this._rows.forEach((v, i) => fn(v, i));
    }

    /**
     * @param {number} ln - Número de línea, del 1 en adelante...
     * @return {DTRow}
     */
    getRow(ln) {
        this._requireBody();
        // TODO: Asegurar los indices
        return this._lineIndex.get(ln);
    }

    /**
     * @param {string} name
     * @return {number}
     */
    getColIndex(name) {
        const index = this._header.indexOf(name);
        return index !== -1 ? index : null;
    }

    /**
     * @param {number} index
     * @return {string}
     */
    getColName(index) {
        const name = this._header[index];
        return name != null ? name : null;
    }

    /**
     * @param {boolean} excludeIgnored
     * @return {number}
     */
    getColCount(excludeIgnored = false) {
        return excludeIgnored
            ? this._header.length - this._ignoredColumns.size
            : this._header.length;
    }

    /**
     * @param {number[]} keyColumns
     * @internal
     */
    _setKeyCols(keyColumns) {
        this._keyColumns.clear();

        if (keyColumns != null) {
            keyColumns.forEach(idx => this._keyColumns.add(idx));
        }

        this._invalidateCaches();
        this._rebuildIndexes();
    }

    /**
     * @return {number[]}
     */
    getKeyCols() {
        return [...this._keyColumns];
    }

    /**
     * @param {string|number} col
     */
    isKeyCol(col) {
        // Si es una cadena, obtenemos el índice de la columna
        if (typeof col === 'string') {
            col = this._header.indexOf(col);
        }
        return this._keyColumns.has(col);
    }

    /**
     * @param {boolean} excludeIgnored
     * @return {number}
     */
    getKeyColCount(excludeIgnored = false) {
        return excludeIgnored
            ? [...this._keyColumns].filter(v => !this._ignoredColumns.has(v)).length
            : this._keyColumns.length;
    }

    /**
     * Determina si esta tabla contiene el átomo especificado.
     *
     * @param {DTRow} row
     * @param {number} atomIdx
     */
    contains(row, atomIdx) {
        this._requireBody();

        // Si el número de columnas no ignoradas es distinto, es seguro que no tenemos el átomo
        if (row.table.getColCount(true) !== this.getColCount(true)) {
            return false;
        }

        // Buscar en el índice
        return this._rowIndex.has(row.getPacked(atomIdx));
    }

    /**
     * @param {DTRow} row
     * @param {number} atomIdx
     */
    containsKey(row, atomIdx) {
        this._requireBody();

        // Si no hay columnas clave, siempre se devuelve false
        if (this._keyColumns.size === 0 || row.table._keyColumns.size === 0) {
            return false;
        }

        // Si el número de columnas no ignoradas es distinto, es seguro que no tenemos el átomo
        if (row.table.getKeyColCount(true) !== this.getKeyColCount(true)) {
            return false;
        }

        // Buscar en el índice
        return this._keyIndex.has(row.getPackedKey(atomIdx));
    }

    /**
     * @param {string} packedKey
     * @return {{row: DTRow, atomIdx: number}} | null
     */
    getByPackedKey(packedKey) {
        this._requireBody();

        const entry = this._keyIndex.get(packedKey);
        return entry !== undefined ? Object.assign({}, entry) : null;
    }

    /**
     * @param {number[]} ignoredColumns
     * @internal
     */
    _setIgnoredCols(ignoredColumns) {
        this._ignoredColumns.clear();

        if (ignoredColumns != null) {
            ignoredColumns.forEach(idx => this._ignoredColumns.add(idx));
        }

        this._invalidateCaches();
        this._rebuildIndexes();
    }

    /**
     * @return {number[]}
     */
    getIgnoredCols() {
        return [...this._ignoredColumns];
    }

    /**
     * @param {string|number} col
     */
    isIgnoredCol(col) {
        // Si es una cadena, obtenemos el índice de la columna
        if (typeof col === 'string') {
            col = this._header.indexOf(col);
        }
        return this._ignoredColumns.has(col);
    }

    _invalidateCaches() {
        this._rows.forEach(row => row._invalidateCache());
    }

    /**
     * @return {{row: DTRow, atomIdx: number}[][]}
     */
    getDuplInfo() {
        return [...this._duplicatedKeys.values()];
    }

    get knownTable() {
        return this._knownTable != null ? this._knownTable.name : null;
    }

    get bodyParsed() {
        return this._bodyParsed;
    }
}

DecisionTable.RX_ISRULE = /(\t|^)(IN\([^t]+\)|=[^t]+)(\t|$)/;

/**
 * @callback cbEachRow
 * @param {DTRow} row
 * @param {number} index
 * @return {void}
 */

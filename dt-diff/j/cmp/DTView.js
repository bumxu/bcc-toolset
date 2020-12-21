class DTView extends EventEmitter {
    constructor($blk) {
        super();

        this._uiCache = new Map();

        this._$blk = $blk;
        /** @type {DecisionTable} */
        this._model = null;

        this._setup$Codemirror();
        this._setup$Choices();
        this._setupEvents();
    }

    /**
     *
     * @private
     */
    _setup$Codemirror() {
        /** @type {CodeMirror} */
        this.cm = CodeMirror.fromTextArea(this.$txRawData, {
            mode: 'rainbow',
            indentWithTabs: true,
            lineNumbers: true,
            firstLineNumber: 0,
            styleActiveLine: { nonEmpty: true },
            highlightSelectionMatches: { showToken: /\w/, annotateScrollbar: true, minChars: 4 }
        });
        // Solucionar problemas de renderizado
        setTimeout(() => this.cm.refresh(), 800);
    }

    /**
     *
     * @private
     */
    _setup$Choices() {
        /** @type {Choices} */
        this._cxKeyCols = new Choices(this.$selKeyCols, CHOICES_OPTIONS);
        /** @type {Choices} */
        this._cxIgnoredCols = new Choices(this.$selIgnoredCols, CHOICES_OPTIONS);
    }

    /**
     *
     * @private
     */
    _setupEvents() {
        // Codemirror
        this.cm.on('cursorActivity', this._updateSelectedColumnDial.bind(this));
        this.cm.on('focus', this._updateSelectedColumnDial.bind(this));
        this.cm.on('blur', this._hideSelectedColumnDial.bind(this));
        this.cm.on('change', this._onChangeInput.bind(this));

        // Botones
        this.$btnClear.addEventListener('click', () => this.clearAndFocus());
        this.$btnTxtDupl.addEventListener('click', () => this.removeDuplicatedLines());
        this.$btnLibexport.addEventListener('click', () => this.parseXml());
        this.$btnFind.addEventListener('click', () => this._toggleSearchInput());

        // Choices
        this.$selKeyCols.addEventListener('change', this._onChangeKeyColumns.bind(this));
        this.$selIgnoredCols.addEventListener('change', this._onChangeIgnoredColumns.bind(this));

        // Búsqueda
        this.$inpInputSearch.addEventListener('keydown', this._onSearchKeydown.bind(this));
        this.$inpInputSearch.addEventListener('input', this._onSearchInput.bind(this));

        // Alias
        this.$inpAlias.addEventListener('input', this._onAliasInput.bind(this));
    }

    /**
     *
     * @private
     */
    _updateSelectedColumnDial() {
        // La tabla tiene que ser válida
        if (this._model == null) {
            this._hideSelectedColumnDial();
            return;
        }

        const selections = this.cm.listSelections();

        // No debe ser XML
        //if (ng.treatAsXML(cm.getValue())) return;
        // No debe haber cursor multiple
        if (selections.length > 1) {
            this._hideSelectedColumnDial();
            return;
        }

        const selection = selections[0];

        // No debe haber nada seleccionado
        if (selection.head.line !== selection.anchor.line || selection.head.ch !== selection.anchor.ch) {
            this._hideSelectedColumnDial();
            return;
        }

        const ln = selection.head.line;
        const ch = selection.head.ch;

        const til = this.cm.getLine(ln).substring(0, ch);
        const tabs = (til.match(/\t/g) || []).length;
        const colName = this._model.getColName(tabs);

        this.$spColumnDial.innerHTML = colName != null ? colName : '?';
        this.$spColumnDial.classList.remove('hidden');
    }

    /**
     *
     * @private
     */
    _hideSelectedColumnDial() {
        this.$spColumnDial.classList.add('hidden');
    }

    /**
     *
     * @private
     */
    _onChangeInput() {
        let prevHeader;
        /** @type {string[]} */
        let prevKeyColsNames, prevIgnoredColsNames;

        // Si actualmente hay modelo...
        if (this._model != null) {
            // Guardamos la cabecera y las columnas marcadas actualmente
            prevHeader = this._model.getSortedHeader().map(idx => this._model.getColName(idx)).join('|');
            prevKeyColsNames = this._model.getKeyCols().map(idx => this._model.getColName(idx));
            prevIgnoredColsNames = this._model.getIgnoredCols().map(idx => this._model.getColName(idx));

            // Limpiamos el modelo
            this._model = null;
        }

        // Vamosa a regenerar el modelo
        let value = this.getValue();
        //
        // Si no hay contenido, abortamos
        if (/^\s*$/.test(value)) {
            return;
        }
        //
        // Si hay una única línea vacía al final la descartamos
        value = value.replace(/(?<=\S)\n$/, '');
        //
        try {
            this._model = new DecisionTable(value);
        } catch (err) {
            console.error(err);
        }

        // Mostramos la tabla reconocida, si la hay
        this.$spKnownTable.innerText = this._model != null && this._model.knownTable != null
            ? this._model.knownTable
            : 'NO';

        // Si la cabecera no ha cambiado, o es un superset de la anterior,
        // restaurar las columnas marcadas por el usuario
        if (this._model != null) {
            let newHeader = this._model.getSortedHeader().map(idx => this._model.getColName(idx)).join('|');
            if (prevHeader != null && newHeader === prevHeader) {
                this._model._setKeyCols(prevKeyColsNames.map(col => this._model.getColIndex(col)));
                this._model._setIgnoredCols(prevIgnoredColsNames.map(col => this._model.getColIndex(col)));
                console.debug('Ha cambiado el cuerpo.');
            } else {
                console.debug('Ha cambiado la cabecera.\n', prevHeader, '\n', newHeader);
            }
        }

        // Actualizar selectores
        this._updateKeyColsSelect();
        this._updateIgnoredColsSelect();

        // Actualizar el chequeo
        xapp.checkup();

        // Notificar
        this.emit('change');
    }

    /**
     *
     * @private
     */
    _updateKeyColsSelect() {
        this._cxKeyCols.clearStore();

        if (this._model != null) {
            this._cxKeyCols.setChoices(this._model.getHeader().map((name, idx) => {
                return {
                    value: idx,
                    label: name,
                    selected: this._model.isKeyCol(idx)
                };
            }), 'value', 'label');
        }

        // Actualizar el chequeo
        xapp.checkup();
    }

    /**
     *
     * @private
     */
    _updateIgnoredColsSelect() {
        this._cxIgnoredCols.clearStore();

        if (this._model != null) {
            this._cxIgnoredCols.setChoices(this._model.getHeader().map((name, idx) => {
                return {
                    value: idx,
                    label: name,
                    selected: this._model.isIgnoredCol(idx)
                };
            }), 'value', 'label');
        }

        // Actualizar el chequeo
        xapp.checkup();
    }

    /**
     *
     * @private
     */
    _onChangeKeyColumns() {
        /** @type {number[]} */
        const newKeyCols = this._cxKeyCols.getValue(true).map(idx => Number(idx));

        // Quitar las nuevas columnas clave de la lista de ignoradas, si están
        const newIgnoredCols = this._model.getIgnoredCols().filter(idx => !newKeyCols.includes(idx));

        // Aplicar los cambios al modelo
        this._model._setKeyCols(newKeyCols);
        this._model._setIgnoredCols(newIgnoredCols);

        // Actualizar la vista
        this._updateKeyColsSelect();
        this._updateIgnoredColsSelect();

        // Notificar
        this.emit('change');
    }

    /**
     *
     * @private
     */
    _onChangeIgnoredColumns() {
        /** @type {number[]} */
        const newIgnoredCols = this._cxIgnoredCols.getValue(true).map(idx => Number(idx));

        // Quitar las nuevas columnas ignoradas de la lista de claves, si están
        const newKeyCols = this._model.getKeyCols().filter(idx => !newIgnoredCols.includes(idx));

        // Aplicar los cambios al modelo
        this._model._setIgnoredCols(newIgnoredCols);
        this._model._setKeyCols(newKeyCols);

        // Actualizar la vista
        this._updateKeyColsSelect();
        this._updateIgnoredColsSelect();

        // Notificar
        this.emit('change');
    }

    /**
     * @param {KeyboardEvent} ev
     * @private
     */
    _onSearchKeydown(ev) {
        switch (ev.key) {
            case  'Enter':
                if (ev.shiftKey) {
                    this.searchBackward();
                } else {
                    this.searchForward();
                }
                break;
        }
    }

    /**
     * @private
     */
    _onSearchInput() {
        if (DTView.RX_ISRX.test(this.$inpInputSearch.value)) {
            this.$inpInputSearch.classList.add('rx');
        } else {
            this.$inpInputSearch.classList.remove('rx');
        }
    }

    _onAliasInput() {
        // Notificar
        this.emit(DTView.EV_CHANGE_VIEW);
    }

    isXmlLike() {
        return /^\s*(<\?xml[^>]*>\s*<root|<root)/.test(
            this.getValue().substr(0, 200).replace(/\n/g, ''));
    }

    parseXml() {
        try {
            this.setValue(xlibexport.parseText(this.getValue()).textRule);
            return true;
        } catch (err) {
            xui.displayMessage(`${ this.$inpTitle.innerText } => ${ err.message }`);
            console.error(err);
            return false;
        }
    }

    _toggleSearchInput() {
        if (this.$blkInputSearch.classList.contains('hidden')) {
            this.$blkInputSearch.classList.remove('hidden');
        } else {
            this.$blkInputSearch.classList.add('hidden');
        }
    }

    searchForward(ev) {
        const str = this.$inpInputSearch.value;

        // Buscar punto de partida
        const from = this.cm.getCursor('to');

        // Buscar la cadena
        let l, line, ch;

        //- Línea actual
        line = this.cm.getLine(from.line);
        ch = this._searchInLine(line.substring(from.ch), str);
        if (ch != null) {
            this._searchDone(from.line, from.ch + ch, str.length);
            return;
        }

        //- A continuación (circular)
        for (let i = 0; i < this.cm.lineCount(); i++) {
            l = (from.line + 1 + i) % this.cm.lineCount();

            line = this.cm.getLine(l);
            ch = this._searchInLine(line, str);
            if (ch != null) {
                this._searchDone(l, ch, str.length);
                return;
            }
        }

        console.log('No se encuentra :(');
    }

    searchBackward(ev) {
        const str = this.$inpInputSearch.value;

        // Buscar punto de partida
        const from = this.cm.getCursor('from');

        // Buscar la cadena
        let l, line, ch;

        //- Línea actual
        line = this.cm.getLine(from.line);
        ch = this._searchInLine(line.substring(0, from.ch), str);
        if (ch != null) {
            this._searchDone(from.line, from.ch + ch, str.length);
            return;
        }

        //- A continuación (circular)
        for (let i = 0; i < this.cm.lineCount(); i++) {
            l = DTView.mod(from.line - 1 - i, this.cm.lineCount());

            line = this.cm.getLine(l);
            ch = this._searchInLine(line, str);
            if (ch != null) {
                this._searchDone(l, ch, str.length);
                return;
            }
        }

        console.log('No se encuentra :(');
    }

    static mod(m, n) {
        return ((m % n) + n) % n;
    };

    _searchInLine(line, str) {
        const s = line.indexOf(str);
        return s > -1 ? s : null;
    }

    _searchDone(line, ch, len) {
        this.cm.setSelection(
            { line, ch },
            { line, ch: ch + len }
        );
    }

    /**
     * @return {string}
     */
    getValue() {
        return this.cm.getValue();
    }

    setValue(value) {
        this.cm.setValue(value);
        this._onChangeInput();
    }

    /** @return {DecisionTable} */
    getModel() {
        return this._model;
    }

    getSession() {
        return JSON.stringify({
            alias: this.$inpAlias.value,
            input: this.getValue(),
            keyCols: this._cxKeyCols.getValue(true).map(idx => Number(idx)),
            ignoredCols: this._cxIgnoredCols.getValue(true).map(idx => Number(idx))
        });
    }

    restoreSession(serialized) {
        const data = JSON.parse(serialized);

        this.$inpAlias.value = data.alias || '';

        this.setValue(data.input || '');

        if (this._model != null) {
            this._model._setKeyCols(data.keyCols);
            this._model._setIgnoredCols(data.ignoredCols);

            this._updateKeyColsSelect();
            this._updateIgnoredColsSelect();
        }
    }

    focus() {
        this.cm.focus();
    }

    clearAndFocus() {
        this.setValue('');
        this.focus();
    }

    removeDuplicatedLines() {
        const uq = new Set();
        const out = [];

        this.getValue().split('\n').forEach((line) => {
            if (!uq.has(line)) {
                uq.add(line);
                out.push(line);
            }
        });
        this.setValue(out.join('\n'));
    }

    /**
     * @param {number} ln
     */
    goTo(ln) {
        this.cm.setCursor(ln, 0);
        this.focus();
    }

    /**
     * @param {number} ln      - Número de línea de la fila afectada.
     */
    deleteLine(ln) {
        const row = this._model.getRow(ln);
        this.cm.replaceRange('', { line: row.numLine - 1 }, { line: row.numLine });

        this._onChangeInput();
    }

    /**
     * @return {HTMLElement}
     */
    $(selector) {
        // Si el elemento está en la cache, devolverlo
        let node = this._uiCache.get(selector);
        if (node != null) {
            return node;
        }

        // Si el elemento no está en cache, buscarlo en el componente
        node = this._$blk.querySelector(selector);
        // El elemento DEBE existir
        if (node == null) {
            throw new Error(`Elemento de la interfaz no encontrado: #${ this._$blk }${ selector }.`);
        }

        // Guardaar en cache y devolver
        this._uiCache.set(selector, node);
        return node;
    };

    get $btnClear() {
        return this.$('.btn-x-clear');
    }

    get $btnTxtDupl() {
        return this.$('.btn-x-txtdupl');
    }

    get $btnLibexport() {
        return this.$('.btn-x-libexport');
    }

    get $inpTitle() {
        return this.$('.blk-title');
    }

    /** @return {HTMLInputElement} */
    get $inpAlias() {
        return this.$('.inp-x-alias');
    }

    get $btnFind() {
        return this.$('.btn-x-find');
    }

    get $txRawData() {
        return this.$('.txRawData');
    }

    get $spKnownTable() {
        return this.$('.sp-x-knownTable');
    }

    get $spColumnDial() {
        return this.$('.sp-x-coldial');
    }

    get $selKeyCols() {
        return this.$('.sel-x-keyCols');
    }

    get $selIgnoredCols() {
        return this.$('.sel-x-ignoredCols');
    }

    get $blkInputSearch() {
        return this.$('.blk-x-inputSearch');
    }

    /** @return {HTMLInputElement} */
    get $inpInputSearch() {
        return this.$('.inp-x-inputSearch');
    }
}

DTView.RX_ISRX = /^\/.*\/$/;
DTView.EV_CHANGE_VIEW = 'ev.change.view';
DTView.EV_CHANGE_MODEL = 'ev.change.model';

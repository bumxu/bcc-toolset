const CHOICES_OPTIONS = {
    duplicateItemsAllowed: false,
    shouldSort: false,
    removeItemButton: true,
    noResultsText: 'Ningún elemento encontrado',
    noChoicesText: 'Ningún elemento para elegir',
    itemSelectText: 'Click para añadir'
};

class AppUi {
    constructor() {
        this.uiCache = new Map();

        this.dtInputA = new DTView(this.$id('blkInputA'));
        this.dtInputB = new DTView(this.$id('blkInputB'));

        /** @type {CodeMirror} */
        this.cmFilter = CodeMirror.fromTextArea(this.$txFilter, {
            mode: 'filtermode',
            tabSize: 6,
            indentUnit: 6,
            indentWithTabs: true,
            lineNumbers: false,
            styleActiveLine: true
            //highlightSelectionMatches: false
        });

        // Indica si se está restaurando un estado, para evitar llamar a saveSession
        this.restoringSession = false;
    }

    initialize() {
        // Restaurar desde hash, si lo hay
        this._restoreFromHash();

        // Restaurar la sesión previa
        this._restoreSession();

        xui.$btnCompare.addEventListener('click', () => {
            xapp.compare();
        });

        xui.$btnCopy.addEventListener('click', () => {
            xui.copySelectionAsText();
        });

        xui.$btnPermalink.addEventListener('click', () => {
            xui.copyPermalink();
        });

        // Report tabs
        this.$id('tabBtn10').addEventListener('click', this._onShowTabBtn.bind(this));
        this.$id('tabBtn01').addEventListener('click', this._onShowTabBtn.bind(this));
        this.$id('tabBtn02').addEventListener('click', this._onShowTabBtn.bind(this));
        this.$id('tabBtn03').addEventListener('click', this._onShowTabBtn.bind(this));
        this.$id('tabBtn04').addEventListener('click', this._onShowTabBtn.bind(this));
        this.$id('tabBtn05').addEventListener('click', this._onShowTabBtn.bind(this));

        // Eventos de teclado
        document.addEventListener('keydown', (ev) => {
            if (ev.key === 'F8') {
                xapp.compare();
                ev.preventDefault();
            }
            /*if (ev.key === 'F9') {
                doFindDuplicates();
                ev.preventDefault();
            }*/
        });

        // Session
        this.dtInputA.on('change', this._saveSession.bind(this));
        this.dtInputA.on(DTView.EV_CHANGE_VIEW, this._saveSession.bind(this));
        this.dtInputB.on('change', this._saveSession.bind(this));
        this.dtInputB.on(DTView.EV_CHANGE_VIEW, this._saveSession.bind(this));
        this.cmFilter.on('change', this._saveSession.bind(this));
        // ·
        window.addEventListener('hashchange', (ev) => {
            this._restoreFromHash();
            this._restoreSession();
        }, false);
    }

    /**
     * @param {string} message
     */
    displayMessage(message) {
        alert(message);
    }

    _onShowTabBtn(ev) {
        this.showTab(ev.target.dataset.show);
    };

    /**
     * @param {string} tab
     */
    showTab(tab) {
        [...document.querySelectorAll('.tab-bar .tab')].map(a => a.classList.remove('sel'));
        document.querySelector('.tab-bar .tab.' + tab).classList.add('sel');

        [...document.querySelectorAll('.tab-panel')].map(a => a.classList.add('hidden'));
        document.querySelector('.tab-panel.' + tab).classList.remove('hidden');
    }

    /**
     * Establece el valor a mostrar en el contador de la pestaña del informe especificado.
     *
     * @param {number} id - Id del informe a modificar.
     * @param {string|number} value - Nuevo valor a mostrar.
     */
    setBadge(id, value) {
        // Si es cero, mostrar en otro color
        if (String(value)[0] === '0') {
            this.$id('tabBadge' + id).classList.add('zero');
        } else {
            this.$id('tabBadge' + id).classList.remove('zero');
        }

        this.$id('tabBadge' + id).innerHTML = value;
    }

    setBusy(busy = true) {
        this.$btnCompare.disabled = busy;

        if (busy) {
            //this.$btnDuplicates.disabled = true;
            this.$id('tabStatus').classList.remove('hidden');
        } else {
            this.$id('tabStatus').classList.add('hidden');
        }
    }

    setDirty(dirty = true) {
        if (dirty) {
            this.$id('warnBar').classList.remove('hidden');
        } else {
            this.$id('warnBar').classList.add('hidden');
        }
    }

    copySelectionAsText() {
        const text = window.getSelection().toString()
            .replace(/^.*[AB]:\d.*\n/gm, '');

        navigator.clipboard.writeText(text);
        // const el = document.createElement('textarea');
        // el.value = text;
        // document.body.appendChild(el);
        // el.select();
        // document.execCommand('copy');
        // document.body.removeChild(el);
    }

    copyPermalink() {
        navigator.clipboard.writeText(this._getHashPermalink());
    }

    /**
     * @param {'A'|'B'} table
     * @param {number}  ln
     */
    $cmdGoTo(table, ln) {
        if (table === 'A') {
            this.dtInputA.goTo(ln);
        } else {
            this.dtInputB.goTo(ln);
        }
    }

    /**
     * @param {'A'|'B'} table
     * @param {number} ln
     */
    $cmdDeleteLine(table, ln) {
        const dt = table === 'A' ? this.dtInputA : this.dtInputB;
        dt.deleteLine(ln);
        // TODO -> Replace line
        xapp.compare();
    }

    /**
     *
     * @param {HTMLButtonElement} $btn
     */
    $cmdDiffToggleAB($btn) {
        const $lineA = $btn.parentElement.parentElement.querySelector('.rp-entry-cten.ctenA');
        const $lineB = $btn.parentElement.parentElement.querySelector('.rp-entry-cten.ctenB');

        if ($lineA.classList.contains('hidden')) {
            $lineA.classList.remove('hidden');
            $lineB.classList.add('hidden');
            $btn.innerText = 'A';
        } else {
            $lineB.classList.remove('hidden');
            $lineA.classList.add('hidden');
            $btn.innerText = 'B';
        }
    }

    ///  Sesión  ///

    _getHashPermalink() {
        const storage = {};
        // Áreas de entrada y alias
        storage.dtd_inputA = this.dtInputA.getSession();
        storage.dtd_inputB = this.dtInputB.getSession();
        // Filtro
        storage.inputFilter = this.cmFilter.getValue();

        // Pestaña del informe
        //storage.activeTab = document.querySelector('.tab-bar > div.sel').dataset.show;

        console.log(btoa(String.fromCharCode(...BSON.serialize(storage))));
        const hash = btoa(JSON.stringify(storage));

        return location.href.replace(/#.*$/, '') + '#for:' + hash;
    }

    /**
     * Guarda los datos de la sesión actual.
     */
    _saveSession() {
        if (!this.restoringSession) {
            // Áreas de entrada y alias
            localStorage.dtd_inputA = this.dtInputA.getSession();
            localStorage.dtd_inputB = this.dtInputB.getSession();
            // Filtro
            localStorage.inputFilter = this.cmFilter.getValue();

            // Pestaña del informe
            //localStorage.activeTab = document.querySelector('.tab-bar > div.sel').dataset.show;

            console.log('[Sesion] Estado guardado.');
        }
    }

    /**
     * Realiza la carga inicial de los datos de la sesión previa.
     */
    _restoreSession() {
        this.restoringSession = true;

        // Áreas de entrada
        this.dtInputA.restoreSession(localStorage.dtd_inputA || '{}');
        this.dtInputB.restoreSession(localStorage.dtd_inputB || '{}');
        // Filtros
        this.cmFilter.setValue(localStorage.inputFilter || '');

        // this._saveSession();
        this.restoringSession = false;

        console.log('[Sesion] Estado restaurado.');
    }

    /**
     * Realiza la carga inicial de los datos desde la cedena enviada con la URL.<br>
     * Descarta la sesión previa.
     */
    _restoreFromHash() {
        if (location.hash.indexOf('#for:') === 0) {
            const hash = location.hash.substring(5);
            history.pushState('', document.title, location.pathname + location.search);

            let storage;
            try {
                storage = JSON.parse(atob(hash));
            } catch (err) {
                console.warn('[Sesion] Error al parsear el permalink.');
                console.warn(err);

                alert('No se ha podido restaurar la sesión desde el enlace (' + err.message + ').');

                return;
            }

            // Áreas de entrada y alias
            localStorage.dtd_inputA = storage.dtd_inputA;
            localStorage.dtd_inputB = storage.dtd_inputB;
            // Filtro
            localStorage.inputFilter = storage.inputFilter;

            // Pestaña del informe
            //localStorage.activeTab = document.querySelector('.tab-bar > div.sel').dataset.show;

            console.log('[Sesion] Estado reemplazado por permalink.');

            xapp.compare();
        }
    }

    /**
     * @return {HTMLElement}
     */
    $id() {
        // El ID se forma con la combinación de los args.
        const id = [...arguments].join('');

        // Si el elemento está en la cache, devolverlo
        let node = this.uiCache.get(id);
        if (node != null) {
            return node;
        }

        // Si el elemento no está en cache, buscarlo en la UI
        node = document.querySelector(`#${id}`);
        // El elemento DEBE existir
        if (node == null) {
            throw new Error(`Elemento de la interfaz no encontrado: #${id}.`);
        }

        // Guardaar en cache y devolver
        this.uiCache.set(id, node);
        return node;
    };

    /** @type {HTMLTextAreaElement} */
    get $txFilter() {
        return this.$id('txFilter');
    }

    /** @type {HTMLInputElement} */
    get $chkRpUngroupWhole() {
        return this.$id('chkRpUngroupWhole');
    }

    /** @type {HTMLInputElement} */
    get $chkRpDiffShowsB() {
        return this.$id('chkRpDiffShowsB');
    }

    /** @type {HTMLInputElement} */
    get $chkRpAddOppositeIgnored() {
        return this.$id('chkRpAddOppositeIgnored');
    }

    /** @type {HTMLInputElement} */
    get $btnCompare() {
        return this.$id('btnCompare');
    }

    /** @type {HTMLInputElement} */
    get $btnCopy() {
        return this.$id('btnCopy');
    }

    /** @type {HTMLInputElement} */
    get $btnPermalink() {
        return this.$id('btnPermalink');
    }

    get $reportOnlyInA() {
        return this.$id('reportOnlyInA');
    }

    get $reportOnlyInB() {
        return this.$id('reportOnlyInB');
    }

    get $reportConflicts() {
        return this.$id('reportConflicts');
    }

    get $reportCheckup() {
        return this.$id('reportCheckup');
    }

    get $reportDuplInA() {
        return this.$id('reportDuplInA');
    }

    get $reportDuplInB() {
        return this.$id('reportDuplInB');
    }

    get $warnBar() {
        return this.$id('warnBar');
    }
}

/**
 * @type {AppUi}
 * @global
 */
const xui = new AppUi();

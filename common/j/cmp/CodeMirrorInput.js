M$ = async function () {

    /** @type CodeMirrorInput */
    const EventEmitter = await require('../common/j/cmp/EventEmitter.js', 'EventEmitter');
    const ID = await require('../common/j/req/bx-id.js', 'ID');

    /**
     * Textarea para la entrada de datos.
     * @class
     * @abstract
     */
    class CodeMirrorInput extends EventEmitter {
        /**
         * @param {string} id
         * @param {Object} options
         */
        constructor(id, options) {
            super();

            this._$ = ID(id);
            this._cm = CodeMirror.fromTextArea(this._$, options);

            // Eventos
            this._cm.on('change', this.onTextChanged.bind(this));
        }

        get $() {
            return this._$;
        }

        get cm() {
            return this._cm;
        }

        get text() {
            return this.cm.getValue();
        }

        set text(str) {
            return this.cm.setValue(str);
        }

        clear() {
            this.text = '';
        }

        focus() {
            this.cm.focus();
        }

        clearAndFocus() {
            this.text = '';
            this.focus();
        }

        focusLine(line, linePosition, length) {
            // Mover al final para que la línea resaltada quede al principio
            this.cm.setCursor(this.cm.lastLine(), 0);
            // Resaltar
            this.cm.setSelection({line, ch: linePosition}, {line: line, ch: linePosition + length});
        }


        ///  Búsqueda  ///

        findPersistent() {
            this._cm.execCommand('findPersistent');
        }


        ///  Eventos  ///

        onTextChanged() {
            this.emit('input');
        }
    }

    return {CodeMirrorInput};
};

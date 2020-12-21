class App {
    constructor() {
        xui.dtInputA.on('change', this._onInputChanged.bind(this));
        xui.dtInputB.on('change', this._onInputChanged.bind(this));
        xui.cmFilter.on('change', this._onInputChanged.bind(this));
        xui.$chkRpUngroupWhole.addEventListener('change', this._onOptionChanged.bind(this));
        xui.$chkRpDiffShowsB.addEventListener('change', this._onOptionChanged.bind(this));
        xui.$chkRpAddOppositeIgnored.addEventListener('change', this._onOptionChanged.bind(this));

        // document.addEventListener('copy', function () {
        //     var text = window.getSelection().toString()
        //     copyToClipboard(text);
        // });
        //
        // function copyToClipboard(text) {
        //     var textarea = document.createElement("textarea");
        //     textarea.textContent = text;
        //     textarea.style.position = "fixed";
        //     document.body.appendChild(textarea);
        //     textarea.select();
        //     try {
        //         return document.execCommand("cut");
        //     } catch (ex) {
        //         console.warn("Copy to clipboard failed.", ex);
        //         return false;
        //     } finally {
        //         document.body.removeChild(textarea);
        //     }
        // }
    }

    _onInputChanged() {
        if (xrp.hasActiveReports()) {
            xui.setDirty();
        }
    }

    _onOptionChanged() {
        xrp.reRenderDiffReport();
    }

    checkup() {
        const log = xng.checkup();
        xrp.renderCheckupReport(log);
    }

    compare() {
        xui.setBusy();

        setTimeout(() => {
            // TODO: Controlar errores aquí
            try {
                this._compare();
                xui.setDirty(false);
            } catch (err) {
                xui.displayMessage(err.message);
            }

            xui.setBusy(false);
        }, 100);
    }

    /**
     * @private
     */
    _compare() {
        xui.setBusy();

        // Auto convertir lo que parezca XML
        let xmlVoid = false;
        if (!xmlVoid && xui.dtInputA.isXmlLike()) {
            if (!xui.dtInputA.parseXml()) xmlVoid = true;
        }
        if (!xmlVoid && xui.dtInputB.isXmlLike()) {
            if (!xui.dtInputB.parseXml()) xmlVoid = true;
        }
        if (xmlVoid) return;

        if (this.dTableA == null || this.dTableB == null) {
            xui.displayMessage('Alguna de las entradas no es válida.');
            xui.setBusy(false);
            return;
        }

        /** @type {DiffOutput} */
        let diff;

        // Procesar las filas si aún no se ha hecho (lazy)
        if (!xapp.dTableA.bodyParsed || !xapp.dTableB.bodyParsed) {
            if (!xapp.dTableA.bodyParsed) {
                console.debug('Procesando filas de A (lazy)...');
                xapp.dTableA.parseRows();
            }
            if (!xapp.dTableB.bodyParsed) {
                console.debug('Procesando filas de B (lazy)...');
                xapp.dTableB.parseRows();
            }
        }

        // Reconstruir el filtro
        try {
            xng.rebuildFilter();
        } catch (err) {
            xui.displayMessage(err.message);
        }

        // Actualizar duplicados
        xrp.renderDuplReport({
            duplInA: this._filterDuplInfo(xapp.dTableA.getDuplInfo()),
            duplInB: this._filterDuplInfo(xapp.dTableB.getDuplInfo())
        });

        // Comparar
        try {
            diff = xng.getDiff();
        } catch (err) {
            xui.displayMessage(err.message);
        }

        xrp.renderDiffReport(diff);

        xui.setBusy(false);
    };

    /**
     * @param {{row: DTRow, atomIdx: number}[][]} dplInfo
     * @private
     */
    _filterDuplInfo(dplInfo) {
        const out = [];

        for (let dpl of dplInfo) {
            let cnt = 0;
            const filtered = dpl.filter(at => !xng.isFiltered(xapp.dTableA, at.row.getAtom(at.atomIdx).array()));
            if (filtered.length > 0) {
                out.push(dpl);
            }
        }

        return out;
    }

    get dTableA() {
        return xui.dtInputA.getModel();
    }

    get dTableB() {
        return xui.dtInputB.getModel();
    }
}

/**
 * @type {App}
 * @global
 */
const xapp = new App();


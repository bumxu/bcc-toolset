class AppRP {
    constructor() {
        this._lastDiff = null;
    }


    ///  Dupl Report  ///

    /**
     * @param {DuplInfo} info
     */
    renderDuplReport(info) {
        console.debug('Mostrando informe de duplicados...');

        xui.$reportDuplInA.innerHTML = '';
        xui.$reportDuplInB.innerHTML = '';

        let refA = { t: '' }, refB = { t: '' };

        // Duplicados en A
        for (let dpl of info.duplInA) {
            this._renderDuplRow('A', dpl, refA);
        }
        // Duplicados en B
        for (let dpl of info.duplInB) {
            this._renderDuplRow('B', dpl, refB);
        }

        xui.$reportDuplInA.innerHTML = refA.t;
        xui.$reportDuplInB.innerHTML = refB.t;

        xui.setBadge(4, info.duplInA.length);
        xui.setBadge(5, info.duplInB.length);
    }

    /**
     *
     * @param {'A'|'B'} dt
     * @param {{row: DTRow, atomIdx: number}[]} atoms
     * @param {{t: string}} out - Referencia a la cadena a la que se concatena la salida.
     * @private
     */
    _renderDuplRow(dt, atoms, out = { t: '' }) {
        out.t += `<div class="rp-entry">`;

        // Cabecera
        out.t += `<div class="rp-entry-head">`;
        //
        for (let at of atoms) {
            out.t += /**/ `${ this._renderBookmark(dt, at.row.numLine) }<br>`;
        }
        //
        out.t += `</div>`;

        // Contenido
        out.t += `<div class="rp-entry-cten">`;
        //
        for (let at of atoms) {
            out.t += `<div class="rp-entry-line">`;
            out.t += at.row.getAtom(at.atomIdx)
                // Poner en negrita las columnas clave
                .map((v, i) => {
                    return at.row.table.isKeyCol(i) ? `<span style="font-weight: 700;">${ v }</span>` : v;
                })
                // Sombrear las columnas ignoradas
                .map((v, i) => {
                    return at.row.table.isIgnoredCol(i) ? `<span style="opacity: 0.4;">${ v }</span>` : v;
                })
                // Resaltar las diferencias
                .map((v, i) => {
                    // En los duplicados mlas diferencias solo pueden estar en las columnas no claves y no ignoradas
                    if (!at.row.table.isKeyCol(i) && !at.row.table.isIgnoredCol(i)) {
                        // Comprobar si el valor es diferente en algún otro átomo
                        const cname = at.row.table.getColName(i);
                        const diff = atoms.some((atom) =>
                            atom.row.getAtom(atom.atomIdx).get(atom.row.table.getColIndex(cname)) !== v);
                        if (diff) {
                            return `<span class="highlight" title="Duplicado con diferencias">${ v }</span>`;
                        }
                    }
                    return v;
                })
                .join('<span class="sp">\t</span>');
            out.t += `</div>`;
        }
        //
        out.t += `</div>`;

        out.t += '</div>';
    }


    ///  Diff Report  ///

    /**
     * @param {DiffOutput} diff
     */
    renderDiffReport(diff) {
        console.debug('Mostrando informe de diferencias...');

        xui.$reportOnlyInA.innerHTML = '';
        xui.$reportOnlyInB.innerHTML = '';
        xui.$reportConflicts.innerHTML = '';

        let refA = { t: '' }, refB = { t: '' }, outX = '';

        // Solo en A
        for (let lrp of Object.keys(diff.onlyInA).map(Number).sort((a, b) => a > b ? 1 : a < b ? -1 : 0)) {
            let lastLine = null;
            const aftAtoms = diff.onlyInA[lrp].length;
            const row = diff.onlyInA[lrp][0].row;

            this._renderDiffRow('A', row, diff.onlyInA[lrp], refA);
            // for (let rp of diff.onlyInA[lrp]) {
            //     outA += this._renderLine('A', rp.row, rp.atomIdx, aftAtoms === rp.row.atomCount, lastLine ===
            // rp.row.numLine); lastLine = rp.row.numLine; }
        }
        // Solo en B
        for (let lrp of Object.keys(diff.onlyInB).map(Number).sort((a, b) => a > b ? 1 : a < b ? -1 : 0)) {
            let lastLine = null;
            const aftAtoms = diff.onlyInB[lrp].length;
            const row = diff.onlyInB[lrp][0].row;

            this._renderDiffRow('B', row, diff.onlyInB[lrp], refB);
            // for (let rp of diff.onlyInB[lrp]) {
            //     outB += this._renderLine('B', rp.row, rp.atomIdx, aftAtoms === rp.row.atomCount, lastLine ===
            // rp.row.numLine); lastLine = rp.row.numLine; }
        }
        // Conflictos
        for (let rp of diff.conflicts) {
            outX += this._renderConflictLine(rp);
        }

        xui.$reportOnlyInA.innerHTML = refA.t;
        xui.$reportOnlyInB.innerHTML = refB.t;
        xui.$reportConflicts.innerHTML = outX;

        const atomsOnlyInA = Object.values(diff.onlyInA).map(v => v.length).reduce((p, c) => {
            return p + c;
        }, 0);
        const atomsOnlyInB = Object.values(diff.onlyInB).map(v => v.length).reduce((p, c) => {
            return p + c;
        }, 0);
        xui.setBadge(1, `${ Object.keys(diff.onlyInA).length }(${ atomsOnlyInA })`);
        xui.setBadge(2, `${ Object.keys(diff.onlyInB).length }(${ atomsOnlyInB })`);
        xui.setBadge(3, diff.conflicts.length);

        // Conservar
        this._lastDiff = diff;

        // setTimeout(() => {
        //     this.tableView();
        // }, 1500);
    }

    clearDiffReports() {
        this._lastDiff = null;

        xui.$reportOnlyInA.innerHTML = '';
        xui.$reportOnlyInB.innerHTML = '';
        xui.$reportConflicts.innerHTML = '';

        xui.setBadge(1, '');
        xui.setBadge(2, '');
        xui.setBadge(3, '');
    }

    /**
     *
     * @param {'A'|'B'} dt
     * @param {DTRow} row
     * @param {{row: DTRow, atomIdx: number}[]} atoms
     * @param {{t: string}} out - Referencia a la cadena a la que se concatena la salida.
     * @private
     */
    _renderDiffRow(dt, row, atoms, out = { t: '' }) {
        const whole = atoms.length === row.atomCount;

        out.t += `<div class="rp-entry ${ whole ? 'whole' : 'partial' }">`;

        // Cabecera
        out.t += `<div class="rp-entry-head" title="${ whole ? 'Toda' : 'Parte de' } la línea ${ row.numLine }.">`;
        out.t += /**/ `${ whole ? 'T' : 'P' } ${ this._renderBookmark(dt, row.numLine) } `;
        out.t += /**/ `<!--span class="bookmark ${ !whole ? 'hidden' : '' }" onclick="xui.$cmdDeleteLine('${ dt }',${ row.numLine })">&times;</span-->`;
        out.t += `</div>`;

        // Contenido
        out.t += `<div class="rp-entry-cten">`;
        //
        if (whole && !xui.$chkRpUngroupWhole.checked) {
            out.t += `<div class="rp-entry-line">`;
            out.t += row.line.split('\t')
                .map((v, i) => {
                    return row.table.isKeyCol(i) ? `<span style="font-weight: 700;">${ v }</span>` : v;
                })
                .map((v, i) => {
                    return row.table.isIgnoredCol(i) ? `<span style="opacity: 0.4;">${ v }</span>` : v;
                })
                .map((v, i) => {
                    return `<span class="rp-col-n-${ i }">${ v }</span>`;
                })
                .join('<span class="sp">\t</span>');
            out.t += `</div>`;
        } else {
            for (let rp of atoms) {
                out.t += `<div class="rp-entry-line">`;
                out.t += row.getAtom(rp.atomIdx)
                    .map((v, i) => {
                        return row.table.isKeyCol(i) ? `<span style="font-weight: 700;">${ v }</span>` : v;
                    })
                    .map((v, i) => {
                        return row.table.isIgnoredCol(i) ? `<span style="opacity: 0.4;">${ v }</span>` : v;
                    })
                    .join('<span class="sp">\t</span>');
                out.t += `</div>`;
            }
        }
        //
        out.t += `</div>`;

        out.t += '</div>';
    }

    /**
     * @param {'A'|'B'} dt
     * @param {DTRow} row
     * @param {number} atomIdx
     * @param {boolean} wholeRow
     * @param {boolean} collapse
     * @return {string}
     * @private
     */
    _renderLine(dt, row, atomIdx, wholeRow, collapse) {
        return `
            <div class="rp-entry ${ wholeRow ? 'whole ' : '' } ${ collapse ? 'collapse ' : '' }">
                <div class="rp-entry-head" title="${ wholeRow ? 'Toda' : 'Parte de' } la línea ${ row.numLine }.">${ this._renderBookmark(dt, row.numLine) } 
                    <span class="bookmark ${ !wholeRow ? 'hidden' : '' }" onclick="xui.$cmdDeleteLine('${ dt }',${ row.numLine })">&times;</span></div
                ><div class="rp-line-cten">${ this._getLineCten(row, atomIdx) }</div>
            </div>`;
    }

    _renderConflictLine(entry) {
        if (xui.$chkRpDiffShowsB.checked) {
            return `
            <div class="rp-entry">
                <div class="rp-entry-head">${ this._renderBookmark('A', entry.rowA.numLine) } ${ this._renderBookmark('B', entry.rowB.numLine) } 
                <button class="btn btn-xs" onclick="xui.$cmdDiffToggleAB(this)">B</button></div
                ><div class="rp-entry-cten ctenA hidden"><div class="rp-entry-line">${ this._getConflictLineCten(entry, false) }</div></div
                ><div class="rp-entry-cten ctenB"><div class="rp-entry-line">${ this._getConflictLineCten(entry, true) }</div></div>
            </div>`;
        } else {
            return `
            <div class="rp-entry">
                <div class="rp-entry-head">${ this._renderBookmark('A', entry.rowA.numLine) } ${ this._renderBookmark('B', entry.rowB.numLine) } 
                <button class="btn btn-xs" onclick="xui.$cmdDiffToggleAB(this)">A</button></div
                ><div class="rp-entry-cten ctenA"><div class="rp-entry-line">${ this._getConflictLineCten(entry, false) }</div></div
                ><div class="rp-entry-cten ctenB hidden"><div class="rp-entry-line">${ this._getConflictLineCten(entry, true) }</div></div>
            </div>`;
        }
    }

    /**
     *
     * @param {DTRow} row
     * @param {number} atomIdx
     * @return {string}
     * @private
     */
    _getLineCten(row, atomIdx) {
        return row.getAtom(atomIdx)
            .map((v, i) => {
                return row.table.isKeyCol(i) ? `<span style="font-weight: 700;">${ v }</span>` : v;
            })
            .map((v, i) => {
                return row.table.isIgnoredCol(i) ? `<span style="opacity: 0.4;">${ v }</span>` : v;
            })
            .join('<span class="sp">\t</span>');
    }

    /**
     * @param {DiffConflictEntry} entry
     * @param {boolean} showDefaultB - Si es FALSE usa el contenido de A, si es TRUE usa el contenido de B.
     * @return {string}
     * @private
     */
    _getConflictLineCten(entry, showDefaultB) {
        const atomA = entry.rowA.getAtom(entry.atomIdxA);
        const atomB = entry.rowB.getAtom(entry.atomIdxB);

        let cten;

        if (showDefaultB) {
            cten = atomB
                // Resaltar las diferencias
                .map((atomColB, colIdxB) => {
                    const colB = entry.rowB.table.getColName(colIdxB);
                    const aColIdx = entry.rowA.table.getColIndex(colB);
                    if (!entry.rowB.table.isIgnoredCol(colIdxB) && atomColB !== atomA.$(aColIdx)) {
                        return `<span class="highlight" title="En A: ${ atomA.$(aColIdx) }">${ atomColB }</span>`;
                    }
                    return atomColB;
                })
                // Poner en negrita las columnas clave
                .map((v, i) => {
                    return xapp.dTableB.isKeyCol(i) ? `<span style="font-weight: 700;">${ v }</span>` : v;
                })
                // Sombrear las columnas ignoradas
                .map((v, i) => {
                    return xapp.dTableB.isIgnoredCol(i) ? `<span style="opacity: 0.5;">${ v }</span>` : v;
                });

            // Añadir las columnas ignoradas del opuesto
            if (xui.$chkRpAddOppositeIgnored.checked) {
                cten.push(...atomA
                    // Filtrar ignoradas
                    .filter((v, i) => xapp.dTableA.isIgnoredCol(i))
                    // Poner en color azul
                    .map((v, i) => `<span style="color: #06f;">${ v }</span>`));
            }
        } else {
            cten = atomA
                // Resaltar las diferencias
                .map((atomColA, colIdxA) => {
                    const colA = entry.rowA.table.getColName(colIdxA);
                    const bColIdx = entry.rowB.table.getColIndex(colA);
                    if (!entry.rowA.table.isIgnoredCol(colIdxA) && atomColA !== atomB.$(bColIdx)) {
                        return `<span class="highlight" title="En B: ${ atomB.$(bColIdx) }">${ atomColA }</span>`;
                    }
                    return atomColA;
                })
                // Poner en negrita las columnas clave
                .map((v, i) => {
                    return xapp.dTableA.isKeyCol(i) ? `<span style="font-weight: 700;">${ v }</span>` : v;
                })
                // Sombrear las columnas ignoradas
                .map((v, i) => {
                    return xapp.dTableA.isIgnoredCol(i) ? `<span style="opacity: 0.5;">${ v }</span>` : v;
                });

            // Añadir las columnas ignoradas del opuesto
            if (xui.$chkRpAddOppositeIgnored.checked) {
                cten.push(...atomB
                    // Filtrar ignoradas
                    .filter((v, i) => xapp.dTableB.isIgnoredCol(i))
                    // Poner en color azul
                    .map((v, i) => `<span style="color: #06f;">${ v }</span>`));
            }
        }

        return cten.join('<span class="sp">\t</span>');
    }

    /**
     * @param {string} label
     * @param {number} line
     * @return {string}
     * @private
     */
    _renderBookmark(label, line) {
        return `<span class="bookmark" onclick="xui.$cmdGoTo('${ label }',${ line })">${ label }:${ line }</span>`;
    }

    renderCheckupReport(rp) {
        xui.$reportCheckup.innerHTML = rp.join('<br>');
    }

    hasActiveReports() {
        return this._lastDiff != null;
    }

    reRenderDiffReport() {
        if (this._lastDiff != null) {
            this.renderDiffReport(this._lastDiff);
        }
    }

    tableView() {
        //$('<style></style>').appendTo($(document.body)).remove();

        // Para cada informe
        document.querySelectorAll('.rp-holder').forEach(($report, i) => {

            // Para cada columna
            for (let n = 0; n < 1000; n++) {
                // Siguiente índice de columna
                const $nCols = $report.querySelectorAll('.rp-col-n-'+n);
                // Si no hay valores para esta columna, hemos terminado
                if ($nCols.length === 0) {
                    break;
                }

                // Cálculo del ancho máximo de la columna actual
                const colWidth = [...$nCols.values()].reduce((prv, $nCol, i) => {
                    return Math.max(prv, $nCol.offsetWidth);
                }, 0);
                // Aplicar el ancho calculado
                $nCols.forEach(($v, i) => {
                    $v.style.width = colWidth + 'px';
                    $v.style.display = 'inline-block';
                });
            }

        });
    }
}

/**
 * @type {AppRP}
 * @global
 */
const xrp = new AppRP();

/**
 * @typedef {Object} DuplInfo
 * @property {{row: DTRow, atomIdx: number}[][]} duplInA
 * @property {{row: DTRow, atomIdx: number}[][]} duplInB
 */
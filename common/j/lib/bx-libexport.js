/*
 * LIBEXPORT v.1.0.2
 */

/**
 * @global
 * @type {{parse: (function(*=): {textRule: string, jsonRule: []}), parseText: (function(*=): {textRule: string, jsonRule: []})}}
 */
const xlibexport = (function () {
    const PARSER = new DOMParser();

    const parseText = function (xml) {
        const doc = PARSER.parseFromString(xml, 'text/xml');
        return parse(doc);
    };

    const parse = function (xdoc) {
        const cols = [];
        const dataOut = [];
        let textOut = '';

        let textRow, dataRow;

        //-- CABECERA

        // Obtenemos la cabecera
        const xcols = xdoc.evaluate('/root/Columns/Column', xdoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        // Si no hay columnas, abortamos
        if (xcols.snapshotLength === 0) {
            throw new Error('El XML de entrada no tiene columnas.');
        }

        // Obtenemos las características de cada columna
        for (let i = 0; i < xcols.snapshotLength; i++) {
            const xcol = xcols.snapshotItem(i);

            cols.push({
                name: xcol.getAttribute('name'),
                type: xcol.getAttribute('type'),
                input: xcol.getAttribute('input') === 'true'
            });
        }

        // Generamos la cabecera
        dataRow = cols.map(col => col.name);
        textRow = dataRow.join('\t');

        // Movemos la cabecera a la salida
        dataOut.push(dataRow);
        textOut += textRow;

        //-- FILAS

        // Obtenemos la cabecera
        const xrows = xdoc.evaluate('/root/Rows/Row', xdoc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

        // Recorremos cada una de las filas
        for (let i = 0; i < xrows.snapshotLength; i++) {
            const xrow = xrows.snapshotItem(i);

            dataRow = [];

            // Tratamos de identificar cada una de las columnas
            for (let col of cols) {
                const childs = xrow.getElementsByTagName(col.name);

                // Caso 1: La columna está más de una vez o wtf -> abortamos
                if (childs == null || childs.length > 1) {
                    // TODO: Cuando hay varias salidas es el elemento <COLUMNA> el que se repite
                    throw new Error(`Número de columnas "${col.name}" incorrecto en la fila #${i} => ${(childs == null ? 'null' : childs.length)}.`);
                }

                // Caso 2: La columna no está en la fila
                if (childs.length === 0) {
                    dataRow.push('');
                    continue;
                }

                // Caso 3: La columna aparece en la fila
                const child = childs[0];

                // Se espera un nodo normal
                if (child.nodeType !== Node.ELEMENT_NODE) {
                    throw new Error(`La columna ${col.name} de la fila #${i} no es un elemento XML válido => ${child.nodeType}.`);
                }

                // -> Es campo de salida
                if (!col.input) {
                    const contents = child.childNodes;

                    // Se espera un solo elemento de tipo texto, o nada
                    if (contents.length > 1 || (contents.length === 1 && contents[0].nodeType !== Node.TEXT_NODE)) {
                        throw new Error(`La columna ${col.name} de la fila #${i} no tiene una estructura válida para un campo de salida.`);
                    }

                    // TODO: Hay reglas con salida multiple

                    // Elaborar el resultado
                    let res = '';
                    //> Si tiene valor, asignarlo
                    if (contents[0] != null)
                        res = contents[0].textContent;
                    //> Si es texto, envolverlo
                    if (col.type === 'Text')
                        res = formatText([res])[0];

                    dataRow.push(res);
                }
                // -> Es campo de entrada
                else {
                    dataRow.push(_parseInput(child, col, i));
                }
            }

            // Generamos la fila (texto)
            textRow = dataRow.join('\t');

            // Movemos la cabecera a la salida
            dataOut.push(dataRow);
            textOut += '\n' + textRow;
        }

        return {
            textRule: textOut,
            jsonRule: dataOut
        };
    };

// Traducción de los operadores que 
// difieren del formato XML al formato TAB
    const OP_XML_TRANS = {
        EQ: '=',
        NE: '!=',
        GT: '>',
        GE: '>=',
        LT: '<',
        LE: '<='
    };

    const _nullTo = function (checkable, replacement) {
        return checkable == null ? replacement : checkable;
    };

    const _parseInput = function (node, col, i) {
        const op = node.getAttribute('op');

        let keyword = OP_XML_TRANS[op];
        if (keyword == null) {
            keyword = op;
        }

        //-- Sin elementos
        if (/^(NULL|NOT_NULL|TRUE|FALSE)$/.test(op)) {
            // No se espera ningún elemento
            if (node.childNodes.length !== 0) {
                throw new Error(`Entrada de la regla con un número de elementos no acorde con un operador "${op}" en la fila #${i} => ${node.childNodes.length}.`);
            }

            return keyword;
        }

        //-- Único elemento
        else if (/^(EQ|NE|GT|GE|LT|LE)$/.test(op)) {
            // Se espera un solo nodo
            if (node.childNodes.length !== 1)
                throw new Error(`La columna ${col.name} de la fila #${i} tiene un número de elementos no acorde con un operador "${op}" => ${node.childNodes.length}.`);

            let value = node.childNodes[0];

            // Se espera un nodo de texto
            if (value.nodeType !== Node.TEXT_NODE)
                throw new Error(`La columna ${col.name} de la fila #${i} no tiene un tipo válido para un operador "${op}".`);

            // -> text
            value = value.textContent;

            // Si la columna es ReferentialGen, quitar el código del referencial
            if (col.type === 'ReferentialGen')
                value = formatReferentialGen([value])[0];

            // Si la columna es Text, envolverlo
            if (col.type === 'Text')
                value = formatText([value])[0];

            return keyword + value;
        }

        //-- Dos elementos
        else if (/^(BT|NOT_BT)$/.test(op)) {
            let values = xpath('v/text()', node);

            // Se esperan 2 elementos
            if (values.length == null || values.length !== 2)
                throw new Error(`La columna ${col.name} de la fila #${i} tiene un número de elementos no acorde con un operador "${op}" => ${node.childNodes.length}.`);

            // -> text
            values = values.map(v => v.textContent);

            // Si la columna es ReferentialGen, quitar el código del referencial
            if (col.type === 'ReferentialGen')
                values = formatReferentialGen(values);

            return keyword + '(' + values.join(',') + ')';
        }

        //-- Multiples elementos
        else if (/^(IN|NOT_IN)$/.test(op)) {
            let values = xpath('v/text()', node);

            // Se esperan varios elementos
            if (values.length == null || values.length === 0) {
                throw new Error(`La columna ${col.name} de la fila #${i} tiene un número de elementos no acorde con un operador "${op}" => ${node.childNodes.length}.`);
            }

            // -> text
            values = values.map(v => v.textContent);

            // Si la columna es ReferentialGen, quitar el código del referencial
            if (col.type === 'ReferentialGen')
                values = formatReferentialGen(values);

            // Si la columna es Text, envolverlo
            if (col.type === 'Text')
                values = formatText(values);

            return keyword + '(' + values.join(',') + ')';
        }
        //-- En cualquier otro caso
        else {
            throw new Error(`Entrada de la regla con un tipo de operador desconocido en la fila #${i} => ${op}.`);
        }
    };

    const _validateTypeNodes = function (nodes, type) {
        for (let node of nodes) {
            if (node.nodeType !== type) {
                return false;
            }
        }

        return true;
    };

    const formatReferentialGen = function (values) {
        return values.map(v => v.substring(10));
    };

    const formatText = function (values) {
        return values.map(v => '"' + v + '"');
    };

    const xpath = function (xpath, node, type = XPathResult.ORDERED_NODE_ITERATOR_TYPE) {
        const result = node.getRootNode().evaluate(xpath, node, null, type, null);

        if ([XPathResult.ORDERED_NODE_ITERATOR_TYPE, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, XPathResult.UNORDERED_NODE_ITERATOR_TYPE,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE].includes(result.resultType)) {
            const iterable = [];
            let node;

            while (node = result.iterateNext())
                iterable.push(node);
            return iterable;
        }

        return result;
    };

    return {parse, parseText};
})();
(async function () {
    // Constante: XML Parser
    const PARSER = new DOMParser();

    // DOM
    const $issuesView = document.querySelector('#issues');
    const $xlsLink = document.querySelector('#xls-link');
    const $csvLink = document.querySelector('#csv-link');
    const $doBtn = document.querySelector('#do-btn');
    const $beautyXmlBtn = document.querySelector('#beautyxml-btn');
    const $findBtn01 = document.querySelector('#findBtn01');
    const $findBtn02 = document.querySelector('#findBtn02');

    // CodeMirror
    const xmlIn = CodeMirror.fromTextArea(document.querySelector('#xml-in'),
        {
            indentWithTabs: true,
            lineNumbers: true,
            styleActiveLine: true
        });
    const tabOut = CodeMirror.fromTextArea(document.querySelector('#tab-out'),
        {
            readOnly: true,
            indentWithTabs: true,
            lineNumbers: true,
            styleActiveLine: true
        });


    const doProcess = () => {
        clearOut();

        // Formatear XML de paso
        try {
            beautifyXml();
        } catch (err) {
            console.warn('No se pudo formatear el XML de la entrada.');
        }

        const xml = xmlIn.getValue();
        const doc = PARSER.parseFromString(xml, 'text/xml');

        let out;

        try {
            out = xlibexport.parse(doc);
        } catch (err) {
            printIssue(err.message);
            return;
        }
        tabOut.setValue(out.textRule);

        // Producir XLS
        try {
            buildXLS(out.jsonRule);
            buildCSV(out.jsonRule);
        } catch (err) {
            printIssue('No se han podido generar los archivos => ' + err.message);
            return;
        }
    };

    const buildXLS = function (data) {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);

        XLSX.utils.book_append_sheet(wb, ws, 'RuleSheet');
        const ab = XLSX.write(wb, {
            type: 'array',
            bookType: 'xlml'
        });
        const blob = new Blob([ab], {type: 'application/vnd.ms-excel'});

        $xlsLink.href = URL.createObjectURL(blob);
        $xlsLink.download = dateformat(Date.now(), 'yyyymmdd_HHMM') + '.xls';
    };

    const buildCSV = function (data) {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws, {
            'FS': ';'
        });

        const blob = new Blob([csv], {type: 'text/csv'});

        $csvLink.href = URL.createObjectURL(blob);
        $csvLink.download = dateformat(Date.now(), 'yyyymmdd_HHMM') + '.csv';
    };

    const clearFiles = function () {
        $xlsLink.removeAttribute('href');
        $csvLink.removeAttribute('href');
    };

    const printIssue = function (issue) {
        $issuesView.innerHTML += issue;
    };

    const clearIssues = function () {
        $issuesView.innerHTML = '';
    };

    const clearOut = function () {
        tabOut.setValue('');
        clearFiles();
        clearIssues();
    };


    /**
     * Guarda los datos de la sesión actual.
     */
    const saveTxtContents = () => {
        // Áreas de entrada y alias
        localStorage.xmlIn = xmlIn.getValue();

        console.log('[Sesion] Estado actualizado.');
    };

    /**
     * Realiza la carga inicial de los datos de la sesión previa.
     */
    const loadTxtContents = () => {
        // Áreas de entrada
        xmlIn.setValue(localStorage.xmlIn || '');

        console.log('[Sesion] Estado restaurado.');
    };

    const beautifyXml = () => {
        xmlIn.setValue(vkbeautify.xml(xmlIn.getValue(), '\t'));
    };


    /// --- ///


    loadTxtContents();

    // Eventos
    xmlIn.on('change', saveTxtContents);
    xmlIn.on('change', clearOut);
    $doBtn.addEventListener('click', doProcess);
    $beautyXmlBtn.addEventListener('click', beautifyXml);

    $findBtn01.addEventListener('click', () => xmlIn.execCommand('find'));
    $findBtn02.addEventListener('click', () => tabOut.execCommand('find'));

    document.addEventListener('keydown', (ev) => {
        // F8 -> Procesar
        if (ev.keyCode === 119) {
            ev.preventDefault();
            doProcess();
        }
        // F9 -> Formatear
        if (ev.keyCode === 120) {
            ev.preventDefault();
            beautifyXml();
        }
    });

    clearOut();

})();

const $ouInput = document.querySelector('#ouInput');
const $ctInput = document.querySelector('#ctInput');
const $txOutCount = document.querySelector('#txOutCount');
const $txOutFinal = document.querySelector('#txOutFinal');
const $extOut = document.querySelector('#ext-output');
const $doBtn = document.querySelector('#do-btn');

let rows;
let ranges;
let rgeCount, rctCount, rgeAvgSize;

/**
 *
 */
function readRgeCount() {
    rgeCount = Number($ctInput.value);
}

/**
 *
 */
function readLines() {
    rows = [];
    rctCount = 0;

    const lines = $ouInput.value.split(/\r?\n/);
    for (let line of lines) {
        // Trim
        line = line.replace(/(^\s+|\s+$)/g, '');
        if (line != '') {
            const tmp = line.split(/\t/);
            const row = { ou: String(tmp[0]), oux: String(tmp[1]), count: Number(tmp[2]) };
            rows.push(row);

            rctCount += row.count;
        }
    }
}

/**
 *
 */
function getRanges() {
    ranges = [];

    readRgeCount();
    readLines();

    console.log(`Hay que procesar ${rctCount} recibos en ${rgeCount} rangos.`);

    rgeAvgSize = rctCount / rgeCount;

    console.log(`De media, cada rango contendrá ${rgeAvgSize} recibos.`);

    if (rows.length < rgeCount) {
        alert('El número de oficinas es menor que el número de rangos.');
        return;
    }
    if (rows.length === rgeCount) {
        alert('El número de oficinas es igual que el número de rangos.');
        return;
    }

    /** @type {{a?:string, ax?:string, b?: string, bx?: string, count?: number} | null} */
    let range;
    let count = 0, lSpace, rSpace;
    for (let i = 0; i < rows.length; i++) {
        count += rows[i].count;

        // Abrir rango
        if (range == null) {
            range = { a: rows[i].ou, ax: rows[i].oux };
        }

        // El último rango va hasta el final, por lo que no decidimos
        if (ranges.length < rgeCount - 1 && count >= rgeAvgSize) {
            // Si el número de oficinas supera el tamaño medio del rango,
            // decidir entre tomar exceso o defecto
            if (i > 0 && count > rgeAvgSize) {
                const rSpace = count - rgeAvgSize;
                const lSpace = rgeAvgSize - (count - rows[i].count);

                if (rSpace < lSpace) {
                    // Cerrar el rango
                    range.b = rows[i].ou;
                    range.bx = rows[i].oux;
                    range.count = count;
                } else {
                    // Cerrar el rango
                    range.b = rows[i - 1].ou;
                    range.bx = rows[i - 1].oux;
                    range.count = count - rows[i].count;
                    i--;
                }
            } else {
                // Cerrar el rango
                range.b = rows[i].ou;
                range.bx = rows[i].oux;
                range.count = count;
            }

            // Guardar el rango
            ranges.push(range);
            console.debug(range);
            range = null;

            // Preparar siguiente
            count = 0;
        }
    }

    // Último rango
    if (range != null) {
        range.b = rows[rows.length - 1].ou;
        range.bx = rows[rows.length - 1].oux;
        range.count = count;
        ranges.push(range);
        console.debug(range);
        range = null;
    }
}

function displayRanges() {
    let out = '', outx = '';
    for (let range of ranges) {
        out += `${range.a} a ${range.b} (${range.count})\n`;
        outx += `"${range.ax}";"${range.bx}"\n`;
    }
    $txOutCount.value = out;
    $txOutFinal.value = outx;
}

function displayExtQuery() {
    let ou = [];
    for (let range of ranges) {
        ou.push(range.a);
        ou.push(range.b);
    }

    $extOut.value =
        'SELECT id_itrl_ou, \'"\'|| cod_bosr_ent ||\';\'|| cod_itrl_ou  ||\'"\' AS csv \n' +
        'FROM core.ou_ou \n' +
        'WHERE id_itrl_ou IN (' + ou.join(',') + ');';
}

$doBtn.addEventListener('click', () => {
    getRanges();
    displayRanges();
    displayExtQuery();
});
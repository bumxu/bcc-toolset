// Known Tables
/**
 *
 * @type {Kt[]}
 */
const KT = [{
    name: 'SACBRRCONCEPT', key: [0, 1, 2],
    col: ['ID_PD_GR', 'COD_AC_BA', 'COD_AC_CONC_GRP', 'IND_OK']
}, {
    name: 'SACBRRBALREL', key: [0],
    col: ['COD_AC_BA', 'COD_AC']
}, {
    name: 'SACBRRBASTRU', key: [0, 1],
    col: ['ID_PD_GR', 'COD_AC_BA', 'COD_BA_DEPTH_UPD', 'COD_BA_UPD_TYP', 'IND_MULT_CCY', 'COD_BA_OU', 'IND_UPD_FI', 'COD_BA_AVG_CAL', 'IND_INCR_BA', 'IND_BA_SF', 'IND_MAIN_BA', 'COD_LCS_AR', 'IND_BA_EP', 'IND_CAL_VALUE_DATE', 'IND_VARTN_VALUE_DATE_STLMNT']
}, {
    name: 'SACBRRLEDGERBA', key: [0, 1, 2],
    col: ['ID_PD_GR', 'COD_IR', 'COD_AC_BA', 'IND_OBGY', 'COD_IR_AMT', 'IND_LEDGER']
}, {
    name: 'SACBRRBALTOUPD', key: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    col: ['ID_PD_GR', 'COD_AC', 'COD_IR', 'COD_AC_CONC_GRP', 'COD_ENTRY_OPRTN_STYP', 'ID_SP', 'ID_CP', 'COD_AUX_1', 'COD_AUX_2', 'COD_AUX_3', 'COD_AUX_4', 'COD_AUX_5', 'COD_AUX_6', 'COD_AUX_7', 'COD_AUX_8', 'COD_AC_BA', 'COD_SIGN_ENTRY', 'IND_ENTRY_COMPL']
}, {
    name: 'CBCBRRACTIVSF', key: [0, 1, 2, 3, 4, 5],
    col: ['COD_LNE', 'ID_PD_GR', 'COD_FEE_PMT_EVNT', 'ID_SP', 'ID_CP', 'PARM_1', 'TXT_ACTV', 'MNEMC']
}, {
    name: 'LIQBRRCONCEPLIQ', key: [0, 1, 2, 3, 4],
    col: ['COD_LNE', 'ID_PD_GR', 'COD_FEE_PMT_EVNT', 'ID_SP', 'ID_CP', 'NUM_SEQ_CONC', 'NUM_SEQ_CONC_LITIG', 'IND_OPRTN_PSBL_UNDO_STLMNT', 'COD_ENTRY_OPRTN_STYP', 'COD_ENTRY_OPRTN_STYP_LIAB', 'COD_STLMNT_SPEC_CONC', 'IND_SIMU']
}, {
    name: 'PRUEBAS', key: [0, 1],
    col: ['A', 'B', 'C', 'D']
}];


class KnownTables {
    /**
     * @param {string[]} fields
     * @return {?Kt}
     */
    static recognize(fields) {
        /** @type {Kt[]} */
        const classification = [];

        for (let kt of KT) {
            // Si todos los elementos de la kt existen en la cabecera,
            // la añadimos a la clasificación
            if (kt.col.every(value => (fields.includes(value)))) {
                classification.push(kt);
            }
        }

        // Si no hay elementos coincidentes, no se reconoce la tabla
        if (classification.length === 0)
            return null;

        // Ordenamos los candidatos para saber cuál tiene más campos coincidentes
        classification.sort((a, b) => a.col.length > b.col.length ? -1 : (a.col.length < b.col.length ? 1 : 0));

        return classification[0];
    }
}

/** @typedef {{name:string, col: string[], key: number[]}} Kt */

CodeMirror.defineSimpleMode('filtermode', {
    // The start state contains the rules that are intially used
    start: [
        {
            regex: /^([\t ]*)(!?)(\w+)([\t ]+)([^\s#]+)(?:([\t ]*)(#.*?))?[\t ]*$/,
            token: [null, 'filter-neg', 'filter-col', null, 'filter-regex', null, 'filter-comment']
        }, {
            regex: /^(#.*?)[\t ]*$/,
            token: 'filter-comment'
        }, {
            regex: /^(.*)$/,
            token: 'filter-error'
        }
    ],
    meta: {
        //dontIndentStates: ['comment'],
        //lineComment: '#'
    }
});

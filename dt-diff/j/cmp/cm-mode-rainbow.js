CodeMirror.defineMode('rainbow', function () {
    return {
        startState: function () {
            return {
                prevToken: null,
                colId: 0,
                quoted: false
            };
        },
        token: function (stream, state) {
            let type;

            if (state.prevToken == null || state.prevToken === 'tab' || state.prevToken === 'tabq') {
                stream.eatWhile(/([^\t])/);
                state.prevToken = 'col';

                // Toggle quoted
                stream.current().split('').filter(c => c === '"').forEach(c => state.quoted = !state.quoted);

                //console.log('C');
                type = 'rbw-c' + state.colId;
                if (!state.quoted)
                    state.colId = (state.colId + 1) % 26;
            } else {
                if (stream.eat(/(\t)/)) {
                    state.prevToken = 'tab';
                    //console.log('T');
                }
            }

            if (stream.eol()) {
                //console.log('¬');
                state.prevToken = null;
                state.colId = 0;
            }

            return type;
        }
    };
});
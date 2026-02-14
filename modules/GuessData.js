export class GuessData {
    /** @type {[LetterData,LetterData,LetterData,LetterData,LetterData]} */
    #letterData = new Array(5);
    /**
     * Creates a new guess data instance.
     * @param {String} answer
     * @param {String} guess
     */
    constructor(answer, guess) {
        for (let x = 0; x < 5; x++) {
            /** @type {LetterData} */
            let wordData = { letter: guess[x], type: GuessData.INCORRECT };
            if (guess[x] == answer[x]) {
                wordData.type = GuessData.CORRECT;
            }
            this.#letterData[x] = wordData;
            Object.defineProperty(this, x, {
                get: function () {
                    return this.#letterData[x];
                }
            });
        }
        for (let x = 0; x < 5; x++) {
            if (this[x].type == GuessData.INCORRECT && answer.includes(guess[x]) && this.#letterData.filter(e => e.letter == guess[x] && e.type > GuessData.INCORRECT).length < answer.split('').filter(e => e == guess[x]).length) {
                this[x].type = GuessData.HAS_LETTER;
            }
        }

    }
    /**
     * 
     * @returns {HTMLDivElement}
     */
    buildElement() {
        let div = document.quickElement("div", { class: "gameGuessContainer" });
        for (let letter of this) {
            div.createChildNode("div", { class: "guessLetter" + (letter.type == GuessData.CORRECT ? " correct" : (letter.type == GuessData.HAS_LETTER ? " hasLetter" : " incorrect")) }, letter.letter);
        }
        return div;
    }
    *[Symbol.iterator]() {
        let x = 0;
        while (x < 5) yield this.#letterData[x++];
    }
    /** @type {0} */
    static INCORRECT = 0;
    /** @type {1} */
    static HAS_LETTER = 1;
    /** @type {2} */
    static CORRECT = 2;
}

/**
 * @typedef {object} LetterData
 * @property {string} letter
 * @property {0 | 1 | 2} type
 */
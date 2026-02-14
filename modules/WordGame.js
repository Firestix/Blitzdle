import { GuessData } from "./GuessData.js";

export class WordGame {
    /** @type {string} */
    #answer;
    /** @type {number} */
    index;
    /** @type {HTMLDivElement} */
    element;
    /** @type {HTMLDivElement} */
    guessesElement;
    /** @type {HTMLDivElement} */
    hintsElement;
    solved = false;
    /** @type {GuessData[]} */
    guesses = [];
    /**
     * Creates a new instance of the word game.
     * @param {number} index
     * @param {string} word
     */
    constructor(elem, index, word, guesses = []) {
        this.element = elem;
        this.#answer = word;
        this.index = index;
        this.buildElements();
        if (guesses.length > 0) {
            for (let x = guesses.length - 1; x >= 0; x--) {
                if (guesses[x] == this.#answer) {
                    this.solved = true;
                }
                let guessdata = this.appendGuess(guesses[x]);
                this.guesses.unshift(guessdata);
                if (this.solved) break;
            }
            this.buildHintTracker();
        }
    }
    /**
     * 
     * @param {string} word 
     */
    guess(word) {
        if (word == this.#answer) {
            this.solved = true;
        }
        let guessdata = this.appendGuess(word);
        this.guesses.unshift(guessdata);
        this.buildHintTracker();
    }
    /**
     * 
     * @param {string} word 
     * @returns 
     */
    appendGuess(word) {
        let guessdata = new GuessData(this.#answer, word);
        if (this.solved) {
            this.element.classList.add("solved");
        }
        this.guessesElement.insertBefore(guessdata.buildElement(), this.guessesElement.children[1]);
        this.guessesElement.scrollTo(0, 0);
        return guessdata;
    }
    buildElements() {
        this.element.createChildNode("div", { class: "wordGameIndex" }, (this.index + 1).toString());
        this.guessesElement = this.element.createChildNode("div", { class: "guessesContainer" });
        this.hintsElement = this.guessesElement.createChildNode("div", { class: "hintsElement" });
    }
    buildHintTracker() {
        this.hintsElement.innerHTML = "";
        if (!this.solved) {
            let { correct, couldHave, correctLetters } = this.getLetterHintData();
            this.hintsElement.createChildNode("div", { class: "hintsContainer" }, (div) => {
                for (let y = 0; y < 5; y++) {
                    div.createChildNode("div", { class: "hintContainer" }, (div) => {
                        if (correct[y].length > 0) {
                            div.createChildNode("div", { class: "hint correct" }, correct[y][0]);
                        } else {
                            let sortedList = couldHave[y].sort();
                            for (let letter of sortedList) {
                                div.createChildNode("div", { class: "smallHint hasLetter" }, letter, (l) => {
                                    if (correctLetters.includes(letter)) l.classList.add("used");
                                });
                            }
                        }
                    });
                }
            });
        }
    }
    getLetterHintData() {
        let correct = [[], [], [], [], []];
        let correctLetters = [];
        let couldHaveLetters = [];
        let hasLetter = [[], [], [], [], []];
        let couldHave = [[], [], [], [], []];
        let incorrect = [[], [], [], [], []];
        for (let guess of this.guesses) {
            for (let x = 0; x < 5; x++) {
                switch (guess[x].type) {
                    case GuessData.CORRECT:
                        if (!correct[x].includes(guess[x].letter)) {
                            correct[x].push(guess[x].letter);
                            correctLetters.push(guess[x].letter);
                        }
                        break;
                    case GuessData.HAS_LETTER:
                        if (!hasLetter[x].includes(guess[x].letter)) hasLetter[x].push(guess[x].letter);
                        break;
                    default:
                        if (!incorrect[x].includes(guess[x].letter)) incorrect[x].push(guess[x].letter);
                }
            }
        }
        for (let x = 0; x < 5; x++) {
            for (let y = 0; y < 5; y++) {
                if (x == y) continue;
                for (let letter of hasLetter[y]) {
                    if (!couldHave[x].includes(letter) && !hasLetter[x].includes(letter) && !incorrect[x].includes(letter)) {
                        couldHave[x].push(letter);
                        if (!couldHaveLetters.includes(letter)) couldHaveLetters.push(letter);
                    }
                }
            }
        }
        return { correct, couldHave, correctLetters, couldHaveLetters };
    }

    getAnswer() {
        return this.solved ? this.#answer : this.solved;
    }
}

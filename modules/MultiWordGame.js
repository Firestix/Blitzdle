import { GameWordLists } from "./GameWordLists.js";
import { WordGame } from "./WordGame.js";
import { ReplayMap } from "./Replay.js";

const wordLists = new GameWordLists();

wordLists.loadWordLists()

export class MultiWordGame extends EventTarget {
    /** @type {Element} */
    container;
    /** @type {HTMLDivElement} */
    guessContainer;
    /** @type {HTMLDivElement} */
    unusedLettersContainer;
    /** @type {HTMLDivElement} */
    gamesContainer;
    /** @type {WordGame[]} */
    games = [];
    /** @type {string[]} */
    guesses = [];
    currentGuess = "";
    /** @type {number} */
    startTime;
    /** @type {boolean} */
    gameStarted;
    /** @type {boolean} */
    gameFinished;
    /** @type {ReplayMap} */
    replay;
    /** @type {boolean} */
    isReplay;
    /** @type {FileReader} */
    replayReader;
    /** @type {HTMLDivElement} */
    timerElement;
    /** @type {Date} */
    expire;
    /**
     * 
     * @param {Element} elem 
     * @param {MultiWordGameSettings} settings 
     */
    constructor(elem, settings) {
        super();
        let gameSettings = {
            dailyMode: false,
            hardMode: false,
            easyMode: false,
            customMode: false,
            replayMode: false,
            startOnCreation: false,
            ...settings
        };
        let numWords = gameSettings.numWords;
        let isDaily = gameSettings.dailyMode;
        let isHard = gameSettings.hardMode;
        let isEasy = gameSettings.easyMode;
        this.isReplay = gameSettings.replayMode;
        let isCustom = gameSettings.customMode;
        let seed = gameSettings.gameSeed;
        this.replay = ReplayMap.fromObject({numWords,isDaily,isHard,isEasy,isCustom,seed});
        
        this.replayReader = new FileReader();
        this.replayReader.onloadend = (e) => this.replayReaderHandler(e, "gameState");
        this.container = elem;
        this.expire = new Date();
        this.expire.setDate(this.expire.getDate() + 1);
        this.expire.setHours(0, 0, 0, 0);
        if (gameSettings.startOnCreation) {
            this.start();
        }
    }
    get gameSeed() {
        return this.replay.seed;
    }
    get isDaily() {
        return this.replay.isDaily;
    }
    get isHard() {
        return this.replay.isHard;
    }
    get isEasy() {
        return this.replay.isEasy;
    }
    get numWords() {
        return this.replay.numWords;
    }
    async start() {
        this.initContainer();
        let listToUse = this.isHard ? (await wordLists.completeWordList).randomize(this.numWords, this.gameSeed) : (await wordLists.selectWordList).randomize(this.numWords, this.gameSeed);
        for (let x = 0, xlen = listToUse.length; x < xlen; x++) {
            let div = this.gamesContainer.createChildNode("div", { class: "gameContainer" });
            this.games.push(new WordGame(div, x, listToUse[x], this.guesses));
        }
        this.buildUnusedLettersElements();
        if (!this.isReplay) {
            document.addEventListener("keydown", (e) => {
                this.keyHandler(e);
            });
            this.guessContainer.addEventListener("animationend", (e) => {
                this.guessContainer.classList.remove("inpErr");
            });
        }
    }
    async guess() {
        if (this.currentGuess.length == 5 && !this.guesses.includes(this.currentGuess) && (await wordLists.completeWordList).includes(this.currentGuess)) {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.startTime = Date.now();
                this.replay.timestamp = Date.now();
                this.replay.firstGuess = this.currentGuess.split("").map(c => c.charCodeAt(0));
            }
            this.guesses.unshift(this.currentGuess);
            for (let g of this.games) {
                if (g.solved) continue;
                g.guess(this.currentGuess);
            }
            if (this.games.filter(g => g.solved).length == this.games.length) {
                this.gameFinished = true;
                localStorage.removeItem("gameState");
                if (this.isDaily && !this.isReplay) {
                    let dailyReader = new FileReader();
                    dailyReader.readAsDataURL(new Blob([this.replay.encode()], { type: "application/octet-stream" }));
                    dailyReader.onloadend = (e) => this.replayReaderHandler(e, this.isHard ? "expert" : this.isEasy ? "easy" : "normal");
                }
                this.dispatchEvent(new CustomEvent("finished", {detail:{gameState:this}}))
            }
            this.currentGuess = "";
            this.buildGuessContainerElements();
        } else {
            this.guessContainer.classList.add("inpErr");
        }
        if (!this.gameFinished && !this.isReplay) this.replayReader.readAsDataURL(new Blob([this.replay.encode()], { type: "application/octet-stream" }));
        this.buildUnusedLettersElements();
    }
    /**
     * 
     * @param {KeyboardEvent} e 
     */
    keyHandler(e) {
        this.guessContainer.classList.remove("inpErr");
        if (!this.gameFinished) {
            if (this.gameStarted) {
                this.replay.insert(e)
                if (!this.isReplay && e.keyCode != 13) this.replayReader.readAsDataURL(new Blob([this.replay.encode()], { type: "application/octet-stream" }));
            }
            this.modifyGuess(e.keyCode);
        }
    }
    /**
     * 
     * @param {ProgressEvent<FileReader>} e 
     * @param {string} key 
     */
    replayReaderHandler(e, key) {
        let gameStateObj = {
            expire: this.expire.getTime(),
            state: e.target.result.replace(/data:\S+\/\S+;base64,/,"").replaceAll("=","").replaceAll("+","-").replaceAll("/","_")
        };
        localStorage.setItem(key, JSON.stringify(gameStateObj));
    }
    /**
     * 
     * @param {number} code 
     */
    modifyGuess(code) {
        switch (code) {
            // Enter Key
            case 13:
                this.guess();
                break;
            // Backspace Key
            case 8:
            // Delete Key
            case 46:
                if (this.currentGuess.length > 0) this.currentGuess = this.currentGuess.substring(0, this.currentGuess.length - 1);
                this.buildGuessContainerElements();
                break;
            default:
                // Keys A-Z
                if (code > 64 && code < 91) {
                    if (this.currentGuess.length < 5) {
                        this.currentGuess += String.fromCharCode(code);
                    }
                }
                this.buildGuessContainerElements();
        }
    }
    buildGuessContainerElements() {
        this.guessContainer.innerHTML = "";
        for (let x = 0; x < 5; x++) {
            this.guessContainer.createChildNode("div", { class: "guessLetter" + (this.currentGuess.length == x + 1 ? " letterInp" : "") }, (div) => {
                div.createChildNode("div", { style: this.currentGuess[x] ? "" : "color:transparent;" }, this.currentGuess[x] ? this.currentGuess[x] : "_");
            });
        }
    }
    buildUnusedLettersElements() {
        this.buildTimerElement();
        this.unusedLettersContainer.innerHTML = "";
        let usedLetters = [];
        for (let guess of this.guesses) {
            for (let c = 0; c < guess.length; c++) {
                if (!usedLetters.includes(guess[c])) usedLetters.push(guess[c]);
            }
        }
        this.unusedLettersContainer.createChildNode("div", { class: "keyboardConatiner" }, (div) => {
            let rows = [
                [{ Q: 81 }, { W: 87 }, { E: 69 }, { R: 82 }, { T: 84 }, { Y: 89 }, { U: 85 }, { I: 73 }, { O: 79 }, { P: 80 }],
                [{ A: 65 }, { S: 83 }, { D: 68 }, { F: 70 }, { G: 71 }, { H: 72 }, { J: 74 }, { K: 75 }, { L: 76 }],
                [{ "↩": 13 }, { Z: 90 }, { X: 88 }, { C: 67 }, { V: 86 }, { B: 66 }, { N: 78 }, { M: 77 }, { "⌫": 46 }]
            ];
            div.createChildNode("div", { class: "keyboardHeader" }, (div) => {
                div.createChildNode("div", `Blitzdle ${this.isHard ? "🔶" : this.isEasy ? "🟢" : "🟦"}${this.isDaily ? "📆" : this.isCustom ? "🔧" : "🎲"}`);
                div.createChildNode("div", (div) => {
                    div.appendChild(this.timerElement);
                });
            });
            let hintData = {};
            for (let game of this.games) {
                if (game.solved) continue;
                let { correctLetters, couldHaveLetters } = game.getLetterHintData();
                for (let letter of correctLetters) {
                    hintData[letter] = 2;
                }
                for (let letter of couldHaveLetters) {
                    hintData[letter] = hintData[letter] || 1;
                }
            }
            for (let row of rows) {
                div.createChildNode("div", { class: "keyboardRow" }, (div) => {
                    for (let data of row) {
                        let char = Object.keys(data)[0];
                        let code = data[char];
                        let addEvent = (div) => {
                            if (code < 65) {
                                div.classList.add("wideKey");
                            }
                            div.addEventListener("click", () => {
                                if (!this.isReplay) this.keyHandler({ type: "keydown", keyCode: code });
                            });
                        };
                        let keyButton = div.createChildNode("div", { class: "keyButton" }, (div) => {
                            div.createChildNode("div", char);
                            addEvent(div);
                        });
                        if (!usedLetters.includes(char)) {
                            keyButton.classList.add("unused");
                        } else {
                            keyButton.classList.add("used");
                            if (hintData[char]) {
                                keyButton.classList.add(hintData[char] == 2 ? "keyCorrect" : "keyHasLetter");
                            }
                        }
                    }
                });
            }
        });
    }
    buildTimerElement() {
        this.timerElement = document.quickElement("div", { class: "timer" }, "00.00");
    }
    startTimer() {
        window.requestAnimationFrame(() => { this.updateTimer(); });
    }
    updateTimer() {
        if (this.timerElement) {
            if (this.gameStarted) {
                this.timerElement.innerHTML = MultiWordGame.formatTime(Date.now() - this.startTime);
            } else {
                this.timerElement.innerHTML = "00.00";
            }
        }
        if (this.gameFinished) {
            this.timerElement.innerHTML = MultiWordGame.formatTime(this.replay.timeOfLastKeyPress());
        } else {
            window.requestAnimationFrame(() => { this.updateTimer(); });
        }
    }
    initContainer() {
        this.guessContainer = this.container.createChildNode("div", { class: "guessContainer" });
        this.unusedLettersContainer = this.container.createChildNode("div", { class: "unusedLettersContainer" });
        // this.buildUnusedLettersElements();
        this.gamesContainer = this.container.createChildNode("div", { class: "gamesContainer" });
        this.buildGuessContainerElements();
        this.startTimer();
    }
    /**
     * 
     * @param {Element} elem 
     * @param {ReplayMap} replayMap 
     * @param {boolean} dataOnly 
     * @returns 
     */
    static async fromReplayMap(elem, replayMap, dataOnly) {
        let game = new MultiWordGame(elem, replayMap.settings);
        game.replay = replayMap;
        game.startTime = replayMap.timestamp;
        let { guesses, currentGuess } = await MultiWordGame.generateGuesses(replayMap.firstGuess, replayMap.actions);
        game.guesses = guesses;
        game.currentGuess = currentGuess;
        game.gameStarted = true;
        if (!dataOnly) game.start();
        return game;
    }
    /**
     * 
     * @param {[number,number,number,number,number]} firstGuess 
     * @param {[number,{type:"key",value:number}][]} data 
     * @returns 
     */
    static async generateGuesses(firstGuess, data) {
        let currentGuess = "";
        let lettersTyped = [...firstGuess, 13, ...data.filter(e=>e[1].type == "key").map(v=>v[1].value)];
        let guesses = [];
        for (let x = 0, xlen = lettersTyped.length; x < xlen; x++) {
            let code = lettersTyped[x];
            switch (code) {
                case 13:
                    if (currentGuess.length == 5 && !guesses.includes(currentGuess) && (await wordLists.completeWordList).includes(currentGuess)) {
                        guesses.unshift(currentGuess);
                        currentGuess = "";
                    }
                    break;
                case 8:
                case 46:
                    if (currentGuess.length > 0) currentGuess = currentGuess.substring(0, currentGuess.length - 1);
                    break;
                default:
                    if (code > 64 && code < 91) {
                        if (currentGuess.length < 5) {
                            currentGuess += String.fromCharCode(code);
                        }
                    }
            }
        }
        return { guesses, currentGuess };
    }
    /**
     * 
     * @param {Element} elem 
     * @param {ArrayBuffer} replay 
     * @param {boolean} dataOnly 
     * @returns 
     */
    static async fromReplay(elem, replay, dataOnly = false) {
        let replayData = new ReplayMap(replay);
        let gameSettings = {
            gameSeed: replayData.seed,
            dailyMode: replayData.isDaily,
            hardMode: replayData.isHard,
            customMode: replayData.isCustom,
            numWords: replayData.numWords,
            easyMode: replayData.isEasy,
            replayMode: true,
            startOnCreation: !dataOnly
        };
        let game = new MultiWordGame(elem, gameSettings);
        if (!dataOnly) {
            let firstGuess = replayData.firstGuess;
            for (let c = 0; c < firstGuess.length; c++) {
                window.setTimeout(() => {
                    game.keyHandler({ type:"keydown", keyCode: firstGuess[c] });
                }, 150*(c+1)); 
            }
            let actions = replayData.actions;
            window.setTimeout(() => {
                game.keyHandler({ keyCode: 13 });
                for (let action of actions) {
                    window.setTimeout(() => {
                        game.keyHandler({ type:"keydown", keyCode: action[1].value });
                    }, action[0]);
                }
            }, 900);
        } else {
            game.replay = data;
            let { guesses } = await MultiWordGame.generateGuesses(settings, data);
            game.guesses = guesses;
            game.gameFinished = true;
        }
        return {game,replayData};
    }
    /**
     * 
     * @param {number} mills 
     * @param {boolean} useMills 
     * @returns 
     */
    static formatTime(mills, useMills = true) {
        let hours = Math.floor(mills / 1000 / 60 / 60);
        let minutes = Math.floor(mills / 1000 / 60) % 60;
        let seconds = Math.floor(mills / 1000) % 60;
        let millis = mills.toString().slice(-3).slice(0, 2);
        let str = `${mills >= (1000 * 60 * 60) ? hours.toString().padStart(2, "0") + ":" : ""}${mills >= (1000 * 60) ? minutes.toString().padStart(2, "0") + ":" : ""}${seconds.toString().padStart(2, "0")}${useMills ? "." + millis : ""}`;
        return str;
    }
}

/**
 * @typedef {object} MultiWordGameSettings
 * @prop {boolean} dailyMode
 * @prop {boolean} hardMode
 * @prop {boolean} easyMode
 * @prop {boolean} customMode
 * @prop {boolean} replayMode
 * @prop {boolean} startOnCreation
 * @prop {number} gameSeed
 * @prop {number} numWords
 */

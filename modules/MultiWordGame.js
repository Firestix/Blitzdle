import { GameWordLists } from "./GameWordLists.js";
import { WordGame } from "./WordGame.js";
import { BitArray } from "./BitArray.js"

const wordLists = new GameWordLists();

wordLists.loadWordLists()

export class MultiWordGame extends EventTarget {
    container;
    guessContainer;
    unusedLettersContainer;
    gamesContainer;
    games = [];
    guesses = [];
    currentGuess = "";
    startTime;
    gameStarted;
    gameFinished;
    gameSeed;
    isDaily;
    isHard;
    isEasy;
    replay = [];
    isReplay;
    numWords;
    timerElement;
    expire;
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
        this.numWords = gameSettings.numWords;
        this.isDaily = gameSettings.dailyMode;
        this.isHard = gameSettings.hardMode;
        this.isEasy = gameSettings.easyMode;
        this.isReplay = gameSettings.replayMode;
        this.isCustom = gameSettings.customMode;
        this.gameSeed = gameSettings.gameSeed;
        this.replayReader = new FileReader();
        this.replayReader.onloadend = (e) => this.replayReaderHandler(e, "gameState");
        this.replay.push(Number(this.gameSeed));
        this.replay.push(this.isDaily ? 1 : 0);
        this.replay.push(this.isHard ? 1 : 0);
        this.replay.push(this.isCustom ? 1 : 0);
        this.replay.push(this.isEasy ? 1 : 0);
        this.replay.push(this.numWords);
        this.container = elem;
        this.expire = new Date();
        this.expire.setDate(this.expire.getDate() + 1);
        this.expire.setHours(0, 0, 0, 0);
        if (gameSettings.startOnCreation) {
            this.start();
        }
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
    pushCharToReplay(...chars) {
        let timestamp = Date.now();
        for (let char of chars) {
            this.replay.push(timestamp - this.startTime);
            this.replay.push(char);
        }

    }
    get finishTime() {
        if (this.replay.length < 12) return 0;
        return this.replay.at(-2);
    }
    async guess() {
        if (this.currentGuess.length == 5 && !this.guesses.includes(this.currentGuess) && (await wordLists.completeWordList).includes(this.currentGuess)) {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.startTime = Date.now();
                this.replay.push(this.startTime, ...this.currentGuess.split("").map(c => c.charCodeAt(0)));
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
                    dailyReader.readAsDataURL(new Blob([this.createReplayData()], { type: "application/octet-stream" }));
                    dailyReader.onloadend = (e) => this.replayReaderHandler(e, this.isHard ? "expert" : this.isEasy ? "easy" : "normal");
                }
                this.dispatchEvent(new CustomEvent("finished", {detail:{gameState:this}}))
            }
            this.currentGuess = "";
            this.buildGuessContainerElements();
        } else {
            this.guessContainer.classList.add("inpErr");
        }
        if (!this.gameFinished && !this.isReplay) this.replayReader.readAsDataURL(new Blob([this.createReplayData()], { type: "application/octet-stream" }));
        this.buildUnusedLettersElements();
    }
    keyHandler(e) {
        // console.log(e)
        this.guessContainer.classList.remove("inpErr");
        if (!this.gameFinished) {
            if (this.gameStarted) {
                this.pushCharToReplay(e.keyCode);
                // this.setReplayCookie();
            }
            this.modifyGuess(e.keyCode);
        }
    }
    replayReaderHandler(e, key) {
        // console.log(e.target.result)
        let gameStateObj = {
            expire: this.expire.getTime(),
            state: e.target.result.replace(/^data:application\/octet-stream;base64,/, "")
        };
        localStorage.setItem(key, JSON.stringify(gameStateObj));
        // console.log(new Blob(Object.values(localStorage)).size)
    }
    modifyGuess(code) {
        switch (code) {
            case 13:
                this.guess();
                break;
            case 8:
            case 46:
                if (this.currentGuess.length > 0) this.currentGuess = this.currentGuess.substring(0, this.currentGuess.length - 1);
                this.buildGuessContainerElements();
                break;
            default:
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
                // console.log(game)
                if (game.solved) continue;
                let { correctLetters, couldHaveLetters } = game.getLetterHintData();
                for (let letter of correctLetters) {
                    hintData[letter] = 2;
                }
                for (let letter of couldHaveLetters) {
                    hintData[letter] = hintData[letter] || 1;
                }
            }
            // console.log(hintData)
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
                                if (!this.isReplay) this.keyHandler({ keyCode: code });
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
                            // console.log(hintData[char])
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
            this.timerElement.innerHTML = MultiWordGame.formatTime(this.finishTime);
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
    static async fromGameState(elem, gameState, dataOnly = false) {
        let data = await MultiWordGame.parseReplayData(gameState);
        // console.log(data);
        let settings = data.splice(0, 12);
        let gameSettings = {
            gameSeed: settings[0],
            dailyMode: !!settings[1],
            hardMode: !!settings[2],
            customMode: !!settings[3],
            numWords: settings[5],
            easyMode: !!settings[4]
        };
        let game = new MultiWordGame(elem, gameSettings);
        // let game = new MultiWordGame(elem,Number(genData[3]),Number(genData[1]) == 1,genData[0],Number(genData[2]) == 1,false,false);
        game.replay = [...settings, ...data];
        game.startTime = settings[6];
        // console.log(lettersTyped)
        let { guesses, currentGuess } = await MultiWordGame.generateGuesses(settings, data);
        game.guesses = guesses;
        game.currentGuess = currentGuess;
        game.gameStarted = true;
        if (!dataOnly) game.start();
        return game;
    }
    static async generateGuesses(settings, data) {
        let currentGuess = "";
        let lettersTyped = [...settings.slice(7), 13, ...data.filter((e, i) => i % 2)];
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

    static async fromReplay(elem, replay, dataOnly = false) {
        let data = await MultiWordGame.parseReplayData(replay);
        let settings = data.splice(0, 12);
        // console.log(settings)
        let gameSettings = {
            gameSeed: settings[0],
            dailyMode: !!settings[1],
            hardMode: !!settings[2],
            customMode: !!settings[3],
            numWords: settings[5],
            easyMode: !!settings[4],
            replayMode: true,
            startOnCreation: !dataOnly
        };
        // console.log(gameSettings)
        let game = new MultiWordGame(elem, gameSettings);
        if (!dataOnly) {
            window.setTimeout(() => {
                game.keyHandler({ keyCode: settings[7] });
            }, 150);
            window.setTimeout(() => {
                game.keyHandler({ keyCode: settings[8] });
            }, 300);
            window.setTimeout(() => {
                game.keyHandler({ keyCode: settings[9] });
            }, 450);
            window.setTimeout(() => {
                game.keyHandler({ keyCode: settings[10] });
            }, 600);
            window.setTimeout(() => {
                game.keyHandler({ keyCode: settings[11] });
            }, 750);
            window.setTimeout(() => {
                game.keyHandler({ keyCode: 13 });
                for (let x = 0; x < data.length; x += 2) {
                    window.setTimeout(() => {
                        game.keyHandler({ keyCode: data[x + 1] });
                    }, data[x]);
                    // console.log(`keypress queued for ${data[x]}`)
                }
            }, 900);
        } else {
            game.replay = data;
            let { guesses } = await MultiWordGame.generateGuesses(settings, data);
            game.guesses = guesses;
            game.gameFinished = true;
        }
        return game;
    }
    static formatTime(mills, useMills = true) {
        let hours = Math.floor(mills / 1000 / 60 / 60);
        let minutes = Math.floor(mills / 1000 / 60) % 60;
        let seconds = Math.floor(mills / 1000) % 60;
        let millis = mills.toString().slice(-3).slice(0, 2);
        let str = `${mills >= (1000 * 60 * 60) ? hours.toString().padStart(2, "0") + ":" : ""}${mills >= (1000 * 60) ? minutes.toString().padStart(2, "0") + ":" : ""}${seconds.toString().padStart(2, "0")}${useMills ? "." + millis : ""}`;
        return str;
    }

    createReplayData() {
        let replay = this.replay;
        // console.log(replay)
        // console.log(replay.length)
        let arrayBuffer = new ArrayBuffer(20+((replay.length-12)*5/2));
        let settingsData = new DataView(arrayBuffer,0,20);
        let replayData = new DataView(arrayBuffer,20,arrayBuffer.byteLength-20);
        let bools = BitArray.from([replay[1],replay[2],replay[3],replay[4]]);
        // console.log(bools)
        // console.log(replayData.byteLength)
        settingsData.setUint8(0,1)                                          // replay file version
        settingsData.setUint32(1,replay[0],true)                            // seed
        settingsData.setUint8(5,bools.encode())   // isDaily, isHard, isCustom, isEasy
        settingsData.setUint8(6,replay[5])                                  // numWords
        settingsData.setFloat64(7,replay[6],true)                           // timestamp of first guess
        settingsData.setUint8(15,replay[7])                                 // first guess charcodes (next 5)
        settingsData.setUint8(16,replay[8])
        settingsData.setUint8(17,replay[9])
        settingsData.setUint8(18,replay[10])
        settingsData.setUint8(19,replay[11])
        let x = 0;
        let y = 12;
        if (replayData.byteLength > 0) {
            while (y-12 < replay.length-12) {
                replayData.setUint32(x,replay[y++],true)      // timestamp of keypress
                x += 4;
                replayData.setUint8(x++,replay[y++])          // keypress charcode
            }
        }
        // console.log(new Uint8Array(arrayBuffer))
        return arrayBuffer;
    }

    static async parseReplayData(buffer) {
        if (!buffer) return false;
        // console.log(buffer)
        let settingsView = new DataView(buffer,1,19);
        // console.log(new Uint8Array(settingsView.buffer))
        let replayView = new DataView(buffer,20,buffer.byteLength-20);
        // console.log(replayView.byteLength)
        let returnArray = [];
        returnArray.push(
            settingsView.getUint32(0,true),                     // seed
            ...new BitArray(settingsView.getUint8(4),4),    // isDaily, isHard, isCustom, isEasy
            settingsView.getUint8(5),                           // numWords
            settingsView.getFloat64(6,true),                    // timestamp of first guess
            settingsView.getUint8(14,true),                     // first guess charcodes (next 5)
            settingsView.getUint8(15,true),
            settingsView.getUint8(16,true),
            settingsView.getUint8(17,true),
            settingsView.getUint8(18,true)
        )
        let x = 0;
        while(x < replayView.byteLength) {
            // console.log(x)
            returnArray.push(replayView.getUint32(x,true))
            x += 4;
            returnArray.push(replayView.getUint8(x++))
        }
        // console.log(returnArray)
        return Array.from(returnArray)
    }
}

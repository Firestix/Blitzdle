let scriptTag = document.getElementById("gameScript");
let queryData = [...scriptTag.src.matchAll(/[\?&]([^=&]+)(?:=([^&=]+)|)/g)];
let queryVars = {};
for (let q of queryData) {
    queryVars[q[1]] = q[2];
}
let pageParams = new URLSearchParams(window.location.search);

import "./quickElement.js";
import { DialogBox } from "./modules/dialogBox.js";
import { WordList } from "./modules/WordList.js";
import { WordGame } from "./modules/WordGame.js";


let wordList, commonWordList, dialog;

// let completedDailies = {normal:false,expert:false};

async function init() {
    let wlr = await fetch("wordle.txt");
    let cwlr = await fetch("wordlecommon.txt");
    wordList = WordList.fromArray((await wlr.text()).split(/\r\n|\r|\n/g));
    commonWordList = WordList.fromArray((await cwlr.text()).split(/\r\n|\r|\n/g));
    let gameState = window.localStorage.getItem("gameState");
    let div = document.getElementById("game");
    if (gameState) {
        let parsedData = JSON.parse(gameState);
        // console.log(parsedData);
        if (parsedData.expire > Date.now()) {
            let buffer = await (await fetch(`data:application/octet-stream;base64,${parsedData.state}`)).arrayBuffer();
            // console.log(buffer)
            div.innerHTML = "";
            MultiWordGame.fromGameState(div,buffer);
        } else {
            localStorage.removeItem("gameState");
            generateMainPage();
        }
    } else if (pageParams.get("qg")) {
        console
        switch (pageParams.get("qg")) {
            case "normal":
                div.innerHTML = "";
                startGame(false);
                break;
            case "hard":
                div.innerHTML = "";
                startGame(false,true);
                break;
            default:
                generateMainPage();
        }
    } else {
        generateMainPage();
    }
}


function generateMainPage() {
    let div = document.getElementById("game");
    div.innerHTML = "";
    div.createChildNode("div",{class:"mainMenuContainer"},(div)=>{
        div.createChildNode("h1","Blitzdle");
        div.createChildNode("div",(div)=>{
            div.createChildNode("span","Based on ")
            div.createChildNode("a",{href:"https://www.nytimes.com/games/wordle/",target:"_blank"},"Wordle");
            div.createChildNode("span"," by ");
            div.createChildNode("a",{href:"https://www.powerlanguage.co.uk/",target:"_blank"},"Josh Wardle");
            div.createChildNode("span"," and hosted by ");
            div.createChildNode("a",{href:"https://twitter.com/NYTGames",target:"_blank"},"@NYTGames.");
        });
        div.createChildNode("br")
        div.createChildNode("button",{class:"smallButton"},"How To Play",(button)=>{
            button.addEventListener("click",howToPlayDialog);
        });
        div.createChildNode("h2","Daily");
        div.createChildNode("button",{class:"difficultyButton"},(button)=>{
            button.createChildNode("div","🟢Easy");
            button.addEventListener("click",()=>{
                setDailyDifficulty(div,"easy");
            });
        });
        div.createChildNode("br");
        div.createChildNode("button",{class:"difficultyButton"},(button)=>{
            button.createChildNode("div","🟦Normal");
            button.addEventListener("click",()=>{
                setDailyDifficulty(div,"normal");
            });
        });
        div.createChildNode("br");
        div.createChildNode("button",{class:"difficultyButton"},(button)=>{
            button.createChildNode("div","🔶Expert");
            button.addEventListener("click",()=>{
                setDailyDifficulty(div,"expert");
            });
        });
        div.createChildNode("h2","Random");
        div.createChildNode("button",{class:"difficultyButton"},(button)=>{
            button.createChildNode("div","🟦Normal");
            button.addEventListener("click",()=>{
                div.innerHTML = "";
                startGame(false);
            });
        })
        div.createChildNode("br");
        div.createChildNode("button",{class:"difficultyButton"},(button)=>{
            button.createChildNode("div","🔶Expert");
            button.addEventListener("click",()=>{
                div.innerHTML = "";
                startGame(false,true);
            });
        });
        div.createChildNode("br");
        div.createChildNode("br");
        div.createChildNode("button",{class:"smallButton"},"Custom Game",(button)=>{
            button.addEventListener("click",customGameDialog);
        })
        div.createChildNode("button",{class:"smallButton"},"View Replay",(button)=>{
            button.addEventListener("click",replayDialog);
        });
        div.createChildNode("br");
        div.createChildNode("br");
        div.createChildNode("div",{style:"font-size:10pt"},` v${queryVars["v"]}`);
    })
}

function setDailyDifficulty(div,difficulty) {
    let finishedGame = checkForFinishedGame(difficulty);
    if (finishedGame) {
        if (confirm(`You've already completed today's ${difficulty} game. Come back tomorrow for a new game.\r\n\r\nWould you like to download the replay file for this game?`)){
            fetch(`data:application/octet-stream;base64,${finishedGame.state}`).then(res=>res.arrayBuffer()).then(data=>{
                downloadFile("game_" + (new Date().toISOString()).replaceAll(/:/g,"_") + ".replay",data);
            })
        }
    } else {
        div.innerHTML = "";
        startGame(true,difficulty=="expert",false,false,difficulty=="easy" ? 1 : false);
    }
}

function checkForFinishedGame(type) {
    let savedGame = localStorage.getItem(type);
    if (savedGame) {
        savedGame = JSON.parse(savedGame);
        if (savedGame.expire < Date.now()) {
            localStorage.removeItem("normal");
            savedGame = false;
        }
    }
    return savedGame;
}

function customGameDialog() {
    dialog = new DialogBox({body:(div)=>{
        div.createChildNode("h2","Custom Game Settings");
        div.createChildNode("div",(div)=>{
            div.createChildNode("span","Word List: ")
            div.createChildNode("select",{id:"customWordList"},(select)=>{
                select.createChildNode("option",{value:"0"},"Normal")
                select.createChildNode("option",{value:"1"},"Expert")
            });
        });
        div.createChildNode("div",(div)=>{
            div.createChildNode("span","Words to Solve: ")
            div.createChildNode("input",{type:"number",min:0,max:255,value:4,id:"customNumWords"});
        });
        div.createChildNode("div","(Set to 0 for random)");
        div.createChildNode("div",(div)=>{
            div.createChildNode("span","Game Seed: ")
            div.createChildNode("input",{type:"text",id:"customSeed"});
        });
        div.createChildNode("div","(Leave blank for random)");
    },buttons:(div)=>{
        div.createChildNode("button",{class:"smallButton"},"Play",(button)=>{
            button.addEventListener("click",(e)=>{
                dialog.close(e);
            })
        });
        div.createChildNode("button",{class:"smallButton"},"Cancel",(button)=>{
            button.addEventListener("click",(e)=>{
                dialog.close(e);
            })
        });
    },modal:true,class:"dialogBox custom",openOnCreation:true});
    dialog.addEventListener("close",(e)=>{
        // console.log(e.detail.usingEvent.target)
        if (e.detail.usingEvent.target.innerText == "Play") {
            let hardMode = Number(dialog.body.querySelector("#customWordList").value);
            let seed = dialog.body.querySelector("#customSeed").value == "" ? false : dialog.body.querySelector("#customSeed").value;
            let numWords = Number(dialog.body.querySelector("#customNumWords").value);
            let div = document.getElementById("game");
            div.innerHTML = "";
            startGame(false,hardMode,true,seed,numWords);
        }
    })
}

function howToPlayDialog() {
    dialog = new DialogBox({body:(div)=>{
        div.createChildNode("h2","How to play");
        div.createChildNode("h3","Goal")
        div.createChildNode("p","Guess all of the 5 letter words as fast as possible.");
        div.createChildNode("p","To make a guess, use the keyboard to enter a 5 letter word, then press enter. After making a guess, use the letter clues to refine your next guess. Solve all the word puzzles to win!")
        div.createChildNode("h3","Letter Hints");
        div.createChildNode("div",{class:"exampleGame"},(div)=>{
            div.createChildNode("div",{class:"guessLetter correct"},'C');
            div.createChildNode("div",{class:"guessLetter incorrect"},'R');
            div.createChildNode("div",{class:"guessLetter incorrect"},'A');
            div.createChildNode("div",{class:"guessLetter hasLetter"},'N');
            div.createChildNode("div",{class:"guessLetter incorrect"},'E');
        });
        div.createChildNode("ul",(ul)=>{
            ul.createChildNode("li","Dark Gray means that this letter is not in the word.")
            ul.createChildNode("li","Yellow means that this letter is in the word, but it's not in this spot.")
            ul.createChildNode("li","Green means that this letter is in the word, and it's in this spot.")
        })
        div.createChildNode("h3","Hint Bar");
        div.createChildNode("p","As you make more guesses, the hint bar above each puzzle will keep track of the letter hints you've accumulated.")
        div.createChildNode("div",{class:"exampleGame"},(div)=>{
            div.createChildNode("div",{class:"hintsContainer"},(div)=>{
                div.createChildNode("div",{class:"hintContainer"},(div)=>{
                    div.createChildNode("div",{class:"smallHint hasLetter"},'C');
                    div.createChildNode("div",{class:"smallHint hasLetter used"},'I');
                });
                div.createChildNode("div",{class:"hintContainer"},(div)=>{
                    div.createChildNode("div",{class:"hint correct"},'I');
                });
                div.createChildNode("div",{class:"hintContainer"},(div)=>{
                    div.createChildNode("div",{class:"smallHint hasLetter used"},'I');
                    div.createChildNode("div",{class:"smallHint hasLetter"},'N');
                });
                div.createChildNode("div",{class:"hintContainer"},(div)=>{
                    div.createChildNode("div",{class:"smallHint hasLetter"},'C');
    
                    div.createChildNode("div",{class:"smallHint hasLetter"},'N');
                });
                div.createChildNode("div",{class:"hintContainer"},(div)=>{
                    div.createChildNode("div",{class:"smallHint hasLetter"},'C');
                    div.createChildNode("div",{class:"smallHint hasLetter used"},'I');
                    div.createChildNode("div",{class:"smallHint hasLetter"},'N');
                });
            });
            div.createChildNode("div",(div)=>{
                div.createChildNode("div",{class:"guessLetter hasLetter"},'N');
                div.createChildNode("div",{class:"guessLetter correct"},'I');
                div.createChildNode("div",{class:"guessLetter hasLetter"},'C');
                div.createChildNode("div",{class:"guessLetter incorrect"},'E');
                div.createChildNode("div",{class:"guessLetter incorrect"},'R');
            });
            div.createChildNode("div",(div)=>{
                div.createChildNode("div",{class:"guessLetter incorrect"},'M');
                div.createChildNode("div",{class:"guessLetter correct"},'I');
                div.createChildNode("div",{class:"guessLetter incorrect"},'R');
                div.createChildNode("div",{class:"guessLetter incorrect"},'E');
                div.createChildNode("div",{class:"guessLetter incorrect"},'S');
            });
            div.createChildNode("div",(div)=>{
                div.createChildNode("div",{class:"guessLetter incorrect"},'A');
                div.createChildNode("div",{class:"guessLetter incorrect"},'U');
                div.createChildNode("div",{class:"guessLetter incorrect"},'D');
                div.createChildNode("div",{class:"guessLetter hasLetter"},'I');
                div.createChildNode("div",{class:"guessLetter incorrect"},'O');
            });
        });
        div.createChildNode("ul",(ul)=>{
            ul.createChildNode("li","Small yellow letters mean that the letter could be in this spot.");
            ul.createChildNode("li","Larger green letters mean that the word has that letter in this spot.");
            ul.createChildNode("li","Faded yellow is the same as yellow, but indicates that you've already found a spot where this letter is used. This is to account for potential duplicate letters.");
        });
        div.createChildNode("h3","Results");
        div.createChildNode("ul",(ul)=>{
            ul.createChildNode("li","Time (⏱️): The time it took to guess all of the letter puzzles from your first guess to your final guess.");
            ul.createChildNode("li","Guesses (❓): The amount of valid guesses it took to solve all the puzzles.");
            ul.createChildNode("li","Accuracy (🎯): The ratio of your valid guesses vs. all of your guesses, as a percentage.");
        });
        div.createChildNode("h3","Game Modes");
        div.createChildNode("ul",(ul)=>{
            ul.createChildNode("li","Daily (📆): This puzzle is part of a daily puzzle. A new puzzle is generated every day.");
            ul.createChildNode("li","Random (🎲): This puzzle is randomly generated.");
            ul.createChildNode("li","Custom (🔧): This is a custom made puzzle.");
        });
        div.createChildNode("h3","Difficulties");
        div.createChildNode("ul",(ul)=>{
            ul.createChildNode("li","Easy (🟢): Generates a puzzle using a list of commonly used five letter words.");
            ul.createChildNode("li","Normal (🟦): Generates 2 - 4 puzzles using a list of commonly used five letter words.");
            ul.createChildNode("li","Expert (🔶): Generates 2 - 8 puzzles using a list of all valid five letter words.");
        });
    },buttons:(div)=>{
        div.createChildNode("button",{class:"smallButton"},"Close",(button)=>{
            button.addEventListener("click",(e)=>{
                dialog.close(e);
            })
        });
    },modal:true,class:"dialogBox howtoplay",openOnCreation:true})
}

function replayDialog() {
    let file = document.quickElement("input",{type:"file",accept:".replay"});
    file.addEventListener("change",(e)=>{
        const reader = new FileReader();
        reader.readAsArrayBuffer(e.target.files[0]);
        reader.onloadend = (e)=>{
            let div = document.getElementById("game");
            div.innerHTML = "";
            MultiWordGame.fromReplay(div,e.target.result);
        }
    })
    file.click();
}

function startGame(daily,hardMode=false,custom=false,seed = false,num = false) {
    let gameSeed;
    let numWords = num;
    if (custom && !isNaN(seed)) {
        let numSeed = Number(seed);
        if (numSeed >= 0 && numSeed < 4294967295) gameSeed = numSeed;
    }
    let rngSeed = seed ? seed.toString() : daily ? generateDailySeed(hardMode,!hardMode&&num==1) : Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString();
    let rng = new Math.seedrandom(rngSeed);
    gameSeed = gameSeed || Math.floor(rng()*4294967295);
    numWords = numWords || Math.floor(numWordsTransformFunc(rng()/(hardMode?1:2)));
    return new MultiWordGame(document.getElementById("game"),{
        numWords:numWords,
        dailyMode:daily,
        gameSeed:gameSeed,
        hardMode:hardMode,
        customMode:custom,
        easyMode:numWords==1&&!hardMode,
        startOnCreation:true
    });
}

function numWordsTransformFunc(x) {
    return Math.tan(x*2.5-1.15)+4.5
}

function generateDailySeed(hardMode,easyMode) {
    let today = new Date();
    return (hardMode ? "1" : easyMode ? "2" : "") + today.getFullYear().toString() + (today.getMonth()+1).toString().padStart(2,"0") + today.getDate().toString().padStart(2,"0");
}

class MultiWordGame {
    container;
    guessContainer;
    unusedLettersContainer;
    gamesContainer;
    games = [];
    guesses = [];
    currentGuess = "";
    startTime;
    finishTime;
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
    constructor(elem,settings) {
        let gameSettings = {
            dailyMode:false,
            hardMode:false,
            easyMode:false,
            customMode:false,
            replayMode:false,
            startOnCreation:false,
            ...settings
        }
        this.numWords = gameSettings.numWords;
        this.isDaily = gameSettings.dailyMode;
        this.isHard = gameSettings.hardMode;
        this.isEasy = gameSettings.easyMode;
        this.isReplay = gameSettings.replayMode;
        this.isCustom = gameSettings.customMode;
        this.gameSeed = gameSettings.gameSeed;
        this.replayReader = new FileReader();
        this.replayReader.onloadend = (e)=>this.replayReaderHandler(e,"gameState");
        this.replay.push(Number(this.gameSeed));
        this.replay.push(this.isDaily ? 1 : 0);
        this.replay.push(this.isHard ? 1 : 0);
        this.replay.push(this.isCustom ? 1 : 0);
        this.replay.push(this.isEasy ? 1 : 0);
        this.replay.push(this.numWords);
        this.container = elem;
        this.expire = new Date();
        this.expire.setDate(this.expire.getDate()+1);
        this.expire.setHours(0,0,0,0);
        if (gameSettings.startOnCreation) {
            this.start();
        }
    }
    start() {
        this.initContainer();
        let listToUse = this.isHard ? wordList.randomize(this.numWords,this.gameSeed) : commonWordList.randomize(this.numWords,this.gameSeed)
        for (let x = 0, xlen = listToUse.length; x < xlen; x++) {
            let div = this.gamesContainer.createChildNode("div",{class:"gameContainer"})
            this.games.push(new WordGame(div,x,listToUse[x],this.guesses));
        }
        this.buildUnusedLettersElements()
        if (!this.isReplay) {
            document.addEventListener("keydown",(e)=>{
                this.keyHandler(e);
            });
            this.guessContainer.addEventListener("animationend",(e)=>{
                this.guessContainer.classList.remove("inpErr");
            });
        }
    }
    pushCharToReplay(...chars) {
        let timestamp = Date.now();
        for (let char of chars) {
            this.replay.push(timestamp-this.startTime);
            this.replay.push(char);
        }
        
    }
    guess() {
        if (this.currentGuess.length == 5 && !this.guesses.includes(this.currentGuess) && wordList.includes(this.currentGuess)) {
            if (!this.gameStarted) {
                this.gameStarted = true;
                this.startTime = Date.now();
                this.replay.push(this.startTime,...this.currentGuess.split("").map(c=>c.charCodeAt(0)))
            }
            this.guesses.unshift(this.currentGuess);
            for (let g of this.games) {
                if (g.solved) continue;
                g.guess(this.currentGuess);
            }
            if (this.games.filter(g=>g.solved).length == this.games.length) {
                this.finishTime = Date.now();
                this.gameFinished = true;
                localStorage.removeItem("gameState")
                if (this.isDaily && !this.isReplay) {
                    let dailyReader = new FileReader();
                    dailyReader.readAsDataURL(new Blob([createReplayData(this)],{type:"application/octet-stream"}));
                    dailyReader.onloadend = (e)=>this.replayReaderHandler(e,this.isHard ? "expert" : this.isEasy ? "easy" : "normal");
                }
                endGameDialog(this);
            }
            this.currentGuess = "";
            this.buildGuessContainerElements();
        } else {
            this.guessContainer.classList.add("inpErr");
        }
        if (!this.gameFinished && !this.isReplay) this.replayReader.readAsDataURL(new Blob([createReplayData(this)],{type:"application/octet-stream"}));
        this.buildUnusedLettersElements();
    }
    keyHandler(e) {
        // console.log(e)
        this.guessContainer.classList.remove("inpErr");
        if (!this.gameFinished) {
            if (this.gameStarted){
                this.pushCharToReplay(e.keyCode);
                // this.setReplayCookie();
            }
            this.modifyGuess(e.keyCode);
        }
    }
    replayReaderHandler(e,key) {
        // console.log(e.target.result)
        let gameStateObj = {
            expire: this.expire.getTime(),
            state: e.target.result.replace(/^data:application\/octet-stream;base64,/,"")
        }
        localStorage.setItem(key,JSON.stringify(gameStateObj))
        // console.log(new Blob(Object.values(localStorage)).size)
    }
    modifyGuess(code) {
        switch(code) {
            case 13:
                this.guess();
                break;
            case 8:
            case 46:
                if (this.currentGuess.length > 0) this.currentGuess = this.currentGuess.substring(0,this.currentGuess.length-1);
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
            this.guessContainer.createChildNode("div",{class:"guessLetter" + (this.currentGuess.length == x+1 ? " letterInp" : "")},(div)=>{
                div.createChildNode("div",{style:this.currentGuess[x] ? "" : "color:transparent;"},this.currentGuess[x] ? this.currentGuess[x] : "_")
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
        this.unusedLettersContainer.createChildNode("div",{class:"keyboardConatiner"},(div)=>{
            let rows = [
                [{Q:81},{W:87},{E:69},{R:82},{T:84},{Y:89},{U:85},{I:73},{O:79},{P:80}],
                [{A:65},{S:83},{D:68},{F:70},{G:71},{H:72},{J:74},{K:75},{L:76}],
                [{"↩":13},{Z:90},{X:88},{C:67},{V:86},{B:66},{N:78},{M:77},{"⌫":46}]
            ];
            div.createChildNode("div",{class:"keyboardHeader"},(div)=>{
                div.createChildNode("div",`Blitzdle ${this.isHard ? "🔶" : this.isEasy ? "🟢" : "🟦"}${this.isDaily ? "📆" : this.isCustom ? "🔧" : "🎲"}`)
                div.createChildNode("div",(div)=>{
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
                div.createChildNode("div",{class:"keyboardRow"},(div)=>{
                    for (let data of row) {
                        let char = Object.keys(data)[0];
                        let code = data[char];
                        let addEvent = (div) => {
                            if (code < 65) {
                                div.classList.add("wideKey")
                            }
                            div.addEventListener("click",()=>{
                                if (!this.isReplay) this.keyHandler({keyCode:code});
                            })
                        }
                        let keyButton = div.createChildNode("div",{class:"keyButton"},(div)=>{
                            div.createChildNode("div",char);
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
    buildTimerElement(){
        this.timerElement = document.quickElement("div",{class:"timer"},"00.00");
    }
    startTimer(){
        window.requestAnimationFrame(()=>{this.updateTimer()});
    }
    updateTimer(){
        if (this.gameStarted) {
            this.timerElement.innerHTML = formatTime(Date.now() - this.startTime);
        } else {
            this.timerElement.innerHTML = "00.00";
        }
        if (this.gameFinished) {
            this.timerElement.innerHTML = formatTime(this.finishTime - this.startTime);
        } else {
            window.requestAnimationFrame(()=>{this.updateTimer()});
        }
    }
    initContainer() {
        this.guessContainer = this.container.createChildNode("div",{class:"guessContainer"});
        this.unusedLettersContainer = this.container.createChildNode("div",{class:"unusedLettersContainer"});
        // this.buildUnusedLettersElements();
        this.gamesContainer = this.container.createChildNode("div",{class:"gamesContainer"});
        this.buildGuessContainerElements();
        this.startTimer();
    }
    static async fromGameState(elem,gameState) {
        let data = await parseReplayData(gameState);
        // console.log(data);
        let settings = data.splice(0,12);
        let gameSettings = {
            gameSeed:settings[0],
            dailyMode:!!settings[1],
            hardMode:!!settings[2],
            customMode:!!settings[3],
            numWords:settings[5],
            easyMode:!!settings[4]
        }
        let game = new MultiWordGame(elem,gameSettings);
        // let game = new MultiWordGame(elem,Number(genData[3]),Number(genData[1]) == 1,genData[0],Number(genData[2]) == 1,false,false);
        game.replay = [...settings,...data];
        game.startTime = settings[6];
        let lettersTyped = [...settings.slice(7),13,...data.filter((e,i)=>i%2)];
        // console.log(lettersTyped)
        let guesses = [];
        let currentGuess = "";
        for (let x = 0, xlen = lettersTyped.length; x < xlen; x++) {
            let code = lettersTyped[x];
            switch(code) {
                case 13:
                    if (currentGuess.length == 5 && !guesses.includes(currentGuess) && wordList.includes(currentGuess)) {
                        guesses.unshift(currentGuess)
                        currentGuess = "";
                    }
                    break;
                case 8:
                case 46:
                    if (currentGuess.length > 0) currentGuess = currentGuess.substring(0,currentGuess.length-1);
                    break;
                default:
                    if (code > 64 && code < 91) {
                        if (currentGuess.length < 5) {
                            currentGuess += String.fromCharCode(code);
                        }
                    }
            }
        }
        game.guesses = guesses;
        game.currentGuess = currentGuess;
        game.gameStarted = true;
        game.start();
    }
    static async fromReplay(elem,replay) {
        let data = await parseReplayData(replay);
        let settings = data.splice(0,12);
        // console.log(settings)
        let gameSettings = {
            gameSeed:settings[0],
            dailyMode:!!settings[1],
            hardMode:!!settings[2],
            customMode:!!settings[3],
            numWords:settings[5],
            easyMode:!!settings[4],
            replayMode:true,
            startOnCreation:true
        }
        // console.log(gameSettings)
        let game = new MultiWordGame(elem,gameSettings);
        window.setTimeout(()=>{
            game.keyHandler({keyCode:settings[7]})
        },150)
        window.setTimeout(()=>{
            game.keyHandler({keyCode:settings[8]})
        },300)
        window.setTimeout(()=>{
            game.keyHandler({keyCode:settings[9]})
        },450)
        window.setTimeout(()=>{
            game.keyHandler({keyCode:settings[10]})
        },600)
        window.setTimeout(()=>{
            game.keyHandler({keyCode:settings[11]})
        },750)
        window.setTimeout(()=>{
            game.keyHandler({keyCode:13})
            for (let x = 0; x < data.length; x+=2) {
                window.setTimeout(()=>{
                    game.keyHandler({keyCode:data[x+1]})
                },data[x])
                // console.log(`keypress queued for ${data[x]}`)
            }
        },900)
    }
}

function endGameDialog(gameState) {
    dialog = new DialogBox({body:(div)=>{
        div.createChildNode("h2","GREAT!");
        div.createChildNode("div",{class:"statusContainer"},(div)=>{
            div.createChildNode("div",{class:"stat"},(div)=>{
                div.createChildNode("span","Time:");
                div.createChildNode("span",formatTime(gameState.finishTime - gameState.startTime));
            });
            div.createChildNode("div",{class:"stat"},(div)=>{
                div.createChildNode("span","Guesses:");
                div.createChildNode("span",gameState.guesses.length.toString());
            });
            div.createChildNode("div",{class:"stat"},(div)=>{
                div.createChildNode("span","Accuracy:");
                div.createChildNode("span",calculateAccuracy(gameState));
            });
        });
        div.createChildNode("h2","WORDS:");
        div.createChildNode("div",{class:"definitionsContainer"},(div)=>{
            for (let game of gameState.games) {
                div.createChildNode("div",{class:"definition"},(div)=>{
                    div.createChildNode("span",game.getAnswer())
                    div.createChildNode("a",{class:"defButton",target:"_blank",href:"https://www.scrabble-solver.com/define/" + game.getAnswer()}, "?")
                })
            }
        })
    },buttons:(div)=>{
        if (!gameState.isReplay) {
            div.createChildNode("button",{class:"smallButton"},"Share",(button)=>{
                button.addEventListener("click",()=>{
                    shareClipboard(gameState);
                })
            });
            div.createChildNode("button",{class:"smallButton"},"Save Replay",(button)=>{
                button.addEventListener("click",(e)=>{
                    downloadReplay(gameState);
                })
            });
        }
        div.createChildNode("button",{class:"smallButton"},"Menu",(button)=>{
            button.addEventListener("click",(e)=>{
                generateMainPage();
                dialog.close(e);
            })
        });
    },modal:true,openOnCreation:true});
    return dialog;
}

function formatTime(mills,useMills = true) {
    let hours = Math.floor(mills/1000/60/60);
    let minutes = Math.floor(mills/1000/60)%60;
    let seconds = Math.floor(mills/1000)%60;
    let millis = mills.toString().slice(-3).slice(0,2);
    let str = `${mills >= (1000*60*60) ? hours.toString().padStart(2,"0") + ":" : ""}${mills >= (1000*60) ? minutes.toString().padStart(2,"0") + ":" : ""}${seconds.toString().padStart(2,"0")}${useMills ? "." + millis : ""}`
    return str;
}

function calculateAccuracy(gameState) {
    let enterKeys = gameState.replay.slice(12).filter((e,i)=>i%2).filter(e=>e==13).length+1;
    let acc = gameState.guesses.length / enterKeys * 100;
    return acc.toFixed(1) + "%";
}

function shareClipboard(gameState) {
    let startDate = new Date(gameState.startTime);
    let time = formatTime(gameState.finishTime - gameState.startTime);
    let hard = gameState.isHard ? "🔶" : gameState.isEasy ? "🟢" : "🟦";
    let daily = `${hard}${gameState.isDaily ? "📆:" + startDate.getFullYear() + "-" + (startDate.getMonth()+1) + "-" + startDate.getDate() : gameState.isCustom ? "🔧" : "🎲"}`;
    let seeds = gameState.isDaily ? "" : `\n🌱:${gameState.gameSeed} (x${gameState.numWords})`;
    let newClip = `Blitzdle ${daily}
⏱️:${time}
❓:${gameState.guesses.length}
🎯:${calculateAccuracy(gameState)}${seeds}
https://firestix.github.io/Blitzdle/`;
    navigator.permissions.query({name: "clipboard-write"}).then(result => {
        if (result.state == "granted" || result.state == "prompt") {
            navigator.clipboard.writeText(newClip).then(()=>{
                alert("Results copied to clipboard.");
            });
        }
    },()=>{
        let ta = document.body.createChildNode("textarea",newClip);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("Results copied to clipboard.");
    })
}

function downloadReplay(gameState) {
    downloadFile("game_" + (new Date().toISOString()).replaceAll(/:/g,"_") + ".replay",createReplayData(gameState))
}

function downloadFile(filename,data) {
	let file = new File([data],filename,{type:"application/octet-stream"});
	let url = window.URL.createObjectURL(file);
	let a = document.body.createChildNode("a",{href:url,download:filename});
	a.click();
	document.body.removeChild(a);
	window.URL.revokeObjectURL(url);
}

function createReplayData(gameState) {
    let replay = gameState.replay;
    // console.log(replay)
    // console.log(replay.length)
    let arrayBuffer = new ArrayBuffer(20+((replay.length-12)*5/2));
    let settingsData = new DataView(arrayBuffer,0,20);
    let replayData = new DataView(arrayBuffer,20,arrayBuffer.byteLength-20);
    // console.log(replayData.byteLength)
    settingsData.setUint8(0,1)                                          // replay file version
    settingsData.setUint32(1,replay[0],true)                            // seed
    settingsData.setUint8(5,encodeBinaryValue([replay[1],replay[2],replay[3],replay[4]]))   // isDaily, isHard, isCustom, isEasy
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

async function parseReplayData(buffer) {
    if (!buffer) return false;
    // console.log(buffer)
    let settingsView = new DataView(buffer,1,19);
    // console.log(new Uint8Array(settingsView.buffer))
    let replayView = new DataView(buffer,20,buffer.byteLength-20);
    // console.log(replayView.byteLength)
    let returnArray = [];
    returnArray.push(
        settingsView.getUint32(0,true),                     // seed
        ...parseBinaryValue(settingsView.getUint8(4),4),    // isDaily, isHard, isCustom, isEasy
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

function parseBinaryValue(num,bitLength) {
    let array = [];
    let y = num;
    for (let x = 0; x < bitLength; x++) {
        array.push(!!(y & 1));
        y >>>= 1;
    }
    return array;
}
function encodeBinaryValue(bits) {
    bits.reverse();
    let num = 0;
    for (let x = 0; x < Math.min(bits.length,32); x++) {
        num <<= 1;
        if (bits[x]) num += 1;
    }
    return num;
}

init();
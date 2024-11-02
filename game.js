let scriptTag = document.getElementById("gameScript");
let queryData = [...scriptTag.src.matchAll(/[\?&]([^=&]+)(?:=([^&=]+)|)/g)];
let queryVars = {};
for (let q of queryData) {
    queryVars[q[1]] = q[2];
}
let pageParams = new URLSearchParams(window.location.search);

import "./quickElement.js";
import { DialogBox } from "./modules/dialogBox.js";
import { MultiWordGame } from "./modules/MultiWordGame.js";
import { BitArray } from "./modules/BitArray.js";
import { isMobile } from "./modules/MobileRegex.js";

let dialog;

// let completedDailies = {normal:false,expert:false};

async function init() {
    let gameState = window.localStorage.getItem("gameState");
    let div = document.getElementById("game");
    if (gameState) {
        let parsedData = JSON.parse(gameState);
        // console.log(parsedData);
        if (parsedData.expire > Date.now()) {
            let buffer = await fetch(`data:application/octet-stream;base64,${parsedData.state}`).then(res=>res.arrayBuffer());
            // console.log(buffer)
            div.innerHTML = "";
            MultiWordGame.fromGameState(div,buffer);
        } else {
            localStorage.removeItem("gameState");
            generateMainPage();
        }
    } else if (pageParams.get("qg")) {
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
            MultiWordGame.fromReplay(div,e.target.result).then((mwg)=>{
                mwg.addEventListener("finished",(e)=>{
                    endGameDialog(e.detail.gameState);
                })
            });
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
    let mwg = new MultiWordGame(document.getElementById("game"),{
        numWords:numWords,
        dailyMode:daily,
        gameSeed:gameSeed,
        hardMode:hardMode,
        customMode:custom,
        easyMode:numWords==1&&!hardMode,
        startOnCreation:true
    });
    mwg.addEventListener("finished",(e)=>{
        endGameDialog(e.detail.gameState);
    }) 
}

function numWordsTransformFunc(x) {
    return Math.tan(x*2.5-1.15)+4.5
}

function generateDailySeed(hardMode,easyMode) {
    let today = new Date();
    return (hardMode ? "1" : easyMode ? "2" : "") + today.getFullYear().toString() + (today.getMonth()+1).toString().padStart(2,"0") + today.getDate().toString().padStart(2,"0");
}

function endGameDialog(gameState) {
    dialog = new DialogBox({body:(div)=>{
        div.createChildNode("h2","GREAT!");
        div.createChildNode("div",{class:"statusContainer"},(div)=>{
            div.createChildNode("div",{class:"stat"},(div)=>{
                div.createChildNode("span","Time:");
                div.createChildNode("span",MultiWordGame.formatTime(gameState.finishTime - gameState.startTime));
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

function calculateAccuracy(gameState) {
    let enterKeys = gameState.replay.slice(12).filter((e,i)=>i%2).filter(e=>e==13).length+1;
    let acc = gameState.guesses.length / enterKeys * 100;
    return acc.toFixed(1) + "%";
}

function shareClipboard(gameState) {
    let startDate = new Date(gameState.startTime);
    let time = MultiWordGame.formatTime(gameState.finishTime - gameState.startTime);
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
    downloadFile("game_" + (new Date().toISOString()).replaceAll(/:/g,"_") + ".replay",gameState.createReplayData())
}

function downloadFile(filename,data) {
	let file = new File([data],filename,{type:"application/octet-stream"});
	let url = window.URL.createObjectURL(file);
	let a = document.body.createChildNode("a",{href:url,download:filename});
	a.click();
	document.body.removeChild(a);
	window.URL.revokeObjectURL(url);
}


init();
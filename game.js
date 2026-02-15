let scriptTag = document.getElementById("gameScript");
let queryData = [...scriptTag.src.matchAll(/[\?&]([^=&]+)(?:=([^&=]+)|)/g)];
let queryVars = {};
for (let q of queryData) {
    queryVars[q[1]] = q[2];
}
let pageParams = new URLSearchParams(window.location.search);

import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

import "./quickElement.js";
import { DialogBox } from "./modules/dialogBox.js";
import { MultiWordGame } from "./modules/MultiWordGame.js";
import { isMobile } from "./modules/MobileRegex.js";
import { ReplayMap } from "./modules/Replay.js";

let dialog;

async function init() {
    let gameState = window.localStorage.getItem("gameState");
    let div = document.getElementById("game");
    if (gameState) {
        let parsedData = JSON.parse(gameState);
        if (parsedData.expire > Date.now()) {
            let replayData = await ReplayMap.fromEncodedData(encodeBase64FromUrl(parsedData.state));
            div.innerHTML = "";
            let mwg = await MultiWordGame.fromReplayMap(div,replayData);
            mwg.addEventListener("finished",(e)=>{
                endGameDialog(e.detail.gameState);
            }) 
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
        let lastVersionSeen = window.localStorage.getItem("lastVersionSeen");
        if (!lastVersionSeen || (lastVersionSeen && lastVersionSeen != queryVars["v"])) {
            try {
                openChangelogDialog();
            } catch (e) {
                console.error(e);
            } finally {
                window.localStorage.setItem("lastVersionSeen",queryVars["v"])
            }
        }
    }
}

/**
 * 
 * @param {string} str 
 * @returns 
 */
function encodeBase64FromUrl(str) {
    let returnStr = str.replaceAll("-","+").replaceAll("_","/");
    let neededPaddingChars = Math.abs(returnStr.length % 4 - 4) % 4;
    return returnStr.padEnd(returnStr.length + neededPaddingChars,"=");
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
            button.addEventListener("click",()=>{openStaticDialog("how_to_play")});
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
        div.createChildNode("button",{class:"smallButton"},"Credits",(button)=>{
            button.addEventListener("click",()=>{openStaticDialog("credits")});
        });
        div.createChildNode("br");
        div.createChildNode("br");
        div.createChildNode("div",{class:"version"},` v${queryVars["v"]}`,(div)=>{
            div.addEventListener("click",()=>{openChangelogDialog()})
        });
    })
}

/**
 * 
 * @param {Element} div 
 * @param {"easy" | "normal" | "expert"} difficulty 
 */
async function setDailyDifficulty(div,difficulty) {
    let finishedGame = checkForFinishedGame(difficulty);
    if (finishedGame) {
        let replayData = await ReplayMap.fromEncodedData(encodeBase64FromUrl(finishedGame.state));
        let gameState = await MultiWordGame.fromReplayMap(div,replayData,true);
        finishedDailyGameDialog(gameState,difficulty);
    } else {
        div.innerHTML = "";
        startGame(true,difficulty=="expert",false,false,difficulty=="easy" ? 1 : false);
    }
}

/**
 * 
 * @param {"easy" | "normal" | "expert"} type 
 * @returns 
 */
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

async function openStaticDialog(mdName) {
    let md = await fetch(`./dialogs/${mdName}.md`);
    if (md.status !== 200) throw "File not found";
    dialog = new DialogBox({body:async (div)=>{
        div.innerHTML = marked.parse(await fetch(`./dialogs/${mdName}.md`).then(res=>res.text()))
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
            MultiWordGame.fromReplay(div,e.target.result).then((obj)=>{
                obj.game.addEventListener("finished",async (e)=>{
                    endGameDialog(obj.game);
                })
            });
        }
    })
    file.click();
}

/**
 * 
 * @param {boolean} daily 
 * @param {boolean} hardMode 
 * @param {boolean} custom 
 * @param {boolean} seed 
 * @param {boolean} num 
 */
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

/**
 * 
 * @param {number} x 
 * @returns 
 */
function numWordsTransformFunc(x) {
    return Math.tan(x*2.5-1.15)+4.5
}

/**
 * 
 * @param {boolean} hardMode 
 * @param {boolean} easyMode 
 * @returns 
 */
function generateDailySeed(hardMode,easyMode) {
    let today = new Date();
    return (hardMode ? "1" : easyMode ? "2" : "") + today.getFullYear().toString() + (today.getMonth()+1).toString().padStart(2,"0") + today.getDate().toString().padStart(2,"0");
}

/**
 * 
 * @param {MultiWordGame} gameState 
 * @returns 
 */
function endGameDialog(gameState) {
    dialog = new DialogBox({body:(div)=>{
        div.createChildNode("h2","GREAT!");
        div.createChildNode("div",{class:"statusContainer"},(div)=>{
            createStatBlock(div,gameState)
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

function createStatBlock(div,gameState){
    div.createChildNode("div",{class:"stat"},(div)=>{
        div.createChildNode("span","Time:");
        div.createChildNode("span",MultiWordGame.formatTime(gameState.replay.timeOfLastKeyPress()));
    });
    div.createChildNode("div",{class:"stat"},(div)=>{
        div.createChildNode("span","Guesses:");
        div.createChildNode("span",gameState.guesses.length.toString());
    });
    div.createChildNode("div",{class:"stat"},(div)=>{
        div.createChildNode("span","Accuracy:");
        div.createChildNode("span",calculateAccuracy(gameState));
    });
}

function finishedDailyGameDialog(gameState) {
    let hard = gameState.isHard ? "🔶" : gameState.isEasy ? "🟢" : "🟦";

    dialog = new DialogBox({body:(div)=>{
        div.createChildNode("h2",`${hard}📆 Game Finished`);
        div.createChildNode("p","Come back tomorrow for a new daily game.")
        div.createChildNode("p",`Game Started: ${new Date(gameState.startTime).toLocaleString("en-US")}`)
        div.createChildNode("div",{class:"statusContainer"},(div)=>{
            createStatBlock(div,gameState)
        });
    },buttons:(div)=>{
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
    let enterKeys = gameState.replay.actions.filter(v=>v[1].type == "key" && v[1].value == 13).length+1;
    let acc = gameState.guesses.length / enterKeys * 100;
    return acc.toFixed(1) + "%";
}

function shareClipboard(gameState) {
    let startDate = new Date(gameState.replay.timestamp);
    let time = MultiWordGame.formatTime(gameState.replay.timeOfLastKeyPress());
    let hard = gameState.isHard ? "🔶" : gameState.isEasy ? "🟢" : "🟦";
    let platform = isMobile() ? "📱" : "💻";
    let daily = `${hard}${platform}${gameState.isDaily ? "📆:" + startDate.getFullYear() + "-" + (startDate.getMonth()+1) + "-" + startDate.getDate() : gameState.isCustom ? "🔧" : "🎲"}`;
    let seeds = gameState.isDaily ? "" : `\n🌱:${gameState.gameSeed} (x${gameState.numWords})`;
    let newClip = `Blitzdle ${daily}
⏱️:${time}
❓:${gameState.guesses.length}
🎯:${calculateAccuracy(gameState)}${seeds}
${window.location}`;
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
    downloadFile("game_" + (new Date().toISOString()).replaceAll(/:/g,"_") + ".replay",gameState.replay.encode())
}

function downloadFile(filename,data) {
	let file = new File([data],filename,{type:"application/octet-stream"});
	let url = window.URL.createObjectURL(file);
	let a = document.body.createChildNode("a",{href:url,download:filename});
	a.click();
	document.body.removeChild(a);
	window.URL.revokeObjectURL(url);
}

function openChangelogDialog() {
    openStaticDialog(`changelog_${queryVars["v"]}`);
}

init();
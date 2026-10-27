import { queryVars } from "./modules/QueryVars.js";
import { pageParams } from "./modules/PageParams.js";
import { appSettings } from "./modules/AppSettings.js";

setDisplayMode(appSettings.settings.displayMode)

let swRegistration = undefined
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(`./sw.js?v=${queryVars["v"]}${pageParams.get("rmsw") !== null || pageParams.get("vscode-livepreview") ? "&rmsw" : ""}`,{scope:"/Blitzdle/"}).then((reg)=>{
        swRegistration = reg;
        init();
    },(err)=>{
        console.error(err);
        init();
    })
} else {
    init();
}

import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

import "./quickElement.js";
import { DialogBox } from "./modules/dialogBox.js";
import { MultiWordGame } from "./modules/MultiWordGame.js";
import { isMobile } from "./modules/MobileRegex.js";
import { ReplayMap } from "./modules/Replay.js";
import { createTitle } from "./modules/Title.js";
import { GameWordLists } from "./modules/GameWordLists.js";
import { WordList } from "./modules/WordList.js";
import { BitArray } from "./modules/BitArray.js";

let dialog;
/** @type {GameWordLists} */
let wordLists;
let mainDiv = document.getElementById("game");

async function init() {
    let gameState = window.localStorage.getItem("gameState");
    if (gameState) {
        let parsedData = JSON.parse(gameState);
        if (parsedData.expire > Date.now()) {
            let replayData = await ReplayMap.fromEncodedData(encodeBase64FromUrl(parsedData.state));
            let mwg = await MultiWordGame.fromReplayMap(mainDiv,replayData);
            mwg.addEventListener("finished",(e)=>{
                endGameDialog(e.detail.gameState);
            }) 
        } else {
            localStorage.removeItem("gameState");
            generateMainPage();
        }
    } else if (pageParams.get("dg")) {
        let diff = pageParams.get("dg");
        if (diff == "easy" || diff == "normal" || diff == "expert") {
            if (setDailyDifficulty(mainDiv,diff)) {
                openApp();
            }
        } else {
            openApp();
        }
    } else if (pageParams.get("qg")) {
        switch (pageParams.get("qg")) {
            case "normal":
                startGame(false);
                break;
            case "hard":
                startGame(false,true);
                break;
            default:
                openApp();
        }
    } else if (pageParams.get("cg")) {
        try {
            await startCustomGame(pageParams.get("cg"))
        } catch (e) {
            console.error(e);
            openApp();
        }
    } else {
        openApp();
    }
}

function openApp() {
    generateMainPage();
    let lastVersionSeen = window.localStorage.getItem("lastVersionSeen");
    if (!lastVersionSeen || (lastVersionSeen && lastVersionSeen != queryVars["v"].replaceAll(/[a-z]/g, ""))) {
        try {
            openChangelogDialog();
        } catch (e) {
            console.error(e);
        } finally {
            window.localStorage.setItem("lastVersionSeen", queryVars["v"].replaceAll(/[a-z]/g, ""));
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
    mainDiv.innerHTML = "";
    mainDiv.createChildNode("div",{class:"mainMenuContainer"},(div)=>{
        //div.createChildNode("h1","Blitzdle");
        div.createChildNode("div",{class:"title"},(div)=>{
            createTitle(div);
            div.createChildNode("br")
            div.createChildNode("div",{class:"version"},` v${queryVars["v"]}`,(div)=>{
                div.addEventListener("click",()=>{openChangelogDialog()})
            });
        });
        div.createChildNode("div",(div)=>{
            div.createChildNode("span","Based on ")
            div.createChildNode("a",{href:"https://www.nytimes.com/games/wordle/",target:"_blank"},"Wordle");
            div.createChildNode("span"," by ");
            div.createChildNode("a",{href:"https://www.powerlanguage.co.uk/",target:"_blank"},"Josh Wardle");
            div.createChildNode("span"," and hosted by ");
            div.createChildNode("a",{href:"https://twitter.com/NYTGames",target:"_blank"},"@NYTGames.");
        });
        div.createChildNode("div",(div)=>{
            window.addEventListener("appinstalled", (e) => {
                div.parentElement.removeChild(div);
            })
            window.addEventListener("beforeinstallprompt",(e)=>{
                console.log(e)
                e.preventDefault();
                if (div.children.length > 0) div.innerHTML = "";
                div.createChildNode("button",{class:"smallButton"},isMobile() ? "Add to Home Screen" : "Install Blitzdle",(button)=>{
                    button.addEventListener("click",async ()=>{
                        let res = await e.prompt();
                        if (res.outcome == "accepted") div.style.display = "hidden";
                    })
                })
            })
        })
        div.createChildNode("button",{class:"smallButton"},"How To Play",(button)=>{
            button.addEventListener("click",()=>{openStaticDialog("how_to_play")});
        });
        div.createChildNode("h2","📆Daily");
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
        div.createChildNode("h2","🎲Random");
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
        div.createChildNode("h2","🔧Custom");
        div.createChildNode("button",{class:"difficultyButton"},"🌱Play",(button)=>{
            button.addEventListener("click",customGameDialog);
        })
        div.createChildNode("button",{class:"difficultyButton"},"📝Create",(button)=>{
            button.addEventListener("click",createCustomGameDialog);
        })
        div.createChildNode("br");
        div.createChildNode("br");
        div.createChildNode("button",{class:"smallButton"},"📋Settings",(button)=>{
            button.addEventListener("click",()=>{openSettingsDialog()});
        });
        div.createChildNode("button",{class:"smallButton"},"📺View Replay",(button)=>{
            button.addEventListener("click",replayDialog);
        });
        div.createChildNode("button",{class:"smallButton"},"🪪Credits",(button)=>{
            button.addEventListener("click",()=>{openStaticDialog("credits")});
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
        return finishedGame;
    } else {
        div.innerHTML = "";
        startGame(true,difficulty=="expert",false,false,difficulty=="easy" ? 1 : false);
        return false;
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

function customGameDialog(event,gameCode=false) {
    dialog = new DialogBox({body:(div)=>{
        div.createChildNode("h2","Custom Game");
        let textArea = document.quickElement("textarea",{id:"customGameStr",autocomplete:"off", autocorrect:"off", autocapitalize:"off", spellcheck:"false", placeholder:"🌱 Paste your custom game string here (YmxpdHpkbGUDB....)"},(textarea)=>{
            if (gameCode) textarea.value = gameCode;
        });
        div.createChildNode("div",(div)=>{
            div.appendChild(textArea)
        })
        div.createChildNode("div",(div)=>{
            if (gameCode) {
                div.createChildNode("button","Copy Game String",(button)=>{
                    button.addEventListener("click",()=>{
                        if (textArea.value != "") {
                            copyTextToClipboard(textArea.value,()=>{
                                alert("Game string copied to clipboard.");
                            })
                        }
                    })
                });
            } else {
                div.createChildNode("button","Paste Game String",(button)=>{
                    button.addEventListener("click",()=>{
                        navigator.permissions.query({ name: "clipboard-read" }).then(result => {
                            if (result.state == "granted" || result.state == "prompt") {
                                navigator.clipboard.readText().then((result)=>{
                                    textArea.value = result;
                                    alert("Pasted contents of clipboard.")
                                });
                            }
                        },()=>{
                            textArea.select();
                            document.execCommand("paste");
                            alert("Pasted contents of clipboard.")
                        })
                    })
                });
            }
        })
        if (gameCode) {
            div.createChildNode("div",{style:"font-style: italic;"},"(Your generated game is in the text box above. Copy it to share or press Play to play it yourself.)")
        }
    },buttons:(div)=>{
        div.createChildNode("button",{class:"smallButton"},"Play",(button)=>{
            button.addEventListener("click",(e)=>{
                if (document.getElementById("customGameStr").value == "") {
                    alert("Custom game string is invalid")
                } else {
                    dialog.close(e);
                }
            })
        });
        div.createChildNode("button",{class:"smallButton"},"Cancel",(button)=>{
            button.addEventListener("click",(e)=>{
                dialog.close(e);
            })
        });
    },modal:true,class:"dialogBox custom",openOnCreation:true});
    dialog.addEventListener("close",async (e)=>{
        if (e.detail.usingEvent.target.innerText == "Play") {
            try {
                await startCustomGame(dialog.body.querySelector("#customGameStr").value);
            } catch (e) {
                alert(`Error parsing settings string: ${e}`);
            }
        }
    })
}

async function startCustomGame(customGameString) {
    let settings = await decodeCustomGameString(customGameString);
    if (settings.length > 0) startGame(...settings); 
    return;
}

async function decodeCustomGameString(str) {
    let settingsStr = encodeBase64FromUrl(str);
    let buffer = await fetch(`data:application/octet-stream;base64,${settingsStr}`).then(res=>res.arrayBuffer());
    let headerView = new Uint8Array(buffer,0,8);
    if ([...headerView].map(v=>String.fromCharCode(v)).join("") !== "blitzdle") throw "Header mismatch";
    let settingsView = new DataView(buffer,8,4);
    let [isDaily,isHard,isCustom,isEasy] = new BitArray(settingsView.getUint8(1),4);
    if (isDaily || isEasy || !isCustom) throw "Malformed Data";
    let numWords = settingsView.getUint8(2);
    let wordLength = settingsView.getUint8(3);
    let wordRng = new Array(numWords);
    try {
        let wordNums = new Uint16Array(buffer,12);
        for (let x = 0; x < wordNums.length; x++) {
            if (x >= wordRng.length) throw "Data Array exceeds NumWords";
            wordRng[x] = wordNums[x];
        }
    } catch (e) {
        console.error(e);
        throw "Malformed Data";
    }
    return [isDaily,isHard,isCustom,false,numWords,wordLength,wordRng];
}

async function createCustomGameDialog() {
    if (!wordLists) wordLists = new GameWordLists();
    await wordLists.loadWordLists();
    dialog = new DialogBox({body:(div)=>{
        div.createChildNode("h2","Custom Game Settings");
        let wlenSel = document.quickElement("select",{id:"customWordLength"},(select)=>{
            select.createChildNode("option",{value:"4"},"4")
            select.createChildNode("option",{value:"5",selected:"selected"},"5")
            select.createChildNode("option",{value:"6"},"6")
            select.addEventListener("input",()=>{
                let rows = wordListDiv.children;
                let words = [];
                for (let row of rows) {
                    let wlen = Number(select.value);
                    let inp = row.querySelector('input[type="text"]')
                    inp.value = inp.value.trim().toUpperCase().slice(0,wlen);
                    let wl = wlistSel.value == "0" ? wordLists.selectWordList[wlen] : wordLists.completeWordList[wlen];
                    if (wl.includes(inp.value) && !(words.includes(inp.value))) {
                        row.querySelector('span').innerHTML = "✅";
                        words.push(inp.value);
                    } else {
                        row.querySelector('span').innerHTML = "❌";
                    }
                }
            });
        });
        let wlistSel = document.quickElement("select",{id:"customWordList"},(select)=>{
            select.createChildNode("option",{value:"0"},"🟦Normal")
            select.createChildNode("option",{value:"1"},"🔶Expert")
            select.addEventListener("input",()=>{
                let rows = wordListDiv.children;
                let words = [];
                for (let row of rows) {
                    let inp = row.querySelector('input[type="text"]')
                    let wlen = Number(wlenSel.value);
                    inp.value = inp.value.trim().toUpperCase().slice(0,wlen);
                    let wl = wlistSel.value == "0" ? wordLists.selectWordList[wlen] : wordLists.completeWordList[wlen];
                    if (wl.includes(inp.value) && !(words.includes(inp.value))) {
                        row.querySelector('span').innerHTML = "✅";
                        words.push(inp.value);
                    } else {
                        row.querySelector('span').innerHTML = "❌";
                    }
                }
            });
        });
        let addWord = function(div,removeMinusButton=false){
            div.createChildNode("div",(div)=>{
                let indicator = div.createChildNode("span","❌");
                div.createChildNode("input",{type:"text"},(inp)=>{
                    inp.addEventListener("input",(e)=>{
                        let wlen = Number(wlenSel.value);
                        e.target.value = e.target.value.trim().toUpperCase().slice(0,wlen);
                        let otherInps = div.parentElement.querySelectorAll('input[type="text"]');
                        for (let oInp of otherInps) {
                            if (oInp.isSameNode(inp)) continue;
                            if (oInp.value == inp.value) {
                                indicator.innerHTML = "❌";
                                return;
                            }
                        }
                        let wl = wlistSel.value == "0" ? wordLists.selectWordList[wlen] : wordLists.completeWordList[wlen];
                        indicator.innerHTML = wl.includes(e.target.value) ? "✅" : "❌";
                    })
                });
                if (!removeMinusButton) {
                    div.createChildNode("button","-",(button)=>{
                        button.addEventListener("click",()=>{
                            div.parentElement.removeChild(div);
                        })
                    })
                }
            })
        }
        let wordListDiv = document.quickElement("div",{class:"wordlist"},(div)=>{
            addWord(div,true);
        });

        div.createChildNode("div",(div)=>{
            div.createChildNode("span","Word List: ")
            div.appendChild(wlistSel)
        });
        div.createChildNode("div",(div)=>{
            div.createChildNode("span","Word Length: ")
            div.appendChild(wlenSel)
        });
        div.createChildNode("h3","Words");
        div.appendChild(wordListDiv);
        div.createChildNode("button","Add Word",(button)=>{
            button.addEventListener("click",()=>{
                addWord(wordListDiv);
            })
        })
    },buttons:(div)=>{
        div.createChildNode("button",{class:"smallButton"},"Generate",(button)=>{
            button.addEventListener("click",(e)=>{
                let spans = dialog.body.querySelectorAll(".wordlist span");
                for (let span of spans) {
                    if (span.innerHTML == "❌") {
                        alert("There are invalid words in the word list. Please modify your word list and try again.");
                        return;
                    }
                }
                dialog.close(e);
            })
        });
        div.createChildNode("button",{class:"smallButton"},"Cancel",(button)=>{
            button.addEventListener("click",(e)=>{
                dialog.close(e);
            })
        });
    },modal:true,class:"dialogBox custom",openOnCreation:true});
    dialog.addEventListener("close",async (e)=>{
        if (e.detail.usingEvent.target.innerText == "Generate") {
            let hardMode = Number(dialog.body.querySelector("#customWordList").value);
            let wordLength = Number(dialog.body.querySelector("#customWordLength").value);
            let wl = WordList.fromArray(hardMode ? wordLists.completeWordList[wordLength] : wordLists.selectWordList[wordLength]);
            let wordInps = dialog.body.querySelectorAll('.wordlist input[type="text"]');
            let numWords = wordInps.length;
            let wordIndexes = [];
            for (let wordInp of wordInps) {
                let wordIndex = wl.findIndex(v=>v==wordInp.value);
                if (wordIndex < 0) throw "Word does not exist in word list";
                wl.splice(wordIndex,1);
                wordIndexes.push(wordIndex);
            }
            let str = await encodeCustomGameString(hardMode, numWords, wordLength, wordIndexes);
            customGameDialog(e,str);
        }
    })
}

async function encodeCustomGameString(hardMode, numWords, wordLength, wordIndexes,) {
    return new Promise((res,rej)=>{
        let settingBit = BitArray.from([false, hardMode, true, false]);
        let buffer = new ArrayBuffer(4 + (2 * numWords));
        let settingsView = new DataView(buffer, 0, 4);
        settingsView.setUint8(0, 3);
        settingsView.setUint8(1, settingBit);
        settingsView.setUint8(2, numWords);
        settingsView.setUint8(3, wordLength);
        let rngView = new Uint16Array(buffer, 4);
        for (let x = 0; x < rngView.length; x++) {
            rngView[x] = wordIndexes[x];
        }
        let reader = new FileReader();
        reader.readAsDataURL(new Blob(["blitzdle",buffer], { type: "application/octet-stream" }));
        reader.onloadend = (e)=>{
            res(e.target.result.replace(/data:\S+\/\S+;base64,/, "").replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_"));
        };
    })
}

async function openStaticDialog(mdName) {
    let md = await fetch(`./dialogs/${mdName}.md`);
    if (md.status !== 200) throw "File not found";
    dialog = new DialogBox({body:async (div)=>{
        div.innerHTML = marked.parse(await md.text());
    },buttons:(div)=>{
        div.createChildNode("button",{class:"smallButton"},"Close",(button)=>{
            button.addEventListener("click",(e)=>{
                dialog.close(e);
            })
        });
    },modal:true,class:"dialogBox howtoplay",openOnCreation:true})
}

async function openSettingsDialog() {
    dialog = new DialogBox({body:async (div)=>{
        div.createChildNode("h1","Settings");
        div.createChildNode("div",(div)=>{
            div.createChildNode("label","Appearance: ")
            div.createChildNode("select",(select)=>{
                select.createChildNode("option",{value:"auto"},"Use Device Theme");
                select.createChildNode("option",{value:"light"},"Light Theme");
                select.createChildNode("option",{value:"dark"},"Dark Theme");
                select.addEventListener("input",()=>{
                    appSettings.settings.displayMode = select.value;
                    setDisplayMode(appSettings.settings.displayMode);
                    appSettings.store()
                })
                select.value = appSettings.settings.displayMode;
            })
        })
        div.createChildNode("div",(div)=>{
            div.createChildNode("label","Timer Display: ")
            div.createChildNode("select",(select)=>{
                select.createChildNode("option",{value:"normal"},"⏱️HH:MM:SS:mm");
                select.createChildNode("option",{value:"short"},"⏱️HH:MM:SS");
                select.createChildNode("option",{value:"none"},"Hide Timer");
                select.addEventListener("input",()=>{
                    appSettings.settings.timer = select.value;
                    appSettings.store()
                })
                select.value = appSettings.settings.timer;
            })
        })
        div.createChildNode("button",{class:"smallButton"},"Refresh Cache",(button)=>{
            button.addEventListener("click",async (e)=>{
                if (confirm("Are you sure you want to clear the cache?")) {
                    const cacheObjects = await window.caches.keys();
                    for (let cId of cacheObjects) {
                        await caches.delete(cId);
                    }
                    if (swRegistration) {
                        await swRegistration.unregister()
                    }
                    window.location.reload();
                }
            })
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
        reader.readAsText(e.target.files[0]);
        reader.onloadend = (e)=>{
            let base64Str = encodeBase64FromUrl(e.target.result);
            fetch(`data:application/octet-stream;base64,${base64Str}`).then(res=>res.arrayBuffer()).then(buffer=>{
                MultiWordGame.fromReplay(mainDiv,buffer).then((obj)=>{
                    obj.game.addEventListener("finished",async (e)=>{
                        endGameDialog(obj.game);
                    })
                });
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
 * @param {string|number|false} seed 
 * @param {boolean} num 
 */
function startGame(daily,hardMode=false,custom=false,seed = false,num = false,wordlength=undefined,wordRng=undefined) {
    let gameSeed;
    let numWords = num;
    let easyMode = numWords==1&&!hardMode
    if (custom) {
        if (!isNaN(seed)) {
            let numSeed = Number(seed);
            if (numSeed >= 0 && numSeed < 4294967295) gameSeed = numSeed;
        }
    }
    let rngSeed = seed ? seed.toString() : daily ? generateDailySeed(hardMode,!hardMode&&num==1) : Math.floor(Math.random()*Number.MAX_SAFE_INTEGER).toString();
    let rng = new Math.seedrandom(rngSeed);
    gameSeed = gameSeed || Math.floor(rng()*4294967295);
    numWords = numWords || Math.floor(numWordsTransformFunc(rng()/(hardMode?1:2)));
    let wLen = wordlength;
    if (isNaN(wLen)) {
        if (easyMode) {
            wLen = 5;
        } else {
            let wlRng = rng();
            wLen = wlRng <= 0.1 ? 4 : (wlRng >= 0.9 ? 6 : 5);
        }
    }
    let settings = {
        numWords:numWords,
        dailyMode:daily,
        hardMode:hardMode,
        customMode:custom,
        easyMode,
        startOnCreation:true,
        wordLength:wLen
    }
    if (custom) {
        settings.wordRng = wordRng;
    } else {
        settings.seed = gameSeed
    }
    if (pageParams.get("rmsw") !== null) window.history.replaceState(null,"","./");
    let mwg = new MultiWordGame(mainDiv,settings);
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

async function shareClipboard(gameState) {
    let startDate = new Date(gameState.replay.timestamp);
    let time = MultiWordGame.formatTime(gameState.replay.timeOfLastKeyPress());
    let hard = gameState.isHard ? "🔶" : gameState.isEasy ? "🟢" : "🟦";
    let platform = isMobile() ? "📱" : "💻";
    let daily = `${hard}${platform}${gameState.isDaily ? "📆:" + startDate.getFullYear() + "-" + (startDate.getMonth()+1) + "-" + startDate.getDate() : gameState.isCustom ? "🔧" : "🎲"}`;
    let seedDetails;
    if (gameState.isCustom) {
        seedDetails = await encodeCustomGameString(gameState.isHard, gameState.numWords, gameState.wordLength, gameState.replay.wordRng);
    }
    let seeds = seedDetails ? `\n🌱:${seedDetails}` : "";
    let newClip = `Blitzdle ${daily}
⏱️:${time}
❓:${gameState.guesses.length}
🎯:${calculateAccuracy(gameState)}${seeds}
${window.location}${seedDetails ? "?cg=" + seedDetails : ""}`;
    copyTextToClipboard(newClip,()=>{
        alert("Results copied to clipboard.");
    });
}

function copyTextToClipboard(newClip,callback) {
    navigator.permissions.query({ name: "clipboard-write" }).then(result => {
        if (result.state == "granted" || result.state == "prompt") {
            navigator.clipboard.writeText(newClip).then(()=>{
                if (typeof callback == "function") callback();
            });
        }
    }, () => {
        let ta = document.body.createChildNode("textarea", newClip);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        if (typeof callback == "function") callback();
    });
}

function setDisplayMode(mode) {
    const body = document.documentElement;
    switch(mode) {
        case "light":
            body.classList.remove("dark");
            body.classList.add("light");
            break;
        case "dark":
            body.classList.remove("light");
            body.classList.add("dark");
            break;
        default:
            body.classList.remove("light");
            body.classList.remove("dark");
    }
}

function downloadReplay(gameState) {
    let dailyReader = new FileReader();
    dailyReader.readAsDataURL(new Blob([gameState.replay.encode()], { type: "application/octet-stream" }));
    dailyReader.onloadend = (e) => {
        downloadFile("game_" + (new Date().toISOString()).replaceAll(/:/g,"_") + ".replay",e.target.result.replace(/data:\S+\/\S+;base64,/,"").replaceAll("=","").replaceAll("+","-").replaceAll("/","_"))
    }
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
    openStaticDialog(`changelog_${queryVars["v"].replaceAll(/[a-z]/g,"")}`);
}
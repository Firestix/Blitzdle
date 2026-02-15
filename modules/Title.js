import { GuessData } from "./GuessData.js";
import { WordList } from "./WordList.js";

export async function createTitle(elem) {
    let date = new Date();
    let seed = `9${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,"0")}${date.getDate().toString().padStart(2,"0")}`
    let wordlist = await WordList.fromURL("./wordleblitz.txt");
    let word = wordlist.randomize(1,seed)[0];
    let guessData = new GuessData(word,"BLITZ");
    elem.appendChild(guessData.buildElement())
    elem.createChildNode("div",{class:"dle"},"DLE");
}

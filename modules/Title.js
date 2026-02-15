import { GuessData } from "./GuessData.js";
import { WordList } from "./WordList.js";

const date = new Date();
const seed = `9${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,"0")}${date.getDate().toString().padStart(2,"0")}`
const wordlist = await WordList.fromURL("./wordleblitz.txt");
const word = wordlist.randomize(1,seed)[0];
const guessData = new GuessData(word,"BLITZ");

export async function createTitle(elem) {
    elem.appendChild(guessData.buildElement())
    elem.createChildNode("div",{class:"dle"},"DLE");
}

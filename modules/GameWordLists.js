import { WordList } from "./WordList.js";

const wordListURLs = [
    null,
    null,
    null,
    null,
    {full:"wordlists/CSW2104final.txt",common:"wordlists/CSW2104common.txt"},
    {full:"wordlists/wordle.txt",common:"wordlists/wordlecommon.txt"},
    {full:"wordlists/CSW2106final.txt",common:"wordlists/CSW2106common.txt"}
]

export class GameWordLists {
    /** @type {WordList[]} */
    completeWordList = [];
    /** @type {WordList[]} */
    selectWordList = [];
    async loadWordLists() {
        for (let x = 0; x < wordListURLs.length; x++) {
            if (!wordListURLs[x]) {
                this.completeWordList[x] = this.selectWordList[x] = undefined;
            } else {
                this.completeWordList[x] = this.completeWordList[x] || await WordList.fromURL(wordListURLs[x].full);
                this.selectWordList[x] = this.selectWordList[x] || await WordList.fromURL(wordListURLs[x].common);
            }
        }
    }
}

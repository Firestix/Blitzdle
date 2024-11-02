import { WordList } from "./WordList.js";

export class GameWordLists {
    completeWordList;
    selectWordList;
    async loadWordLists() {
        this.completeWordList = this.completeWordList || WordList.fromURL("wordle.txt");
        this.selectWordList = this.selectWordList || WordList.fromURL("wordlecommon.txt");
    }
}

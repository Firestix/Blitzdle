/**
 * @extends {Array<string>}
 */
export class WordList extends Array {
    /**
     * 
     * @param  {...string} list 
     */
    constructor(...list) {
        super();
        this.push(...list);
    }
    /**
     * 
     * @param {number} n 
     * @param {number} seed 
     * @returns 
     */
    randomize(n, seed = false) {
        let wordlist = new WordList(...this);
        if (!seed) seed = Date.now().toString();
        let rng = new Math.seedrandom(seed);
        let words = [];
        let x = 0;
        while (x++ < n) {
            let y = Math.floor(rng() * wordlist.length);
            words.push(...wordlist.splice(y, 1));
        }
        return words;
    }
    /**
     * 
     * @param {string} url 
     * @returns 
     */
    static async fromURL(url) {
        let wlRaw = await fetch(url).then(res=>res.text());
        return WordList.fromArray(wlRaw.split(/\r\n|\r|\n/g));
    }
    /**
     * 
     * @param {string[]} array 
     * @returns 
     */
    static fromArray(array) {
        return new WordList(...array);
    }
}

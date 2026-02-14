import { PARSERS } from "./ReplayParser.js";
const REPLAY_HEADER = "replay/blitzdle";
const REPLAY_VERSION = 2;

export class ReplayMap extends Map{
    /**
     * 
     * @param {ArrayBuffer} buffer 
     */
    constructor(buffer = undefined) {
        super();
        if (buffer) {
            this.decode(buffer);
        } else {
            this.seed = this.isDaily = this.isHard = this.isCustom = this.isEasy = this.numWords = undefined;
        }
    }
    get settings() {
        return {
            seed:this.seed,
            isDaily:this.isDaily,
            isHard:this.isHard,
            isCustom:this.isCustom,
            isEasy:this.isEasy,
            numWords:this.numWords,
            timestamp:this.timestamp,
            firstGuess:this.firstGuess,
        }
    }
    get seed() {
        return this.get("seed")
    }
    set seed(seed) {
        this.set("seed",seed)
    }
    get isDaily() {
        return this.get("isDaily")
    }
    set isDaily(bool) {
        this.set("isDaily",bool)
    }
    get isHard() {
        return this.get("isHard")
    }
    set isHard(bool) {
        this.set("isHard",bool)
    }
    get isCustom() {
        return this.get("isCustom")
    }
    set isCustom(bool) {
        this.set("isCustom",bool)
    }
    get isEasy() {
        return this.get("isEasy")
    }
    set isEasy(bool) {
        this.set("isEasy",bool)
    }
    get numWords() {
        return this.get("numWords")
    }
    set numWords(num) {
        this.set("numWords",num)
    }
    get timestamp() {
        return this.get("timestamp")
    }
    set timestamp(timestamp) {
        this.set("timestamp",timestamp)
    }
    get firstGuess() {
        return this.get("firstGuess")
    }
    set firstGuess(str) {
        this.set("firstGuess",str)
    }
    get actions() {
        return [...this.entries()].filter(v=>typeof v[0] === "number");
    }
    get keyPressTimes() {
        return[...this.keys()].filter(v=>typeof v === "number").sort((a,b)=>a-b);
    }
    /**
     * 
     * @param {KeyboardEvent | MouseEvent} event 
     */
    insert(event) {
        let now = Date.now();
        switch(event.type.toLowerCase()) {
            case "keydown":
                this.set(now-this.timestamp,{type:"key",value:event.keyCode})
        }
    }
    /**
     * 
     * @param {string} base64URLStr 
     */
    static async fromEncodedData(base64Str) {
        let buffer = await fetch(`data:application/octet-stream;base64,${base64Str}`).then(res=>res.arrayBuffer());
        return new ReplayMap(buffer);
    }

    encode() {
        let parser = PARSERS[REPLAY_VERSION];
        let headerBuffer = new ArrayBuffer(REPLAY_HEADER.length+1);
        let headerView = new DataView(headerBuffer,0,REPLAY_HEADER.length+1)
        let x = 0;
        for (let char of REPLAY_HEADER) {
            headerView.setUint8(x++,char.charCodeAt(0));
        }
        headerView.setUint8(x,REPLAY_VERSION);
        let dataBuffer = new ArrayBuffer(parser.settingsLength+parser.getDataLength(this));
        parser.encode.apply(this,[dataBuffer]);
        let headerBytes = new Uint8Array(headerBuffer);
        let dataBytes = new Uint8Array(dataBuffer);
        let byteArray = new Uint8Array(headerBytes.length+dataBytes.length);
        byteArray.set(headerBytes);
        byteArray.set(dataBytes,headerBytes.length);
        return byteArray.buffer;
    }

    decode(buffer) {
        if (!buffer || !(buffer instanceof ArrayBuffer)) throw "Could not read replay data";
        let headerBuffer = buffer.slice(0,REPLAY_HEADER.length+1)
        let header = new TextDecoder().decode(new Uint8Array(headerBuffer,0,REPLAY_HEADER.length));
        if (header != REPLAY_HEADER) throw "Invalid replay data";
        let version = new DataView(headerBuffer.slice(REPLAY_HEADER.length)).getUint8(0);
        if (!PARSERS[version]) throw "Invalid replay version";
        let dataBuffer = buffer.slice(REPLAY_HEADER.length+1);
        PARSERS[version].decode.apply(this,[dataBuffer]);
    }
    static fromObject(obj) {
        let map = new ReplayMap();
        map.seed = obj.seed;
        map.isDaily = obj.isDaily;
        map.isHard = obj.isHard;
        map.isCustom = obj.isCustom;
        map.isEasy = obj.isEasy;
        map.numWords = obj.numWords;
        //map.settings.timestamp = obj.timestamp;
        //map.settings.firstGuess = obj.firstGuess;
        return map;
    }
    timeOfLastKeyPress() {
        let presses = this.keyPressTimes;
        return presses.at(-1);
    }
}
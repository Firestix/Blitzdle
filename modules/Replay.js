import { PARSERS } from "./ReplayParser.js";
const REPLAY_HEADER = "replay/blitzdle";
const REPLAY_VERSION = 2;

export class ReplayMap extends Map{
    /**
     * 
     * @param {ArrayBuffer} replayRawData 
     */
    constructor(buffer = undefined) {
        super();
        if (buffer) {
            this.decode(buffer);
        }
    }
    get settings() {
        return {
            seed:this.get("seed"),
            isDaily:this.get("isDaily"),
            isHard:this.get("isHard"),
            isCustom:this.get("isCustom"),
            isEasy:this.get("isEasy"),
            numWords:this.get("numWords"),
            timestamp:this.get("timestamp"),
            firstGuess:this.get("firstGuess")
        }
    }
    get actions() {
        return [...this.entries()].filter(v=>v[0] instanceof BigInt);
    }
    /**
     * 
     * @param {KeyboardEvent | MouseEvent} event 
     */
    insert(event) {
        let now = BigInt(Date.now());
        switch(event.type) {
            case "KeyDown":
                this.set(now,{type:"key",value:event.keyCode})
        }
    }
    /**
     * 
     * @param {string} base64URLStr 
     */
    static async fromEncodedData(base64URLStr) {
        let buffer = await fetch(`data:application/octet-stream;base64,${base64URLStr}`).then(res=>res.arrayBuffer());
        return new ReplayMap(buffer);
    }

    encode() {
        let parser = PARSERS[REPLAY_VERSION];
        let headerBuffer = new ArrayBuffer(REPLAY_HEADER.length+1);
        let headerView = new DataView(headerBuffer,REPLAY_HEADER.length + 1)
        let x = 0;
        for (let char of REPLAY_HEADER) {
            headerView.setUint8(x++,char.charCodeAt(0));
        }
        headerView.setUint8(x,REPLAY_VERSION);
        let dataBuffer = new ArrayBuffer(parser.settingsLength+parser.getDataLength(this));
        PARSERS[version].encode.apply(this,[dataBuffer]);
        let headerBytes = new Uint8Array(headerBuffer);
        let dataBytes = new Uint8Array(dataBuffer);
        let byteArray = new Uint8Array(headerBytes.length+dataBytes.length);
        byteArray.set(headerBytes);
        byteArray.set(dataBytes,headerBytes.length);
        return byteArray.buffer;
        // let replay = this.replay;
        // // console.log(replay)
        // // console.log(replay.length)
        // let arrayBuffer = new ArrayBuffer(20+((replay.length-12)*5/2));
        // let settingsData = new DataView(arrayBuffer,0,20);
        // let replayData = new DataView(arrayBuffer,20,arrayBuffer.byteLength-20);
        // let bools = BitArray.from([replay[1],replay[2],replay[3],replay[4]]);
        // // console.log(bools)
        // // console.log(replayData.byteLength)
        // settingsData.setUint8(0,1)                                          // replay file version
        // settingsData.setUint32(1,replay[0],true)                            // seed
        // settingsData.setUint8(5,bools.encode())   // isDaily, isHard, isCustom, isEasy
        // settingsData.setUint8(6,replay[5])                                  // numWords
        // settingsData.setFloat64(7,replay[6],true)                           // timestamp of first guess
        // settingsData.setUint8(15,replay[7])                                 // first guess charcodes (next 5)
        // settingsData.setUint8(16,replay[8])
        // settingsData.setUint8(17,replay[9])
        // settingsData.setUint8(18,replay[10])
        // settingsData.setUint8(19,replay[11])
        // let x = 0;
        // let y = 12;
        // if (replayData.byteLength > 0) {
        //     while (y-12 < replay.length-12) {
        //         replayData.setUint32(x,replay[y++],true)      // timestamp of keypress
        //         x += 4;
        //         replayData.setUint8(x++,replay[y++])          // keypress charcode
        //     }
        // }
        // // console.log(new Uint8Array(arrayBuffer))
        // return arrayBuffer;
    }

    decode(buffer) {
        if (!buffer || !(buffer instanceof ArrayBuffer)) throw "Could not read replay data";
        let headerBuffer = buffer.slice(0,REPLAY_HEADER.length+1)
        let header = new Uint8Array(new DataView(headerBuffer,0,REPLAY_HEADER.length)).toString();
        if (header != REPLAY_HEADER) throw "Invalid replay data";
        offset += REPLAY_HEADER.length;
        let version = new DataView(headerBuffer,REPLAY_HEADER.length,1).getUint8(0);
        if (!PARSERS[version]) throw "Invalid replay version";
        let dataBuffer = buffer.slice(REPLAY_HEADER.length+1);
        PARSERS[version].decode.apply(this,[dataBuffer])
        // let settingsView = new DataView(buffer,1,19);
        // let replayView = new DataView(buffer,20,buffer.byteLength-20);
        // let returnArray = [];
        // returnArray.push(
        //     settingsView.getBigInt64(0,true),                     // seed
        //     ...new BitArray(settingsView.getUint8(4),4),    // isDaily, isHard, isCustom, isEasy
        //     settingsView.getUint8(5),                           // numWords
        //     settingsView.getFloat64(6,true),                    // timestamp of first guess
        //     settingsView.getUint8(14,true),                     // first guess charcodes (next 5)
        //     settingsView.getUint8(15,true),
        //     settingsView.getUint8(16,true),
        //     settingsView.getUint8(17,true),
        //     settingsView.getUint8(18,true)
        // )
        // let x = 0;
        // while(x < replayView.byteLength) {
        //     returnArray.push(replayView.getUint32(x,true))
        //     x += 4;
        //     returnArray.push(replayView.getUint8(x++))
        // }
        // return Array.from(returnArray)
    }
}
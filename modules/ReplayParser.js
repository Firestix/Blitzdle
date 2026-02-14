import { BitArray } from "./BitArray.js";
import { ReplayMap } from "./Replay.js";

export const PARSERS = [
    undefined,
    undefined,
    {
        /**
         * @this ReplayMap
         * @param {ArrayBuffer} buffer 
         */
        decode:function(buffer){
            let settingsView = new DataView(buffer,1,19);
            let replayView = new DataView(buffer,20);
            this.set("seed",settingsView.getUint32(0,true))
            let bools = new BitArray(settingsView.getUint8(4),4);
            this.set("isDaily",bools[0])
            this.set("isHard",bools[1])
            this.set("isCustom",bools[2])
            this.set("isEasy",bools[3])
            this.set("numWords",settingsView.getUint8(5))
            this.set("timestamp",settingsView.getFloat64(6,true))
            this.set("firstGuess",[settingsView.getUint8(14),settingsView.getUint8(15),settingsView.getUint8(16),settingsView.getUint8(17),settingsView.getUint8(18)])
            let x = 0;
            while(x < replayView.byteLength) {
                this.set(replayView.getUint32(x,true),{type:"key",value:replayView.getUint8(x+4)})
                x += 5;
            }
        },
        /**
         * @this ReplayMap
         * @param {ArrayBuffer} buffer 
         */
        encode:function(buffer){
            let settingsData = new DataView(buffer,0,20);
            let replayData = new DataView(buffer,20);
            let bools = BitArray.from([this.isDaily,this.isHard,this.isCustom,this.isEasy]);
            settingsData.setUint8(0,1)                                      // replay file version
            settingsData.setUint32(1,this.seed,true)                    // seed
            settingsData.setUint8(5,bools.encode())                         // isDaily, isHard, isCustom, isEasy
            settingsData.setUint8(6,this.numWords)                      // numWords
            settingsData.setFloat64(7,Number(this.timestamp),true)      // timestamp of first guess
            let z = 15;
            for (let g of this.firstGuess) {                            // first guess charcodes (next 5)
                settingsData.setUint8(z++,g);
            }
            if (replayData.byteLength > 0) {
                let actions = this.actions;
                let x = 0;
                let y = 0;
                while (y < actions.length) {
                    replayData.setUint32(x,Number(actions[y][0]),true)      // timestamp of keypress
                    x += 4;
                    replayData.setUint8(x++,actions[y++][1].value)          // keypress charcode
                }
            }
        },
        settingsLength:20,
        getDataLength:function(replay) {
            return (replay.actions.length)*5;
        }
    },
]
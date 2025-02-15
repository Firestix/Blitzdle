import { BitArray } from "./BitArray.js";
import { ReplayMap } from "./Replay.js";

export const PARSERS = [
    undefined,
    {
        /**
         * @this ReplayMap
         * @param {ArrayBuffer} buffer 
         */
        decode:function(buffer){
            // console.log(buffer)
            let settingsView = new DataView(buffer,1,19);
            // console.log(new Uint8Array(settingsView.buffer))
            let replayView = new DataView(buffer,20,buffer.byteLength-20);
            // console.log(replayView.byteLength)
            this.set("seed",settingsView.getUint32(0,true))
            let bools = new BitArray(settingsView.getUint8(4),4);
            this.set("isDaily",bools[0])
            this.set("isHard",bools[1])
            this.set("isCustom",bools[2])
            this.set("isEasy",bools[3])
            this.set("numWords",settingsView.getUint8(5))
            this.set("timestamp",settingsView.getFloat64(6,true))
            this.set("firstGuess",[
                settingsView.getUint8(14),
                settingsView.getUint8(15),
                settingsView.getUint8(16),
                settingsView.getUint8(17),
                settingsView.getUint8(18)
            ])
            let x = 0;
            while(x < replayView.byteLength) {
                // console.log(x)
                this.set(replayView.getUint32(x,true),{type:"key",value:replayView.getUint8(x+4)})
                x += 5;
            }
            // returnArray.push(
            //     settingsView.getUint32(0,true),                     // seed
            //     ...new BitArray(settingsView.getUint8(4),4),    // isDaily, isHard, isCustom, isEasy
            //     settingsView.getUint8(5),                           // numWords
            //     settingsView.getFloat64(6,true),                    // timestamp of first guess
            //     settingsView.getUint8(14),                     // first guess charcodes (next 5)
            //     settingsView.getUint8(15),
            //     settingsView.getUint8(16),
            //     settingsView.getUint8(17),
            //     settingsView.getUint8(18)
            // )
            
            // while(x < replayView.byteLength) {
            //     // console.log(x)
            //     returnArray.push(replayView.getUint32(x,true))
            //     x += 4;
            //     returnArray.push(replayView.getUint8(x++))
            // }
            // // console.log(returnArray)
            // return Array.from(returnArray)
        },
        /**
         * @this ReplayMap
         * @param {ArrayBuffer} buffer 
         */
        encode:function(buffer){
            let settingsData = new DataView(buffer,0,20);
            let replayData = new DataView(buffer,20);
            let settings = this.settings;
            let bools = BitArray.from([settings.isDaily,settings.isHard,settings.isCustom,settings.isEasy]);
            settingsData.setUint8(0,1)                                      // replay file version
            settingsData.setUint32(1,settings.seed,true)                    // seed
            settingsData.setUint8(5,bools.encode())                         // isDaily, isHard, isCustom, isEasy
            settingsData.setUint8(6,settings.numWords)                      // numWords
            settingsData.setFloat64(7,Number(settings.timestamp),true)              // timestamp of first guess
            let z = 15;
            for (let g of settings.firstGuess) {                            // first guess charcodes (next 5)
                settingsData.setUint8(z++,g);
            }
            if (replayData.byteLength > 0) {
                let actions = this.actions;
                let x = 0;
                let y = 0;
                while (y < actions.length) {
                    replayData.setUint32(x,Number(actions[y][0]-settings.timestamp),true)      // timestamp of keypress
                    x += 4;
                    replayData.setUint8(x++,actions[y++][1].value)          // keypress charcode
                }
            }
            // // console.log(replay)
            // // console.log(replay.length)
            // let arrayBuffer = new ArrayBuffer(20+((replay.length-12)*5/2));
            // let settingsData = new DataView(arrayBuffer,0,20);
            // let replayData = new DataView(arrayBuffer,20,arrayBuffer.byteLength-20);
            // let settings = this.settings;
            // let bools = BitArray.from([settings.isDaily,settings.isHard,settings.isCustom,settings.isEasy]);
            // // console.log(bools)
            // // console.log(replayData.byteLength)
            // settingsData.setUint8(0,1)                                      // replay file version
            // settingsData.setUint32(1,settings.seed,true)                    // seed
            // settingsData.setUint8(5,bools.encode())                         // isDaily, isHard, isCustom, isEasy
            // settingsData.setUint8(6,settings.numWords)                      // numWords
            // settingsData.setFloat64(7,settings.timestamp,true)              // timestamp of first guess
            // let z = 15;
            // for (let g of settings.firstGuess) {                            // first guess charcodes (next 5)
            //     settingsData.setUint8(z++,g)
            // }
            // // settingsData.setUint8(15,replay[7])
            // // settingsData.setUint8(16,replay[8])
            // // settingsData.setUint8(17,replay[9])
            // // settingsData.setUint8(18,replay[10])
            // // settingsData.setUint8(19,replay[11])
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
        },
        settingsLength:20,
        getDataLength:function(replay) {
            return (replay.actions.length-12)*5/2;
        }
    },
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
            let settings = this.settings;
            let bools = BitArray.from([settings.isDaily,settings.isHard,settings.isCustom,settings.isEasy]);
            settingsData.setUint8(0,1)                                      // replay file version
            settingsData.setUint32(1,settings.seed,true)                    // seed
            settingsData.setUint8(5,bools.encode())                         // isDaily, isHard, isCustom, isEasy
            settingsData.setUint8(6,settings.numWords)                      // numWords
            settingsData.setFloat64(7,Number(settings.timestamp),true)      // timestamp of first guess
            let z = 15;
            for (let g of settings.firstGuess) {                            // first guess charcodes (next 5)
                settingsData.setUint8(z++,g);
            }
            if (replayData.byteLength > 0) {
                let actions = this.actions;
                let x = 0;
                let y = 0;
                while (y < actions.length) {
                    replayData.setUint32(x,Number(actions[y][0]-settings.timestamp),true)      // timestamp of keypress
                    x += 4;
                    replayData.setUint8(x++,actions[y++][1].value)          // keypress charcode
                }
            }
        },
        settingsLength:20,
        getDataLength:function(replay) {
            return (replay.actions.length-12)*5/2;
        }
    },
]
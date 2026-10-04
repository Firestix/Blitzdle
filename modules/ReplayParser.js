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
            // Replay Version
            // |[Settings    ][1st][Replay        ...  
            // |[            ][gue][              ...  
            // |[            ][ss ][              ...
            // @@===000=======@====@===00===00===0...
            //  |   |||       12345|   |
            //  |   ||Timestamp    |   Data
            //  |   |NumWords      Press
            //  |   BitArray       Timestamp
            //  Seed 
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
            this.set("wordLength",5)
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
            settingsData.setUint8(0,2)                                      // replay file version
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
        settingsLength:function(){
            return 20;
        },
        getDataLength:function(replay) {
            return (replay.actions.length)*5;
        }
    },
    {
        /**
         * @this ReplayMap
         * @param {ArrayBuffer} buffer 
         */
        decode:function(buffer){
            // Replay Version
            // |[Settings ]     [1st ][Replay        ...  
            // |[         ]     [gue ][              ...  
            // |[         ]     [ss  ][              ...
            // @0000=======[*  ]@===--@===00===00===0...
            //  ||||            123456|   |
            //  |||Timestamp          |   Data
            //  ||WordLength          Press
            //  |NumWords             Timestamp  
            //  BitArray
            // 
            // * Seed Data
            // isCustom = false: seed (uInt32)
            // isCustom = true: wordlist (uInt16 array)
            // 
            // Base Settings
            let settingsView = new DataView(buffer,1,11);
            let bools = new BitArray(settingsView.getUint8(0),4);
            this.set("isDaily",bools[0])
            this.set("isHard",bools[1])
            let isCustom = bools[2]
            this.set("isCustom",isCustom)
            this.set("isEasy",bools[3])
            let numWords = settingsView.getUint8(1)
            this.set("numWords",numWords)
            let wordLength = settingsView.getUint8(2)
            this.set("wordLength",wordLength)
            this.set("timestamp",settingsView.getFloat64(3,true))
            let rngDataLength = isCustom ? 2*numWords : 4;
            let rngDataView = new DataView(buffer,12,rngDataLength)
            if (isCustom) {
                let wordRng = [];
                for (let w = 0; w < numWords; w++) {
                    wordRng.push(rngDataView.getUint16(w*2,true))
                }
                this.set("wordRng",wordRng)
            } else {
                this.set("seed",rngDataView.getUint32(0,true))
            }
            let firstGuessData = new Uint8Array(buffer,12+rngDataLength,wordLength)
            this.set("firstGuess",[...firstGuessData])
            let replayView = new DataView(buffer,12+rngDataLength+wordLength);
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
            let sDataRNGLength = this.isCustom ? this.wordRng.length*2 : 4
            let settingsData = new DataView(buffer,0,12+sDataRNGLength+this.wordLength);
            let bools = BitArray.from([this.isDaily,this.isHard,this.isCustom,this.isEasy]);
            settingsData.setUint8(0,3)                                      // replay file version
            // settingsData.setUint32(1,this.seed,true)                    // seed
            settingsData.setUint8(1,bools.encode())                         // isDaily, isHard, isCustom, isEasy
            settingsData.setUint8(2,this.numWords)                      // numWords
            settingsData.setUint8(3,this.wordLength)                      // wordLength
            settingsData.setFloat64(4,Number(this.timestamp),true)      // timestamp of first guess
            if (this.isCustom) {
                for (let x = 0; x < this.wordRng.length; x++) {
                    settingsData.setUint16(12+x*2,this.wordRng[x],true);
                }
            } else {
                settingsData.setUint32(12,this.seed);
            }
            let z = 12+sDataRNGLength;
            for (let g of this.firstGuess) {                            // first guess charcodes (next 5)
                settingsData.setUint8(z++,g);
            }
            let replayData = new DataView(buffer,settingsData.byteLength);
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
        /**
         * 
         * @param {ReplayMap} replay 
         * @returns 
         */
        getSettingsLength:(replay)=>{
            return replay.isCustom ? 12+replay.wordRng.length*2+replay.wordLength : 16+replay.wordLength;
        },
        /**
         * 
         * @param {ReplayMap} replay 
         * @returns 
         */
        getDataLength:function(replay) {
            return (replay.actions.length)*5;
        }
    },
]
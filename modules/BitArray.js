export class BitArray {
    length;
    constructor(num, bitLength) {
        this.length = bitLength;
        let y = num;
        for (let x = 0; x < this.length; x++) {
            this[x] = !!(y & 1);
            y >>>= 1;
        }
    }
    encode() {
        let num = 0;
        for (let x = this.length - 1; x >= 0; x--) {
            num <<= 1;
            if (this[x]) num += 1;
        }
        return num;
    }
    *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i++) {
            yield this[i];
        }
    }
    [Symbol.toPrimitive](hint) {
        return hint === "string" ? this.encode().toString(2) : this.encode();
    }
    /**
     * 
     * @param {ArrayLike} arrayLike 
     * @param {*} mapFn 
     * @param {*} thisArg 
     */
    static from(arrayLike, mapFn, thisArg) {
        let bitArray = new BitArray(0,arrayLike.length);
        if (!mapFn) mapFn = function(v,i){return v};
        for (let i = 0; i < arrayLike.length; i++) {
            bitArray[i] = !!(mapFn.call(thisArg || null, arrayLike[i], i));
        }
        return bitArray;
    }
}
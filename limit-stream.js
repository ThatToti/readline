/**
 * Copyright: 黄俊豪 Toti <mr.totihuang@gmail.com>
 * Time: 2018
 */
const fs = require('fs');
const crypto = require('crypto');

const KB = 1024;
const MB = 1024 * KB;

/** 字节大小转换 */
function byteLog(size) {
    if (size > 2 * 1024 * 1024) {
        return `${(size / 1024 / 1024).toFixed(4)} Mb`;
    } else if (size > 2 * 1024) {
        return `${(size / 1024).toFixed(4)} Kb`;
    } else {
        return `${size.toFixed(4)} b`;
    }
}

/** 读速度监控类,用于开发时候监控读写是否平衡 */
class LimitStream {
    constructor(filePath, options = {}) {
        const { isHash, highWaterMark, limit = Infinity } = options;

        this.limit = limit;
        this._readBytesSecond = 0;
        this.time = new Date();
        this.startTime = new Date();
        this.stream = fs.createReadStream(filePath, { highWaterMark });

        this.contentBuffer = Buffer.alloc(0);

        this.stream.on('data', chunk => {
            this._readBytesSecond += chunk.length;
            this.contentBuffer = Buffer.concat([this.contentBuffer, chunk]);
        });

        this.stream.on('close', chunk => {
            const currentTime = new Date();

            console.log(
                `Average Time: ${byteLog(
                    (this._readBytesSecond / (currentTime - this.time)) * 1000
                )}/s`
            );
            console.log(`Total Time: ${currentTime - this.time} ms`);
            console.log(`Total Size: ${byteLog(this._readBytesSecond)}`);

            this.destory();
        });

        this.checkSpeed();

        this[Symbol.iterator] = function* (params) {
        };
    }

    /** 速度检查 */
    checkSpeed() {
        this.intervalTimer = setInterval(() => {
            this.averageTime =
                (this._readBytesSecond / (new Date() - this.time)) * 1000;

            const isStreamPause = this.stream.isPaused();
            const Overspeed = this.averageTime > this.limit;

            if (!isStreamPause && Overspeed) {
                this.stream.pause();
            }

            if (isStreamPause && !Overspeed) {
                this.stream.resume();
            }

            console.log(`${log(this.averageTime)}/s`);
        }, 100);
    }

    /** 清除定时器 */
    destory() {
        clearInterval(this.intervalTimer);
        this.stream.close();
    }
}

module.exports = LimitStream
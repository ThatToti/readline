const fs = require('fs')
const StringDecoder = require('string_decoder').StringDecoder
const decoder = new StringDecoder('utf8')
const EventEmitter = require('events');
class MyEmitter extends EventEmitter { }
const emiter = new MyEmitter();
const target = 'assets/100MB.txt'

class Reader {
    constructor(filepath, options) {

        const { highWaterMark } = options

        /** 创建可读流, highwatermark 设置流量线 */
        this.stream = fs.createReadStream(filepath, { highWaterMark: highWaterMark })

        /** 行队列 */
        this.lineChunks = []
        /** 自执行的行队列缓冲 */
        this.lines = []
        /** 未换行的 buf, 等待下次拼接,初始化为0 */
        this.buf = Buffer.alloc(0)
        /** 是否结束 */
        this.isEnd = false
        /** 是否暂停 */
        this.isPause = false
        /** 统计长度 */
        this._readBytesSecond = 0
        /** 初始时间 */
        this.time = new Date();
        /** 轮询的 hash 表长度 */
        this.pollChunk = 0;

        /** 监听读流 */
        this.stream.on('data', chunk => {
            this._readBytesSecond += chunk.length;
            this.pollChunk += chunk.length;
            /** 按行读取 */
            [this.buf, this.lineChunks] = this.createLine(Buffer.concat([this.buf, chunk]), this.lineChunks)
            /** 暂停 */
            this.stream.pause()
            /** 触发监听 */
            emiter.emit('next')
            emiter.emit('pause')
        })

        /** 监听结束 */
        this.stream.on('end', () => {
            this.isEnd = true

            /** 最后一段未换行的处理情况 */
            if (this.buf.length >= 0) {
                [this.buf, this.lineChunks] = this.createLine(Buffer.concat([this.buf]), this.lineChunks)
                emiter.emit('next')
                emiter.emit('pause')
            }
        })

        /** 关闭监听 */
        this.stream.on('close', chunk => {
            const currentTime = new Date();
        });
    }

    /** 按行读取函数 */
    createLine(buf, list = []) {
        var index = buf.indexOf('\n')

        if (this.isEnd) {
            list.push(buf)
            return [null, list]
        }

        if (index === -1) {
            return [buf, list]
        }

        var line = buf.slice(0, index)

        list.push(line)

        return this.createLine(buf.slice(index + 1), list)
    }

    /** 暂停处理函数,用于步进操作 */
    pause() {
        return new Promise(resolve => {

            /** 结束返回 false */
            if (this.isEnd && this.lineChunks.length === 0) {
                resolve([false])
            }

            /** 暂停返回 false */
            if (this.isPause && this.lineChunks.length === 0) {
                resolve([false])
            }

            /** 监听暂停 */
            emiter.once('pause', () => {
                this.isPause = true

                /** 存在未读取情况,重新监听 */
                if (this.lineChunks.length === 0) {
                    this.stream.resume()
                    this.isPause = false
                    resolve(this.pause())
                } else {
                    /** 返回行队列 */
                    resolve(this.lineChunks)
                }
            })

        })
    }

    /** 内部函数,用于自执行 */
    next() {
        return new Promise(resolve => {

            var self = this

            /** 结束时返回 false */
            if (this.isEnd && this.lineChunks.length === 0) {
                resolve([false])
            }

            /** 监听自执行的 next */
            emiter.once('next', () => {
                resolve(self.lineChunks)
            })

        })
    }

    /** 自执行函数 go, 自动读取所有流
     * 开发者无需关注内部的状态改变
     * 与 next 配合使用
     */
    async go() {

        /** 有行队列,一次 shift 一个 */
        if (this.lines.length > 0) {
            return this.lines.shift()
        } else {
            /** 无行队列,拉取数据 */
            this.stream.resume()
            this.lines = await this.next()
            return this.go()
        }
    }

    /** 
     * 轮询:
     * 用于 hash 切分,与 highwatermark 配合,切分 hash
     */
    async poll() {

        /** 有队列,返回一大块内容 */
        if (this.pollChunk >= 10 * 1024 * 1024) {
            this.pollChunk = 0
            if (this.lines[0] === false) return false
            return this.lines.splice(0)
        } else {
            /** 无队列拉取 */
            this.stream.resume()
            this.lines = await this.pause()
            return this.poll()
        }
    }

    /**
     * 读取指针:
     * 用于和轮询配合,切分 hash
     */
    resume() {
        this.isEnd ? this.isPause = true : this.isPause = false
        this.stream.resume()
    }

}

/** DJB 教授发明的 hash 函数,广泛使用 */
function DJBHash(str) {
    var hash = 5381;
    var len = str.length, i = 0

    while (len--) {
        hash = (hash << 5) + hash + str.charCodeAt(i++); /* times 33 */
    }
    hash &= ~(1 << 31); /* strip the highest bit */
    return hash;
};

/** 大 hash 表切分,存入硬盘 */
function output(hashmap, mapNum) {
    /** 创建写入流 */
    const ws = fs.createWriteStream(`hashmaps/map${mapNum}.txt`)
    /** 先转对象,再转 json */
    ws.write(JSON.stringify(strMapToObj(hashmap)))
};

/** obj 转 map */
function objToStrMap(obj) {
    let strMap = new Map();
    for (let k of Object.keys(obj)) {
        strMap.set(k, obj[k]);
    }
    return strMap;
}

/** map 转 obj */
function strMapToObj(strMap) {
    let obj = Object.create(null);
    for (let [k, v] of strMap) {
        obj[k] = v;
    }
    return obj;
}

/**
   * 写文件模块,hash 切分,存入硬盘
   */
(async () => {
    let mapNum = 1
    let j = 0
    /** 10MB 的切分量 */
    let fileB = new Reader(target, { highWaterMark: 1024 * 16 });
    while (hashes = await fileB.poll()) {
        /** 初始化 hashmap */
        let hashmap = new Map()

        for (let raw of hashes) {
            /** 转字符串 */
            let str = decoder.write(raw)

            /** 哈希函数生成 hash */
            let hash = DJBHash(str)

            /** 值为数组 */
            let arr = hashmap.get(hash) || []

            /** 生成 map */
            hashmap.set(hash, [...arr, j++])
        }

        /** 写文件到本地硬盘 */
        await output(hashmap, mapNum++)

        /** 读取下一份 hashmap */
        fileB.resume()
    }
})()

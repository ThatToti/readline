/**
 * 各种变量声明
 */
const fs = require('fs')
const StringDecoder = require('string_decoder').StringDecoder
var decoder = new StringDecoder('utf8')
const EventEmitter = require('events');
class MyEmitter extends EventEmitter { }
const emiter = new MyEmitter();

class Reader {
    constructor(filepath, options, hashsize = 10 * 1024 * 1024) {

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
        if (this.pollChunk >= hashsize) {
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

exports.Reader = Reader
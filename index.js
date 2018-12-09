const fs = require('fs')
const StringDecoder = require('string_decoder').StringDecoder
var decoder = new StringDecoder('utf8')
const EventEmitter = require('events');
class MyEmitter extends EventEmitter { }
const emiter = new MyEmitter();

const source = 'assets/a.txt'
const target = 'assets/b.txt'

class Reader {
  constructor(filepath, options) {

    const { highWaterMark } = options

    this.stream = fs.createReadStream(filepath, { highWaterMark: highWaterMark })

    this.lineChunks = []
    this.lines = []
    this.buf = Buffer.alloc(0)

    this.isEnd = false
    this.isPause = false

    this.stream.on('data', chunk => {
      [this.buf, this.lineChunks] = this.createLine(Buffer.concat([this.buf, chunk]), this.lineChunks)
      this.stream.pause()

      emiter.emit('next')
      emiter.emit('pause')

    })

    this.stream.on('end', () => {
      this.isEnd = true


      if (this.buf.length > 0) {
        [this.buf, this.lineChunks] = this.createLine(Buffer.concat([this.buf]), this.lineChunks)
        emiter.emit('next')
        emiter.emit('pause')
      }
    })
  }

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

  pause() {
    return new Promise(resolve => {

      var self = this
      // debugger

      if (this.isEnd && this.lineChunks.length === 0) {
        resolve([false])
      }

      if (this.isPause && this.lineChunks.length === 0) {
        resolve([false])
      }

      var fn = function () {
        emiter.once('pause', () => {
          // debugger
          self.isPause = true
          if (self.lineChunks.length === 0) {
            self.stream.resume()
            fn()
          } else {
            resolve(self.lineChunks)
          }
        })
      }

      fn()

    })
  }

  next() {
    return new Promise(resolve => {

      if (this.isEnd && this.lineChunks.length === 0) {
        // debugger
        resolve([false])
      }

      emiter.on('next', () => {
        // debugger
        resolve(this.lineChunks)
      })
    })
  }

  async go() {
    // debugger
    if (this.lines.length > 0) {
      return this.lines.shift()
    } else {
      this.stream.resume()
      this.lines = await this.next()
      return this.go()
    }
  }

  async poll() {

    // debugger
    if (this.lines.length > 0) {
      // debugger
      return this.lines.shift()
    } else {
      // debugger
      this.lines = await this.pause()
      return this.poll()
    }

  }

  resume() {
    // debugger
    this.isEnd ? this.isPause = true : this.isPause = false
    this.stream.resume()
  }

}

var a = new Reader(source, { highWaterMark: 1024 });


(async () => {

  let res
  let hash
  let i = 0


  while (res = await a.go()) {

    let b = new Reader(target, { highWaterMark: 1024 });
    let j = 0
    while (hash = await b.poll()) {
      // debugger
      let hashmap = new Map()
      hashmap.set(decoder.write(hash), j++)
      console.log(hashmap)
      b.resume()
    }
    // debugger


    console.log(decoder.write(res), i++)

  }

  console.log('run false')

})();









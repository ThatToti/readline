const fs = require('fs')
const StringDecoder = require('string_decoder').StringDecoder
var decoder = new StringDecoder('utf8')
const EventEmitter = require('events');
class MyEmitter extends EventEmitter { }
const emiter = new MyEmitter();

const source = 'assets/c.txt'

class Reader {
  constructor() {

    this.stream = fs.createReadStream(source, { highWaterMark: 10 })

    this.lineChunks = []
    this.lines = []
    this.buf = Buffer.alloc(0)

    this.isEnd = false

    this.stream.on('data', chunk => {
      [this.buf, this.lineChunks] = this.createLine(Buffer.concat([this.buf, chunk]), this.lineChunks)
      this.stream.pause()

      emiter.emit('next')
    })

    this.stream.on('end', () => {
      this.isEnd = true

      if (this.buf.length > 0) {
        [this.buf, this.lineChunks] = this.createLine(Buffer.concat([this.buf]), this.lineChunks)
        emiter.emit('next')
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


  next() {
    return new Promise(resolve => {
      emiter.on('next', () => {
        resolve(this.lineChunks)
      })
    })
  }

  async go() {
    if (this.lines.length > 0) {
      return this.lines.shift()
    } else {
      this.stream.resume()
      this.lines = await this.next()
      return this.go()
    }
  }

}

var a = new Reader();

(async () => {

  let res
  let count = 0
  while (res = await a.go()) {

    count++
    console.log(decoder.write(res), count)

  }

})();









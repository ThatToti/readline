const fs = require('fs')
const StringDecoder = require('string_decoder').StringDecoder
var decoder = new StringDecoder('utf8')
const EventEmitter = require('events');
class MyEmitter extends EventEmitter { }
const emiter = new MyEmitter();

const source = 'assets/a.txt'
const target = 'assets/b.txt'

function DJBHash(str) {
  var hash = 5381;
  var len = str.length, i = 0

  while (len--) {
    hash = (hash << 5) + hash + str.charCodeAt(i++); /* times 33 */
  }
  hash &= ~(1 << 31); /* strip the highest bit */
  return hash;
}

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

      // debugger
      if (this.buf.length >= 0) {
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
      // debugger

      if (this.isEnd && this.lineChunks.length === 0) {
        resolve([false])
      }

      if (this.isPause && this.lineChunks.length === 0) {
        resolve([false])
      }

      emiter.once('pause', () => {
        // debugger
        this.isPause = true
        if (this.lineChunks.length === 0) {
          this.stream.resume()
          this.isPause = false
          resolve(this.pause())
        } else {
          resolve(this.lineChunks)
        }
      })

    })
  }

  next() {
    return new Promise(resolve => {

      var self = this

      if (this.isEnd && this.lineChunks.length === 0) {
        // debugger
        resolve([false])
      }

      emiter.once('next', () => {
        // debugger
        resolve(self.lineChunks)
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
      // debugger
      return this.go()
    }
  }

  async poll() {

    // debugger
    if (this.lines.length > 0) {
      // debugger
      if (this.lines[0] === false) return false

      return this.lines.splice(0)
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

function objToStrMap(obj) {
  let strMap = new Map();
  for (let k of Object.keys(obj)) {
    strMap.set(k, obj[k]);
  }
  return strMap;
}

function strMapToObj(strMap) {
  let obj = Object.create(null);
  for (let [k, v] of strMap) {
    obj[k] = v;
  }
  return obj;
}

function output(hashmap, mapNum) {

  /** 创建写入流 */
  const ws = fs.createWriteStream(`hashmaps/map${mapNum}.txt`)

  /** 先转对象,再转 json */
  ws.write(JSON.stringify(strMapToObj(hashmap)))

}

function readHashMap(map) {
  return new Promise(resolve => {
    fs.readFile(`hashmaps/${map}`, (err, data) => {
      /** 先转 json ,再转 hashmap */
      resolve(objToStrMap(JSON.parse(decoder.write(data))))
    })
  })

};

function lsDir(dirname) {
  return new Promise(resolve => {
    fs.readdir(dirname, (err, files) => {
      resolve(files)
    })
  })
}

function printLog(content) {
  var ws = fs.createWriteStream(`temp/output.txt`)
  ws.write(content)
}


(async () => {

  /** 写文件,hash 切分 */
  let mapNum = 1
  let j = 0
  let fileB = new Reader(target, { highWaterMark: 1024 * 1024 * 10 });
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


  /** 读文件 */
  let i = 0
  let log = ``
  var fileA = new Reader(source, { highWaterMark: 1024 * 1024 });
  while (line = await fileA.go()) {
    i++

    /** buf 转字符串 */
    let str = decoder.write(line)

    /** 字符串转 hash */
    let hash = DJBHash(str)

    /** 相同行数组 */
    let arr = []

    /** ls hashmaps */
    let maps = await lsDir('hashmaps')

    for (let map of maps) {
      let hashmap = await readHashMap(map)

      if (hashmap.get(hash.toString())) {
        arr = [...arr, ...hashmap.get(hash.toString())]
      }
    }

    /** 如果有相同行 */
    if (arr.length > 0) {
      if (str === '') return
      content = `${str}\na.txt:${i}\nb.txt:${arr}\n\r`
      console.log(content)
      log += content
      printLog(log)
    }
  }

})();









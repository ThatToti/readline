const fs = require('fs')
const path = require('path')
const StringDecoder = require('string_decoder').StringDecoder
var decoder = new StringDecoder('utf8')

const source = 'assets/a.txt'

class Reader {
  constructor() {
    this.stream = fs.createReadStream(source)
  }

}

const stream = fs.createReadStream(source)
var lineChunks = []
var bufChunks = Buffer.alloc(0)
var bufSize = 0

var createLine1 = (buf, list) => {

  var index = buf.indexOf('\n')

  if (index === -1) {
    list.push(buf)
    return list
  }

  var line = buf.slice(0, index)

  list.push(line)

  return createLine1(buf.slice(index + 1), list)
}


stream.on('data', chunk => {

  lineChunks = createLine1(chunk, lineChunks)



})

stream.on('end', () => {
  // var buf = Buffer.concat(bufChunks, bufSize)
  // console.log(buf)
  for (let line of lineChunks) {
    console.log(decoder.write(line))
  }
})




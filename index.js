const fs = require('fs')
const path = require('path')
const source = 'assets/a.txt'

class Reader {
  constructor() {
    this.stream = fs.createReadStream(filepath, { highWaterMark })
  }

}

const stream = fs.createReadStream(source)

stream.on('data', chunk => {
  debugger
  console.log(chunk)
})


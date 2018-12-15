const gzip = require('zlib').createGzip();
const stream = require('stream')
const fs = require('fs');
const util = require('util')

const pipeline = util.promisify(stream.pipeline)

const input = fs.createReadStream('assets/1GB.txt');
const out = (chunk) => fs.appendFile('assets/10GB.txt', chunk, () => { })

async function run() {
    input.on('data', chunk => out(chunk))
};

run()

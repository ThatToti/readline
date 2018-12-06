const fs = require('fs');
const rl = require('readline');

const crypto = require('crypto');

function hash(text) {
  const hash = crypto.createHash('sha1');
  hash.update(text);
  return hash.digest('hex');
}
_readBytesSecond = 0;

function delay(time) {
  return new Promise(res => {
    setTimeout(_ => {
      res();
    }, time);
  });
}

const EventEmitter = require('events');

class LineIterator {
  constructor(filePath, options) {
    const { isHash = false } = options;
    this.rl = rl.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    });

    this.lineSet = [];
    this.rl.on('line', async line => {
      //   console.log(line);
      if (isHash) {
        this.lineSet.push(hash(line));
      } else {
        this.lineSet.push(line);
      }

      _readBytesSecond += Buffer.from(line).length;

      this.rl.pause();
    });

    this.rl.on('close', res => {
      this.isRlCLose = true;
    });
  }

  once() {
    return new Promise(res => {
      this.rl.once('pause', line => {
        // console.log(this.lineSet);
        res();
      });
    });
  }

  async next() {
    if (this.isRlCLose) {
      return null;
    }
    if (this.lineSet.length === 0) {
      this.rl.resume();
      await this.once();
    }
    const nextLine = this.lineSet.shift();
    // console.log('nextLine', nextLine);
    // if (!nextLine) {
    //   debugger;
    // }
    return nextLine;
  }
}

function printMemoryUsage() {
  var info = process.memoryUsage();
  function mb(v) {
    return (v / 1024 / 1024).toFixed(2) + 'MB';
  }
  console.log(
    'rss=%s, heapTotal=%s, heapUsed=%s',
    mb(info.rss),
    mb(info.heapTotal),
    mb(info.heapUsed)
  );
}

_lastTimestamp = Date.now();
var MB = 1024 * 1024;

speed = MB * 10;
function isTooFast() {
  //   debugger;
  var t = (Date.now() - _lastTimestamp) / 1000;
  var bps = _readBytesSecond / t;
  return bps > speed;
}

// 每隔一段时间检查速度
async function checkSpeed() {
  //   debugger;
  while (1) {
    if (!isTooFast()) {
      break;
    }
    // console.log('too fast');
    await delay(100);
  }
  return true;
}

const a = new LineIterator('assets/a.txt', { isHash: true });
const b = new LineIterator('assets/b.txt', { isHash: true });
// (async () => {
//   let sourceLine = '';

//   let i = 1;

//   while ((sourceLine = await a.next())) {
//     // console.log(sourceLine, i);
//     // debugger;
//     let targetLine = '',
//       j = 1;
//     const targetStream = new LineIterator('assets/b.txt');
//     while ((targetLine = await targetStream.next())) {
//       await checkSpeed();

//       if (j % 100 === 0) {
//         printMemoryUsage();
//       }
//       if (sourceLine === targetLine) {
//         console.log(i, j);
//       }
//       j += 1;
//     }
//     i += 1;
//   }
// })();

(async () => {
  let sourceLine = '';
  let i = 1;

  while ((sourceLine = await a.next())) {
    // console.log(sourceLine, i);
    // debugger;
    let targetLine = '',
      j = 1;
    console.log(sourceLine);
    debugger;
    // const targetStream = new LineIterator('assets/b.txt');
    // while ((targetLine = await targetStream.next())) {
    //   await checkSpeed();

    //   if (j % 100 === 0) {
    //     printMemoryUsage();
    //   }
    //   if (sourceLine === targetLine) {
    //     console.log(i, j);
    //   }
    //   j += 1;
    // }
    i += 1;
  }
})();

/**
 * 两个大文件查找相同行
 * Copyright: 2018 黄俊豪 Toti <mr.totihuang@gmail.com>
 */

/**
 * 各种变量声明
 */
const fs = require('fs')
const StringDecoder = require('string_decoder').StringDecoder
var decoder = new StringDecoder('utf8')
const { Reader } = require('./reader')

/** 源文件和目标文件 */
const source = 'assets/a.txt'
const target = 'assets/2MB.txt'

/** 每隔一秒查一次内存情况 */
const intervalTimer = setInterval(printMemoryUsage, 1000);

/**
 * Reader 模块,读取流文件,提供一系列方法
 * @param {filepath} 路径
 * @param {options} 设置
 * @method {go}
 */


/** 内存监控函数 */
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

/** 大 hash 表切分,存入硬盘 */
function output(hashmap, mapNum) {
  /** 创建写入流 */
  const ws = fs.createWriteStream(`hashmaps/map${mapNum}.txt`)
  /** 先转对象,再转 json */
  ws.write(JSON.stringify(strMapToObj(hashmap)))
}

/** 读硬盘中的 hash 表 */
function readHashMap(map) {
  return new Promise(resolve => {
    fs.readFile(`hashmaps/${map}`, (err, data) => {
      /** 先转 json ,再转 hashmap */
      resolve(objToStrMap(JSON.parse(decoder.write(data))))
    })
  })

};

/** 查看目录下的文件 */
function lsDir(dirname) {
  return new Promise(resolve => {
    fs.readdir(dirname, (err, files) => {
      resolve(files)
    })
  })
}

/** 打印查找的结果 */
function printLog(outMap) {
  // fs.appendFile(`temp/output.txt`, content, (err) => {
  //   console.log(err)
  // })
  let ws = fs.createWriteStream('temp/output.txt')

  let content = ``
  for (let [index, item] of Object.entries(outMap)) {
    content += `${item.str}\na.txt:${index}\nb.txt:${item.arr}\n\r`
  }
  ws.write(content)

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

/** 自执行逻辑 */
(async () => {

  /**
   * hashmap 切分直接读入内存
   */
  let [strT, hashT, arrT, j, outMap] = ['', 12121, [], 0, {}]
  /** 100MB 的切分量 */
  let fileB = new Reader(target, { highWaterMark: 1024 * 1024 }, 100 * 1024 * 1024);
  /** 输出的 map */
  while (hashes = await fileB.poll()) {

    let hashmap = new Map()

    for (let raw of hashes) {
      /** 记录行数 */
      j++

      /** 转字符串 */
      strT = decoder.write(raw)

      /** 哈希函数生成 hash */
      hashT = DJBHash(strT)

      /** 值为数组 */
      arrT = hashmap.get(hashT) || []

      /** 生成 map */
      hashmap.set(hashT, [...arrT, j])
    }

    /** 
      * 读文件模块
      */
    let [strS, hashS, i] = ['', 12121, 0]
    let fileA = new Reader(source, { highWaterMark: 1024 * 1024 });
    while (line = await fileA.go()) {
      i++

      /** buf 转字符串 */
      strS = decoder.write(line)

      /** 字符串转 hash */
      hashS = DJBHash(strS)

      /** 相同行数组 */
      let arr = []

      /** 与直接在内存的 hashmap 对比  */
      if (hashmap.get(hashS)) {
        arr = [...arr, ...hashmap.get(hashS)]
      }

      /** 如果有相同行 */
      if (arr.length > 0) {
        if (strS === '') return

        if (outMap[i] === undefined) {
          outMap[i] = { str: strS, arr: arr }
        } else {
          outMap[i].arr = [...outMap[i].arr, ...arr]
        }
        printLog(outMap)
        printMemoryUsage()
      }
    }

    /** 读取下一份 hashmap */
    fileB.resume()
  }
})();









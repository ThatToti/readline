const fs = require('fs')

fs.stat('assets/a.txt', (err, stats) => {
    // console.log(stats)
    // console.log(parseInt(stats.mode & parseInt("777", 8)).toString(8)[0])
    console.log(parseInt(parseInt("777", 8)))
    let code = parseInt((stats.mode & parseInt("777", 8)).toString(8)[0])
    // console.log(!!(1 & parseInt((stats.mode & parseInt("777", 8)).toString(8)[0])))
})
#!/usr/bin/env node
const fs = require('fs');
const child_process = require('child_process');

child_process.exec('yarn start:trader', (err, stdout, stderr) => {
  if (err) {
    // node couldn't execute the command
    fs.appendFile('/var/www/robot/web/reports/trader/trade-error.txt', err, function (err) {
      // if (err) throw err;
    })
    return;
  } else {
    fs.appendFile('/var/www/robot/web/reports/trader/trade-error.txt', stderr, function (err) {
      // if (err) throw err;
    })
  }

  fs.appendFile('/var/www/robot/web/reports/trader/trade.txt', stdout, function (err) {
    // if (err) throw err;
  })
});
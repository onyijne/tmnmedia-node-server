import fs from 'fs'
var stringify = require('json-stringify-safe');

export const indexData = [
  'Volatility 10 Index=/topics/10v1',
  'Volatility 25 Index=/topics/25v1',
  'Volatility 50 Index=/topics/50v1',
  'Volatility 75 Index=/topics/75v1',
  'Volatility 100 Index=/topics/100v1',
  'Volatility 10 (1s) Index=/topics/10sv1',
  'Volatility 25 (1s) Index=/topics/25sv1',
  'Volatility 50 (1s) Index=/topics/50sv1',
  'Volatility 75 (1s) Index=/topics/75sv1',
  'Volatility 100 (1s) Index=/topics/100sv1'
]

export async function topicMap (indexName) {
  let topic
  indexData.forEach(ele => {
    const name = ele.split('=')
    if (name[0] === indexName) {
      topic = name[1]
    }
  })
  return topic
}

export async function indexNameMap (topic) {
  let indexName
  indexData.forEach(ele => {
    const name = ele.split('=')
    if (name[1] === topic) {
      indexName = name[0]
    }
  })
  return indexName
}

export function isEmpty (value) {
  // eslint-disable-next-line valid-typeof
  if (typeof (value) === 'array') return value.length === 0
  return !value || Object.keys(value).length === 0
}

export function arrayRemove (arr, value) {
  return arr.filter(ele => ele !== value)
}

export function arrayAdd (arr, value) {
  arr.push(value)
  return arr
}

export function call_user_func(cb, parameters) {
    // Call a user function which is the first parameter    
    //   
    // version: 812.3015  
    // discuss at: http://phpjs.org/functions/call_user_func  
    // +   original by: Brett Zamir  
    // *     example 1: call_user_func('isNaN', 'a');  
    // *     returns 1: true  
    let func;
   
    if (typeof cb == 'string') {
        if (typeof this[cb] == 'function') {
            func = this[cb];
        } else {
            func = (new Function(null, 'return ' + cb))();
        }
    } else if (cb instanceof Array) {
        func = eval(cb[0]+"['"+cb[1]+"']");
    }
    if (typeof func != 'function') {
        throw new Exception(func + ' is not a valid function');
    }

    return func.apply(null, Array.prototype.slice.call(parameters, 1));
}

export async function logger (data, file = '/var/www/robot/web/reports/server/robot.txt') {
  let send = data
  if (typeof(data) == 'object') {
    send = stringify(send)
  }
    fs.appendFile(file, `,\n${send}`, function (err) {
     // if (err) throw err;
    })
  }

export const Math = (function() {
  const Math = {}
  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */
  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }
})();


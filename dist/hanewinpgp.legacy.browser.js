/*!
 * hanewinpgp.browser - PGP / GnuPG / OpenPGP Message Encryption in JavaScript by Herbert Hanewinkel.
 * @version v0.1.0
 * @link https://github.com/dossy/hanewinpgp#readme
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.hanewinpgp = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jshint eqnull:true*/
(function (root) {
  "use strict";

  var GLOBAL_KEY = "Random";

  var imul = (typeof Math.imul !== "function" || Math.imul(0xffffffff, 5) !== -5 ?
    function (a, b) {
      var ah = (a >>> 16) & 0xffff;
      var al = a & 0xffff;
      var bh = (b >>> 16) & 0xffff;
      var bl = b & 0xffff;
      // the shift by 0 fixes the sign on the high part
      // the final |0 converts the unsigned value into a signed value
      return (al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0;
    } :
    Math.imul);

  var stringRepeat = (typeof String.prototype.repeat === "function" && "x".repeat(3) === "xxx" ?
    function (x, y) {
      return x.repeat(y);
    } : function (pattern, count) {
      var result = "";
      while (count > 0) {
        if (count & 1) {
          result += pattern;
        }
        count >>= 1;
        pattern += pattern;
      }
      return result;
    });

  function Random(engine) {
    if (!(this instanceof Random)) {
      return new Random(engine);
    }

    if (engine == null) {
      engine = Random.engines.nativeMath;
    } else if (typeof engine !== "function") {
      throw new TypeError("Expected engine to be a function, got " + typeof engine);
    }
    this.engine = engine;
  }
  var proto = Random.prototype;

  Random.engines = {
    nativeMath: function () {
      return (Math.random() * 0x100000000) | 0;
    },
    mt19937: (function (Int32Array) {
      // http://en.wikipedia.org/wiki/Mersenne_twister
      function refreshData(data) {
        var k = 0;
        var tmp = 0;
        for (;
          (k | 0) < 227; k = (k + 1) | 0) {
          tmp = (data[k] & 0x80000000) | (data[(k + 1) | 0] & 0x7fffffff);
          data[k] = data[(k + 397) | 0] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
        }

        for (;
          (k | 0) < 623; k = (k + 1) | 0) {
          tmp = (data[k] & 0x80000000) | (data[(k + 1) | 0] & 0x7fffffff);
          data[k] = data[(k - 227) | 0] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
        }

        tmp = (data[623] & 0x80000000) | (data[0] & 0x7fffffff);
        data[623] = data[396] ^ (tmp >>> 1) ^ ((tmp & 0x1) ? 0x9908b0df : 0);
      }

      function temper(value) {
        value ^= value >>> 11;
        value ^= (value << 7) & 0x9d2c5680;
        value ^= (value << 15) & 0xefc60000;
        return value ^ (value >>> 18);
      }

      function seedWithArray(data, source) {
        var i = 1;
        var j = 0;
        var sourceLength = source.length;
        var k = Math.max(sourceLength, 624) | 0;
        var previous = data[0] | 0;
        for (;
          (k | 0) > 0; --k) {
          data[i] = previous = ((data[i] ^ imul((previous ^ (previous >>> 30)), 0x0019660d)) + (source[j] | 0) + (j | 0)) | 0;
          i = (i + 1) | 0;
          ++j;
          if ((i | 0) > 623) {
            data[0] = data[623];
            i = 1;
          }
          if (j >= sourceLength) {
            j = 0;
          }
        }
        for (k = 623;
          (k | 0) > 0; --k) {
          data[i] = previous = ((data[i] ^ imul((previous ^ (previous >>> 30)), 0x5d588b65)) - i) | 0;
          i = (i + 1) | 0;
          if ((i | 0) > 623) {
            data[0] = data[623];
            i = 1;
          }
        }
        data[0] = 0x80000000;
      }

      function mt19937() {
        var data = new Int32Array(624);
        var index = 0;
        var uses = 0;

        function next() {
          if ((index | 0) >= 624) {
            refreshData(data);
            index = 0;
          }

          var value = data[index];
          index = (index + 1) | 0;
          uses += 1;
          return temper(value) | 0;
        }
        next.getUseCount = function() {
          return uses;
        };
        next.discard = function (count) {
          uses += count;
          if ((index | 0) >= 624) {
            refreshData(data);
            index = 0;
          }
          while ((count - index) > 624) {
            count -= 624 - index;
            refreshData(data);
            index = 0;
          }
          index = (index + count) | 0;
          return next;
        };
        next.seed = function (initial) {
          var previous = 0;
          data[0] = previous = initial | 0;

          for (var i = 1; i < 624; i = (i + 1) | 0) {
            data[i] = previous = (imul((previous ^ (previous >>> 30)), 0x6c078965) + i) | 0;
          }
          index = 624;
          uses = 0;
          return next;
        };
        next.seedWithArray = function (source) {
          next.seed(0x012bd6aa);
          seedWithArray(data, source);
          return next;
        };
        next.autoSeed = function () {
          return next.seedWithArray(Random.generateEntropyArray());
        };
        return next;
      }

      return mt19937;
    }(typeof Int32Array === "function" ? Int32Array : Array)),
    browserCrypto: (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function" && typeof Int32Array === "function") ? (function () {
      var data = null;
      var index = 128;

      return function () {
        if (index >= 128) {
          if (data === null) {
            data = new Int32Array(128);
          }
          crypto.getRandomValues(data);
          index = 0;
        }

        return data[index++] | 0;
      };
    }()) : null
  };

  Random.generateEntropyArray = function () {
    var array = [];
    var engine = Random.engines.nativeMath;
    for (var i = 0; i < 16; ++i) {
      array[i] = engine() | 0;
    }
    array.push(new Date().getTime() | 0);
    return array;
  };

  function returnValue(value) {
    return function () {
      return value;
    };
  }

  // [-0x80000000, 0x7fffffff]
  Random.int32 = function (engine) {
    return engine() | 0;
  };
  proto.int32 = function () {
    return Random.int32(this.engine);
  };

  // [0, 0xffffffff]
  Random.uint32 = function (engine) {
    return engine() >>> 0;
  };
  proto.uint32 = function () {
    return Random.uint32(this.engine);
  };

  // [0, 0x1fffffffffffff]
  Random.uint53 = function (engine) {
    var high = engine() & 0x1fffff;
    var low = engine() >>> 0;
    return (high * 0x100000000) + low;
  };
  proto.uint53 = function () {
    return Random.uint53(this.engine);
  };

  // [0, 0x20000000000000]
  Random.uint53Full = function (engine) {
    while (true) {
      var high = engine() | 0;
      if (high & 0x200000) {
        if ((high & 0x3fffff) === 0x200000 && (engine() | 0) === 0) {
          return 0x20000000000000;
        }
      } else {
        var low = engine() >>> 0;
        return ((high & 0x1fffff) * 0x100000000) + low;
      }
    }
  };
  proto.uint53Full = function () {
    return Random.uint53Full(this.engine);
  };

  // [-0x20000000000000, 0x1fffffffffffff]
  Random.int53 = function (engine) {
    var high = engine() | 0;
    var low = engine() >>> 0;
    return ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
  };
  proto.int53 = function () {
    return Random.int53(this.engine);
  };

  // [-0x20000000000000, 0x20000000000000]
  Random.int53Full = function (engine) {
    while (true) {
      var high = engine() | 0;
      if (high & 0x400000) {
        if ((high & 0x7fffff) === 0x400000 && (engine() | 0) === 0) {
          return 0x20000000000000;
        }
      } else {
        var low = engine() >>> 0;
        return ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
      }
    }
  };
  proto.int53Full = function () {
    return Random.int53Full(this.engine);
  };

  function add(generate, addend) {
    if (addend === 0) {
      return generate;
    } else {
      return function (engine) {
        return generate(engine) + addend;
      };
    }
  }

  Random.integer = (function () {
    function isPowerOfTwoMinusOne(value) {
      return ((value + 1) & value) === 0;
    }

    function bitmask(masking) {
      return function (engine) {
        return engine() & masking;
      };
    }

    function downscaleToLoopCheckedRange(range) {
      var extendedRange = range + 1;
      var maximum = extendedRange * Math.floor(0x100000000 / extendedRange);
      return function (engine) {
        var value = 0;
        do {
          value = engine() >>> 0;
        } while (value >= maximum);
        return value % extendedRange;
      };
    }

    function downscaleToRange(range) {
      if (isPowerOfTwoMinusOne(range)) {
        return bitmask(range);
      } else {
        return downscaleToLoopCheckedRange(range);
      }
    }

    function isEvenlyDivisibleByMaxInt32(value) {
      return (value | 0) === 0;
    }

    function upscaleWithHighMasking(masking) {
      return function (engine) {
        var high = engine() & masking;
        var low = engine() >>> 0;
        return (high * 0x100000000) + low;
      };
    }

    function upscaleToLoopCheckedRange(extendedRange) {
      var maximum = extendedRange * Math.floor(0x20000000000000 / extendedRange);
      return function (engine) {
        var ret = 0;
        do {
          var high = engine() & 0x1fffff;
          var low = engine() >>> 0;
          ret = (high * 0x100000000) + low;
        } while (ret >= maximum);
        return ret % extendedRange;
      };
    }

    function upscaleWithinU53(range) {
      var extendedRange = range + 1;
      if (isEvenlyDivisibleByMaxInt32(extendedRange)) {
        var highRange = ((extendedRange / 0x100000000) | 0) - 1;
        if (isPowerOfTwoMinusOne(highRange)) {
          return upscaleWithHighMasking(highRange);
        }
      }
      return upscaleToLoopCheckedRange(extendedRange);
    }

    function upscaleWithinI53AndLoopCheck(min, max) {
      return function (engine) {
        var ret = 0;
        do {
          var high = engine() | 0;
          var low = engine() >>> 0;
          ret = ((high & 0x1fffff) * 0x100000000) + low + (high & 0x200000 ? -0x20000000000000 : 0);
        } while (ret < min || ret > max);
        return ret;
      };
    }

    return function (min, max) {
      min = Math.floor(min);
      max = Math.floor(max);
      if (min < -0x20000000000000 || !isFinite(min)) {
        throw new RangeError("Expected min to be at least " + (-0x20000000000000));
      } else if (max > 0x20000000000000 || !isFinite(max)) {
        throw new RangeError("Expected max to be at most " + 0x20000000000000);
      }

      var range = max - min;
      if (range <= 0 || !isFinite(range)) {
        return returnValue(min);
      } else if (range === 0xffffffff) {
        if (min === 0) {
          return Random.uint32;
        } else {
          return add(Random.int32, min + 0x80000000);
        }
      } else if (range < 0xffffffff) {
        return add(downscaleToRange(range), min);
      } else if (range === 0x1fffffffffffff) {
        return add(Random.uint53, min);
      } else if (range < 0x1fffffffffffff) {
        return add(upscaleWithinU53(range), min);
      } else if (max - 1 - min === 0x1fffffffffffff) {
        return add(Random.uint53Full, min);
      } else if (min === -0x20000000000000 && max === 0x20000000000000) {
        return Random.int53Full;
      } else if (min === -0x20000000000000 && max === 0x1fffffffffffff) {
        return Random.int53;
      } else if (min === -0x1fffffffffffff && max === 0x20000000000000) {
        return add(Random.int53, 1);
      } else if (max === 0x20000000000000) {
        return add(upscaleWithinI53AndLoopCheck(min - 1, max - 1), 1);
      } else {
        return upscaleWithinI53AndLoopCheck(min, max);
      }
    };
  }());
  proto.integer = function (min, max) {
    return Random.integer(min, max)(this.engine);
  };

  // [0, 1] (floating point)
  Random.realZeroToOneInclusive = function (engine) {
    return Random.uint53Full(engine) / 0x20000000000000;
  };
  proto.realZeroToOneInclusive = function () {
    return Random.realZeroToOneInclusive(this.engine);
  };

  // [0, 1) (floating point)
  Random.realZeroToOneExclusive = function (engine) {
    return Random.uint53(engine) / 0x20000000000000;
  };
  proto.realZeroToOneExclusive = function () {
    return Random.realZeroToOneExclusive(this.engine);
  };

  Random.real = (function () {
    function multiply(generate, multiplier) {
      if (multiplier === 1) {
        return generate;
      } else if (multiplier === 0) {
        return function () {
          return 0;
        };
      } else {
        return function (engine) {
          return generate(engine) * multiplier;
        };
      }
    }

    return function (left, right, inclusive) {
      if (!isFinite(left)) {
        throw new RangeError("Expected left to be a finite number");
      } else if (!isFinite(right)) {
        throw new RangeError("Expected right to be a finite number");
      }
      return add(
        multiply(
          inclusive ? Random.realZeroToOneInclusive : Random.realZeroToOneExclusive,
          right - left),
        left);
    };
  }());
  proto.real = function (min, max, inclusive) {
    return Random.real(min, max, inclusive)(this.engine);
  };

  Random.bool = (function () {
    function isLeastBitTrue(engine) {
      return (engine() & 1) === 1;
    }

    function lessThan(generate, value) {
      return function (engine) {
        return generate(engine) < value;
      };
    }

    function probability(percentage) {
      if (percentage <= 0) {
        return returnValue(false);
      } else if (percentage >= 1) {
        return returnValue(true);
      } else {
        var scaled = percentage * 0x100000000;
        if (scaled % 1 === 0) {
          return lessThan(Random.int32, (scaled - 0x80000000) | 0);
        } else {
          return lessThan(Random.uint53, Math.round(percentage * 0x20000000000000));
        }
      }
    }

    return function (numerator, denominator) {
      if (denominator == null) {
        if (numerator == null) {
          return isLeastBitTrue;
        }
        return probability(numerator);
      } else {
        if (numerator <= 0) {
          return returnValue(false);
        } else if (numerator >= denominator) {
          return returnValue(true);
        }
        return lessThan(Random.integer(0, denominator - 1), numerator);
      }
    };
  }());
  proto.bool = function (numerator, denominator) {
    return Random.bool(numerator, denominator)(this.engine);
  };

  function toInteger(value) {
    var number = +value;
    if (number < 0) {
      return Math.ceil(number);
    } else {
      return Math.floor(number);
    }
  }

  function convertSliceArgument(value, length) {
    if (value < 0) {
      return Math.max(value + length, 0);
    } else {
      return Math.min(value, length);
    }
  }
  Random.pick = function (engine, array, begin, end) {
    var length = array.length;
    var start = begin == null ? 0 : convertSliceArgument(toInteger(begin), length);
    var finish = end === void 0 ? length : convertSliceArgument(toInteger(end), length);
    if (start >= finish) {
      return void 0;
    }
    var distribution = Random.integer(start, finish - 1);
    return array[distribution(engine)];
  };
  proto.pick = function (array, begin, end) {
    return Random.pick(this.engine, array, begin, end);
  };

  function returnUndefined() {
    return void 0;
  }
  var slice = Array.prototype.slice;
  Random.picker = function (array, begin, end) {
    var clone = slice.call(array, begin, end);
    if (!clone.length) {
      return returnUndefined;
    }
    var distribution = Random.integer(0, clone.length - 1);
    return function (engine) {
      return clone[distribution(engine)];
    };
  };

  Random.shuffle = function (engine, array, downTo) {
    var length = array.length;
    if (length) {
      if (downTo == null) {
        downTo = 0;
      }
      for (var i = (length - 1) >>> 0; i > downTo; --i) {
        var distribution = Random.integer(0, i);
        var j = distribution(engine);
        if (i !== j) {
          var tmp = array[i];
          array[i] = array[j];
          array[j] = tmp;
        }
      }
    }
    return array;
  };
  proto.shuffle = function (array) {
    return Random.shuffle(this.engine, array);
  };

  Random.sample = function (engine, population, sampleSize) {
    if (sampleSize < 0 || sampleSize > population.length || !isFinite(sampleSize)) {
      throw new RangeError("Expected sampleSize to be within 0 and the length of the population");
    }

    if (sampleSize === 0) {
      return [];
    }

    var clone = slice.call(population);
    var length = clone.length;
    if (length === sampleSize) {
      return Random.shuffle(engine, clone, 0);
    }
    var tailLength = length - sampleSize;
    return Random.shuffle(engine, clone, tailLength - 1).slice(tailLength);
  };
  proto.sample = function (population, sampleSize) {
    return Random.sample(this.engine, population, sampleSize);
  };

  Random.die = function (sideCount) {
    return Random.integer(1, sideCount);
  };
  proto.die = function (sideCount) {
    return Random.die(sideCount)(this.engine);
  };

  Random.dice = function (sideCount, dieCount) {
    var distribution = Random.die(sideCount);
    return function (engine) {
      var result = [];
      result.length = dieCount;
      for (var i = 0; i < dieCount; ++i) {
        result[i] = distribution(engine);
      }
      return result;
    };
  };
  proto.dice = function (sideCount, dieCount) {
    return Random.dice(sideCount, dieCount)(this.engine);
  };

  // http://en.wikipedia.org/wiki/Universally_unique_identifier
  Random.uuid4 = (function () {
    function zeroPad(string, zeroCount) {
      return stringRepeat("0", zeroCount - string.length) + string;
    }

    return function (engine) {
      var a = engine() >>> 0;
      var b = engine() | 0;
      var c = engine() | 0;
      var d = engine() >>> 0;

      return (
        zeroPad(a.toString(16), 8) +
        "-" +
        zeroPad((b & 0xffff).toString(16), 4) +
        "-" +
        zeroPad((((b >> 4) & 0x0fff) | 0x4000).toString(16), 4) +
        "-" +
        zeroPad(((c & 0x3fff) | 0x8000).toString(16), 4) +
        "-" +
        zeroPad(((c >> 4) & 0xffff).toString(16), 4) +
        zeroPad(d.toString(16), 8));
    };
  }());
  proto.uuid4 = function () {
    return Random.uuid4(this.engine);
  };

  Random.string = (function () {
    // has 2**x chars, for faster uniform distribution
    var DEFAULT_STRING_POOL = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-";

    return function (pool) {
      if (pool == null) {
        pool = DEFAULT_STRING_POOL;
      }

      var length = pool.length;
      if (!length) {
        throw new Error("Expected pool not to be an empty string");
      }

      var distribution = Random.integer(0, length - 1);
      return function (engine, length) {
        var result = "";
        for (var i = 0; i < length; ++i) {
          var j = distribution(engine);
          result += pool.charAt(j);
        }
        return result;
      };
    };
  }());
  proto.string = function (length, pool) {
    return Random.string(pool)(this.engine, length);
  };

  Random.hex = (function () {
    var LOWER_HEX_POOL = "0123456789abcdef";
    var lowerHex = Random.string(LOWER_HEX_POOL);
    var upperHex = Random.string(LOWER_HEX_POOL.toUpperCase());

    return function (upper) {
      if (upper) {
        return upperHex;
      } else {
        return lowerHex;
      }
    };
  }());
  proto.hex = function (length, upper) {
    return Random.hex(upper)(this.engine, length);
  };

  Random.date = function (start, end) {
    if (!(start instanceof Date)) {
      throw new TypeError("Expected start to be a Date, got " + typeof start);
    } else if (!(end instanceof Date)) {
      throw new TypeError("Expected end to be a Date, got " + typeof end);
    }
    var distribution = Random.integer(start.getTime(), end.getTime());
    return function (engine) {
      return new Date(distribution(engine));
    };
  };
  proto.date = function (start, end) {
    return Random.date(start, end)(this.engine);
  };

  if (typeof define === "function" && define.amd) {
    define(function () {
      return Random;
    });
  } else if (typeof module !== "undefined" && typeof require === "function") {
    module.exports = Random;
  } else {
    (function () {
      var oldGlobal = root[GLOBAL_KEY];
      Random.noConflict = function () {
        root[GLOBAL_KEY] = oldGlobal;
        return this;
      };
    }());
    root[GLOBAL_KEY] = Random;
  }
}(this));
},{}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}

},{}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],"buffer":[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":2,"ieee754":3,"isarray":4}],"hanewinpgp":[function(require,module,exports){
(function (Buffer){
/*!
 * hanewinpgp - PGP / GnuPG / OpenPGP Message Encryption in JavaScript by Herbert Hanewinkel.
 * @version v0.1.0
 * @link https://github.com/dossy/hanewinpgp#readme
 */

var VERSION = '0.1.0';

/* OpenPGP encryption using RSA/AES
 * Copyright 2005-2006 Herbert Hanewinkel, www.haneWIN.de
 * version 2.0, check www.haneWIN.de for the latest version
 *
 * This software is provided as-is, without express or implied warranty.  
 * Permission to use, copy, modify, distribute or sell this software, with or
 * without fee, for any purpose and by any individual or organization, is hereby
 * granted, provided that the above copyright notice and this paragraph appear 
 * in all copies. Distribution as a part of an application or binary must
 * include the above copyright notice in the documentation and/or other
 * materials provided with the application or distribution.
 */

'use strict';

/* We need an unpredictable session key of 128 bits ( = 2^128 possible keys).
 * If we generate the session key with a PRNG from a small seed we get only
 * a small number of session keys, e.g. 4 bytes seed => 2^32 keys, a brute
 * force attack could try all 2^32 session keys. 
 * (see RFC 1750 - Randomness Recommendations for Security.)
 *
 * Sources for randomness in Javascript are limited.
 * We have load, exec time, seed from random(), mouse movement events
 * and the timing from key press events.
 * But even here we have restrictions.
 * - A mailer will add a timestamp to the encrypted message, therefore
 *   only the msecs from the clock can be seen as unpredictable.
 * - Because the Windows timer is still based on the old DOS timer,
 *   the msecs jump under Windows in 18.2 msecs steps.
 * - Only a few bits from mouse mouvement event coordinates are unpredictable,
 *   if the same buttons are clicked on the screen.
 */

var randomByte

try {
  var crypto = require('crypto')

  randomByte = function () { return crypto.randomBytes(1)[0] }
} catch (e) {
  var Random = require('random-js')

  randomByte = Random.engines.browserCrypto ?
    function () { return Random.integer(0, 255)(Random.engines.browserCrypto) } :
    function () { return Random.integer(0, 255)(Random.engines.nativeMath) }
}

//randomByte = function () { return 1 }

var randomString = function (len, noNulls) {
  var r = [], t;

  for (var i = 0; i < len;) {
    t = randomByte()
    if (t == 0 && noNulls) continue
    i++

    r.push(String.fromCharCode(t))
  }

  return r.join('')
}

// ----------------------------------------

function hex2s(hex)
{
 var r='';
 if(hex.length%2) hex+='0';

 for(var i = 0; i<hex.length; i += 2)
   r += String.fromCharCode(parseInt(hex.slice(i, i+2), 16));
 return r;
}

function crc24(data)
{
 var crc = 0xb704ce;

 for(var n=0; n<data.length;n++)
 {
   crc ^=(data.charCodeAt(n)&255)<<16;
   for(var i=0;i<8;i++)
   {
    crc<<=1;
    if(crc & 0x1000000) crc^=0x1864cfb;
   }       
 }
 return String.fromCharCode((crc>>16)&255)
        +String.fromCharCode((crc>>8)&255)
        +String.fromCharCode(crc&255);
}

/**
 * RFC 4880 - https://tools.ietf.org/html/rfc4880
 */

// --------------------------------------
// GPG CFB symmetric encryption using AES

function GPGencrypt(key, text) {
  var i, n;
  var len = text.length;
  var lsk = key.length;
  var bpbl = 16; // bytes per data block
  var iblock = new Array(bpbl)
  var rblock = new Array(bpbl);
  var ct = new Array(bpbl + 2);
  var expandedKey = keyExpansion(key);
  var ciphertext = [];
 
  // append zero padding
  if (len % bpbl) {
    for (i = (len % bpbl); i < bpbl; i++) {
      text += '\0';
    }
  }

  // set up initialisation vector and random byte vector
  for (i = 0; i < bpbl; i++) {
    iblock[i] = 0;
    rblock[i] = randomByte();
  }

  iblock = AESencrypt(iblock, expandedKey);
  for (i = 0; i < bpbl; i++) {
    ct[i] = (iblock[i] ^= rblock[i]);
  }

  iblock = AESencrypt(iblock, expandedKey);
  // append check octets
  ct[bpbl] = (iblock[0] ^ rblock[bpbl - 2]);
  ct[bpbl + 1] = (iblock[1] ^ rblock[bpbl - 1]);
 
  for (i = 0; i < bpbl + 2; i++) {
    ciphertext.push(String.fromCharCode(ct[i]));
  }

  // resync
  iblock = ct.slice(2, bpbl + 2);

  for (n = 0; n < text.length; n += bpbl) {
    iblock = AESencrypt(iblock, expandedKey);
    for (i = 0; i < bpbl; i++) {
      iblock[i] ^= text.charCodeAt(n + i);
      ciphertext.push(String.fromCharCode(iblock[i]));
    }
  }

  return ciphertext.slice(0, len + bpbl + 2).join('');
}

/**
 * RFC 4880 - 4.2. Packet Headers
 *
 * We are implementing the "old" packet format.
 * 
 * @param {number} tag - Packet tag.
 * @param {number} len - Packet length.
 * @returns {string} Packet header data.
 */
function GPGpkt(tag, len) {
  var h = [ 0x80 + ((tag & 0x0F) << 2) + (len > 255) + (len > 65535) ]

  if (len > 65535) {
    h.push((len & 0xFF000000) >>> 24)
    h.push((len & 0x00FF0000) >>> 16)
  }

  if (len > 255) {
    h.push((len & 0x0000FF00) >>> 8)
  }

  h.push(len & 0x000000FF)

  return h.map(function (el) { return String.fromCharCode(el) }).join('')
}

/**
 * RFC 4880 - 5.1. Public-Key Encrypted Session Key Packets (Tag 1)
 */
function GPGpkesk(keyId, keytyp, symAlgo, sessionkey, pkey) { 
  var el = [ 3, 5, 9, 17, 513, 2049, 4097, 8193 ];
  var s = r2s(pkey);
  var l = Math.floor((s.charCodeAt(0) * 256 + s.charCodeAt(1) + 7) / 8);
  var mod = mpi2b(s.substr(0, l + 2));
  var exp = new Array();

  if (keytyp) {
    var grp = new Array();
    var y = new Array();
    var B = new Array();
    var C = new Array();

    var l2 = Math.floor((s.charCodeAt(l + 2) * 256 + s.charCodeAt(l + 3) + 7) / 8) + 2;

    grp = mpi2b(s.substr(l + 2, l2));
    y = mpi2b(s.substr(l + 2 + l2));
    exp[0] = 9; //el[randomByte()&7];
    B = bmodexp(grp, exp, mod);
    C = bmodexp(y, exp, mod);
  } else {
    exp = mpi2b(s.substr(l + 2));
  }

  var lsk = sessionkey.length;

  // calculate checksum of session key
  var c = 0;
  for (var i = 0; i < lsk; i++) c += sessionkey.charCodeAt(i);
  c &= 0xffff;

  // create MPI from session key using PKCS-1 block type 02
  var lm = (l - 2) * 8 + 2;
  var m = String.fromCharCode(lm / 256) + String.fromCharCode(lm % 256) +
    String.fromCharCode(2) +                // skip leading 0 for MPI
    randomString(l - lsk - 6, 1) + '\0' +   // add random padding (non-zero)
    String.fromCharCode(symAlgo) + sessionkey +
    String.fromCharCode(c / 256) + String.fromCharCode(c & 255);

  if (keytyp) {
    // add Elgamal encrypted mpi values
    var enc = b2mpi(B) + b2mpi(bmod(bmul(mpi2b(m), C), mod));

    return GPGpkt(1, enc.length + 10) +
      String.fromCharCode(3) + keyId + String.fromCharCode(16) + enc;
  } else {
    // rsa encrypt the result and convert into mpi
    var enc = b2mpi(bmodexp(mpi2b(m), exp, mod));

    return GPGpkt(1, enc.length + 10) +
      String.fromCharCode(3) + keyId + String.fromCharCode(1) + enc;
  }
}

/**
 * RFC 4880 - 5.7. Symmetrically Encrypted Data Packet (Tag 9)
 */
function GPGsed(key, data) {
  var ld = GPGld(data)
  var enc = GPGencrypt(key, ld)
  var pkt = GPGpkt(9, enc.length) + enc

  return pkt
}

/**
 * RFC 4880 - 5.9. Literal Data Packet (Tag 11)
 *
 * @param {Array} message - The message to encrypt.
 * @param {number} [type] - 0 = binary (default), 1 = text, 2 = UTF-8.
 * @returns {string} Packet data.
 */
function GPGld(data, type) {
  type = type || 0;

  /*
   * Text data is stored with <CR><LF> text endings (i.e., network-
   * normal line endings).  These should be converted to native line
   * endings by the receiving software.
   */

  return GPGpkt(11, data.length + 10) +
    [ 'b', 't', 'u' ][type] + // format
    String.fromCharCode(4) + 'file' +  // filename
    '\0\0\0\0' + // date
    data.map(function (el) { return String.fromCharCode(el) }).join('')
}

/**
 * Encrypt a message using the supplied key object.
 *
 * @param {object} key - Object from extract().
 * @param {string|Array|Buffer} message - The message to encrypt.
 * @returns {string} ASCII-armored encrypted text.
 */
module.exports.encrypt = function (key, message) {
  if (typeof navigator != 'undefined' && /MSIE [0-8]\.[0-9]+/.test(navigator.appVersion)) {
    throw new Error('IE8 and older not supported.');
  }

  var arr = message

  // Convert strings to Buffers, so they can be turned into Arrays below.
  if (typeof arr == 'string') {
    arr = Buffer.from(arr, 'utf8')
  }

  if (typeof arr == 'object' && !(arr instanceof Array)) {
    // expect an array-like object
    arr = Array.prototype.slice.call(arr, 0)
  }

  var symAlg = 7                  // AES=7, AES192=8, AES256=9
  var kSize = [ 16, 24, 32 ]      // key length in bytes
  var keylen = kSize[symAlg - 7]  // session key length in bytes
  var sesskey = randomString(keylen, 0)
  var keyId = hex2s(key.id)
  var cp = GPGpkesk(keyId, key.type, symAlg, sesskey, key.key) + GPGsed(sesskey, arr)

  return [
    '-----BEGIN PGP MESSAGE-----',
    'Version: hanewinpgp v' + VERSION,
    '',
    s2r(cp),
    '=' + s2r(crc24(cp)),
    '-----END PGP MESSAGE-----'
  ].join('\n')
}

/* OpenPGP public key extraction
 * Copyright 2005 Herbert Hanewinkel, www.haneWIN.de
 * version 1.1, check www.haneWIN.de for the latest version

 * This software is provided as-is, without express or implied warranty.  
 * Permission to use, copy, modify, distribute or sell this software, with or
 * without fee, for any purpose and by any individual or organization, is hereby
 * granted, provided that the above copyright notice and this paragraph appear 
 * in all copies. Distribution as a part of an application or binary must
 * include the above copyright notice in the documentation and/or other materials
 * provided with the application or distribution.
 */

'use strict';

function s2hex(s)
{
  var result = '';
  for(var i=0; i<s.length; i++)
  {
    var c = s.charCodeAt(i);
    result += ((c<16) ? "0" : "") + c.toString(16);
  }
  return result;
}

function getPublicKey(text)
{
  var found = 0, len;
  var i= text.indexOf('-----BEGIN PGP PUBLIC KEY BLOCK-----');

  if(i == -1)
  {
    alert('No PGP Public Key Block');
    this.vers = '';
    this.fp = '';
    this.keyid = '';
    this.user = '';
    this.pkey = '';
    return;
  }
 
  var a=text.indexOf('\n\n',i);
  if(a>0) a += 2;
  else
  {
    a = text.indexOf('\n\r\n', i);
    if(a>0) a += 3;
  }

  var e=text.indexOf('\n=',i); 
  if(a>0 && e>0) text = text.slice(a,e); 
  else
  {
    alert('Invalid PGP Public Key Block');
    this.vers = '';
    this.fp = '';
    this.keyid = '';
    this.user = '';
    this.pkey = '';
    return;
  }
 
  var s=r2s(text);

  for(var i=0; i < s.length;)
  {
    var tag = s.charCodeAt(i++);

    if((tag&128) == 0) break;

    if(tag&64)
    {
      tag&=63;
      len=s.charCodeAt(i++);
      if(len >191 && len <224) len=((len-192)<<8) + s.charCodeAt(i++);
      else if(len==255) len = (s.charCodeAt(i++)<<24) + (s.charCodeAt(i++)<<16) + (s.charCodeAt(i++)<<8) + s.charCodeAt(i++);
      else if(len>223 &&len<255) len = (1<<(len&0x1f)); 
    }
    else
    {
      len = tag&3;
      tag = (tag>>2)&15;
      if(len==0) len = s.charCodeAt(i++);
      else if(len==1) len = (s.charCodeAt(i++)<<8) + s.charCodeAt(i++);
      else if(len==2) len = (s.charCodeAt(i++)<<24) + (s.charCodeAt(i++)<<16) + (s.charCodeAt(i++)<<8) + s.charCodeAt(i++);
      else len = s.length-1;
    }

    if(tag==6 || tag==14)  //  public key/subkey packet
    {
      var k = i;
      var vers=s.charCodeAt(i++);

      found = 1;
      this.vers=vers;

      var time=(s.charCodeAt(i++)<<24) + (s.charCodeAt(i++)<<16) + (s.charCodeAt(i++)<<8) + s.charCodeAt(i++);
      
      if(vers==2 || vers==3) var valid=s.charCodeAt(i++)<<8 + s.charCodeAt(i++);

      var algo=s.charCodeAt(i++);

      if(algo == 1 || algo == 2)
      {
        var m = i;
        var lm = Math.floor((s.charCodeAt(i)*256 + s.charCodeAt(i+1)+7)/8);
        i+=lm+2;

        var mod = s.substr(m,lm+2);
        var le = Math.floor((s.charCodeAt(i)*256 + s.charCodeAt(i+1)+7)/8);
        i+=le+2;

        this.pkey=s2r(s.substr(m,lm+le+4));
        this.type="RSA";

        if(vers==3)
        {
           this.fp='';
           this.keyid=s2hex(mod.substr(mod.length-8, 8));
        }
        else if(vers==4)
        {
          var pkt = String.fromCharCode(0x99) + String.fromCharCode(len>>8) 
                    + String.fromCharCode(len&255)+s.substr(k, len);
          var fp = str_sha1(pkt);
          this.fp=s2hex(fp);
          this.keyid=s2hex(fp.substr(fp.length-8,8));
        }
        else
        {
          this.fp='';
          this.keyid='';
        }
        found = 2;
      }
      else if((algo == 16 || algo == 20) && vers == 4)
      {
        var m = i;

        var lp = Math.floor((s.charCodeAt(i)*256 + s.charCodeAt(i+1)+7)/8);
        i+=lp+2;

        var lg = Math.floor((s.charCodeAt(i)*256 + s.charCodeAt(i+1)+7)/8);
        i+=lg+2;

        var ly = Math.floor((s.charCodeAt(i)*256 + s.charCodeAt(i+1)+7)/8);
        i+=ly+2;

        this.pkey=s2r(s.substr(m,lp+lg+ly+6));

        var pkt = String.fromCharCode(0x99) + String.fromCharCode(len>>8) 
                    + String.fromCharCode(len&255)+s.substr(k, len);
        var fp = str_sha1(pkt);
        this.fp=s2hex(fp);
        this.keyid=s2hex(fp.substr(fp.length-8,8));
        this.type="ELGAMAL";
        found = 3;
      } 
      else
      {
        i = k + len;
      }
    }
    else if(tag==13)   // user id
    {
      this.user=s.substr(i,len);
      i+=len;
    }
    else
    {
      i+=len;
    }
  }
  if(found < 2)
  {  
      this.vers = '';
      this.fp = '';
      this.keyid = '';
      if(found == 0)
          this.user = "No public key packet found."; 
      else if(found == 1)
      {
          this.user = "public key algorithm is " + algo + " not RSA or ELGAMAL.";
      }
      this.pkey = "";
  }
}

module.exports.extract = function (text) {
  var key = new getPublicKey(text);

  return {
    version: key.vers,
    user: key.user,
    id: key.keyid,
    type: key.type == 'RSA' ? 0 : 1, // 1=ELGAMAL
    key: key.pkey.replace(/\n/g, '')
  };
};

/* Rijndael (AES) Encryption
 * Copyright 2005 Herbert Hanewinkel, www.haneWIN.de
 * version 1.1, check www.haneWIN.de for the latest version

 * This software is provided as-is, without express or implied warranty.  
 * Permission to use, copy, modify, distribute or sell this software, with or
 * without fee, for any purpose and by any individual or organization, is hereby
 * granted, provided that the above copyright notice and this paragraph appear 
 * in all copies. Distribution as a part of an application or binary must
 * include the above copyright notice in the documentation and/or other
 * materials provided with the application or distribution.
 */

// The round constants used in subkey expansion
var Rcon = [ 
0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 
0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 
0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91 ];

// Precomputed lookup table for the SBox
var S = [
 99, 124, 119, 123, 242, 107, 111, 197,  48,   1, 103,  43, 254, 215, 171, 
118, 202, 130, 201, 125, 250,  89,  71, 240, 173, 212, 162, 175, 156, 164, 
114, 192, 183, 253, 147,  38,  54,  63, 247, 204,  52, 165, 229, 241, 113, 
216,  49,  21,   4, 199,  35, 195,  24, 150,   5, 154,   7,  18, 128, 226, 
235,  39, 178, 117,   9, 131,  44,  26,  27, 110,  90, 160,  82,  59, 214, 
179,  41, 227,  47, 132,  83, 209,   0, 237,  32, 252, 177,  91, 106, 203, 
190,  57,  74,  76,  88, 207, 208, 239, 170, 251,  67,  77,  51, 133,  69, 
249,   2, 127,  80,  60, 159, 168,  81, 163,  64, 143, 146, 157,  56, 245, 
188, 182, 218,  33,  16, 255, 243, 210, 205,  12,  19, 236,  95, 151,  68,  
23,  196, 167, 126,  61, 100,  93,  25, 115,  96, 129,  79, 220,  34,  42, 
144, 136,  70, 238, 184,  20, 222,  94,  11, 219, 224,  50,  58,  10,  73,
  6,  36,  92, 194, 211, 172,  98, 145, 149, 228, 121, 231, 200,  55, 109, 
141, 213,  78, 169, 108,  86, 244, 234, 101, 122, 174,   8, 186, 120,  37,  
 46,  28, 166, 180, 198, 232, 221, 116,  31,  75, 189, 139, 138, 112,  62, 
181, 102,  72,   3, 246,  14,  97,  53,  87, 185, 134, 193,  29, 158, 225,
248, 152,  17, 105, 217, 142, 148, 155,  30, 135, 233, 206,  85,  40, 223,
140, 161, 137,  13, 191, 230,  66, 104,  65, 153,  45,  15, 176,  84, 187,  
 22 ];

var T1 = [
0xa56363c6, 0x847c7cf8, 0x997777ee, 0x8d7b7bf6,
0x0df2f2ff, 0xbd6b6bd6, 0xb16f6fde, 0x54c5c591,
0x50303060, 0x03010102, 0xa96767ce, 0x7d2b2b56,
0x19fefee7, 0x62d7d7b5, 0xe6abab4d, 0x9a7676ec,
0x45caca8f, 0x9d82821f, 0x40c9c989, 0x877d7dfa,
0x15fafaef, 0xeb5959b2, 0xc947478e, 0x0bf0f0fb,
0xecadad41, 0x67d4d4b3, 0xfda2a25f, 0xeaafaf45,
0xbf9c9c23, 0xf7a4a453, 0x967272e4, 0x5bc0c09b,
0xc2b7b775, 0x1cfdfde1, 0xae93933d, 0x6a26264c,
0x5a36366c, 0x413f3f7e, 0x02f7f7f5, 0x4fcccc83,
0x5c343468, 0xf4a5a551, 0x34e5e5d1, 0x08f1f1f9,
0x937171e2, 0x73d8d8ab, 0x53313162, 0x3f15152a,
0x0c040408, 0x52c7c795, 0x65232346, 0x5ec3c39d,
0x28181830, 0xa1969637, 0x0f05050a, 0xb59a9a2f,
0x0907070e, 0x36121224, 0x9b80801b, 0x3de2e2df,
0x26ebebcd, 0x6927274e, 0xcdb2b27f, 0x9f7575ea,
0x1b090912, 0x9e83831d, 0x742c2c58, 0x2e1a1a34,
0x2d1b1b36, 0xb26e6edc, 0xee5a5ab4, 0xfba0a05b,
0xf65252a4, 0x4d3b3b76, 0x61d6d6b7, 0xceb3b37d,
0x7b292952, 0x3ee3e3dd, 0x712f2f5e, 0x97848413,
0xf55353a6, 0x68d1d1b9, 0x00000000, 0x2cededc1,
0x60202040, 0x1ffcfce3, 0xc8b1b179, 0xed5b5bb6,
0xbe6a6ad4, 0x46cbcb8d, 0xd9bebe67, 0x4b393972,
0xde4a4a94, 0xd44c4c98, 0xe85858b0, 0x4acfcf85,
0x6bd0d0bb, 0x2aefefc5, 0xe5aaaa4f, 0x16fbfbed,
0xc5434386, 0xd74d4d9a, 0x55333366, 0x94858511,
0xcf45458a, 0x10f9f9e9, 0x06020204, 0x817f7ffe,
0xf05050a0, 0x443c3c78, 0xba9f9f25, 0xe3a8a84b,
0xf35151a2, 0xfea3a35d, 0xc0404080, 0x8a8f8f05,
0xad92923f, 0xbc9d9d21, 0x48383870, 0x04f5f5f1,
0xdfbcbc63, 0xc1b6b677, 0x75dadaaf, 0x63212142,
0x30101020, 0x1affffe5, 0x0ef3f3fd, 0x6dd2d2bf,
0x4ccdcd81, 0x140c0c18, 0x35131326, 0x2fececc3,
0xe15f5fbe, 0xa2979735, 0xcc444488, 0x3917172e,
0x57c4c493, 0xf2a7a755, 0x827e7efc, 0x473d3d7a,
0xac6464c8, 0xe75d5dba, 0x2b191932, 0x957373e6,
0xa06060c0, 0x98818119, 0xd14f4f9e, 0x7fdcdca3,
0x66222244, 0x7e2a2a54, 0xab90903b, 0x8388880b,
0xca46468c, 0x29eeeec7, 0xd3b8b86b, 0x3c141428,
0x79dedea7, 0xe25e5ebc, 0x1d0b0b16, 0x76dbdbad,
0x3be0e0db, 0x56323264, 0x4e3a3a74, 0x1e0a0a14,
0xdb494992, 0x0a06060c, 0x6c242448, 0xe45c5cb8,
0x5dc2c29f, 0x6ed3d3bd, 0xefacac43, 0xa66262c4,
0xa8919139, 0xa4959531, 0x37e4e4d3, 0x8b7979f2,
0x32e7e7d5, 0x43c8c88b, 0x5937376e, 0xb76d6dda,
0x8c8d8d01, 0x64d5d5b1, 0xd24e4e9c, 0xe0a9a949,
0xb46c6cd8, 0xfa5656ac, 0x07f4f4f3, 0x25eaeacf,
0xaf6565ca, 0x8e7a7af4, 0xe9aeae47, 0x18080810,
0xd5baba6f, 0x887878f0, 0x6f25254a, 0x722e2e5c,
0x241c1c38, 0xf1a6a657, 0xc7b4b473, 0x51c6c697,
0x23e8e8cb, 0x7cdddda1, 0x9c7474e8, 0x211f1f3e,
0xdd4b4b96, 0xdcbdbd61, 0x868b8b0d, 0x858a8a0f,
0x907070e0, 0x423e3e7c, 0xc4b5b571, 0xaa6666cc,
0xd8484890, 0x05030306, 0x01f6f6f7, 0x120e0e1c,
0xa36161c2, 0x5f35356a, 0xf95757ae, 0xd0b9b969,
0x91868617, 0x58c1c199, 0x271d1d3a, 0xb99e9e27,
0x38e1e1d9, 0x13f8f8eb, 0xb398982b, 0x33111122,
0xbb6969d2, 0x70d9d9a9, 0x898e8e07, 0xa7949433,
0xb69b9b2d, 0x221e1e3c, 0x92878715, 0x20e9e9c9,
0x49cece87, 0xff5555aa, 0x78282850, 0x7adfdfa5,
0x8f8c8c03, 0xf8a1a159, 0x80898909, 0x170d0d1a,
0xdabfbf65, 0x31e6e6d7, 0xc6424284, 0xb86868d0,
0xc3414182, 0xb0999929, 0x772d2d5a, 0x110f0f1e,
0xcbb0b07b, 0xfc5454a8, 0xd6bbbb6d, 0x3a16162c ];

var T2 = [
0x6363c6a5, 0x7c7cf884, 0x7777ee99, 0x7b7bf68d,
0xf2f2ff0d, 0x6b6bd6bd, 0x6f6fdeb1, 0xc5c59154,
0x30306050, 0x01010203, 0x6767cea9, 0x2b2b567d,
0xfefee719, 0xd7d7b562, 0xabab4de6, 0x7676ec9a,
0xcaca8f45, 0x82821f9d, 0xc9c98940, 0x7d7dfa87,
0xfafaef15, 0x5959b2eb, 0x47478ec9, 0xf0f0fb0b,
0xadad41ec, 0xd4d4b367, 0xa2a25ffd, 0xafaf45ea,
0x9c9c23bf, 0xa4a453f7, 0x7272e496, 0xc0c09b5b,
0xb7b775c2, 0xfdfde11c, 0x93933dae, 0x26264c6a,
0x36366c5a, 0x3f3f7e41, 0xf7f7f502, 0xcccc834f,
0x3434685c, 0xa5a551f4, 0xe5e5d134, 0xf1f1f908,
0x7171e293, 0xd8d8ab73, 0x31316253, 0x15152a3f,
0x0404080c, 0xc7c79552, 0x23234665, 0xc3c39d5e,
0x18183028, 0x969637a1, 0x05050a0f, 0x9a9a2fb5,
0x07070e09, 0x12122436, 0x80801b9b, 0xe2e2df3d,
0xebebcd26, 0x27274e69, 0xb2b27fcd, 0x7575ea9f,
0x0909121b, 0x83831d9e, 0x2c2c5874, 0x1a1a342e,
0x1b1b362d, 0x6e6edcb2, 0x5a5ab4ee, 0xa0a05bfb,
0x5252a4f6, 0x3b3b764d, 0xd6d6b761, 0xb3b37dce,
0x2929527b, 0xe3e3dd3e, 0x2f2f5e71, 0x84841397,
0x5353a6f5, 0xd1d1b968, 0x00000000, 0xededc12c,
0x20204060, 0xfcfce31f, 0xb1b179c8, 0x5b5bb6ed,
0x6a6ad4be, 0xcbcb8d46, 0xbebe67d9, 0x3939724b,
0x4a4a94de, 0x4c4c98d4, 0x5858b0e8, 0xcfcf854a,
0xd0d0bb6b, 0xefefc52a, 0xaaaa4fe5, 0xfbfbed16,
0x434386c5, 0x4d4d9ad7, 0x33336655, 0x85851194,
0x45458acf, 0xf9f9e910, 0x02020406, 0x7f7ffe81,
0x5050a0f0, 0x3c3c7844, 0x9f9f25ba, 0xa8a84be3,
0x5151a2f3, 0xa3a35dfe, 0x404080c0, 0x8f8f058a,
0x92923fad, 0x9d9d21bc, 0x38387048, 0xf5f5f104,
0xbcbc63df, 0xb6b677c1, 0xdadaaf75, 0x21214263,
0x10102030, 0xffffe51a, 0xf3f3fd0e, 0xd2d2bf6d,
0xcdcd814c, 0x0c0c1814, 0x13132635, 0xececc32f,
0x5f5fbee1, 0x979735a2, 0x444488cc, 0x17172e39,
0xc4c49357, 0xa7a755f2, 0x7e7efc82, 0x3d3d7a47,
0x6464c8ac, 0x5d5dbae7, 0x1919322b, 0x7373e695,
0x6060c0a0, 0x81811998, 0x4f4f9ed1, 0xdcdca37f,
0x22224466, 0x2a2a547e, 0x90903bab, 0x88880b83,
0x46468cca, 0xeeeec729, 0xb8b86bd3, 0x1414283c,
0xdedea779, 0x5e5ebce2, 0x0b0b161d, 0xdbdbad76,
0xe0e0db3b, 0x32326456, 0x3a3a744e, 0x0a0a141e,
0x494992db, 0x06060c0a, 0x2424486c, 0x5c5cb8e4,
0xc2c29f5d, 0xd3d3bd6e, 0xacac43ef, 0x6262c4a6,
0x919139a8, 0x959531a4, 0xe4e4d337, 0x7979f28b,
0xe7e7d532, 0xc8c88b43, 0x37376e59, 0x6d6ddab7,
0x8d8d018c, 0xd5d5b164, 0x4e4e9cd2, 0xa9a949e0,
0x6c6cd8b4, 0x5656acfa, 0xf4f4f307, 0xeaeacf25,
0x6565caaf, 0x7a7af48e, 0xaeae47e9, 0x08081018,
0xbaba6fd5, 0x7878f088, 0x25254a6f, 0x2e2e5c72,
0x1c1c3824, 0xa6a657f1, 0xb4b473c7, 0xc6c69751,
0xe8e8cb23, 0xdddda17c, 0x7474e89c, 0x1f1f3e21,
0x4b4b96dd, 0xbdbd61dc, 0x8b8b0d86, 0x8a8a0f85,
0x7070e090, 0x3e3e7c42, 0xb5b571c4, 0x6666ccaa,
0x484890d8, 0x03030605, 0xf6f6f701, 0x0e0e1c12,
0x6161c2a3, 0x35356a5f, 0x5757aef9, 0xb9b969d0,
0x86861791, 0xc1c19958, 0x1d1d3a27, 0x9e9e27b9,
0xe1e1d938, 0xf8f8eb13, 0x98982bb3, 0x11112233,
0x6969d2bb, 0xd9d9a970, 0x8e8e0789, 0x949433a7,
0x9b9b2db6, 0x1e1e3c22, 0x87871592, 0xe9e9c920,
0xcece8749, 0x5555aaff, 0x28285078, 0xdfdfa57a,
0x8c8c038f, 0xa1a159f8, 0x89890980, 0x0d0d1a17,
0xbfbf65da, 0xe6e6d731, 0x424284c6, 0x6868d0b8,
0x414182c3, 0x999929b0, 0x2d2d5a77, 0x0f0f1e11,
0xb0b07bcb, 0x5454a8fc, 0xbbbb6dd6, 0x16162c3a ];

var T3 = [
0x63c6a563, 0x7cf8847c, 0x77ee9977, 0x7bf68d7b,
0xf2ff0df2, 0x6bd6bd6b, 0x6fdeb16f, 0xc59154c5,
0x30605030, 0x01020301, 0x67cea967, 0x2b567d2b,
0xfee719fe, 0xd7b562d7, 0xab4de6ab, 0x76ec9a76,
0xca8f45ca, 0x821f9d82, 0xc98940c9, 0x7dfa877d,
0xfaef15fa, 0x59b2eb59, 0x478ec947, 0xf0fb0bf0,
0xad41ecad, 0xd4b367d4, 0xa25ffda2, 0xaf45eaaf,
0x9c23bf9c, 0xa453f7a4, 0x72e49672, 0xc09b5bc0,
0xb775c2b7, 0xfde11cfd, 0x933dae93, 0x264c6a26,
0x366c5a36, 0x3f7e413f, 0xf7f502f7, 0xcc834fcc,
0x34685c34, 0xa551f4a5, 0xe5d134e5, 0xf1f908f1,
0x71e29371, 0xd8ab73d8, 0x31625331, 0x152a3f15,
0x04080c04, 0xc79552c7, 0x23466523, 0xc39d5ec3,
0x18302818, 0x9637a196, 0x050a0f05, 0x9a2fb59a,
0x070e0907, 0x12243612, 0x801b9b80, 0xe2df3de2,
0xebcd26eb, 0x274e6927, 0xb27fcdb2, 0x75ea9f75,
0x09121b09, 0x831d9e83, 0x2c58742c, 0x1a342e1a,
0x1b362d1b, 0x6edcb26e, 0x5ab4ee5a, 0xa05bfba0,
0x52a4f652, 0x3b764d3b, 0xd6b761d6, 0xb37dceb3,
0x29527b29, 0xe3dd3ee3, 0x2f5e712f, 0x84139784,
0x53a6f553, 0xd1b968d1, 0x00000000, 0xedc12ced,
0x20406020, 0xfce31ffc, 0xb179c8b1, 0x5bb6ed5b,
0x6ad4be6a, 0xcb8d46cb, 0xbe67d9be, 0x39724b39,
0x4a94de4a, 0x4c98d44c, 0x58b0e858, 0xcf854acf,
0xd0bb6bd0, 0xefc52aef, 0xaa4fe5aa, 0xfbed16fb,
0x4386c543, 0x4d9ad74d, 0x33665533, 0x85119485,
0x458acf45, 0xf9e910f9, 0x02040602, 0x7ffe817f,
0x50a0f050, 0x3c78443c, 0x9f25ba9f, 0xa84be3a8,
0x51a2f351, 0xa35dfea3, 0x4080c040, 0x8f058a8f,
0x923fad92, 0x9d21bc9d, 0x38704838, 0xf5f104f5,
0xbc63dfbc, 0xb677c1b6, 0xdaaf75da, 0x21426321,
0x10203010, 0xffe51aff, 0xf3fd0ef3, 0xd2bf6dd2,
0xcd814ccd, 0x0c18140c, 0x13263513, 0xecc32fec,
0x5fbee15f, 0x9735a297, 0x4488cc44, 0x172e3917,
0xc49357c4, 0xa755f2a7, 0x7efc827e, 0x3d7a473d,
0x64c8ac64, 0x5dbae75d, 0x19322b19, 0x73e69573,
0x60c0a060, 0x81199881, 0x4f9ed14f, 0xdca37fdc,
0x22446622, 0x2a547e2a, 0x903bab90, 0x880b8388,
0x468cca46, 0xeec729ee, 0xb86bd3b8, 0x14283c14,
0xdea779de, 0x5ebce25e, 0x0b161d0b, 0xdbad76db,
0xe0db3be0, 0x32645632, 0x3a744e3a, 0x0a141e0a,
0x4992db49, 0x060c0a06, 0x24486c24, 0x5cb8e45c,
0xc29f5dc2, 0xd3bd6ed3, 0xac43efac, 0x62c4a662,
0x9139a891, 0x9531a495, 0xe4d337e4, 0x79f28b79,
0xe7d532e7, 0xc88b43c8, 0x376e5937, 0x6ddab76d,
0x8d018c8d, 0xd5b164d5, 0x4e9cd24e, 0xa949e0a9,
0x6cd8b46c, 0x56acfa56, 0xf4f307f4, 0xeacf25ea,
0x65caaf65, 0x7af48e7a, 0xae47e9ae, 0x08101808,
0xba6fd5ba, 0x78f08878, 0x254a6f25, 0x2e5c722e,
0x1c38241c, 0xa657f1a6, 0xb473c7b4, 0xc69751c6,
0xe8cb23e8, 0xdda17cdd, 0x74e89c74, 0x1f3e211f,
0x4b96dd4b, 0xbd61dcbd, 0x8b0d868b, 0x8a0f858a,
0x70e09070, 0x3e7c423e, 0xb571c4b5, 0x66ccaa66,
0x4890d848, 0x03060503, 0xf6f701f6, 0x0e1c120e,
0x61c2a361, 0x356a5f35, 0x57aef957, 0xb969d0b9,
0x86179186, 0xc19958c1, 0x1d3a271d, 0x9e27b99e,
0xe1d938e1, 0xf8eb13f8, 0x982bb398, 0x11223311,
0x69d2bb69, 0xd9a970d9, 0x8e07898e, 0x9433a794,
0x9b2db69b, 0x1e3c221e, 0x87159287, 0xe9c920e9,
0xce8749ce, 0x55aaff55, 0x28507828, 0xdfa57adf,
0x8c038f8c, 0xa159f8a1, 0x89098089, 0x0d1a170d,
0xbf65dabf, 0xe6d731e6, 0x4284c642, 0x68d0b868,
0x4182c341, 0x9929b099, 0x2d5a772d, 0x0f1e110f,
0xb07bcbb0, 0x54a8fc54, 0xbb6dd6bb, 0x162c3a16 ];

var T4 = [
0xc6a56363, 0xf8847c7c, 0xee997777, 0xf68d7b7b,
0xff0df2f2, 0xd6bd6b6b, 0xdeb16f6f, 0x9154c5c5,
0x60503030, 0x02030101, 0xcea96767, 0x567d2b2b,
0xe719fefe, 0xb562d7d7, 0x4de6abab, 0xec9a7676,
0x8f45caca, 0x1f9d8282, 0x8940c9c9, 0xfa877d7d,
0xef15fafa, 0xb2eb5959, 0x8ec94747, 0xfb0bf0f0,
0x41ecadad, 0xb367d4d4, 0x5ffda2a2, 0x45eaafaf,
0x23bf9c9c, 0x53f7a4a4, 0xe4967272, 0x9b5bc0c0,
0x75c2b7b7, 0xe11cfdfd, 0x3dae9393, 0x4c6a2626,
0x6c5a3636, 0x7e413f3f, 0xf502f7f7, 0x834fcccc,
0x685c3434, 0x51f4a5a5, 0xd134e5e5, 0xf908f1f1,
0xe2937171, 0xab73d8d8, 0x62533131, 0x2a3f1515,
0x080c0404, 0x9552c7c7, 0x46652323, 0x9d5ec3c3,
0x30281818, 0x37a19696, 0x0a0f0505, 0x2fb59a9a,
0x0e090707, 0x24361212, 0x1b9b8080, 0xdf3de2e2,
0xcd26ebeb, 0x4e692727, 0x7fcdb2b2, 0xea9f7575,
0x121b0909, 0x1d9e8383, 0x58742c2c, 0x342e1a1a,
0x362d1b1b, 0xdcb26e6e, 0xb4ee5a5a, 0x5bfba0a0,
0xa4f65252, 0x764d3b3b, 0xb761d6d6, 0x7dceb3b3,
0x527b2929, 0xdd3ee3e3, 0x5e712f2f, 0x13978484,
0xa6f55353, 0xb968d1d1, 0x00000000, 0xc12ceded,
0x40602020, 0xe31ffcfc, 0x79c8b1b1, 0xb6ed5b5b,
0xd4be6a6a, 0x8d46cbcb, 0x67d9bebe, 0x724b3939,
0x94de4a4a, 0x98d44c4c, 0xb0e85858, 0x854acfcf,
0xbb6bd0d0, 0xc52aefef, 0x4fe5aaaa, 0xed16fbfb,
0x86c54343, 0x9ad74d4d, 0x66553333, 0x11948585,
0x8acf4545, 0xe910f9f9, 0x04060202, 0xfe817f7f,
0xa0f05050, 0x78443c3c, 0x25ba9f9f, 0x4be3a8a8,
0xa2f35151, 0x5dfea3a3, 0x80c04040, 0x058a8f8f,
0x3fad9292, 0x21bc9d9d, 0x70483838, 0xf104f5f5,
0x63dfbcbc, 0x77c1b6b6, 0xaf75dada, 0x42632121,
0x20301010, 0xe51affff, 0xfd0ef3f3, 0xbf6dd2d2,
0x814ccdcd, 0x18140c0c, 0x26351313, 0xc32fecec,
0xbee15f5f, 0x35a29797, 0x88cc4444, 0x2e391717,
0x9357c4c4, 0x55f2a7a7, 0xfc827e7e, 0x7a473d3d,
0xc8ac6464, 0xbae75d5d, 0x322b1919, 0xe6957373,
0xc0a06060, 0x19988181, 0x9ed14f4f, 0xa37fdcdc,
0x44662222, 0x547e2a2a, 0x3bab9090, 0x0b838888,
0x8cca4646, 0xc729eeee, 0x6bd3b8b8, 0x283c1414,
0xa779dede, 0xbce25e5e, 0x161d0b0b, 0xad76dbdb,
0xdb3be0e0, 0x64563232, 0x744e3a3a, 0x141e0a0a,
0x92db4949, 0x0c0a0606, 0x486c2424, 0xb8e45c5c,
0x9f5dc2c2, 0xbd6ed3d3, 0x43efacac, 0xc4a66262,
0x39a89191, 0x31a49595, 0xd337e4e4, 0xf28b7979,
0xd532e7e7, 0x8b43c8c8, 0x6e593737, 0xdab76d6d,
0x018c8d8d, 0xb164d5d5, 0x9cd24e4e, 0x49e0a9a9,
0xd8b46c6c, 0xacfa5656, 0xf307f4f4, 0xcf25eaea,
0xcaaf6565, 0xf48e7a7a, 0x47e9aeae, 0x10180808,
0x6fd5baba, 0xf0887878, 0x4a6f2525, 0x5c722e2e,
0x38241c1c, 0x57f1a6a6, 0x73c7b4b4, 0x9751c6c6,
0xcb23e8e8, 0xa17cdddd, 0xe89c7474, 0x3e211f1f,
0x96dd4b4b, 0x61dcbdbd, 0x0d868b8b, 0x0f858a8a,
0xe0907070, 0x7c423e3e, 0x71c4b5b5, 0xccaa6666,
0x90d84848, 0x06050303, 0xf701f6f6, 0x1c120e0e,
0xc2a36161, 0x6a5f3535, 0xaef95757, 0x69d0b9b9,
0x17918686, 0x9958c1c1, 0x3a271d1d, 0x27b99e9e,
0xd938e1e1, 0xeb13f8f8, 0x2bb39898, 0x22331111,
0xd2bb6969, 0xa970d9d9, 0x07898e8e, 0x33a79494,
0x2db69b9b, 0x3c221e1e, 0x15928787, 0xc920e9e9,
0x8749cece, 0xaaff5555, 0x50782828, 0xa57adfdf,
0x038f8c8c, 0x59f8a1a1, 0x09808989, 0x1a170d0d,
0x65dabfbf, 0xd731e6e6, 0x84c64242, 0xd0b86868,
0x82c34141, 0x29b09999, 0x5a772d2d, 0x1e110f0f,
0x7bcbb0b0, 0xa8fc5454, 0x6dd6bbbb, 0x2c3a1616 ];

function B0(x) { return (x&255); }
function B1(x) { return ((x>>8)&255); }
function B2(x) { return ((x>>16)&255); }
function B3(x) { return ((x>>24)&255); }

function F1(x0, x1, x2, x3)
{
  return B1(T1[x0&255]) | (B1(T1[(x1>>8)&255])<<8)
      | (B1(T1[(x2>>16)&255])<<16) | (B1(T1[x3>>>24])<<24);
}

function packBytes(octets)
{
  var i, j;
  var len=octets.length;
  var b=new Array(len/4);

  if (!octets || len % 4) return;

  for (i=0, j=0; j<len; j+= 4)
     b[i++] = octets[j] | (octets[j+1]<<8) | (octets[j+2]<<16) | (octets[j+3]<<24);

  return b;  
}

function unpackBytes(packed)
{
  var j;
  var i=0, l = packed.length;
  var r = new Array(l*4);

  for (j=0; j<l; j++)
  {
    r[i++] = B0(packed[j]);
    r[i++] = B1(packed[j]);
    r[i++] = B2(packed[j]);
    r[i++] = B3(packed[j]);
  }
  return r;
}

// ------------------------------------------------

var maxkc=8;
var maxrk=14;

function keyExpansion(key)
{
  var kc, i, j, r, t;
  var rounds;
  var keySched=new Array(maxrk+1);
  var keylen=key.length;
  var k=new Array(maxkc);
  var tk=new Array(maxkc);
  var rconpointer=0;

  if(keylen==16)
  {
   rounds=10;
   kc=4;
  }
  else if(keylen==24)
  {
   rounds=12;
   kc=6
  }
  else if(keylen==32)
  {
   rounds=14;
   kc=8
  }
  else
  {
   alert('Invalid AES key length '+keylen);
   return;
  }

  for(i=0; i<maxrk+1; i++) keySched[i]=new Array(4);

  for(i=0,j=0; j<keylen; j++,i+=4)
    k[j] = key.charCodeAt(i) | (key.charCodeAt(i+1)<<8)
                     | (key.charCodeAt(i+2)<<16) | (key.charCodeAt(i+3)<<24);

  for(j=kc-1; j>=0; j--) tk[j] = k[j];

  r=0;
  t=0;
  for(j=0; (j<kc)&&(r<rounds+1); )
  {
    for(; (j<kc)&&(t<4); j++,t++)
    {
      keySched[r][t]=tk[j];
    }
    if(t==4)
    {
      r++;
      t=0;
    }
  }

  while(r<rounds+1)
  {
    var temp = tk[kc-1];

    tk[0] ^= S[B1(temp)] | (S[B2(temp)]<<8) | (S[B3(temp)]<<16) | (S[B0(temp)]<<24);
    tk[0] ^= Rcon[rconpointer++];

    if(kc != 8)
    {
      for(j=1; j<kc; j++) tk[j] ^= tk[j-1];
    }
    else
    {
      for(j=1; j<kc/2; j++) tk[j] ^= tk[j-1];
 
      temp = tk[kc/2-1];
      tk[kc/2] ^= S[B0(temp)] | (S[B1(temp)]<<8) | (S[B2(temp)]<<16) | (S[B3(temp)]<<24);

      for(j=kc/2+1; j<kc; j++) tk[j] ^= tk[j-1];
    }

    for(j=0; (j<kc)&&(r<rounds+1); )
    {
      for(; (j<kc)&&(t<4); j++,t++)
      {
        keySched[r][t]=tk[j];
      }
      if(t==4)
      {
        r++;
        t=0;
      }
    }
  }
  //this.rounds = rounds;
  //this.rk = keySched;
  //return this;
  return { rounds: rounds, rk: keySched }
}

function AESencrypt(block, ctx)
{
  var r;
  var t0,t1,t2,t3;

  var b = packBytes(block);
  var rounds = ctx.rounds;
  var b0 = b[0];
  var b1 = b[1];
  var b2 = b[2];
  var b3 = b[3];

  for(r=0; r<rounds-1; r++)
  {
    t0 = b0 ^ ctx.rk[r][0];
    t1 = b1 ^ ctx.rk[r][1];
    t2 = b2 ^ ctx.rk[r][2];
    t3 = b3 ^ ctx.rk[r][3];

    b0 = T1[t0&255] ^ T2[(t1>>8)&255] ^ T3[(t2>>16)&255] ^ T4[t3>>>24];
    b1 = T1[t1&255] ^ T2[(t2>>8)&255] ^ T3[(t3>>16)&255] ^ T4[t0>>>24];
    b2 = T1[t2&255] ^ T2[(t3>>8)&255] ^ T3[(t0>>16)&255] ^ T4[t1>>>24];
    b3 = T1[t3&255] ^ T2[(t0>>8)&255] ^ T3[(t1>>16)&255] ^ T4[t2>>>24];
  }

  // last round is special
  r = rounds-1;

  t0 = b0 ^ ctx.rk[r][0];
  t1 = b1 ^ ctx.rk[r][1];
  t2 = b2 ^ ctx.rk[r][2];
  t3 = b3 ^ ctx.rk[r][3];

  b[0] = F1(t0, t1, t2, t3) ^ ctx.rk[rounds][0];
  b[1] = F1(t1, t2, t3, t0) ^ ctx.rk[rounds][1];
  b[2] = F1(t2, t3, t0, t1) ^ ctx.rk[rounds][2];
  b[3] = F1(t3, t0, t1, t2) ^ ctx.rk[rounds][3];

  return unpackBytes(b);
}


/* OpenPGP radix-64/base64 string encoding/decoding
 * Copyright 2005 Herbert Hanewinkel, www.haneWIN.de
 * version 1.0, check www.haneWIN.de for the latest version

 * This software is provided as-is, without express or implied warranty.  
 * Permission to use, copy, modify, distribute or sell this software, with or
 * without fee, for any purpose and by any individual or organization, is hereby
 * granted, provided that the above copyright notice and this paragraph appear 
 * in all copies. Distribution as a part of an application or binary must
 * include the above copyright notice in the documentation and/or other materials
 * provided with the application or distribution.
 */

var b64s='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function s2r(t)
{
 var a, c, n;
 var r='', l=0, s=0;
 var tl=t.length;

 for(n=0; n<tl; n++)
 {
  c=t.charCodeAt(n);
  if(s == 0)
  {
   r+=b64s.charAt((c>>2)&63);
   a=(c&3)<<4;
  }
  else if(s==1)
  {
   r+=b64s.charAt((a|(c>>4)&15));
   a=(c&15)<<2;
  }
  else if(s==2)
  {
   r+=b64s.charAt(a|((c>>6)&3));
   l+=1;
   if((l%60)==0) r+="\n";
   r+=b64s.charAt(c&63);
  }
  l+=1;
  if((l%60)==0) r+="\n";

  s+=1;
  if(s==3) s=0;  
 }
 if(s>0)
 {
  r+=b64s.charAt(a);
  l+=1;
  if((l%60)==0) r+="\n";
  r+='=';
  l+=1;
 }
 if(s==1)
 {
  if((l%60)==0) r+="\n";
  r+='=';
 }

 return r;
}

function r2s(t)
{
 var c, n;
 var r='', s=0, a=0;
 var tl=t.length;

 for(n=0; n<tl; n++)
 {
  c=b64s.indexOf(t.charAt(n));
  if(c >= 0)
  {
   if(s) r+=String.fromCharCode(a | (c>>(6-s))&255);
   s=(s+2)&7;
   a=(c<<s)&255;
  }
 }
 return r;
}
//var alert = console.log;
var alert = function(message) {
  throw new Error(message)
}
/* RSA public key encryption/decryption
 * The following functions are (c) 2000 by John M Hanna and are
 * released under the terms of the Gnu Public License.
 * You must freely redistribute them with their source -- see the
 * GPL for details.
 *  -- Latest version found at http://sourceforge.net/projects/shop-js
 *
 * Modifications and GnuPG multi precision integer (mpi) conversion added
 * 2004 by Herbert Hanewinkel, www.haneWIN.de
 *
 * Conversion to npm module (c) 2017 by Dossy Shiobara <dossy@panoptic.com>
 */

'use strict';

// --- Arbitrary Precision Math ---
// badd(a,b), bsub(a,b), bsqr(a), bmul(a,b)
// bdiv(a,b), bmod(a,b), bexpmod(g,e,m), bmodexp(g,e,m)

// bs is the shift, bm is the mask
// set single precision bits to 28
var bs=28;
var bx2=1<<bs, bm=bx2-1, bx=bx2>>1, bd=bs>>1, bdm=(1<<bd)-1;

var log2=Math.log(2);

function zeros(n)
{
 var r=new Array(n);

 while(n-->0) r[n]=0;
 return r;
}

function zclip(r)
{
 var n = r.length;
 if(r[n-1]) return r;
 while(n>1 && r[n-1]==0) n--;
 return r.slice(0,n);
}

// returns bit length of integer x
function nbits(x)
{
  var n = 1, t;
  if((t=x>>>16) != 0) { x = t; n += 16; }
  if((t=x>>8) != 0) { x = t; n += 8; }
  if((t=x>>4) != 0) { x = t; n += 4; }
  if((t=x>>2) != 0) { x = t; n += 2; }
  if((t=x>>1) != 0) { x = t; n += 1; }
  return n;
}

function badd(a,b)
{
 var al=a.length;
 var bl=b.length;

 if(al < bl) return badd(b,a);

 var r=new Array(al);
 var c=0, n=0;

 for(; n<bl; n++)
 {
  c+=a[n]+b[n];
  r[n]=c & bm;
  c>>>=bs;
 }
 for(; n<al; n++)
 {
  c+=a[n];
  r[n]=c & bm;
  c>>>=bs;
 }
 if(c) r[n]=c;
 return r;
}

function bsub(a,b)
{
 var al=a.length;
 var bl=b.length;

 if(bl > al) return [];
 if(bl == al)
 {
  if(b[bl-1] > a[bl-1]) return [];
  if(bl==1) return [a[0]-b[0]];
 }

 var r=new Array(al);
 var c=0;

 for(var n=0; n<bl; n++)
 {
  c+=a[n]-b[n];
  r[n]=c & bm;
  c>>=bs;
 }
 for(;n<al; n++)
 {
  c+=a[n];
  r[n]=c & bm;
  c>>=bs;
 }
 if(c) return [];

 return zclip(r);
}

function ip(w, n, x, y, c)
{
 var xl = x&bdm;
 var xh = x>>bd;

 var yl = y&bdm;
 var yh = y>>bd;

 var m = xh*yl+yh*xl;
 var l = xl*yl+((m&bdm)<<bd)+w[n]+c;
 w[n] = l&bm;
 c = xh*yh+(m>>bd)+(l>>bs);
 return c;
}

// Multiple-precision squaring, HAC Algorithm 14.16

function bsqr(x)
{
 var t = x.length;
 var n = 2*t;
 var r = zeros(n);
 var c = 0;
 var i, j;

 for(i = 0; i < t; i++)
 {
  c = ip(r,2*i,x[i],x[i],0);
  for(j = i+1; j < t; j++)
  {
   c = ip(r,i+j,2*x[j],x[i],c);
  }
  r[i+t] = c;
 }

 return zclip(r);
}

// Multiple-precision multiplication, HAC Algorithm 14.12

function bmul(x,y)
{
 var n = x.length;
 var t = y.length;
 var r = zeros(n+t-1);
 var c, i, j;

 for(i = 0; i < t; i++)
 {
  c = 0;
  for(j = 0; j < n; j++)
  {
   c = ip(r,i+j,x[j],y[i],c);
  }
  r[i+n] = c;
 }

 return zclip(r);
}

function toppart(x,start,len)
{
 var n=0;
 while(start >= 0 && len-->0) n=n*bx2+x[start--];
 return n;
}

// Multiple-precision division, HAC Algorithm 14.20

function bdiv(a,b)
{
 var n=a.length-1;
 var t=b.length-1;
 var nmt=n-t;

 // trivial cases; a < b
 if(n < t || n==t && (a[n]<b[n] || n>0 && a[n]==b[n] && a[n-1]<b[n-1]))
 {
  //this.q=[0]; this.mod=a;
  //return this;
  return { q: [ 0 ], mod: a }
 }

 // trivial cases; q < 4
 if(n==t && toppart(a,t,2)/toppart(b,t,2) <4)
 {
  var x=a.concat();
  var qq=0;
  var xx;
  for(;;)
  {
   xx=bsub(x,b);
   if(xx.length==0) break;
   x=xx; qq++;
  }
  //this.q=[qq]; this.mod=x;
  //return this;
  return { q: [ qq ], mod: x }
 }

 // normalize
 var shift2=Math.floor(Math.log(b[t])/log2)+1;
 var shift=bs-shift2;

 var x=a.concat();
 var y=b.concat();

 if(shift)
 {
  for(i=t; i>0; i--) y[i]=((y[i]<<shift) & bm) | (y[i-1] >> shift2);
  y[0]=(y[0]<<shift) & bm;
  if(x[n] & ((bm <<shift2) & bm))
  {
   x[++n]=0; nmt++;
  }
  for(i=n; i>0; i--) x[i]=((x[i]<<shift) & bm) | (x[i-1] >> shift2);
  x[0]=(x[0]<<shift) & bm;
 }

 var i, j, x2;
 var q=zeros(nmt+1);
 var y2=zeros(nmt).concat(y);
 for(;;)
 {
  x2=bsub(x,y2);
  if(x2.length==0) break;
  q[nmt]++;
  x=x2;
 }

 var yt=y[t], top=toppart(y,t,2)
 for(i=n; i>t; i--)
 {
  var m=i-t-1;
  if(i >= x.length) q[m]=1;
  else if(x[i] == yt) q[m]=bm;
  else q[m]=Math.floor(toppart(x,i,2)/yt);

  var topx=toppart(x,i,3);
  while(q[m] * top > topx) q[m]--;

  //x-=q[m]*y*b^m
  y2=y2.slice(1);
  x2=bsub(x,bmul([q[m]],y2));
  if(x2.length==0)
  {
   q[m]--;
   x2=bsub(x,bmul([q[m]],y2));
  }
  x=x2;
 }
 // de-normalize
 if(shift)
 {
  for(i=0; i<x.length-1; i++) x[i]=(x[i]>>shift) | ((x[i+1] << shift2) & bm);
  x[x.length-1]>>=shift;
 }

 //this.q = zclip(q);
 //this.mod = zclip(x);
 //return this;
 return { q: zclip(q), mod: zclip(x) }
}

function simplemod(i,m) // returns the mod where m < 2^bd
{
 var c=0, v;
 for(var n=i.length-1; n>=0; n--)
 {
  v=i[n];
  c=((v >> bd) + (c<<bd)) % m;
  c=((v & bdm) + (c<<bd)) % m;
 }
 return c;
}

function bmod(p,m)
{
 if(m.length==1)
 {
  if(p.length==1) return [p[0] % m[0]];
  if(m[0] < bdm) return [simplemod(p,m[0])];
 }

 var r=bdiv(p,m);
 return r.mod;
}

// Barrett's modular reduction, HAC Algorithm 14.42

function bmod2(x,m,mu)
{
 var xl=x.length - (m.length << 1);
 if(xl > 0) return bmod2(x.slice(0,xl).concat(bmod2(x.slice(xl),m,mu)),m,mu);

 var ml1=m.length+1, ml2=m.length-1,rr;
 //var q1=x.slice(ml2)
 //var q2=bmul(q1,mu)
 var q3=bmul(x.slice(ml2),mu).slice(ml1);
 var r1=x.slice(0,ml1);
 var r2=bmul(q3,m).slice(0,ml1);
 var r=bsub(r1,r2);
 
 if(r.length==0)
 {
  r1[ml1]=1;
  r=bsub(r1,r2);
 }
 for(var n=0;;n++)
 {
  rr=bsub(r,m);
  if(rr.length==0) break;
  r=rr;
  if(n>=3) return bmod2(r,m,mu);
 }
 return r;
}

// Modular exponentiation, HAC Algorithm 14.79

function bexpmod(g,e,m)
{
 var a = g.concat();
 var l = e.length-1;
 var n = nbits(e[l])-2;

 for(; l >= 0; l--)
 {
  for(; n >= 0; n-=1)
  {
   a=bmod(bsqr(a),m);
   if(e[l] & (1<<n)) a=bmod(bmul(a,g),m);
  }
  n = bs-1;
 }
 return a;
}

// Modular exponentiation using Barrett reduction

function bmodexp(g,e,m)
{
 var a=g.concat();
 var l=e.length-1;
 var n=m.length*2;
 var mu=zeros(n+1);
 mu[n]=1;
 mu=bdiv(mu,m).q;

 n = nbits(e[l])-2;

 for(; l >= 0; l--)
 {
  for(; n >= 0; n-=1)
  {
   a=bmod2(bsqr(a),m, mu);
   if(e[l] & (1<<n)) a=bmod2(bmul(a,g),m, mu);
  }
  n = bs-1;
 }
 return a;
}

// -----------------------------------------------------
// Compute s**e mod m for RSA public key operation

function RSAencrypt(s, e, m) { return bexpmod(s,e,m); }

// Compute m**d mod p*q for RSA private key operations.

function RSAdecrypt(m, d, p, q, u)
{
 var xp = bmodexp(bmod(m,p), bmod(d,bsub(p,[1])), p);
 var xq = bmodexp(bmod(m,q), bmod(d,bsub(q,[1])), q);

 var t=bsub(xq,xp);
 if(t.length==0)
 {
  t=bsub(xp,xq);
  t=bmod(bmul(t, u), q);
  t=bsub(q,t);
 }
 else
 {
  t=bmod(bmul(t, u), q);
 } 
 return badd(bmul(t,p), xp);
}

// -----------------------------------------------------------------
// conversion functions: num array <-> multi precision integer (mpi)
// mpi: 2 octets with length in bits + octets in big endian order

function mpi2b(s)
{
 var bn=1, r=[0], rn=0, sb=256;
 var c, sn=s.length;
 if(sn < 2)
 {
    alert('string too short, not a MPI');
    return 0;
 }

 var len=(sn-2)*8;
 var bits=s.charCodeAt(0)*256+s.charCodeAt(1);
 if(bits > len || bits < len-8) 
 {
    alert('not a MPI, bits='+bits+",len="+len);
    return 0;
 }

 for(var n=0; n<len; n++)
 {
  if((sb<<=1) > 255)
  {
   sb=1; c=s.charCodeAt(--sn);
  }
  if(bn > bm)
  {
   bn=1;
   r[++rn]=0;
  }
  if(c & sb) r[rn]|=bn;
  bn<<=1;
 }
 return r;
}

function b2mpi(b)
{
 var bn=1, bc=0, r=[0], rb=1, rn=0;
 var bits=b.length*bs;
 var n, rr='';

 for(n=0; n<bits; n++)
 {
  if(b[bc] & bn) r[rn]|=rb;
  if((rb<<=1) > 255)
  {
   rb=1; r[++rn]=0;
  }
  if((bn<<=1) > bm)
  {
   bn=1; bc++;
  }
 }

 while(rn && r[rn]==0) rn--;

 bn=256;
 for(bits=8; bits>0; bits--) if(r[rn] & (bn>>=1)) break;
 bits+=rn*8;

 rr+=String.fromCharCode(bits/256)+String.fromCharCode(bits%256);
 if(bits) for(n=rn; n>=0; n--) rr+=String.fromCharCode(r[n]);
 return rr;
}

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1 Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = ""; /* base-64 pad character. "=" for strict RFC compliance   */
var chrsz   = 8;  /* bits per input character. 8 - ASCII; 16 - Unicode      */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s){return binb2hex(core_sha1(str2binb(s),s.length * chrsz));}
function b64_sha1(s){return binb2b64(core_sha1(str2binb(s),s.length * chrsz));}
function str_sha1(s){return binb2str(core_sha1(str2binb(s),s.length * chrsz));}
function hex_hmac_sha1(key, data){ return binb2hex(core_hmac_sha1(key, data));}
function b64_hmac_sha1(key, data){ return binb2b64(core_hmac_sha1(key, data));}
function str_hmac_sha1(key, data){ return binb2str(core_hmac_sha1(key, data));}

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
  return hex_sha1("abc") == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)), 
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);
  
}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}  

/*
 * Calculate the HMAC-SHA1 of a key and some data
 */
function core_hmac_sha1(key, data)
{
  var bkey = str2binb(key);
  if(bkey.length > 16) bkey = core_sha1(bkey, key.length * chrsz);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++) 
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = core_sha1(ipad.concat(str2binb(data)), 512 + data.length * chrsz);
  return core_sha1(opad.concat(hash), 512 + 160);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * Convert an 8-bit or 16-bit string to an array of big-endian words
 * In 8-bit function, characters >255 have their hi-byte silently ignored.
 */
function str2binb(str)
{
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
  return bin;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2str(bin)
{
  var str = "";
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < bin.length * 32; i += chrsz)
    str += String.fromCharCode((bin[i>>5] >>> (24 - i%32)) & mask);
  return str;
}

/*
 * Convert an array of big-endian words to a hex string.
 */
function binb2hex(binarray)
{
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i++)
  {
    str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) +
           hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
  }
  return str;
}

/*
 * Convert an array of big-endian words to a base-64 string
 */
function binb2b64(binarray)
{
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var str = "";
  for(var i = 0; i < binarray.length * 4; i += 3)
  {
    var triplet = (((binarray[i   >> 2] >> 8 * (3 -  i   %4)) & 0xFF) << 16)
                | (((binarray[i+1 >> 2] >> 8 * (3 - (i+1)%4)) & 0xFF) << 8 )
                |  ((binarray[i+2 >> 2] >> 8 * (3 - (i+2)%4)) & 0xFF);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > binarray.length * 32) str += b64pad;
      else str += tab.charAt((triplet >> 6*(3-j)) & 0x3F);
    }
  }
  return str;
}

}).call(this,require("buffer").Buffer)
},{"buffer":"buffer","crypto":"crypto","random-js":1}]},{},[])("hanewinpgp")
});
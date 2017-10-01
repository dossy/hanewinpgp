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
  const crypto = require('crypto')

  randomByte = function () { return crypto.randomBytes(1)[0] }
} catch (e) {
  const Random = require('random-js')

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

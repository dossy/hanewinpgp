# PGP / GnuPG / OpenPGP Message Encryption in JavaScript by Herbert Hanewinkel

[![travis][travis-image]][travis-url]
[![npm][npm-image]][npm-url]
[![downloads][downloads-image]][downloads-url]
[![browserstack][browserstack-image]][browserstack-url]

[travis-image]: https://travis-ci.org/dossy/hanewinpgp.svg?branch=master
[travis-url]: https://travis-ci.org/dossy/hanewinpgp

[npm-image]: https://img.shields.io/npm/v/hanewinpgp.svg?style=flat
[npm-url]: https://npmjs.org/package/hanewinpgp

[downloads-image]: https://img.shields.io/npm/dm/hanewinpgp.svg?style=flat
[downloads-url]: https://npmjs.org/package/hanewinpgp

[browserstack-image]: https://www.browserstack.com/automate/badge.svg?badge_key=V0pHUTRQNjdqMkFLVWpIVzdKWE9VSjBUc2VxaW5COE1ja3JCRTVNL0Q5OD0tLS94L0RYcWZNaE42QktFRkZXM0U3a2c9PQ==--dab2e0ddbe89c16963bdd438126279364766f633
[browserstack-url]: https://www.browserstack.com/automate/public-build/V0pHUTRQNjdqMkFLVWpIVzdKWE9VSjBUc2VxaW5COE1ja3JCRTVNL0Q5OD0tLS94L0RYcWZNaE42QktFRkZXM0U3a2c9PQ==--dab2e0ddbe89c16963bdd438126279364766f633

A very minimal implementation of PGP message encryption/decryption
by Herbert Hanewinkel, originally posted to his site at
https://www.hanewin.net/encrypt/ and mirrored at
https://dossy.github.io/hanewinpgp/.

## Install

```
$ npm install --save hanewinpgp
```

## Usage

```js
const hanewinpgp = require('hanewinpgp');

var pubkey = "ASCII armored public key here";
var plaintext = "your plaintext message here";

var key = hanewinpgp.extract(pubkey);
var encrypted = hanewinpgp.encrypt(key, plaintext);

// encrypted now contains ASCII armored encrypted message
```

## Demo

You can try a [demo of this code][demo-url] right in your reasonably
modern web browser.

[demo-url]: https://dossy.github.io/hanewinpgp/demo-encrypt/

## License

See [LICENSE](LICENSE) file.

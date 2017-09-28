# PGP / GnuPG / OpenPGP Message Encryption in JavaScript by Herbert Hanewinkel

A very minimal implementation of PGP message encryption/decryption
by Herbert Hanewinkel, originally posted to his site at
https://www.hanewin.net/encrypt/ and mirrored at
https://dossy.github.io/hanewinpgp/.

## Install

TODO: Push this module up to NPM when it's ready to really use.

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

hanewinpgp.stop();

// encrypted now contains ASCII armored encrypted message
```

## License

See [LICENSE](LICENSE) file.

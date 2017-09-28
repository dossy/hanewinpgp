var assert = require('assert');
var hanewinpgp = require('../dist/hanewinpgp');

exports.encrypt = function (test) {
  var key = 'BADelitpUqMZLn+bryZR5rK9J3eu+pRVFP5tpboOlIwO2vqO/rCi8VvT2TPzEJarWhyZ465NIohYCiia9vaGUEp4rsDzFnVNgpON47yPew1zCmOOofituf+X6Qlaxylm5NnO4vnRcmoF4IbGwSCqyGgGor29D75Hovwlj1q6BWHYWwAGKQ==',
    keyid = '02044b001cd7a551', keytype = 0, // 0=RSA, 1=ELGAMAL
    plaintext = 'your secret text goes here',
    armored = [
      '-----BEGIN PGP MESSAGE-----',
      'Version: haneWIN JavascriptPG v2.0',
      '',
      'hIwDAgRLABzXpVEBBACZfx8jKYb2NqxP5ShX25Jwk0QNBAYxBlhr/qfx4KDp',
      'jkZb6wpiNR6FYOAI19wQDJ1n36PRzCw6a1lU7nSJ9yCUXEAjeJXBqCy8FDaB',
      'X68+wTRs2aFWIkeZJ57SmjD231v1YlR1D2FDMfm7QjELzwHcVX/ejKZHTJsv',
      'aQD8qDPctqQ6tI8st0lUdlL7Q2Mx+Vpws3pIKgaT+0fMgaDrMbS5PMNN2Xl7',
      'FU60yec3vMnRt1VSUSajdXqxNwLYkQ==',
      '=/w3K',
      '-----END PGP MESSAGE-----'
    ].join("\n");

  test.equal(hanewinpgp.encrypt(key, keyid, keytype, plaintext), armored);
  test.done();
};

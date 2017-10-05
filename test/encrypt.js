var assert = require('assert')
var hanewinpgp = require('../build/hanewinpgp')

var pubkey = [
    '-----BEGIN PGP PUBLIC KEY BLOCK-----',
    '',
    'mQENBFnNsggBCACexSwvk7KXFPcomsxiOo5OesqxKHbY3zHMNtA3WjAYn87CpHtm',
    'czGlzE2RWX07STqupbJ8FOGgHL6MFuJ/EOxeU6USoCqf2+KReVjdpHYq8HmCB9iD',
    '4vwfJzKUkLiiYBODf+rBPu+pCUZ6HGi+ls8eYsL9lpJekKq7gbnwzRLCODa4WGgX',
    'waRzjD3BLsJ+Oo+FYTX5+Kz3IBJsNdtDVcXWPEecrP3v1hlWqU1GrdxHhr6r2qYf',
    'SbGV5QXtZipyxLUaRvzpTYdWYhdH1vSOWar2B1WXkrIjjHWCml13wko7E+Zo5+bj',
    'AEi1FhlAvRssr6RFdu2mpeqUgdKnQcW6DS1XABEBAAG0ImhhbmV3aW5wZ3AgPGhh',
    'bmV3aW5wZ3BAZ2l0aHViLmNvbT6JAU4EEwEIADgWIQSLf09RHYKnke8KPqkhVqGn',
    'IpnTigUCWc2yCAIbAwULCQgHAwUVCgkICwUWAgMBAAIeAQIXgAAKCRAhVqGnIpnT',
    'ihqXB/oCGM15tXRvjSnOhJcq1uDeCHRnJAjU2Uxo0hl2ut7sRTj7ZpPFpPXymy9f',
    'lHm4kMBz+ETb94SLKNx7mJTLTDUrGvq8/yBy5xuuhBe+pezpBx+vGdfpjdh+/9Rs',
    'SVIyuLW0o/q+tUhuG9bV76PTiIWml0GzT1PXtkt1hrgQZqkuTUe3aPnuM+x35qNZ',
    'L5rNfj6fwfgItuqcH7bqDeX57OQv5U50DKu5cHfgANKzxSYz2BA46SK7ej80qlaa',
    'vBMb7vuw9fum9/t33mMRTutyjlZRJx+9v9nXuqjbMqiIY3WgP/n/3kf65/Ysho2N',
    'Fu8voKd6rjT5fCdqZvxPdnZ62hDHuQENBFnNsggBCAC7MQ8qRjuAr84llGHt514O',
    'dINha2uR0TKEoPxuejTVG0J4d+r8UAOXmwukGXYP5Uo1LLl26Kqcf87Qx9YkiD7V',
    'tcAbnXKf5EeTQH741V30aWUuySfUlH7CZMZmkEaDfcH5JMoMNL1BK3gzIpySiM5J',
    '4CQcwpO1DVlFzkFI8HDOTDcyVYAb5c38R/z4Fn9raznsoOFYdubPulA95QB7nGdS',
    'Q/kkB7G3udjCyllCNxzQ/QC1Ol3fENErTxVW8+g8danaFjP7a7EWvtAj5ozGv6iB',
    'eEedkr9BEwZ44lnxQhdC1CHW1jPta5v1+b8aBW47tZqr3aC9XTjYP/Zw2ANQThSl',
    'ABEBAAGJATYEGAEIACAWIQSLf09RHYKnke8KPqkhVqGnIpnTigUCWc2yCAIbDAAK',
    'CRAhVqGnIpnTivY3B/9Frl2uHmnf0/C6zeSFyojrwgRvkI98rhB6WyQFsnt1JMJL',
    'uwZjtuxqWHUn1Cmoy01H7jlX7Wthe+8Gt//BS6mF+ApiTwocU6ipcMMEC8M+sbiY',
    '0EnQBEh3tAe5fRi8wpd8NLLEx4V7zEVOanQLHjlUkQ4nKxiwDmJ4ashYJmrxcmI6',
    'j4y13tZyq/NcyIzSi9Ex/oP/dBgbCP90IJ5QE4ONy6HyPI/x9BhlnDzTxXkLmQ0t',
    'M3GzRKavvT1heNlivrYVycwvG8tAvaAnz4jYtuzr2d9+9xIiC3r72tO0yuvaUy3L',
    'KAsIopmZ7u6XYAzeE0X6fHFPHIJHqX5SuBmEg4h2',
    '=T7y7',
    '-----END PGP PUBLIC KEY BLOCK-----'
  ].join('\n'),
  privkey = [
    '-----BEGIN PGP PRIVATE KEY BLOCK-----',
    '',
    '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',
    '=0+3U',
    '-----END PGP PRIVATE KEY BLOCK-----'
  ].join('\n')

exports['extract'] = function (test) {
  test.expect(7)

  try {
    hanewinpgp.extract('')

    test.ok(false, 'empty input')
  } catch (e) {
    test.equal(e.message, 'No PGP Public Key Block', 'empty input')
  }

  try {
    hanewinpgp.extract([
      '-----BEGIN PGP PUBLIC KEY BLOCK-----',
      '-----END PGP PUBLIC KEY BLOCK-----'
    ].join('\n'))

    test.ok(false, 'empty key block')
  } catch (e) {
    test.equal(e.message, 'Invalid PGP Public Key Block', 'empty key block')
  }

  try {
    hanewinpgp.extract([
      '-----BEGIN PGP PUBLIC KEY BLOCK-----',
      'asdf',
      '-----END PGP PUBLIC KEY BLOCK-----'
    ].join('\n'))

    test.ok(false, 'garbage key block')
  } catch (e) {
    test.equal(e.message, 'Invalid PGP Public Key Block', 'garbage key block')
  }

  var key = hanewinpgp.extract(pubkey)

  test.equal(key.version, 4, 'key version')
  test.equal(key.user, 'hanewinpgp <hanewinpgp@github.com>', 'key user')
  test.equal(key.id, '613d287d2d771a2e', 'key id')
  test.equal(key.type, 0, 'key type') // 0=RSA, 1=ELGAMAL

  test.done()
}

if (process.browser && typeof navigator != 'undefined' && /MSIE [0-9]+\.[0-9]+/.test(navigator.appVersion)) {
  exports['not supported on IE10 and older'] = function (test) {
    test.expect(1)

    try {
      var a = []

      for (var i = 0; i < 256; i++) {
        a.push(i)
      }

      var message = Buffer.from(a)
      var key = hanewinpgp.extract(pubkey)
      var encrypted = hanewinpgp.encrypt(key, message)

      test.ok(false, 'expected exception not thrown')
    } catch (e) {
      //console.log(e)
      test.equal(e.message, 'IE10 and older not supported.', 'IE10 and older expects a thrown exception')
    }

    test.done()
  }
} else {
  function test_encrypt(test, message) {
    var key = hanewinpgp.extract(pubkey)
    var encrypted = hanewinpgp.encrypt(key, message)

    //console.log(encrypted)

    test.ok(encrypted.match(/^-----BEGIN PGP MESSAGE-----$/m), 'has begin line')
    test.ok(encrypted.match(/^-----END PGP MESSAGE-----$/m), 'has end line')

    if (!process.browser) {
      var tmp = require('tmp')
      var fs = require('fs')
      var spawnSync = require('child_process').spawnSync

      var tmpdir = tmp.dirSync({ unsafeCleanup: true }),
        privfile = tmpdir.name + '/privkey.asc',
        encfile = tmpdir.name + '/encrypted.asc'

      tmp.setGracefulCleanup()

      var cmd, child

      fs.writeFileSync(privfile, privkey)
      fs.writeFileSync(encfile, encrypted)

      cmd = [ 'gpg2', '--batch', '--no-tty', '--homedir', tmpdir.name, '--no-options', '--import', privfile ]
      child = spawnSync(cmd[0], cmd.slice(1))

      cmd = [ 'gpg2', '--batch', '--no-tty', '--homedir', tmpdir.name, '--no-options', '--decrypt', encfile ]
      child = spawnSync(cmd[0], cmd.slice(1))
      //child.stdout && console.log('stdout', child.stdout.toString())
      //child.stderr && console.log('stderr', child.stderr.toString())

      var expected = Buffer.from(message)

      test.equal(child.stdout.length, expected.length, 'lengths match')
      test.ok(child.stdout.equals(expected), 'decrypted successfully')
    }
  }

  exports['encrypt ascii text'] = function (test) {
    test.expect(process.browser ? 2 : 4)
    test_encrypt(test, 'your secret text goes here')
    test.done()
  }

  exports['encrypt ascii text with newlines'] = function (test) {
    test.expect(process.browser ? 2 : 4)
    test_encrypt(test, 'your secret\ntext goes\nhere')
    test.done()
  }

  exports['encrypt utf-8 text'] = function (test) {
    test.expect(process.browser ? 2 : 4)
    test_encrypt(test, 'åêìøü')
    test.done()
  }

  exports['encrypt byte 13 as array'] = function (test) {
    test_encrypt(test, [ 13 ])
    test.done()
  }

  exports['encrypt all bytes 0-255 as array'] = function (test) {
    test.expect(process.browser ? 2 : 4)

    var a = []

    for (var i = 0; i < 256; i++) {
      a.push(i)
    }

    test_encrypt(test, a)
    test.done()
  }

  exports['encrypt all bytes 0-255 as buffer'] = function (test) {
    test.expect(process.browser ? 2 : 4)

    var a = []

    for (var i = 0; i < 256; i++) {
      a.push(i)
    }

    test_encrypt(test, Buffer.from(a))
    test.done()
  }

  exports['encrypt all bytes 0-255 as string'] = function (test) {
    test.expect(process.browser ? 2 : 4)

    var a = []

    for (var i = 0; i < 256; i++) {
      a.push(i)
    }

    test_encrypt(test, a.map(function (el) { return String.fromCharCode(el) }).join(''))
    test.done()
  }
} // if not IE10

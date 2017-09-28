const assert = require('assert')
const tmp = require('tmp')
const fs = require('fs')
const spawnSync = require('child_process').spawnSync
const hanewinpgp = require('../build/hanewinpgp')

tmp.setGracefulCleanup()

const pubfile = __dirname + '/files/pubkey.asc',
	pubkey = fs.readFileSync(pubfile).toString(),
	privfile = __dirname + '/files/privkey.asc',
  privkey = fs.readFileSync(privfile).toString()

exports.encrypt = function (test) {
	test.expect(5)

  var tmpdir = tmp.dirSync({ unsafeCleanup: true }),
    encfile = tmpdir.name + '/encrypted.asc',
    cmd, child

  var key = hanewinpgp.extract(pubkey)

  test.equal(key.version, 4)
	test.equal(key.user, 'hanewinpgp <hanewinpgp@github.com>')
	test.equal(key.id, '613d287d2d771a2e')
	test.equal(key.type, 0) // 0=RSA, 1=ELGAMAL

  var plaintext = 'your secret text goes here'
	var encrypted = hanewinpgp.encrypt(key, plaintext)

	//console.log(encrypted)

  fs.writeFileSync(encfile, encrypted)

  cmd = [ 'gpg2', '--batch', '--no-tty', '--homedir', tmpdir.name, '--no-options', '--import', privfile ]
  child = spawnSync(cmd[0], cmd.slice(1))

/*
  cmd = [ 'gpg2', '--batch', '--no-tty', '--homedir', tmpdir.name, '--no-options', '--armor', '--recipient-file', pubfile, '--output', encfile, '--encrypt' ]
  child = spawnSync(cmd[0], cmd.slice(1), { input: plaintext })
*/

  cmd = [ 'gpg2', '--batch', '--no-tty', '--homedir', tmpdir.name, '--no-options', '--decrypt', encfile ]
  child = spawnSync(cmd[0], cmd.slice(1))
  //child.stdout && console.log('stdout', child.stdout.toString())
  //child.stderr && console.log('stderr', child.stderr.toString())

	test.equal(child.stdout, plaintext)
  test.done()
}

exports.cleanup = function (test) {
  hanewinpgp.stop()
  test.done()
}

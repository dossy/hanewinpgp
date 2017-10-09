(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*!
 * hanewinpgp.browser - PGP / GnuPG / OpenPGP Message Encryption in JavaScript by Herbert Hanewinkel.
 * @version v0.1.0
 * @link https://github.com/dossy/hanewinpgp#readme
 */

var VERSION = '0.1.0';

// IE lt 10
if (typeof navigator != 'undefined' && /MSIE [0-9]+\.[0-9]+/.test(navigator.appVersion)) {
  document.write('<scr' + 'ipt type="text/javascript" src="hanewinpgp.legacy.browser.js"></scr' + 'ipt>');
} else {
  document.write('<scr' + 'ipt type="text/javascript" src="hanewinpgp.browser.js"></scr' + 'ipt>');
}

},{}]},{},[1]);

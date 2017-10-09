// IE lt 10
if (typeof navigator != 'undefined' && /MSIE [0-9]+\.[0-9]+/.test(navigator.appVersion)) {
  document.write('<scr' + 'ipt type="text/javascript" src="hanewinpgp.legacy.browser.js"></scr' + 'ipt>');
} else {
  document.write('<scr' + 'ipt type="text/javascript" src="hanewinpgp.browser.js"></scr' + 'ipt>');
}

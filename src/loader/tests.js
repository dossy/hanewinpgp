if (typeof navigator != 'undefined' && /MSIE [0-9]+\.[0-9]+/.test(navigator.appVersion)) {
  // IE9, IE10
  document.write('<scr' + 'ipt type="text/javascript" src="../build/tests.legacy.js"></scr' + 'ipt>');
} else {
  document.write('<scr' + 'ipt type="text/javascript" src="../build/tests.js"></scr' + 'ipt>');
}

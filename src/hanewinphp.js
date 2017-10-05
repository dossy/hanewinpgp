//var alert = console.log;
var alert = function(message) {
  throw new Error(message)
}

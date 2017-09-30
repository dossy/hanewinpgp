//const alert = console.log;
const alert = function(message) {
  throw new Error(message)
}


var o = require('observable')

var hashChange = require('hash-change')

function getHash () {
  return window.location.hash.replace('#','')
}

exports.hash = function (val) {
  function listener () {
    val(getHash())
  }
  return (
    'undefined' === typeof val ? getHash()
  : 'function'  !== typeof val ? window.location.hash = val
  : (window.addEventListener('hashchange', listener), val(getHash()), function () {
      window.removeEventListener('hashchange', listener)
    }))}


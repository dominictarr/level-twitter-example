
var o = require('observable')

var hashChange = require('hash-change')

exports.hash = function (val) {
  return (
    'undefined' === typeof val ? window.location.hash.replace('#','')
  : 'function'  !== typeof val ? window.location.hash = val
  : (window.addEventListener('hashchange', val), function () {
      window.removeEventListener('hashchange', val)
    }))}


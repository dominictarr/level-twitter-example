var Stream = require('stream')
var o      = require('observable')

// Leveldb is fast, but sometimes, you want to know about something
// faster than fast. the only thing faster than fast is now.
//
// "here is one I prepared earier"
//
// Now is the only thing faster that Fast.
//
// This module replicates some range from leveldb
// (actually, it just has to have {key, value} pairs)
// into local memory, so when you need it,
// you already have that data.
//
// This is only suitable for fairly small datasets,
// fewer than a few thousand, probably.

module.exports = function (map) {
  var cache = new Stream()
  var store = cache.store = {}

  cache.maxListeners = Infinity

  cache.get = function (key) {
    return cache.store[key]
  }

  //maybe make this write?
  cache.set = function () {} 

  cache.observer = function (key) {
    return o.property(this, key)
  }

  cache.write = function (data) {
    map(data.key, data.value, function (key, value) {
      var _value = store[key]
      if(_value != value) {
        store[key] = value
        cache.emit('change', key, value)
        cache.emit('change:'+key, value)
        this.emit('data', {key: key, value: value})
      }
    })
    return true
  }

  cache.end = function () {
    //do nothing?
    this.emit('end')
  }

  return cache
}


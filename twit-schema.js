
var Schema    = require('./schema')
var timestamp = require('monotonic-timestamp')
var assert    = require('assert')

function isString(len) {
  return function (str) {
    assert.equal(typeof str, 'string')
    assert.ok(str.length < len)
    assert.ok(str) //non empty
  }
}
function isNumber () {
  return function (n) {
    assert.ok(!isNaN(n))
    assert.equal(typeof n, 'number')
  }
}

module.exports = function (db) {

  var createSchema = Schema(db)

  //this is assuming this schema:

  createSchema({
    type: 'tweet',
    primary: ['user', 'ts'],
    generate: {
      ts: timestamp
    },
    validate: {
      user: isString(20), message: isString(140)
    }
  })

  createSchema({
    type: 'user',
    primary: ['user'],
    validate: {
      user: isString(20),
      bio: isString(140),
      realname: isString(40)
    }
  })

  createSchema({
    type: 'follow',
    primary: ['followed', 'follower'],
    validate: {
      followed: isString(20),
      follower: isString(20)
    }
  })

  createSchema({
    type: 'feed',
    primary: ['follower', 'ts', 'user'],
    validate: {
      follower : isString(20),
      ts       : isNumber(),
      user     : isString(20),
      message  : isString(140)
    }
  })

  return db
}

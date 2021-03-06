
var shoe       = require('shoe')
var ecstatic   = require('ecstatic')
var http       = require('http')
var schema     = require('./twit-schema')
var db         = schema(require('./db')('/tmp/twitter-example-test'))
var multilevel = require('multilevel')
var manifest   = require('level-manifest')
var fs         = require('fs')
var auth       = require('./auth')

fs.writeFileSync('./manifest.json', JSON.stringify(manifest(db, true), null, 2))

var _auth = auth(db)

shoe(function (stream) {
  stream.on('data', console.log)
  stream.pipe(multilevel.server(db, _auth).on('data', console.log)).pipe(stream)
})
.install(
  http.createServer(ecstatic(__dirname + '/static'))
  .listen(process.env.PORT || 3000),
  {prefix: '/multilevel'}
)


var Bot = require('./bot')

  Bot (db, 'suntzu', ['war'])

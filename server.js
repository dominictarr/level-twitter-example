
var shoe       = require('shoe')
var ecstatic   = require('ecstatic')
var http       = require('http')
var schema     = require('./twit-schema')
var db         = schema(require('./db')('/tmp/twitter-example-test'))
var multilevel = require('multilevel')
var manifest   = require('level-manifest')
var fs         = require('fs')

console.log(db)

fs.writeFileSync('./manifest.json', JSON.stringify(manifest(db, true), null, 2))


shoe(function (stream) {
  stream.pipe(multilevel.server(db).on('data', console.log)).pipe(stream)
})
.install(
  http.createServer(ecstatic(__dirname + '/static'))
  .listen(3000),
  {prefix: '/multilevel'}
)


var Bot = require('./bot')

  Bot (db, 'suntzu', ['war'])

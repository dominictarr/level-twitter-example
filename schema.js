var LiveStream = require('level-live-stream')

function each (obj, iter) {
  for(var k in obj)
    iter(obj[k], k, obj)
}

function merge (to, from) {
  for(var k in from) {
    to[k] = from[k]
  }
  return to
}

var isClient = false
module.exports = function (db) {
  var types = db.types = {}

  isServer = !db.isClient

  if(isServer) LiveStream.install(db)

  var prepare = 
  db.prepare = function (obj) {
    var schema = types[obj.type]

    if(!schema) throw new Error('unknown type:'+obj.type)
    if(schema.generate)
      each(schema.generate, function (gen, key) {
        obj[key] = gen.call(obj)
      })
    if(schema.validate)
      each(schema.validate, function (valid, key) {
        valid(obj[key])
      })
    var key
    if(schema.primary)
      key = schema.primary.map(function (key) {
        return obj[key]
      }).join('!')
    else key = obj.id

    return {
      key: key, value: obj, type: 'put',
      prefix: db.sublevel(obj.type).prefix()
    }
  }

  db.save = function (obj, cb) {
    if(Array.isArray(obj))
      obj = obj.map(prepare)
    else
      obj = [prepare(obj)]

    db.batch(obj, cb)
  }

  db.remove = function (obj, cb) {
    //must have enough to get a primary key...
    
  }

  db.query = function (obj, cb) {
    var schema = types[obj.type]
    if(!schema)
      return cb(new Error('unknown type'))

    var key = schema.primary.map(function (key) {
      return obj[key]
    }).join('!')

    console.log('GET', obj)

    db.sublevel(obj.type).get(key, cb)
  }

  db.queryStream = function (query, opts) {
    if(!query.type)
      throw new Error('must provide "type"')
    if(!types[query.type])
      throw new Error('must provide known "type", was:' + query.type)

    var schema = types[query.type]
    var match = [], i = 0
    while(i < schema.primary.length) {
      var m
      if(m = query[schema.primary[i]])
        match.push(m)
      i++
    }
    var prefix = match.join('!')
    opts = merge(prefix ? {
        min: prefix + '!',
        max: prefix + '!~',
      } : {}, opts)

    if(opts.tail != true)
      opts.tail = false //default to false

    return db.sublevels[query.type]
      .createLiveStream(opts)
  }

  return function createSchema(schema) {
    var type = schema.type
    if('string' !== typeof type && type.length)
      throw new Error('must provide type')
    var typeDb = db.sublevel(type)
    if(isServer) LiveStream.install(typeDb)

    db.types[schema.type] = schema
  }
}

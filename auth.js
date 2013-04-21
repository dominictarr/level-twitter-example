//TODO:
//* password resets.
//* delete users.
//* change password.
//* injectable hash function
//* publish as a module.

var _hash = require('sha1sum')

function hash(str) {
  for(var i = 0; i < 1000; i++)
    str = _hash(str)
  return str
}

var auth = module.exports = function (db) {
  var authDb = db.sublevel('auth')
  return {
    auth: function (user, cb) {

      if(user.signup) {
        console.log('SIGNUP')
        if(!user.name || !user.email || !user.password)
          return cb(new Error('require name, email, password'))

        authDb.get(user.name, function (err, val) {
          console.log(err, val)
          if(!err)
            return cb(new Error('user already exists'))
          var salt = hash(Math.random())

          authDb.put(user.name, {
            password: hash(user.password + salt),
            salt: salt,
            name: user.name
          }, function (err) {
            if(err) cb(err)
            else cb(null, {
              name: user.name,
              email: user.email,
              auth: true,
              signedIn: new Date
            })
          })
        })
      }
      else {
        console.log('SIGNIN')

        if(!user.name || !user.password)
          return cb(new Error('require name, password'))

        authDb.get(user.name, function (err, val) {
          //console.log(val)
          //console.log(val.password, hash(user.password + val.salt))
          if(err)
            cb(new Error('user does not exist'))
          else if(val.password === hash(user.password + val.salt)) {
            console.log('AUTHORIZED', {name: val.name, auth: true, signedIn: new Date})
            cb(null, {name: val.name, auth: true, signedIn: new Date})
          } else
            cb(new Error('password and username do not match'))

        })
      }
    },
    //this is coupled to the twitter example.
    //remove before publishing.
    access: function (user, db, method, args) {
      console.log('access?', user, method)
      if(!user && /put|del|batch|write/.test(method))
        throw new Error('login to get write access')
      //validate that args is valid, and for this user.
    }
  }
}

if(!module.parent) {
  var levelup  = require('levelup')
  var sublevel = require('level-sublevel')
  var opts     = require('optimist').argv

  var db = sublevel(levelup('/tmp/test-level-auth', {encoding: 'json'}))
  var a = auth(db)

  a.auth(opts, function (err, user) {
    if(err) throw err
    console.log(user)
  })
}

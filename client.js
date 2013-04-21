var multilevel = require('multilevel')
var reconnect  = require('reconnect')
var schema     = require('./twit-schema')
var through    = require('through')
var o          = require('observable')
var h          = require('hyperscript')
var odom       = require('./observables')
var EagerCache = require('./eager-cache')

var feed = h('div#feed'), db

function prepend(results, element) {
  if(results.firstChild)
    feed.insertBefore(element, results.firstChild)
  else
    results.appendChild(element)
}

var followCache = EagerCache(function (_, key, emit) {
  emit(key.split('!').pop(), value ? true : null)
})

var followStream

reconnect(function (stream) {
  var qs
  db = schema(multilevel.client(require('./manifest.json')))
  stream.pipe(db).pipe(stream)
  
  var remove = odom.hash(function (hash) {
    var query = hash.split('/')
    var type = query.shift()
    if(qs) qs.destroy()
    feed.innerHTML = ''
    if(type == '!') {
      feed.innerHTML = ''
      qs = db.queryStream({
        type: 'feed', 
        user: query[0] || 'dominictarr'
      }, {tail: true})
      .on('data', function (data) {
        prepend(feed, render(data.value))
      })
    } else if (type = '?') {
      qs = merge([
        db.sublevel('tweetSearch')
          .createQueryStream(query, {tail: true}),
        db.sublevel('userSearch')
          .createQueryStream(query, {tail: true})
        ])
      .on('data', function (data) {
        feed.appendChild(render(data.value))
      })
    }

    username(function (name) {
      if(followStream) {
        followStream.destroy()
        followStream = null
      }

      ;(followStreams = db.queryStream({type: 'follow', follower: name}))
        .on('data', function (d) {
          console.log(d.key, d.value)})
        .pipe(followCache)
    })
  })

  db.once('close', function () {
    db = null
    remove()
  })

}).connect('/multilevel')

var username = o()
username('guest')

var send

function merge (streams) {
  var dest = through(), n
  streams.forEach(function (stream) {
    n ++
    stream.on('data', function (d) {
      dest.write(d)
    })
    stream.on('end', function () {
      if(--n) return
      dest.end()
    })
    dest.once('close', function () {
      stream.destroy()
    })
  })
  return dest
}

var message = o(), signedIn = o()
message('')

signedIn(false)

function a(classes, name, onClick) {
  if(!onClick)
    onClick = name, name = classes,  classes = ''
  console.log(classes, name, onClick)
  return h('a'+classes, name, {href: '#', onclick: function (e) {
    onClick.call(this, e)
    e.preventDefault()
  }}) 
}

function toggle (v, up, down) {
  return a(
    o.boolean(v, up || 'ON', down || 'OFF'),
    function () { v(!v()) }
  )
}

function show (v, el, _el) {
  if(!_el)
    return h('span', {style: {display: o.boolean(v, 'inline', 'none')}}, el)

  return h('span', show(v, el), show(o.not(v), _el))
}

function div() {
  return h('div', [].slice.call(arguments))
}


function signUp () {
  var un = h('input#username', {placeholder: 'username'})
  var em = h('input#email', {placeholder: 'email'})
  var p1 = h('input#password1', {type:'password', placeholder: 'password'})
  var p2 = h('input#password2', {type:'password', placeholder: 'confirm'})
  var _p1 = o.input(p1), _p2 = o.input(p2)
  var message = o(); message('')
  var signup = o()

  var match = o.compute([_p1, _p2], function (p1, p2) {
    return (p1 === p2) && p1 ? true : false
  })

  var su = h('input#signup', {type: 'checkbox'})
  var _su = o.input(su, 'checked', 'change')

  return h('div#login', {style: {
      position: 'fixed', right: '10px', top: '10px'
    }},
    show(signedIn, 
      h('div#signout',
        h('a', '@', username, {href: 
          o.transform(username, function (e) { return '#!/'+e})
        }),
        h('button', 'sign out', {onclick: function () {
          username(null); signedIn(false)
          db.deauth(function (err, data) { console.log('DEAUTH', err, data)})
        }})
      ),
      h('div#signin', 
        h('div', div(un), show(signup, div(em)), p1, show(signup, div(p2))),
        show(signup, h('div', o.boolean(match, 'okay!', 'must match.'))),
        h('button', o.boolean(signup, 'sign-up', 'sign-in'), {onclick: function () {
          if(!db)
            return message('not connected...')
          if(!(signup() ? match() : true))
            return message('password does not match')

          db.auth({
            name: un.value,
            password: _p1(),
            email: em.value,
            signup: signup()
          }, function (err, data) {
            console.log(err, data)
            if(err) {
              message(err.message)
              signedIn(false)
              _p1(''); _p2('')
            }
            else {
              message('signed in!')
              signedIn(true)
              username(data.name)
              odom.hash('!/'+username())
              _p1(''); _p2('')
            }
          })
        }}),
        toggle(signup, 'sign in?', 'sign up?'),
        div(message)
      )
    )
  )
}

document.body.appendChild(
  h('div#content', 
    signUp(),
    h('h1', 'level-twitter', h('div#message', message)),
    h('h2', '@', username),
    h('div#nav',
      h('input#search_input', {
        onkeydown: function (e) {
          if(!db) return //not connected.
          if(e.keyCode === 13) {//Enter
            odom.hash('?/' + this.value)
          }
        }
      })
    ),
    h('div.tab#feed', 
      h('div#send',
        send = h('textarea', {rows: 3, cols: 50, 
          onkeydown: function (e) {
            if(!db) return //not connected.
            if(e.keyCode === 13) {//Enter
              var tweet = {type: 'tweet', user: username(), message: e.target.value}
              db.save(tweet,
                function (err) {
                  if(!err) send.value = ''
                  else message('must log in')
                })
            }
          }}
        )
      ),
      feed
    )
  )
)

function followLink(user) {
  if(user === username())
    return

  return  a(o.boolean(followCache.observer(user), 'unfollow', 'follow'),
    function () {
      //in real twitter,
      //this opens a view of this users, feed,
      //and whether or not we are following them...
      //this would be good information to replicate locally.
      //then you could do a join with your followers
      //which is replicated locally...
      //if you are following more than 1000*N people,
      //just make it lossy (!)
    
      //in this case... just follow them.
      console.log(followCache.get(user), followCache.get(user) ? 'UNFOLLOW' : 'FOLLOW')

      if(db && !followCache.get(user)) {
        console.log('follow!', user)
        db.save({followed: user, follower: username(), type: 'follow'}, function (err) {
          message('followed:'+user)
        })
      }
    }
  )
}

function render (obj, query, user) {

  //higlight any search terms...
  function hl (str) {
    return str
  }

  if(obj.type == 'tweet' || obj.type == 'feed')
    return h('div.item.tweet',
      h('div.meta',
        h('div.title.user', '@'+hl(obj.user), ' ', followLink(obj.user)),
        h('span.date', new Date(obj.ts).toString())
      ),
      h('p.content.message', hl(obj.message))
    )
  else if (obj.type == 'user')
    return h('div.item.user',
      h('div.meta',
        h('div.title.user', hl(obj.realname)),
        h('div.user', '@' + hl(obj.user), ' ', followLink(obj.user))
      ),
      h('p.centent.bio', hl(obj.bio))
    )
  else if(obj.type == 'follow')
    return h('div.item.follow', 
      h('div.meta',
        h('div.title.user', obj.follower)
      )
    )
}



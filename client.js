var multilevel = require('multilevel')
var reconnect  = require('reconnect')
var schema     = require('./twit-schema')
var through    = require('through')
var o          = require('observable')
var h          = require('hyperscript')
var odom       = require('./observables')
var EagerCache = require('./eager-cache')
var dvect      = require('dom-vector')
var relDate      = require('relative-date')


function rdate(d) {
  var rd = o()
  rd(relDate(d))
  setInterval(function () {
    rd(relDate(d))  
  }, 10000)
  return rd
}

var feed = h('div'), db

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

var _usersOnly = h('input', {type: 'checkbox'})
var usersOnly = o.input(_usersOnly, 'checked', 'change')

var viewUser = o()
var page = o() //search or user
var query = o(), message = o(), signedIn = o()
message('')
signedIn(false)

odom.hash(function (q) {
  if(q) {
    var _page = ({'?':'search', '~':'home', '@':'profile'})[q[0]]
    _page != page() && page(_page)
  }
})

page(function (p) {
  odom.hash(({
    'search':'?',
    'home':'~',
    'profile':'@'
  })[p] || '')
})
//observable that fires once,
//when an async operation completes.
function asyncObservable (fun) {
  var v = o()
  v('')
  var args = [].slice.call(1)
  args.push(function (err, data) {
    if(err) v({error: err})
    else    v(data)
  })
  fun.apply(null, args)
  return v
}

var client = o()

reconnect(function (stream) {
  var qs
  db = schema(multilevel.client(require('./manifest.json')))
  stream.pipe(db).pipe(stream)
  client(db)

  db.once('close', function () {
    client(null)
    db = null
  })

}).connect('/multilevel')

var username = o()
username('guest')

client(function (e) {
  console.log('db', !!e)
})

o.compute([client], function (db) {
  console.log('_db', !!db)
})

o.compute([client, username], function (db, name) {
  console.log('follow stream')
  if(!db) return
  if(followStream) {
    followStream.destroy()
    followStream = null
  }

  ;(followStreams = db.queryStream({type: 'follow', follower: name}))
    .on('data', function (d) {
      console.log(d.key, d.value)
    })
    .pipe(followCache)
})

var qs
o.compute([client, username, page, query], function (db, name, page, query) {
  console.log('PAGE!', page)
  if(!db) return
  if(qs) qs.destroy(), qs.removeAllListeners()
  feed.innerHTML = ''
  if(page == 'home') {
    console.log('HOME', name)
    feed.innerHTML = ''
    var seen = {}
    qs = db.queryStream({
      type: 'feed', 
      user: name
    }, {tail: true})
    .on('data', function (data) {
      if(seen[data.key]) return
      seen[data.key] = true
      console.log('HOME _RENDER', data)
      prepend(feed, render(data.value))
    })
  } else if (page == 'profile') {
    console.log('PROFILE', name)
    feed.innerHTML = ''
    feed.appendChild(
      h('div', 
      asyncObservable(function (cb) {
        db.query({
          type:'user', user: query || name
        }, function (err, data) {
          if(err)
            cb(null, h('h2', 'unknown user :"' + (query || name) + '"'))
          else
            cb(null, h('h2', render(data)))
        })
      })
    ))

    qs = db.queryStream({type: 'tweet', user: query || name}, {tail: true})
      .on('data', function (data) {
        prepend(feed, render(data.value))
      })
  } else if (page == 'search') {

    console.log('SEARCH', query, name)
    qs = merge([
      /*usersOnly ? null :*/ db.sublevel('tweetSearch')
        .createQueryStream(query, {tail: true}),
      db.sublevel('userSearch')
        .createQueryStream(query, {tail: true})
      ])
    .on('data', function (data) {
      console.log('SEARCH _RENDER', data)
      feed.appendChild(render(data.value))
    })
  }
})

var send

function merge (streams) {
  var dest = through(), n
  streams.forEach(function (stream) {
    if(!stream) return
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

function a(classes, name, onClick) {
  if(!onClick)
    onClick = name, name = classes,  classes = ''
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

  return h('div#login',
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
              page('home')
              _p1(''); _p2('')
            }
            else {
              message('signed in!')
              signedIn(true)
              username(data.name)
              page('home')
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

//create a tab that focuses the current page.
//like radio buttons.
function to(human, machine) {
  return a(h('span', human, {
      className: o.transform(page, function (e) {
        return (e == human || e == machine) ? 'focus' : 'blur'
      })
    }), function () {
      page(machine || human)
    })
}

var metadata = h('div', 'meta!')
document.body.appendChild(
  h('div#container',
    h('div#content', 
      signUp(),
      h('h1', '@', username, ' ',
        h('span', to('search'),' ', to('home'),' ', to('profile')),
        ' ',
        h('input#search_input', {
          placeholder: 'search',
          onkeydown: function (e) {
            if(!db) return //not connected.
            if(e.keyCode === 13) {//Enter
              query(this.value); page('search')
              //odom.hash('?/' + this.value)
            }
          }
        })
      ),
      h('div#message', message),
      h('div#feed',
        send = h('textarea', {//rows: 3, cols: 46, 
  //        style: {width: '90%', margin: 'auto'},
          placeholder: 'tweet',
          onkeydown: function (e) {
            if(!db) return //not connected.
            if(e.keyCode === 13) {//Enter
              var tweet = {type: 'tweet', user: username(), message: e.target.value}
              console.log('SAVE')
              db.save(tweet,
                function (err) {
                  if(!err) send.value = ''
                  else message('must log in')
                })
            }
          }}
        ),
        feed
      )
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
//      console.log(followCache.get(user), followCache.get(user) ? 'UNFOLLOW' : 'FOLLOW')

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
      h('div.title',
        h('div.meta',
          h('span.date', rdate(new Date(obj.ts))),
          ' ',
          followLink(obj.user),
          {title: new Date(obj.ts).toString()}
        )),
      h('div.title.user', '@'+hl(obj.user)),
      h('p.content.message', hl(obj.message))
    )
  else if (obj.type == 'user')
    return h('div.item.user',
      h('div.title.user', hl('@' + obj.user), obj.realname, ' ', followLink(obj.user)),
        h('div.title.user', hl(obj.bio))
    )
  else if(obj.type == 'follow')
    return h('div.item.follow', 
      h('div.meta',
        h('div.title.user', obj.follower)
      )
    )
}



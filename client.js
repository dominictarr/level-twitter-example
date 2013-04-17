var multilevel = require('multilevel')
var reconnect  = require('reconnect')
var schema     = require('./twit-schema')
var render     = require('./render')
var through    = require('through')
var o          = require('observable')
var h          = require('hyperscript')
var odom       = require('./observables')

var results, db

function prepend(results, element) {
  if(results.firstChild)
    feed.insertBefore(element, results.firstChild)
  else
    results.appendChild(element)
}

reconnect(function (stream) {
  console.log('connected', require('./manifest.json'))
  var qs
  stream.pipe(db).pipe(stream)
  db = schema(multilevel.client(require('./manifest.json')))

  var remove = odom.hash(function (hash) {

    feed.innerHTML = ''
    if(qs) qs.destroy()
    qs = db.queryStream({
      type: 'feed', 
      user: hash || 'dominictarr'
    }, {tail: true})
      .on('data', function (data) {
        prepend(feed, render(data.value))
      })

  })

  db.once('close', function () {
    db = null
  })

}).connect('/multilevel')

var USER = 'dominictarr'

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
  })
  return dest
}

document.body.appendChild(
  h('div#content', 
    h('h1', 'level-twitter'),
    h('div#nav',
      h('input#search_input', {
        onkeydown: function (e) {
          if(!db) return //not connected.
          if(e.keyCode === 13) {//Enter
            results.innerHTML = ''
            var query = this.value.split(' ')
              .map(function (e) {
                return e.trim()
              })
            merge([
              /*db.sublevel('tweetSearch')
                .createQueryStream(query),*/
              db.sublevel('userSearch')
                .createQueryStream(query)
              ])
              .on('data', function (d) {
                results.appendChild(render(d))
              })


          }
        }

      })
    ),
    h('div.tab#search', 
      results = h('div#results')
    ),
    h('div.tab#feed', 
      h('div#send',
        send = h('textarea', {rows: 3, cols: 50, 
          onkeydown: function (e) {
            if(!db) return //not connected.
            if(e.keyCode === 13) {//Enter
              var tweet = {type: 'tweet', user: USER, message: e.target.value}
              db.save(tweet,
                function (err) {
                  if(!err) send.value = ''
                })
            }
          }}
        )
      ),
      h('div.items',
        feed = h('div#feed')
      )
    )
  )
)


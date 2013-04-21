
var levelup   = require('levelup')
var sublevel  = require('level-sublevel')
var trigger   = require('level-trigger')
var timestamp = require('monotonic-timestamp')
var pull      = require('pull-stream')
var InvertedIndex
              = require('level-inverted-index')
var pl        = require('pull-level')
var schema    = require('./twit-schema')

module.exports = function (path) {
  var db = sublevel(levelup(path, {encoding: 'json'}))

  var feed        = db.sublevel('feed')
  var follow      = db.sublevel('follow')
  var tweet       = db.sublevel('tweet')
  var user        = db.sublevel('user')
  var userSearch  = db.sublevel('userSearch')
  var tweetSearch = db.sublevel('tweetSearch')

  schema(db)

  tweet.post(console.log)

  //save every tweet into your own feed.
  tweet.pre(function (op, add) {
    var tweet = op.value
    var _op = db.prepare({
      type    : 'feed',
      follower: tweet.user,
      user    : tweet.user,
      message : tweet.message,
      ts      : tweet.ts
    })
    add(_op)
  })

  trigger(tweet, '_fanout', function (tweet_id, done) {
    //get all the followers
    var user = tweet_id.split('!').shift()
    tweet.get(tweet_id, function (err, tweet) {
      pl.read(follow, {min: user + '!!', max: user+'!~'})
      .pipe(pull.map(function (follow) {
        return db.prepare({
          type    : 'feed',
          user    : tweet.user,
          follower: follow.value.follower,
          message : tweet.message,
          ts      : tweet.ts
        })
      }))
      .pipe(pl.write(feed, done))
    })
  })

  function index (key, value, index) {
    //don't index every tweet
    //by users names - just users
    if(value.type === 'user')
      index(value.user)
    index(value.realname)
    index(value.bio)
    
    index(value.message)
  }
  //values are small enough to just show the whole item.
  function id (value) { return value }

  //could probably combine these both into one search
  //but would be easier to display as one thing
  InvertedIndex(user,  userSearch, index, id)
  InvertedIndex(tweet, tweetSearch, index, id)

  return db
}


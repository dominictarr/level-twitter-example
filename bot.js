

var fs = require('fs')
var path = require('path')
var random = require('./markov')

module.exports = function (db, name, interest) {
  fs.readFile(path.join(__dirname, 'bots', name, 'user.json')
  , function (err, json) {
      if(err) throw err
      var user = JSON.parse(json)
      user.type = 'user'
      console.log(user)
      //create user
      db.save(user, function () {
        random(path.join(__dirname, 'bots', name, 'book.txt'), function (_, gen) {
          function randomTweet () {
            var t = {
              type: 'tweet',
              user: user.user,
              message: gen()
            }
            console.log('tweet', t)
            db.save(t, function () {})
          }
          randomTweet()
          setInterval(function () {
            randomTweet()
          }, 10e3)

          //follow anyone who mentions a word
          if(interest)
            db.sublevel('tweetSearch')
              .createQueryStream(interest, {tail: true})
              .on('data', function (data) {
                console.log('INTEREST', interest) 
                console.log(data) 
              })

        })
      })
    })
}

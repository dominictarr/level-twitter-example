var dir = '/tmp/twitter-example-test'
require('rimraf').sync(dir)
var db = require('../db')(dir)

db.save([
  {
    type: 'user',
    user: 'dominictarr',
    bio: 'Mad Scientist',
    realname: 'Dominic Tarr'
  },
  {
    type: 'user',
    user: 'substack',
    bio:  'bleep bloop',
    realname: 'Jame Haliday III'
  },
  {
    type: 'user',
    user: 'raynos',
    bio: 'JavaScript Engineer',
    realname: 'Jake Verbaten'
  },
  {
    type: 'tweet',
    user: 'dominictarr',
    message: "A Ladder > A Low Hanging Friut",
  },
  {
    type: 'tweet',
    user: 'raynos',
    message: "composable type signatures are composable",
  },
  {
    type: 'tweet',
    user: 'substack',
    message: "tech talks should be more like lord of the rings"
  },
  {
    type: 'follow',
    followed: 'substack', follower: 'dominictarr'
  },
  {
    type: 'follow',
    followed: 'substack', follower: 'raynos'
  }
], function () {
  console.log('done')

  db.queryStream({type: 'tweet', user: 'substack'})
    .on('data', function (data) {
      console.log(data.value)
    })
})

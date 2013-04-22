
var h = require('hyperscript')

//render any object.

module.exports = function (obj, query, user) {

  //higlight any search terms...
  function hl (str) {
    return str
  }
  console.log('R', obj, query, user)
  if(!obj) return ''

  if(obj.type == 'tweet' || obj.type == 'feed')
    return h('div.item.tweet',
      h('div.meta',
        h('div.title.user', '@'+hl(obj.user), 
          h('a', {onclick: function () {
            //in real twitter,
            //this opens a view of this users, feed,
            //and whether or not we are following them...
            //this would be good information to replicate locally.
            //then you could do a join with your followers
            //which is replicated locally...
            //if you are following more than 1000*N people,
            //just make it lossy (!)
            
            //in this case... just follow them.
            
          })),
        h('span.date', new Date(obj.ts).toString())
      ),
      h('p.content.message', hl(obj.message))
    )
  else if (obj.type == 'user') {
    console.log('R U', obj)
    return h('div.item.user',
      h('div.meta',
        h('div.item', h('label', 'username:'),
        h('div.title.user', hl(obj.user))
      ),
      h('div.meta',
        h('div.item', h('label', 'real name:'),
        h('div.title.user', hl(obj.realname))
      ),
      h('div.meta',
        h('div.item', h('label', 'bio:',),
        h('div.title.user', hl(obj.bio))
      )
    )
  }
  else if(obj.type == 'follow')
    return h('div.item.follow', 
      h('div.meta',
        h('div.title.user', obj.follower)
      )
    )
}

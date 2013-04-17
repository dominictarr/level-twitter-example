
var h = require('hyperscript')

//render any object.

module.exports = function (obj, query) {

  //higlight any search terms...
  function hl (str) {
    return str
  }

  if(obj.type == 'tweet' || obj.type == 'feed')
    return h('div.item.tweet',
      h('div.meta',
        h('div.title.user', '@'+hl(obj.user)),
        h('span.date', new Date(obj.ts).toString())
      ),
      h('p.content.message', hl(obj.message))
    )
  else if (obj.type == 'user')
    return h('div.item.user',
      h('div.meta',
        h('div.title.user', hl(obj.realname)),
        h('div.user', '@' + hl(obj.user))
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

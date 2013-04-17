
var fs     = require('fs')
var split  = require('split')

var lines = []
var sentence = /([A-Z][^.]*\.)/

//fs.createReadStream(__dirname + '/seed-text/art-of-war.txt')
//fs.createReadStream(__dirname + '/seed-text/being-earnest.txt')

/*
  okay...

  create bot that tweet occasionally,
  and follow you, if you mention a certain word.
  

*/

module.exports = function (seed, cb) {
  fs.createReadStream(seed)
  .pipe(split(sentence))
  .on('data', function (data) {
    if(sentence.test(data) && data.length < 140)
    lines.push(data)
  })
  .on('end', function () {
    cb(null, function () {
      console.log(lines.length)
      return lines[~~(Math.random() * lines.length)]
    })
  })
}

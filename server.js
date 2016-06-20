var download = require('./download');
var playlistId = process.argv[2];
var verifiedId;

if (!playlistId) {
  throw new Error('Please pass in a playlist id or a youtube playlist url in quotes');
  process.exit();
}

// Is url or partial format
if (!playlistId.match(/[.?&=]/)) {
  verifiedId = playlistId;
} else {
  playlistId
    .split('?')[1]
    .split('&')
    .forEach((item) => {
      var parse = item.split('=');
      if (parse[0] === 'list') {
        verifiedId  = parse[1]
      }
  });
}

if (!verifiedId) {
  throw new Error('Please pass in a playlist id');
  process.exit();
}

download(verifiedId, function(err) {
  if (err) {
    throw err;
  }
});
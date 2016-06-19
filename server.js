var http = require('http');
var fs = require('fs');
var ytdl = require('ytdl-core')
var ffmpeg = require('ffmpeg');
var async = require('async');
var request = require("request");

var urlBase = 'https://www.youtube.com/watch?v=';

var playlistId = 'PLIAJn04wnYq40AyXws5S03plVEicPy6OQ';
var playlist = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${process.env.YOUTUBE_KEY}&maxResults=50`;

var dir = './audio';
if (!fs.existsSync(dir)){
  fs.mkdirSync(dir);
}

async.auto({
  getVideos: function(callback){
    var options = {
      url: playlist,
      json: true
    }

    request(options, (err, response, body) => {
      if (err) {
        callback(err);
      }
      callback(null, body.items);
    });
  },
  start: ['getVideos', (results, callback) => {
    var items = results.getVideos.slice();
    async.whilst(
      () => items.length,
      (callback) => {
        var videoId = items.pop().snippet.resourceId.videoId;
        var url = `${urlBase}${videoId}`;
        var tempFile = `./audio/${videoId}.mp4`;

        download(url, tempFile, callback);
      },
      (err, n) => {
        if (err) {
          console.log(err);
        }
          console.log('pau');
      }
    );
  }]
}, function(err, results) {
    console.log('err = ', err);
    console.log('results = ', results);
});


function download(url, tempFile, callback) {
  async.auto({
    getInfo: function(callback){
      var currentTitle;

      ytdl.getInfo(url, function(err, info) {
        if (err) {
          console.log(err);
        }

        currentTitle = info.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        console.log(`currentTitle ${currentTitle}`);
        callback(null, {url, currentTitle, tempFile} , callback);
      });
    },
    start: ['getInfo', (results, callback) => {
      var results = results.getInfo[0];
      var writeStream = fs.createWriteStream(results.tempFile);

      writeStream.on('close', function() {
        console.log('file done');
        extractAudio(results.currentTitle, results.tempFile, callback);
      });

      ytdl(url, { filter: function(format) {
        return format.container === 'mp4';
      }})
      .pipe(writeStream);
    }]
  }, function(err, results) {
      console.log('err = ', err);
      console.log('results = ', results);
  });
}

function extractAudio(currentTitle, tempFile, callback) {
  var filename = `${dir}/${currentTitle}.mp3`;
  try {
    var process = new ffmpeg(tempFile);
    process.then(function (video) {
      video.fnExtractSoundToMP3(filename, function (err, file) {
        if (!err)
          console.log('Audio file: ' + file);
          fs.unlinkSync(tempFile);
          callback();
        });
    }, function (err) {
        callback(err);
    });
  } catch (e) {
    callback(e);
  }
}
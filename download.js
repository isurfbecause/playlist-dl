var http = require('http');
var fs = require('fs');
var ytdl = require('ytdl-core')
var ffmpeg = require('ffmpeg');
var async = require('async');
var request = require("request");
var sanitizeFilename = require("sanitize-filename");
var urlBase = 'https://www.youtube.com/watch?v=';
var dir = './audio';

module.exports = function(playlistId, callback) {
  var playlist = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${process.env.YOUTUBE_KEY}&maxResults=50`;

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
          console.log(`Songs left to download: ${items.length}`);
          var videoId = items.shift().snippet.resourceId.videoId;
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
  }, callback);
}

 function download(url, tempFile, callback) {
    async.auto({
      getInfo: function(autoCb){

        ytdl.getInfo(url, function(err, info) {
          var currentTitle;
          if (err) {
            console.log(err);
          }

          currentTitle = sanitizeFilename(info.title)
            .split(' ')
            .filter((item) => item.length)
            .join('_');

          console.log(`Downloading ${currentTitle}...`);
          autoCb(null, {url, currentTitle, tempFile} , callback);
        });
      },
      start: ['getInfo', (results, autoCb) => {
        var results = results.getInfo[0];
        var writeStream = fs.createWriteStream(results.tempFile);

        writeStream.on('close', function() {
          extractAudio(results.currentTitle, results.tempFile, autoCb);
        });

        ytdl(url, { filter: function(format) {
          return format.container === 'mp4';
        }})
        .pipe(writeStream);
      }]
    }, callback);
  }

  function extractAudio(currentTitle, tempFile, callback) {
    var filename = `${dir}/${currentTitle}.mp3`;
    try {
      var process = new ffmpeg(tempFile);
      console.log('Extracting audio...');
      process.then(function (video) {
        video.fnExtractSoundToMP3(filename, function (err, file) {
          if (!err)
            console.log('Saved: ' + file);
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
'use strict';
// TODO: Move the PAT to KMS - http://stackoverflow.com/questions/29372278/aws-lambda-how-to-store-secret-to-external-api
const vandium = require('vandium');
const GitHubApi = require('github');
const github = new GitHubApi({debug: false});

vandium.stripErrors(false);
vandium.validation({
  type: vandium.types.string().required(),
  repo: vandium.types.string().required(),
  APIKey: vandium.types.uuid().valid(process.env.APIKEY).required(),
  content: vandium.types.string().required()
});

// One AWS we exec index.handler (because our filename is index.js)
exports.handler = vandium( function( event, context, callback ) {

  // auth with personal access token
  github.authenticate({ type: 'token', token: process.env.PAT });

  if (event.instagram_url) {
    exports.getImg(event, callback);
  } else {
    exports.createPost(event, callback);
  }
});

/* This is the first in a series of functions that call each other when receiving
 * an event for an Instagram image.
 *
 * First we get the image data, base64 encode it and then call uploadImg() which
 * uploads this to GitHub. Once this has finished it calls createPost() to create
 * the corresponding markdown file.
 * We need to chain these because Node is async by default as we need things to be semi synchronous.
 *
 * TODO: Optimise this as I know it's not "correct" - should probably use Promises from something like bluebird.
 */
exports.getImg = function(event, callback) {
  var request = require('request').defaults({ encoding: null });

  request.get(event.instagram_url, function (err, res, body) {
      if (!err && res.statusCode == 200) {
        var pathname = res.request.uri['pathname'];
        var filename = pathname.substring(pathname.lastIndexOf('/') + 1);
        var data = new Buffer(body).toString('base64');
        if (err) {
          callback(err, 'Ooops. Something went wrong getting Instagram image');
        } else {
          // Exit here when testing
          if (process.env.NODE_ENV == 'test') {
            return data;
          }
          exports.uploadImg(data, filename, event, callback);
        }
      }
  });
};

exports.uploadImg = function(data, filename, event, callback) {
  github.repos.createFile({
    owner: 'lildude',
    repo: event.repo,
    path: 'media/' + filename,
    message: 'Add instagram photo',
    content: data
  }, function(err, res){
    if (err) {
      console.log(JSON.stringify(err));
      callback(err, 'Ooops. Something went wrong uploading image to GitHub');
    } else {
      //console.log('Successfully added Instagram img ' + filename);
      exports.createPost(event, callback, filename)
    }
  });
}

exports.createPost = function(event, callback, imgFileName = '') {
  var date = new Date();
  var content = event.content;

  // If the first line starts with a # it's the post title
  if (content.substr(0, 2) == "# ") {
    var parsed = content.match(/^# (.*)\n+(.*)/);
    var title = parsed[1];
    content = parsed[2];
  }

  var fileName = date.toISOString().substr(0, 10) + '-' + (title ? exports.slugify(title) : Math.round(Number(date) / 1000) % (24 * 60 * 60)) + '.md';

  var fileContent = '---\n';
  fileContent += 'layout: post\n';
  if (title) {
    fileContent += 'title: "' + title + '"\n';
  }
  fileContent += 'date: ' + date.toISOString().substr(0, 19).replace('T', ' ') + ' ' + exports.createOffset(date) + '\n';
  fileContent += '---\n\n';

  if (event.instagram_url) {
    fileContent += '![](/media/' + imgFileName + '){:class="instagram"}\n\n';
  }
  fileContent += content;

  // Exit here when testing
  if (process.env.NODE_ENV == 'test') {
    return fileContent;
  }

  github.repos.createFile({
    owner: 'lildude',
    repo: event.repo,
    path: '_posts/' + fileName,
    message: 'New ' + event.type + ' post created via AWS Lambda',
    content: new Buffer(fileContent).toString('base64')
  }, function(err, res){
    if (err) {
      console.log(JSON.stringify(err));
      callback(err, 'Ooops. Something went wrong creating ' + event.type + ' post file on GitHub');
    } else {
      callback(null, 'Successfully created new ' + event.type + ' post with SHA: ' + res.content.sha);
    }
  });
}

exports.pad = function(value) {
  return value < 10 ? '0' + value : value;
}

exports.createOffset = function(date) {
  var sign = (date.getTimezoneOffset() > 0) ? '-' : '+';
  var offset = Math.abs(date.getTimezoneOffset());
  var hours = exports.pad(Math.floor(offset / 60));
  var minutes = exports.pad(offset % 60);
  return sign + hours + minutes;
}

exports.slugify = function(string) {
  return string
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\u00C0-\u00C5]/ig,'a')
    .replace(/[\u00C8-\u00CB]/ig,'e')
    .replace(/[\u00CC-\u00CF]/ig,'i')
    .replace(/[\u00D2-\u00D6]/ig,'o')
    .replace(/[\u00D9-\u00DC]/ig,'u')
    .replace(/[\u00D1]/ig,'n')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

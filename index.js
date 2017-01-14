'use strict';
var GitHubApi = require('github');
var github = new GitHubApi({debug: false});

// One AWS we exec index.handler (because our filename is index.js)
exports.handler = function (event, context, callback) {
  //console.log('env.PAT =', process.env.PAT);
  //console.log('Event: \n', event);

  // auth with personal access token
  github.authenticate({
    type: 'token',
    token: process.env.PAT
  });

  if (event.instagram_url) {
    get_img(event, callback);
  } else {
    create_post(event, callback);
  }
};

/* This is the first in a series of functions that call each other when receiving
 * an event for an Instagram image.
 *
 * First we get the image data, base64 encode it and then call upload_img() which
 * uploads this to GitHub. Once this has finished it calls create_post() to create
 * the corresponding markdown file.
 * We need to chain these because Node is async by default as we need things to be semi synchronous.
 *
 * TODO: Optimise this as I know it's not "correct" - should probably use Promises from something like bluebird.
 */
function get_img(event, callback) {
  var request = require('request').defaults({ encoding: null });

  request.get(event.instagram_url, function (err, res, body) {
      if (!err && res.statusCode == 200) {
        var pathname = res.request.uri['pathname'];
        var filename = pathname.substring(pathname.lastIndexOf('/') + 1);
        var data = new Buffer(body).toString('base64');
        if (err) {
          console.log(JSON.stringify(err));
          callback(err, 'Ooops. Something went wrong getting Instagram image');
        } else {
          upload_img(data, filename, event, callback);
        }
      }
  });
};

function upload_img(data, filename, event, callback) {
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
      create_post(event, callback, filename)
    }
  });
}

function create_post(event, callback, imgFileName = '') {
  var date = new Date();
  var fileName = date.toISOString().substr(0, 10) + '-' + Math.round(Number(date) / 1000) % (24 * 60 * 60) + '.md';
  var content = event.content;

  // If the first line starts with a # it's the post title
  if (content.substr(0, 2) == "# ") {
    var parsed = content.match(/^# (.*)\n+(.*)/);  // TODO: This needs improving.
    var title = parsed[1];
    content = parsed[2];
  }

  var fileContent = '---\n';
  fileContent += 'layout: post\n';
  if (title) {
    fileContent += 'title: "' + title + '"';
  }
  fileContent += 'date: ' + date.toISOString().substr(0, 19).replace('T', ' ') + ' ' + createOffset(date) + '\n';
  fileContent += '---\n\n';

  if (event.instagram_url) {
    fileContent += '![](/media/' + imgFileName + '){:class="instagram"}\n\n';
  }
  fileContent += content;

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

function pad(value) {
  return value < 10 ? '0' + value : value;
}

function createOffset(date) {
  var sign = (date.getTimezoneOffset() > 0) ? '-' : '+';
  var offset = Math.abs(date.getTimezoneOffset());
  var hours = pad(Math.floor(offset / 60));
  var minutes = pad(offset % 60);
  return sign + hours + minutes;
}

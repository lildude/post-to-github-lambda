'use strict';
process.env.PAT = '123e4567e89b';
process.env.APIKEY = '123e4567-e89b-12d3-a456-426655440000';
process.env.NODE_ENV = 'test';

const expect = require('chai').expect;
const myLambda = require('../index.js');
const simple = require('simple-mock');
const fs = require('fs');

describe('Post to GitHub Lambda tests', function() {
  describe('pad()', function() {
    it('should add a zero before 9', function() {
      expect(myLambda.pad(9)).to.equal('09');
    });

    it('should not add a zero before 11', function() {
      expect(myLambda.pad(11)).to.equal(11);
    });
  });

  describe('createOffset()', function() {
    it('should calculate timezone offset for a date', function() {
      var date = new Date();
      expect(myLambda.createOffset(date)).to.equal('+0000');
    });
  });

  describe('slugify()', function() {
    it('should slugify a string with emoji and other non-ascii chars and spaces', function() {
      expect(myLambda.slugify('this--is über 🤡 äble naïvê   banaña')).to.equal('this-is-uber-able-naive-banana');
    });
  });

  describe('createPost()', function() {
    it('should create post content without title', function() {
      var callback = function() { }
      var event = fs.readFileSync('test/fixtures/events/note-event.json', 'utf-8');
      var output = myLambda.createPost(JSON.parse(event), callback);
      expect(output).to.match(/---\nlayout: post\ndate: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+\d{4}\n---\n\nThis is the content 😄 without a title\./);
    });

    it('should create post content with title', function() {
      var callback = function() { }
      var event = fs.readFileSync('test/fixtures/events/titled-note-event.json', 'utf-8');
      var output = myLambda.createPost(JSON.parse(event), callback);
      expect(output).to.match(/---\nlayout: post\ntitle: "This is the über 😄 title"\ndate: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+\d{4}\n---\n\nThis is the content 😄/);
    });

    it('should create post content with image', function() {
      var callback = function() { }
      var event = fs.readFileSync('test/fixtures/events/instagram-event.json', 'utf-8');
      var output = myLambda.createPost(JSON.parse(event), callback, 'instagram-img.jpg');
      expect(output).to.match(/---\nlayout: post\ndate: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+\d{4}\n---\n\n!\[\]\(\/media\/instagram-img\.jpg\){:class="instagram"}\n\nThis is the content 😄/);
    });
  });

  // I don't work yet cos I don't know what I'm doing
  describe.skip('getImg()', function() {
    beforeEach(function() {
      var data = fs.readFileSync('test/fixtures/instagram-img.jpg');
      simple.mock(myLambda, 'request').returnWith(data);
    });
    it('should get image from instagram', function() {
      var callback = function() { }
      var event = fs.readFileSync('test/fixtures/events/instagram-event.json', 'utf-8');
      var output = myLambda.getImg(event, callback);
      console.log(output);
      expect(output).to.equal('foo');
    });
  });

  // I don't work yet cos I don't know what I'm doing
  describe.skip('uploadImg()', function() {
    beforeEach(function() {
      var data = fs.readFileSync('test/fixtures/instagram-img.jpg');
      simple.mock(github.repos, 'createFile').returnWith('{"status": 200}');
    });
    it('should upload image to GitHub', function() {
      var callback = function() { }
      var event = fs.readFileSync('test/fixtures/events/instagram-event.json', 'utf-8');
      var res = myLambda.uploadImg(data, 'instagram-img.jpg', event, callback);
      console.log(res);
    });

  });



});

/* This tests the whole lambda function which is hard and not what we need.
describe('Post to GitHub', function() {
  [
    {
      "type": "note",
      "repo": "lildude.github.io",
      "APIKey": "123e4567-e89b-12d3-a456-426655440000",
      "content": "# This is the über 😄 title\nThis is the content 😄"
    }
  ].forEach(function(event) {
    it('successfully creates a post', function(done) {
      var context = {
        succeed: function(result) {
          expect(result.valid).to.be.true;
          done();
        },
        fail: function() {
          done(new Error('nope'));
        }
      }
      myLambda.handler(event, context);
    });
  });
});
*/

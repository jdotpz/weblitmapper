var util = require('util');
var Writable = require('stream').Writable;
var _ = require('underscore');
var url = require('url');
var querystring = require('querystring');
var MakeStream = require('./lib/make-stream');

// http://stackoverflow.com/a/13885228
function isFullyVisible (elem) {
  elem = $(elem);
  var off = elem.offset();
  var et = off.top;
  var el = off.left;
  var eh = elem.height();
  var ew = elem.width();
  var wh = window.innerHeight;
  var ww = window.innerWidth;
  var wx = window.pageXOffset;
  var wy = window.pageYOffset;
  return (et >= wy && el >= wx && et + eh <= wh + wy && el + ew <= ww + wx);
}

function normalizeMake(make) {
  var parsedURL = url.parse(make.url);

  make.avatarURL = 'http://www.gravatar.com/avatar/' + make.emailHash +
                   '?' + querystring.stringify({
                     d: 'https://stuff.webmaker.org/avatars/' +
                        'webmaker-avatar-44x44.png'
                   });
  make.profileURL = CONFIG.WEBMAKER_URL + '/u/' + make.username;
  make.updateURL = '/update?' + querystring.stringify({
    url: make.url
  });
  make.urlSimplified = parsedURL.hostname +
                       (parsedURL.pathname == '/' ? '' : parsedURL.pathname);

  return make;
}

function InfiniteScrollStream(el) {
  Writable.call(this, {objectMode: true, highWaterMark: 10});
  this._mostRecentItem = this._onVisibleCallback = null;
  this.onViewChanged = this._onViewChanged.bind(this);
  this.el = $(el)[0];
  this.msnry = new Masonry(this.el, {
    transitionDuration: 0
  });
  this.msnry.on('layoutComplete', this.onViewChanged);
}

util.inherits(InfiniteScrollStream, Writable);

InfiniteScrollStream.prototype._write = function(make, encoding, cb) {
  var html = env.render('./template/browser/make-item.html', {
    make: normalizeMake(make)
  });
  var item = $('<div></div>').html(html).find('.make-item')[0];
  this._mostRecentItem = item;
  this._onVisibleCallback = cb;
  this.el.appendChild(item);
  this.msnry.appended(item);
  this.msnry.layout();
};

InfiniteScrollStream.prototype._onViewChanged = function() {
  if (!this._mostRecentItem) return;
  if (isFullyVisible(this._mostRecentItem)) {
    var cb = this._onVisibleCallback;
    this._mostRecentItem = this._onVisibleCallback = null;
    cb();
  }
};

var env = new nunjucks.Environment(new nunjucks.WebLoader(), {
  autoescape: true
});

var makeapi = new Make({
  apiURL: CONFIG.MAKEAPI_URL
});
var makeStream = new MakeStream(makeapi, {
  tagPrefix: CONFIG.WEBLIT_TAG_PREFIX,
  sortByField: 'createdAt'
});
var output = new InfiniteScrollStream($(".make-gallery"));

$(window).load(function() {
  makeStream.pipe(output);
}).on('scroll resize', output.onViewChanged);

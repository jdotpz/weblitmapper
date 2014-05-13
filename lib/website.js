var url = require('url');

var MakeForm = require('./make-form');
var weblitmap = require('./weblitmap');
var bookmarklet = require('./bookmarklet');
var settings = require('./public-settings');
var WeblitResource = require('./model/weblit-resource');

var WEBMAKER_URL = settings.WEBMAKER_URL;
var WEBMAKER_DOMAIN = url.parse(WEBMAKER_URL).hostname;

function getMake(req, res, next) {
  var url = req.query.url || req.body.url;
  req.make = null;
  if (!url) return next();

  WeblitResource.findOne({url: url}, function(err, make) {
    if (err) return next(err);
    req.make = make;
    next();
  });
}

function likeOperation(method) {
  return function(req, res, next) {
    WeblitResource.findOne({
      _id: req.params.id
    }, function(err, resource) {
      if (err) return next(err);
      if (!resource) return res.send(400);
      resource[method](req.session.username, '', req.session.emailHash);
      resource.save(function(err) {
        if (err) return next(err);
        return res.send(method + ' successful');
      });
    });
  };
}

function needsLogin(req, res, next) {
  if (req.session.username) return next();
  return next(401);
}

exports.WEBMAKER_URL = WEBMAKER_URL;
exports.WEBMAKER_DOMAIN = WEBMAKER_DOMAIN;

exports.express = function(app, options) {
  app.locals.WEBMAKER_URL = WEBMAKER_URL;
  app.locals.WEBMAKER_DOMAIN = WEBMAKER_DOMAIN;

  app.get('/', function(req, res, next) {
    return res.render('index.html', {
      bookmarklet: new res.render.SafeString(bookmarklet(options.origin)),
      filter: req.query.filter,
      tags: weblitmap.strandAndCompetencyTags
    });
  });

  app.get('/stats.json', function(req, res, next) {
    WeblitResource.getStats(function(err, stats) {
      if (err) return next(err);
      return res.type('application/json').send(stats);
    });
  });

  app.get('/json', function(req, res, next) {
    var PAGE_SIZE = 10;
    var page = parseInt(req.query.p);
    var query = req.query.q || '';

    if (!/^[0-9]+$/.test(req.query.p) || page == 0)
      return res.send(400);

    res.type('application/json');
    WeblitResource.findFromStringQuery(query, {
      page: page,
      pageSize: PAGE_SIZE
    }, function(err, resources) {
      res.send(resources.map(function(r) {
        return r.toPublicJSON();
      }));
    });
  });

  // TODO: Consider removing :id from here and just expecting the
  // URL to be passed in the POST body. That way we can just reuse
  // our getMake middleware.
  app.post('/:id/like', needsLogin, likeOperation('like'));
  app.post('/:id/unlike', needsLogin, likeOperation('unlike'));

  app.post('/update', needsLogin, getMake, function(req, res, next) {
    var form = new MakeForm(req.body);
    var errors = form.validate();

    errors.forEach(function(error) { req.flash('danger', error); });

    if (errors.length)
      return res.redirect('back');

    form.createOrUpdate({
      make: req.make,
      username: req.session.username,
      emailHash: req.session.emailHash
    }, function(err) {
      if (err) return next(err);
      req.flash('success', 'Submission successful. Thanks!');
      if (req.param('bookmarklet') === 'true') return res.redirect('/close');
      return res.redirect('/');
    });
  });

  app.get('/update', getMake, function(req, res, next) {
    if (!req.query.url)
      return res.redirect('/');
    if (!req.session.username)
      req.flash('warning', 'Please login before submitting this form.');
    var form = new MakeForm(req.query);

    if (req.make) form.loadFrom(req.make);

    return res.render('update.html', {
      weblitmap: weblitmap,
      isUpdate: !!req.make,
      entry: form
    });
  });

  app.get('/close', function(req, res, next) {
    return res.render('close.html');
  });
};

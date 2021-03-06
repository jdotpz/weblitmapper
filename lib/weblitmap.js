var _ = require('underscore');

var rows = require('./weblitmap.json').slice(1);

var strands = exports.strands = [];
var tags = exports.tags = {};
var lowercaseTags = {};

var currentStrand, currentCompetency;

// https://github.com/k88hudson/explore/blob/master/app/scripts/app.js
var EXPLORE_COMPETENCIES = [{
  name: 'Navigation',
  colour: '#ff4e1f',
  description: 'Using software tools to browse the web'
}, {
  name: 'Web Mechanics',
  colour: '#ff6969',
  description: 'Understanding the web ecosystem'
}, {
  name: 'Search',
  colour: '#fe4040',
  description: 'Locating information, people and resources via the web'
}, {
  name: 'Credibility',
  colour: '#ff5984',
  description: 'Critically evaluating information found on the web'
}, {
  name: 'Security',
  colour: '#ff004e',
  description: 'Keeping systems, identities, and content safe'
}, {
  name: 'Composing for the web',
  colour: '#01bc85',
  description: 'Creating and curating content for the web'
}, {
  name: 'Remixing',
  colour: '#00ceb8',
  description: 'Modifying existing web resources to create something new'
}, {
  name: 'Design & Accessibility',
  colour: '#6ecba9',
  description: 'Creating universally effective communications through web resources'
}, {
  name: 'Coding/scripting',
  colour: '#00967f',
  description: 'Creating interactive experiences on the web'
}, {
  name: 'Infrastructure',
  colour: '#09b773',
  description: 'Understanding the Internet stack'
}, {
  name: 'Sharing',
  colour: '#739ab1',
  description: 'Providing access to web resources'
}, {
  name: 'Collaborating',
  colour: '#739ab1',
  description: 'Creating web resources with others'
}, {
  name: 'Community Participation',
  colour: '#63cfea',
  description: 'Getting involved in web communities and understanding their practices'
}, {
  name: 'Privacy',
  colour: '#00bad6',
  description: 'Examining the consequences of sharing data online'
}, {
  name: 'Open Practices',
  colour: '#0097d6',
  description: 'Helping to keep the web democratic and universally accessible'
}];

function tagWithParents(prefix, tag, deps) {
  var thing = lowercaseTags[tag.toLowerCase()];

  if (!Array.isArray(deps)) deps = [];

  deps.push(prefix + thing.tag);

  if (thing.type == 'skill')
    return tagWithParents(prefix, thing.competency.tag, deps);
  if (thing.type == 'competency')
    return tagWithParents(prefix, thing.strand.tag, deps);
  return _.flatten(deps);
}

rows.forEach(function(row, i) {
  var strand = row[0];
  var competency = row[1];
  var skill = row[2];
  var tag = row[3].slice(1);

  if (!tag) {
    if (!currentStrand || !currentCompetency)
      throw new Error('Expected tag name for row ' + i);
    tag = [currentStrand.tag, currentCompetency.tag,
           'Skill' + i].join('-');
  }

  if (strand) {
    currentStrand = {
      type: 'strand',
      name: strand,
      competencies: [],
      tag: tag
    };
    strands.push(currentStrand);
    tags[tag] = currentStrand;
  } else if (competency) {
    currentCompetency = {
      type: 'competency',
      name: competency,
      strand: currentStrand,
      skills: [],
      tag: tag
    };
    EXPLORE_COMPETENCIES.forEach(function(c) {
      if (c.name.toLowerCase() == competency.toLowerCase())
        _.extend(currentCompetency, _.pick(c, 'colour', 'description'));
    });
    currentStrand.competencies.push(currentCompetency);
    tags[tag] = currentCompetency;
  } else if (skill) {
    tags[tag] = {
      type: 'skill',
      competency: currentCompetency,
      name: skill,
      tag: tag
    };
    currentCompetency.skills.push(tags[tag]);
  }
});

Object.keys(tags).forEach(function(tag) {
  lowercaseTags[tag.toLowerCase()] = tags[tag];
});

exports.normalizeTags = normalizeTags = function(tagList, prefix) {
  prefix = prefix || '';
  var regexp = new RegExp('^' + prefix + '(.+)$');
  return _.uniq(_.flatten(tagList
    .filter(function isTagValid(tag) {
      var match = tag.match(regexp);
      if (!match) return false;
      return match[1].toLowerCase() in lowercaseTags;
    })
    .map(function(tag) { return tag.match(regexp)[1]; })
    .map(tagWithParents.bind(null, prefix))));
};

exports.strandAndCompetencyTags = _.values(tags).filter(function(cat) {
  return (cat.type == 'strand' || cat.type == 'competency');
}).map(function(cat) { return cat.tag; });

var debug = require('debug')('swis-reflector');
var debugerror = require('debug')('swis-reflector:ERROR');
debugerror.log = console.warn.bind(console);

var fs = require('fs');
var jquery = require('jquery');
var lodash = require('lodash');

var Agent = require('./lib/Agent');
var notifications = require('./lib/notifications');

var settings = require('./settings.json');

require('jquery-ui/core');
require('jquery-ui/widget');
require('jquery-meteor-blaze')(jquery, lodash);
require('./build')(jquery);

// Single Agent instance
var agent = null;

jquery(document).ready(function()
{
	insertReflector()
});

function insertReflector()
{
	debug('insertReflector()');

	agent = new Agent(settings);
}

var debug = require('debug')('swis-reflector');
var debugerror = require('debug')('swis-reflector:ERROR');
debugerror.log = console.warn.bind(console);

var fs = require('fs');
var jquery = require('jquery');
var lodash = require('lodash');
var rtcninja = require('rtcninja');

var blazeHelpers = require('./lib/blazeHelpers');
var Agent = require('./lib/Agent');
var notifications = require('./lib/notifications');

require('jquery-ui/core');
require('jquery-ui/widget');
require('jquery-meteor-blaze')(jquery, lodash);
require('./build')(jquery);

// Load Blaze helpers
blazeHelpers();

// Single Agent instance
var agent = null;

jquery(document).ready(function()
{
	if (checkBrowserSupported())
	{
		runAgent();
	}
});

function checkBrowserSupported()
{
	debug('checkBrowserSupported()');

	// Load rtcninja
	rtcninja();

	if (rtcninja.hasWebRTC())
	{
		return true;
	}
	else
	{
		notifications.warning('WebRTC not supported');

		return false;
	}
}

function runAgent()
{
	debug('runAgent()');

	agent = new Agent();
}

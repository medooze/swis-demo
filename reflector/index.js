var debug = require('debug')('swis-reflector');
var debugerror = require('debug')('swis-reflector:ERROR');
debugerror.log = console.warn.bind(console);

var fs = require('fs');
var jquery = require('jquery');
var lodash = require('lodash');
var rtcninja = require('rtcninja');

var Agent = require('./lib/Agent');
var notifications = require('./lib/notifications');

require('jquery-ui/core');
require('jquery-ui/widget');
require('jquery-meteor-blaze')(jquery, lodash);
require('./build')(jquery);

// Single Agent instance
var agent = null;
// View widget
var viewWidget = null;

jquery(document).ready(function()
{
	if (checkBrowserSupported())
	{
		insertView();
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

function insertView()
{
	debug('insertView()');

	viewWidget = jquery(document.body)
		.View()
		.data('swis-View');
}

function runAgent()
{
	debug('runAgent()');

	agent = new Agent(viewWidget);
}

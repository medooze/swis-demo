var debug = require('debug')('swis-widget');
var debugerror = require('debug')('swis-widget:ERROR');
debugerror.log = console.warn.bind(console);

var fs = require('fs');
var jquery = require('jquery');
var lodash = require('lodash');
var rtcninja = require('rtcninja');

var Client = require('./lib/Client');
var notifications = require('./lib/notifications');

var settings = require('./settings.json');

require('jquery-ui/core');
require('jquery-ui/widget');
require('jquery-meteor-blaze')(jquery, lodash);
require('./build')(jquery);

// Single Client instance
var client = null;

jquery(document).ready(function()
{
	if (checkBrowserSupported())
	{
		insertCSS();
		insertButton();
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

function insertCSS()
{
	debug('insertCSS()');

	var css = fs.readFileSync('./dist/swis-widget.css', 'utf8');
	var tag = document.createElement('style');
	var content = document.createTextNode(css);

	tag.id = 'swis-css';
	tag.appendChild(content);

	document.body.appendChild(tag);
}

function insertButton()
{
	debug('insertButton()');

	var tag = document.createElement('div');

	tag.dataset.id = 'swis-button-container';
	document.body.appendChild(tag);

	var buttonWidget = jquery(tag)
		.Button()
		.on('button:start', function()
		{
			debug('"button:start" event');

			buttonWidget.setRunning(true);

			client = new Client(settings);

			client.on('close', function()
			{
				buttonWidget.setRunning(false);
			});
		})
		.on('button:stop', function()
		{
			debug('"button:stop" event');

			client.close();
		})
		.data('swis-Button');
}

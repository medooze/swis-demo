var debug = require('debug')('swis-widget');
var debugerror = require('debug')('swis-widget:ERROR');
debugerror.log = console.warn.bind(console);

var fs = require('fs');
var jquery = require('jquery');
var lodash = require('lodash');
var rtcninja = require('rtcninja');

var Client = require('./lib/Client');
var settings = require('./lib/settings');
var notifications = require('./lib/notifications');

require('jquery-ui/core');
require('jquery-ui/widget');
require('jquery-meteor-blaze')(jquery, lodash);
require('./build')(jquery);

// Single Client instance
var client = null;
// Button widget
var buttonWidget = null;

jquery(document).ready(function()
{
	// Load rtcninja
	rtcninja();

	if (!rtcninja.hasWebRTC())
	{
		notifications.info('WebRTC not supported, will use WebSocket');

		Client.setNoWebRTC();
	}

	// Insert Button HTML and CSS
	insertCSS();
	insertButton();
});

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

	buttonWidget = jquery(tag)
		.Button()
		.on('button:start', function()
		{
			debug('"button:start" event');

			if (settings.remote.username)
				runClient();
			else
				buttonWidget.showInput();
		})
		.on('button:stop', function()
		{
			debug('"button:stop" event');

			stopClient();
		})
		.on('button:code', function(event, data)
		{
			debug('"button:code" event [data:%o]', data);

			settings.setRemoteUsername(data.code);

			runClient();
		})
		.data('swis-Button');
}

function runClient()
{
	debug('runClient()');

	buttonWidget.hideInput();
	buttonWidget.setRunning(true);

	client = new Client({ webrtcSupported: rtcninja.hasWebRTC() });

	client.on('close', function()
	{
		buttonWidget.setRunning(false);
	});
}

function stopClient()
{
	debug('stopClient()');

	client.close();
}

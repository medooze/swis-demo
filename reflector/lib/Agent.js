var debug = require('debug')('swis-reflector:Agent');
var debugerror = require('debug')('swis-reflector:ERROR:Agent');
debugerror.log = console.warn.bind(console);

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var protooClient = require('protoo-client');
var rtcninja = require('rtcninja');
var swis = require('swis');

var notifications = require('./notifications');

function Agent(settings)
{
	debug('new() [settings:%o]', settings);

	// Inherit from EventEmitter
	EventEmitter.call(this);

	var self = this;
	var url = settings.protooUrl + '?username=' + settings.local.username + '&uuid=' + settings.local.uuid;

	// Closed flag
	this._closed = false;

	// Whether we are in an ongoing session
	this._inSession = false;

	// protoo client
	this._protoo = protooClient({ url : url });

	this._protoo.on('connecting', function(reattempt)
	{
		if (reattempt === 0)
			notifications.info('protoo connecting...');
		else
			notifications.info('protoo reconnecting...');
	});

	this._protoo.on('online', function(reattempt)
	{
		notifications.success('protoo connected');
	});

	this._protoo.on('offline', function()
	{
		notifications.error('protoo disconnected');
	});

	this._protoo.on('session', function(session, req)
	{
		notifications.success('protoo session requested...');

		self._handleSession(session, req);
	});

	// protoo Session
	this._session = null;

	// swis Observer
	this._observer = null;
}

// Inherits from EventEmitter
inherits(Agent, EventEmitter);

Agent.prototype._handleSession = function(session, req)
{
	debug('_handleSession()');

	var self = this;

	if (this._inSession)
	{
		req.reply(486);

		return;
	}

	this._inSession = true;

	session.on('open', function()
	{
		notifications.success('protoo session established');
	});

	session.on('close', function()
	{
		notifications.info('protoo session closed');

		self._inSession = false;
	});

	req.reply(200);
};

module.exports = Agent;

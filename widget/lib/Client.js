var debug = require('debug')('swis-widget:Client');
var debugerror = require('debug')('swis-widget:ERROR:Client');
debugerror.log = console.warn.bind(console);

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var protooClient = require('protoo-client');
var rtcninja = require('rtcninja');
var swis = require('swis');
var randomString = require('random-string');

var notifications = require('./notifications');

function Client(settings)
{
	debug('new() [settings:%o]', settings);

	// Inherit from EventEmitter
	EventEmitter.call(this);

	var self = this;
	var url = settings.protooUrl + '?username=' + settings.local.username + '&uuid=' + randomString({ length: 6 });

	// Store settings
	this._settings = settings;

	// Closed flag
	this._closed = false;

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

		self._invite();
	});

	this._protoo.on('offline', function()
	{
		notifications.error('protoo disconnected');

		self.close();
	});

	// PeerConnection instance
	this._pc = null;

	// DataChannel instance
	this._datachannel = null;

	// protoo Session
	this._session = null;

	// swis Observer
	this._observer = null;
}

// Inherits from EventEmitter
inherits(Client, EventEmitter);

Client.prototype.close = function()
{
	debug('close()');

	if (this._closed)
		return;

	this._closed = true;

	// End ongoing session
	if (this._session)
		this._session.send('end');

	// Close Protoo client
	if (this._protoo.state !== 'offline')
		this._protoo.close();

	this.emit('close');
};

Client.prototype._invite = function()
{
	debug('_invite()');

	var self = this;
	var path = '/users/' + this._settings.remote.username + '/' + this._settings.remote.uuid;

	this._pc = new rtcninja.RTCPeerConnection()

	this._session = this._protoo.session(path, function(res, error)
	{
		if (res && res.isProvisional)
		{
			notifications.info('protoo session connecting...');
		}
		else if (res && res.isAccept)
		{
			notifications.success('protoo session established');

			// TODO: uncomment
			// self._swis();
		}
		else if (res && res.isReject)
		{
			notifications.warning('protoo session rejected: ' + res.status + ' ' + res.reason);
		}
		else if (error)
		{
			notifications.error('protoo session error: ' + error.toString());
		}
	});

	this._session.on('close', function()
	{
		notifications.info('protoo session closed');

		self._session = null;
		self.close();
	});
};

Client.prototype._swis = function()
{
	debug('_swis()');

	var self = this;
	var swisInterface =
	{
		send      : function(data)
		{
			console.warn('------------------ send() [data:%o]', data);

			self._session.send('swis', data);
		},

		// onmessage :
	}

	this._observer = new swis.Observer

};

module.exports = Client;

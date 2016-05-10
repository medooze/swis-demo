var debug = require('debug')('swis-widget:Client');
var debugerror = require('debug')('swis-widget:ERROR:Client');
debugerror.log = console.warn.bind(console);

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var protooClient = require('protoo-client');
var rtcninja = require('rtcninja');
var swis = require('swis');

var settings = require('./settings');
var notifications = require('./notifications');

function Client()
{
	debug('new() [settings:%o]', settings);

	// Inherit from EventEmitter
	EventEmitter.call(this);

	var self = this;
	var url = settings.protooUrl + '?username=' + settings.local.username + '&uuid=' + settings.local.uuid;

	// Closed flag
	this._closed = false;

	// protoo client
	this._protoo = protooClient({ url : url });

	this._protoo.on('connecting', function(reattempt)
	{
		if (reattempt > 0)
			notifications.info('reconnecting to the server...');
	});

	this._protoo.on('online', function(reattempt)
	{
		debug('online');

		self._invite();
	});

	this._protoo.on('offline', function()
	{
		notifications.error('server connection closed');

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

	// Close swis
	if (this._observer)
		this._observer.stop();

	// Close PeerConnection
	if (this._pc && this._pc.signalingState !== 'closed')
		this._pc.close();

	// End ongoing session
	if (this._session)
	{
		try { this._session.send('end'); } catch (error) {}
		this._session = null;
	}

	// Close Protoo client
	this._protoo.close();

	this.emit('close');
};

Client.prototype._invite = function()
{
	debug('_invite()');

	var self = this;
	var protooPath = '/users/' + settings.remote.username + '/' + settings.remote.uuid;

	this._pc = new rtcninja.RTCPeerConnection(
		{
			iceServers       : settings.iceServers,
			gatheringTimeout : 2000
		});

	this._pc.oniceconnectionstatechange = function(event)
	{
		if (self._pc.iceConnectionState === 'connected' ||
				self._pc.iceConnectionState === 'completed')
		{
			self._pc.oniceconnectionstatechange = null;

			debug('ICE connected');
		}
	};

	this._datachannel = this._pc.createDataChannel('swis',
		{
			protocol   : 'swis',
			negotiated : true,
			id         : 666
		});

	this._datachannel.binaryType = 'arraybuffer';

	this._datachannel.onopen = function()
	{
		debug('datachannel open');

		self._runSwisObserver();
	};

	this._pc.createOffer(
		function(desc)
		{
			self._pc.setLocalDescription(desc,
				function() {},
				function(error)
				{
					notifications.error('setLocalDescription() failed: ' + error.toString());

					self.close();
				});
		},
		function(error)
		{
			notifications.error('createOffer() failed: ' + error.toString());

			self.close();
		});

	this._pc.onicecandidate = function(event)
	{
		if (!event.candidate)
		{
			self._pc.onicecandidate = null;
			createSession();
		}
	};

	function createSession()
	{
		self._session = self._protoo.session(protooPath,
			{
				offer : self._pc.localDescription.sdp
			},
			function(res, error)
			{
				if (res && res.isProvisional)
				{
					notifications.info('waiting for remote peer to join...');
				}
				else if (res && res.isAccept)
				{
					debug('session established');

					self._pc.setRemoteDescription(
						new rtcninja.RTCSessionDescription(
							{
								type : 'answer',
								sdp  : res.data.answer
							}),
							function()
							{
								notifications.info('establishing channel...');
							},
							function(error)
							{
								notifications.error('setRemoteDescription() failed: ' + error.toString());

								self._session.send('end');
							});
				}
				else if (res && res.isReject)
				{
					notifications.warning('session rejected: ' + res.status + ' ' + res.reason);
				}
				else if (error)
				{
					notifications.error('session error: ' + error.toString());
				}
			});

		self._session.on('close', function()
		{
			notifications.info('session ended');

			self._session = null;
			self.close();
		});
	}
};

Client.prototype._runSwisObserver = function()
{
	debug('_runSwisObserver()');

	var excluded = '#swis-css,[data-id="swis-button-container"]';

	this._observer = new swis.Observer(this._datachannel,
		{
			blob  : false,
			chunk : 16000
		});

	this._observer.observe(excluded);

	notifications.success('swis running');
};

module.exports = Client;

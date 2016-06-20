var debug = require('debug')('swis-widget:Client');
var debugerror = require('debug')('swis-widget:ERROR:Client');
debugerror.log = console.warn.bind(console);

var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var protooClient = require('protoo-client');
var rtcninja = require('rtcninja');
var swis = require('swis');
var randomString = require('random-string');

var settings = require('./settings');
var notifications = require('./notifications');

var webrtcSuported = true;

function Client(options)
{
	debug('new() [options:%o, settings:%o]', options, settings);

	// Inherit from EventEmitter
	EventEmitter.call(this);

	var self = this;
	var url = settings.protooUrl + '?username=' + settings.local.username + '&uuid=' + settings.local.uuid;

	this._options = options || {};

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

		if (webrtcSuported)
			self._inviteWithDataChannel();
		else
			self._inviteWithWebSocket();
	});

	this._protoo.on('offline', function()
	{
		notifications.error('server connection closed');

		self.close();
	});

	// PeerConnection instance
	this._pc = null;

	// swis DataChannel/WebSocket instance
	this._channel = null;

	// protoo Session
	this._session = null;

	// swis Observer
	this._observer = null;
}

Client.setNoWebRTC = function()
{
	debug('setNoWebRTC()');

	webrtcSuported = false;
};

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

	// Remove remote cursor container (so also the cursor)
	if (this._remoteCursor)
		document.body.removeChild(this._remoteCursor.parentElement);

	// Close PeerConnection
	if (this._pc && this._pc.signalingState !== 'closed')
		this._pc.close();

	// Close channel
	if (this._channel)
		try { this._channel.close(); } catch (error) {}

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

Client.prototype._inviteWithDataChannel = function()
{
	debug('_inviteWithDataChannel()');

	var self = this;
	var protooPath = '/users/' + settings.remote.username + '/' + settings.remote.uuid;

	this._pc = new rtcninja.RTCPeerConnection(
		{
			iceServers       : settings.iceServers,
			gatheringTimeout : 2000
		});

	var pc = this._pc;

	this._pc.oniceconnectionstatechange = function(event)
	{
		if (pc.iceConnectionState === 'connected' ||
				pc.iceConnectionState === 'completed')
		{
			pc.oniceconnectionstatechange = null;

			debug('ICE connected');
		}
	};

	this._channel = this._pc.createDataChannel('swis',
		{
			protocol   : 'swis',
			negotiated : true,
			id         : 666
		});

	this._channel.binaryType = 'arraybuffer';

	this._channel.onopen = function()
	{
		debug('channel open');

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

Client.prototype._inviteWithWebSocket = function()
{
	debug('_inviteWithWebSocket()');

	var self = this;
	var protooPath = '/users/' + settings.remote.username + '/' + settings.remote.uuid;
	var swisWsRoomId = randomString({ length: 8 }).toLowerCase();

	this._channel = new WebSocket(settings.swisWsUrl + swisWsRoomId, 'swis');

	this._channel.binaryType = 'arraybuffer';

	this._channel.onopen = function()
	{
		debug('channel open');

		self._runSwisObserver();
	};

	createSession();

	function createSession()
	{
		self._session = self._protoo.session(protooPath,
			{
				swisWsRoomId : webrtcSuported ? null : swisWsRoomId
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

					notifications.info('establishing channel...');
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

	var self = this;
	var excluded = '#swis-css,[data-id="swis-button-container"],#swis-widget-toast-container,div.swis-remote-cursor';

	this._observer = new swis.Observer(this._channel,
		{
			blob  : false,
			chunk : 16000
		});

	this._observer.observe(excluded);

	this._observer.on('remotecursormove', function(data)
	{
		if (!self._remoteCursor)
		{
			var remoteCursorContainer = document.createElement('div');

			remoteCursorContainer.classList.add('swis-remote-cursor-container');
			self._remoteCursor = document.createElement('div');
			self._remoteCursor.classList.add('swis-remote-cursor');
			remoteCursorContainer.appendChild(self._remoteCursor);

			document.body.appendChild(remoteCursorContainer);
		}

		updateRemoteCursor(data.x, data.y);
	});

	function updateRemoteCursor(x, y)
	{
		if (!self._remoteCursor || x === undefined)
			return;

		self._remoteCursor.style.left = x - document.body.scrollLeft + 'px';
		self._remoteCursor.style.top = y - document.body.scrollTop + 'px';
	}

	notifications.success('swis running');
};

module.exports = Client;

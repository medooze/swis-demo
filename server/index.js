#!/usr/bin/env node

process.title = 'swis-signaling-server';
process.env.DEBUG = 'protoo* swis* *ERROR*';

var debug = require('debug')('swis');
var debugerror = require('debug')('swis:ERROR');

var protoo = require('protoo');
var http = require('http');
var fs = require('fs');
var url = require('url');

const LISTEN_IP = '0.0.0.0';
const LISTEN_PORT = 8086;

// Add custom 'swis' message to protoo
protoo.addMethod('swis');

// protoo app
var app = protoo();

// Node-WebSocket server options
var wsOptions =
{
	maxReceivedFrameSize     : 960000,  // 960 KBytes
	maxReceivedMessageSize   : 960000,
	fragmentOutgoingMessages : true,
	fragmentationThreshold   : 960000
};

// HTTP server

var httpServer = http.createServer(function(req, res)
{
	debugerror('rejecting common HTTP request');

	res.writeHead(404, 'Not Here');
	res.end();
});

httpServer.listen(LISTEN_PORT, LISTEN_IP);

// Handle WebSocket connections
app.websocket(httpServer, wsOptions, function(info, accept, reject)
{
	// Let the client indicate username and uuid in the URL query
	var u = url.parse(info.req.url, true);
	var username = u.query.username;
	var uuid = u.query.uuid;

	if (username && uuid)
	{
		debug('accepting WebSocket connection [username:%s, uuid:%s, ip:%s, port:%d]',
			username, uuid, info.socket.remoteAddress, info.socket.remotePort);

		accept(username, uuid, null);
	}
	else
	{
		debugerror('rejecting WebSocket connection due to missing username/uuid');

		reject();
	}
});

// Handle new peers
app.on('online', function(peer)
{
	debug('new peer: %s', peer);
});

// Handle disconnected peers
app.on('offline', function(peer)
{
	debug('peer offline: %s', peer);
});

// Handle sessions at /users/:username/:uuid
app.use('/users', protoo.middleware.sessionHandler(app,
	{
		path      : '/:username/:uuid',
		onsession : function(session, req)
		{
			var caller = session.peerA;
			var callee = session.peerB;

			debug('new session: [caller:%s, callee:%s]', caller, callee);

			session.on('progress', function()
			{
				debug('session "progress" event');
			});

			session.on('open', function()
			{
				debug('session "open" event');
			});

			session.on('close', function()
			{
				debug('session "close" event');
			});
		}
	}));

#!/usr/bin/env node

'use strict';

process.title = 'node-swis-server';
process.env.DEBUG = '*node-swis-server* *ERROR*';

const debug = require('debug')('node-swis-server');
const debugerror = require('debug')('node-swis-server:ERROR');

const protoo = require('protoo');
const http = require('http');
const fs = require('fs');
const url = require('url');

const SwisWebSocketServer = require('./lib/SwisWebSocketServer');

const LISTEN_IP = '0.0.0.0';
const LISTEN_PORT = 8086;
// Node-WebSocket server options
const WS_OPTIONS =
{
	maxReceivedFrameSize     : 960000,  // 960 KBytes
	maxReceivedMessageSize   : 960000,
	fragmentOutgoingMessages : true,
	fragmentationThreshold   : 960000
};

// Add custom 'swis' message to protoo
protoo.addMethod('swis');

// protoo app
let app = protoo();

// HTTP server

const httpServer = http.createServer(function(req, res)
{
	debugerror('rejecting common HTTP request');

	res.writeHead(404, 'Not Here');
	res.end();
});

httpServer.listen(LISTEN_PORT, LISTEN_IP);

// Handle WebSocket connections
app.websocket(httpServer, WS_OPTIONS, function(info, accept, reject)
{
	// Let the client indicate username and uuid in the URL query
	let u = url.parse(info.req.url, true);
	let username = u.query.username;
	let uuid = u.query.uuid;

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
			let caller = session.peerA;
			let callee = session.peerB;

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

// Run a swis WebSocket server
let swisWebSocketServer = new SwisWebSocketServer(
	{
		ip       : '0.0.0.0',
		port     : 8088,
		peerWait : 30
	});

// Dump WebSocket server periodically
// setInterval(() =>
// {
// 	swisWebSocketServer.dump();
// }, 1000 * 60 *2);

process.on('exit', function(code)
{
	if (code)
		debugerror('error exit [code:%s]', code);
	else
		debugerror('normal exit [code:%s]', code);
});

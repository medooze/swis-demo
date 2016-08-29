'use strict';

const debug = require('debug')('node-swis-server:SwisWebSocketServer');
const debugerror = require('debug')('node-swis-server:ERROR:SwisWebSocketServer');

const http = require('http');
const websocket = require('websocket');

const Room = require('./SwisWebSocketRoom');

const REGEXP_PATH = new RegExp(/^\/.*\/([a-zA-Z0-9]{6,20})$/);

class SwisWebSocketServer
{
	constructor(options)
	{
		debug('constructor() [options:%o]', options);

		this._options = options;

		let httpServer = http.createServer();

		httpServer.listen(options.port, options.ip, 4096);
		httpServer.on('listening', () =>
		{
			debug('server listening [ip:"%s", port:%s]', options.ip, options.port);
		});

		// Map of rooms indexed by roomId
		this._rooms = new Map();

		// Run a websocket.Server instance
		this._wsServer = new websocket.server(
		{
			httpServer          : httpServer,
			closeTimeout        : 2000,
			ignoreXForwardedFor : false
		});

		// WebSocket server events
		this._wsServer.on('request', (request) =>
		{
			this.onRequest(request);
		});
	}

	dump()
	{
		debug('dump: %d rooms', this._rooms.size);

		for (let room of this._rooms.values())
		{
			room.dump();
		}
	}

	onRequest(request)
	{
		debug('onRequest() [path:%s | origin:%s | ip:%s]',
			request.resource, request.origin, request.remoteAddress);

		// Validate WS subprotocol
		// Validate WebSocket sub-protocol
		if (request.requestedProtocols.indexOf('swis') === -1)
		{
			debugerror('onRequest() | invalid WebSocket subprotocol');

			request.reject(500, 'Invalid WebSocket Sub-Protocol');
			return;
		}

		// Validate path
		let res = REGEXP_PATH.exec(request.resource);

		if (!res)
		{
			debugerror('onRequest() | invalid path: %s', request.resource);

			request.reject(500, 'Invalid Path');
			return;
		}

		// Get roomId
		let roomId = res[1];

		// Search for an existing room
		let room = this._rooms.get(roomId);

		// Room does not exist, create a new one
		if (!room)
		{
			debug('onRequest() | new room #%s', roomId);

			room = new Room(roomId, this._options.peerWait,
			{
				close: () =>
				{
					this._rooms.delete(roomId);
				}
			});

			// Store the room in the map
			this._rooms.set(roomId, room);

			// Insert the pending request into the new room
			room.handleRequest(request);

			return;
		}
		// Room already exists
		else
		{
			room.handleRequest(request);
		}
	}
}

module.exports = SwisWebSocketServer;

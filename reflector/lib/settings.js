var randomString = require('random-string');

var settings =
{
	iceServers :
	[
		{ url: 'turn:turn.ef2f.com:3478?transport=udp', username: 'turn', credential: 'ef2f' },
		{ url: 'turn:turn.ef2f.com:3478?transport=tcp', username: 'turn', credential: 'ef2f' },
		{ url: 'turns:turn.ef2f.com:443?transport=tcp', username: 'turn', credential: 'ef2f' }
	]
};

// If in localhost use a hardcoded config
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
{
	settings.protooUrl = 'ws://localhost:8086/cobrowse/';
	settings.swisWsUrl = 'ws://localhost:8088/cobrowse-data/';
	settings.local =
	{
		username : 'reflector-localhost',
		uuid     : 'abcd1234'
	};
}
// Otherwise use production settings
else
{
	settings.protooUrl = 'wss://dev.ef2f.com/cobrowse/';
	settings.swisWsUrl = 'wss://dev.ef2f.com/cobrowse-data/';
	settings.local =
	{
		username : 'reflector-' + randomString({ length: 6 }).toLowerCase(),
		uuid     : 'abcd1234'
	};
}

module.exports = settings;

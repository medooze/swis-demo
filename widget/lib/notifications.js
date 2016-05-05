var debug = require('debug')('swis-widget:notifications');
var debugerror = require('debug')('swis-widget:ERROR:notifications');
debugerror.log = console.warn.bind(console);

var toastr = require('toastr');

toastr.options =
{
	containerId       : 'swis-widget-toast-container',
	escapeHtml        : true,
	closeButton       : false,
	debug             : false,
	newestOnTop       : false,
	progressBar       : false,
	positionClass     : 'toast-top-right',
	preventDuplicates : false,  // TODO: set true in the future
	onclick           : null,
	showDuration      : '200',
	hideDuration      : '200',
	timeOut           : '2500',
	extendedTimeOut   : '2000',
	showEasing        : 'swing',
	hideEasing        : 'linear',
	showMethod        : 'fadeIn',
	hideMethod        : 'fadeOut'
};


module.exports =
{
	info: function(message)
	{
		debug('info: %s', message);

		toastr.info(message);
	},

	success: function(message)
	{
		debug('success: %s', message);

		toastr.success(message);
	},

	warning: function(message)
	{
		debugerror('warning: %s', message);

		toastr.warning(message);
	},

	error: function(message)
	{
		debugerror('error: %s', message);

		toastr.error(message);
	}
};

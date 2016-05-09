var jquery = require('jquery');

module.exports = function()
{
	jquery.Meteor.Blaze.registerHelper('equals', function(a, b)
	{
		return a === b;
	});
};

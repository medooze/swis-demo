chrome.browserAction.onClicked.addListener(function(tab)
{
	chrome.tabs.executeScript(tab.ib,
	{
		file: 'swis-widget.min.js'
	});
});

import _ from 'lodash';

import store from "./store";


function logVisit() {
	alert('Visit logged!');
}

chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, async function() {
		await store.dispatch({
			type: 'loadUserSettings'
		});

		if(store.state.whitelist.enabled === false) {
			console.log('Whitlist is NOT enabled');
			chrome.declarativeContent.onPageChanged.addRules([{
				conditions: [new chrome.declarativeContent.PageStateMatcher({
					pageUrl: {
						hostEquals: '*',
						schemes: ['http', 'https']
					},
				})
				],
				actions: [new chrome.declarativeContent.ShowPageAction()]
			}]);
		}
		else if(store.state.whitelist.enabled === true) {
			let rules = [];

			_.each(store.state.whitelist.entries, function(entry) {
				console.log(entry);
			});

			chrome.declarativeContent.onPageChanged.addRules([{
				conditions: [new chrome.declarativeContent.PageStateMatcher({
					pageUrl: {
						hostEquals: entry,
						schemes: ['http', 'https']
					},
				})
				],
				actions: [new chrome.declarativeContent.ShowPageAction()]
			}]);
		}

	});
});
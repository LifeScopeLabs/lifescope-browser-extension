import url from 'url';

import Vue from 'vue';
import Vuex from 'vuex';
import bowser from 'bowser';

Vue.use(Vuex);

let currentBrowser;

switch(bowser.name) {
	case ('Chrome'):
		currentBrowser = chrome;

		break;

	case ('Firefox'):
		currentBrowser = browser;

		break;

	case ('Microsoft Edge'):
		currentBrowser = browser;

		break;

	default:
		currentBrowser = browser;
}


export default new Vuex.Store({
	state: {
		whitelist: [],
		whitelistPending: {},
		whitelistHistory: [],
		url: null,
		domain: null,
		connection: {},
		lastUrl: null
	},

	mutations: {
		SET_USER_SETTINGS: async function(state, storage) {
			state.whitelist = storage.whitelist || [];
			state.whitelistPending = storage.whitelistPending || {};
			state.whitelistHistory = storage.whitelistHistory || [];
		}
	},

	actions: {
		loadUserSettings({ commit }) {
			return new Promise(function(resolve, reject) {
				currentBrowser.storage.sync.get(['whitelist', 'whitelistPending', 'whitelistHistory'], async function(result) {
					await commit('SET_USER_SETTINGS', result);

					resolve();
				});
			})
		},

		async saveUserSettings({commit}) {
			currentBrowser.storage.sync.set({
				whitelist: this.state.whitelist,
				whitelistPending: this.state.whitelistPending,
				whitelistHistory: this.state.whitelistHistory
			}, async function() {});
		}
	}
});

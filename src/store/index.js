import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

let browser = chrome;

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
				browser.storage.sync.get(['whitelist', 'whitelistPending', 'whitelistHistory'], async function(result) {
					await commit('SET_USER_SETTINGS', result);

					resolve();
				});
			})
		},

		async saveUserSettings({commit}) {
			browser.storage.sync.set({
				whitelist: this.state.whitelist,
				whitelistPending: this.state.whitelistPending,
				whitelistHistory: this.state.whitelistHistory
			}, async function() {
			});
		}
	}
});

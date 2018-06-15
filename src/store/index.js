import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

let browser = chrome;

export default new Vuex.Store({
	state: {
		whitelist: []
	},

	mutations: {
		SET_USER_SETTINGS: async function(state, storage) {
			state.whitelist = storage.whitelist || [];
		}
	},

	actions: {
		loadUserSettings({ commit }) {
			return new Promise(function(resolve, reject) {
				browser.storage.sync.get(['whitelist'], async function(result) {
					await commit('SET_USER_SETTINGS', result);

					console.log('User Settings Set');
					resolve();
				});
			})
		},

		async saveUserSettings({commit}) {
			browser.storage.sync.set({whitelist: this.state.whitelist}, async function() {
				console.log('Settings saved');
			});
		}
	}
});

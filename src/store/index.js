import Vue from "vue";
import Vuex from "vuex";

import * as getters from "./getters";
import mutations from "./mutations";
import * as actions from "./actions";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    whitelist: {
      enabled: false,
      entries: []
    }
  },

  mutations: {
    SET_USER_SETTINGS: function(state, storage) {
      state.whitelist = storage.whitelist;
    }
  },

  actions: {
    async loadUserSettings({ commit }) {
      chrome.storage.sync.get(['whitelist'], async function(result) {
        console.log(result);
        await commit('SET_USER_SETTINGS', result)
      })
    },

    async saveUserSettings({ commit }) {
      chrome.storage.sync.set({ whitelist: this.state.whitelist}, async function() {
        console.log('Settings saved');
      })
    }
  }
});

import Vue from "vue";
import App from "./App";
import store from "../store";
import router from "./router";

import { ApolloClient } from 'apollo-client'
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import VueApollo from 'vue-apollo'
import _ from "lodash";

const httpLink = new HttpLink({
	uri: 'https://api.lifescope.io/gql',
	credentials: 'include'
});

const middlewareLink = new ApolloLink((operation, forward) => {
	if (_.hasIn(store, 'state.csrf_token')) {
		let headers = operation.getContext().headers;

		if (headers == null) {
			headers = {};
		}

		headers['X-CSRF-Token'] = store.state.csrf_token;

		operation.setContext({
			headers: headers
		});
	}

	return forward(operation);
});

const apolloClient = new ApolloClient({
	link: middlewareLink.concat(httpLink),
	cache: new InMemoryCache(),
	connectToDevTools: true,
});

Vue.use(VueApollo);

const apolloProvider = new VueApollo({
	defaultClient: apolloClient,
});

/* eslint-disable no-new */
new Vue({
  el: "#app",
  provide: apolloProvider.provide(),
  store,
  router,
  render: h => h(App)
});

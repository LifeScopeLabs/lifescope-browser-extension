import url from 'url';

import _ from 'lodash';
import axios from 'axios';
import bowser from 'bowser';
import gql from 'graphql-tag';
import moment from 'moment';

import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import VueApollo from 'vue-apollo'

const httpLink = new HttpLink({
	uri: 'https://api.lifescope.io/gql',
	credentials: 'include'
});

const apolloClient = new ApolloClient({
	link: httpLink,
	cache: new InMemoryCache(),
	connectToDevTools: true,
});

const apolloProvider = new VueApollo({
	defaultClient: apolloClient,
});

const apollo = apolloProvider.provide().$apolloProvider.defaultClient;

import store from "./store";


function logVisit() {
	alert('Visit logged!');
}

let browser = chrome;

browser.runtime.onInstalled.addListener(function() {
	browser.webNavigation.onCommitted.addListener(async function() {
		console.log('Listener added');

		let sessionIdCookie = await new Promise(function(resolve, reject) {
			browser.cookies.get({
				url: 'https://app.lifescope.io',
				name: 'sessionid'
			}, function(results) {
				resolve(results);
			});
		});

		if (sessionIdCookie != null) {
			let result = await apollo.query({
				query: gql`query getBrowserConnection($browser: String!) {
                            connectionBrowserOne(browser: $browser) {
                                id
                            }
                        }`,
				variables: {
					browser: bowser.name
				}
			});

			let existingBrowserConnection = result.data.connectionBrowserOne;

			if (existingBrowserConnection == null) {
				existingBrowserConnection = await apollo.mutate({
					mutation: gql`mutation createBrowserConnection($browser: String!) {
                                connectionCreateBrowser(browser: $browser) {
                                    id
                                }
                            }`,
					variables: {
						browser: bowser.name
					}
				});
			}

			store.state.connection = existingBrowserConnection;
		}

		await store.dispatch({
			type: 'loadUserSettings'
		});

		await new Promise(function(resolve, reject) {
			browser.tabs.query({
				active: true
			}, function(tab) {
				let active = tab[0];

				let parsed = url.parse(active.url);

				store.state.domain = parsed.hostname;
				store.state.url = active.url;

				resolve();
			});
		});

		console.log(store.state);
		browser.browserAction.setPopup({
			popup: 'popup/popup.html'
		});

		if (store.state.whitelist.indexOf(store.state.domain) > -1) {
			let newEvent, newContent;

			await new Promise(async function(resolve, reject) {
				try {
					let result = await axios.get('https://iframely.lifescope.io/iframely?url=' + store.state.url);

					let data = result.data;

					newContent = {
						connection_id_string: store.state.connection.id,
						identifier: store.state.connection.id + ':::' + bowser.name + ':::' + data.meta.canonical,
						tagMasks: {
							source: []
						},
						url: data.meta.canonical
					};

					if (data.rel.indexOf('player') >= 0) {
						newContent.type = audioSites.indexOf(data.meta.site) >= 0 ? 'audio' : 'video';
					}
					else if (data.rel.indexOf('image') >= 0) {
						newContent.type = 'image';
					}
					else {
						newContent.type = 'web-page';
					}

					if (data.meta.description) {
						newContent.text = data.meta.description;

						let tags = newContent.text.match(tagRegex);

						if (tags != null) {
							for (let j = 0; j < tags.length; j++) {
								newContent.tagMasks.source.push(tags[j].slice(1));
							}
						}
					}

					if (data.meta.title) {
						newContent.title = data.meta.title;

						let tags = newContent.title.match(tagRegex);

						if (tags != null) {
							for (let j = 0; j < tags.length; j++) {
								newContent.tagMasks.source.push(tags[j].slice(1));
							}
						}
					}

					newContent.tagMasks.source = _.uniq(newContent.tagMasks.source);

					let thumbnailLink = _.find(data.links, function(link) {
						return link.rel.indexOf('thumbnail') >= 0;
					});

					if (thumbnailLink != null) {
						newContent.embed_thumbnail = thumbnailLink.href;
					}

					if (data.html) {
						newContent.embed_content = data.html;
						newContent.embed_format = 'iframe';
					}
				}
				catch(error) {
					newContent = {
						connection_id_string: store.state.connection.id,
						identifier: store.state.connection.id + ':::' + bowser.name + ':::' + store.state.url,
						tagMasks:  {
							source: []
						},
						type: 'web-page',
						url: store.state.url
					};
				}

				let visit = moment();

				newEvent = {
					connection_id_string: store.state.connection.id,
					identifier: store.state.connection.id + ':::' + bowser.name + ':::visited:::' + store.state.url + ':::' + visit.utc().toJSON(),
					content: [newContent],
					context: 'Visited web page',
					datetime: visit.utc().toDate(),
					provider_name: 'Browser Extensions',
					tagMasks: {
						source: []
					},
					type: 'viewed'
				};

				resolve();
			});

			console.log(newEvent);

			console.log(apollo);
			await apollo.mutate({
				mutation: gql`mutation eventCreateMany($events: String!) {
                              eventCreateMany(events: $events) {
                                id
                              }
                            }`,
				variables: {
					events: JSON.stringify([newEvent])
				}
			});
		}
	});
});
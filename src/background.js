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

import store from "./store";

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

let tagRegex = /#[^#\s]+/g;

function logVisit() {
	alert('Visit logged!');
}

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

currentBrowser.runtime.onInstalled.addListener(function() {
	currentBrowser.webNavigation.onCompleted.addListener(async function() {
		let sessionIdCookie = await new Promise(function(resolve, reject) {
			currentBrowser.cookies.get({
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
                                id,
                                enabled,
								provider_id,
								provider_id_string
                            }
                        }`,
				variables: {
					browser: bowser.name
				},
				fetchPolicy: 'no-cache'
			});

			let existingBrowserConnection = result.data.connectionBrowserOne;

			if (existingBrowserConnection == null) {
				store.state.whitelist = [];
				store.state.whitelistHistory = [];
				store.state.whitelistPending = {};

				await store.dispatch({
					type: 'saveUserSettings'
				});

				result = await apollo.mutate({
					mutation: gql`mutation createBrowserConnection($browser: String!) {
                                connectionCreateBrowser(browser: $browser) {
                                    id,
                                    enabled,
									provider_id,
									provider_id_string
                                }
                            }`,
					variables: {
						browser: bowser.name
					},
					fetchPolicy: 'no-cache'
				});

				existingBrowserConnection = result.data.connectionCreateBrowser;
			}

			store.state.connection = existingBrowserConnection || {};
		}
		else {
			store.state.connection = {};
		}

		await store.dispatch({
			type: 'loadUserSettings'
		});

		if (store.state.connection.enabled === true) {
			await new Promise(function(resolve, reject) {
				currentBrowser.tabs.query({
					active: true
				}, function(tab) {
					let active = tab[0];

					let parsed = url.parse(active.url);

					store.state.domain = parsed.hostname;
					store.state.url = active.url;

					resolve();
				});
			});

			currentBrowser.browserAction.setPopup({
				popup: 'popup/popup.html'
			});

			let whitelistHit = false;

			_.each(store.state.whitelist, function(item) {
				let domainRegex = new RegExp(item);

				if (domainRegex.test(store.state.domain) === true) {
					whitelistHit = true;

					return;
				}

				let parsedUrl = url.parse(store.state.url);

				let condensedUrl = parsedUrl.host + parsedUrl.path;

				if (domainRegex.test(condensedUrl)) {
					whitelistHit = true;

					return;
				}
			});

			if (whitelistHit && store.state.lastUrl !== store.state.url) {
				store.state.lastUrl = store.state.url;

				store.dispatch({
					type: 'saveUserSettings'
				});

				let newEvent, newContent;

				await new Promise(async function(resolve, reject) {
					try {
						let result = await axios.get('https://embed.lifescope.io/iframely?url=' + store.state.url);

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
							tagMasks: {
								source: []
							},
							type: 'web-page',
							url: store.state.url
						};
					}

					let visit = moment();

					newEvent = {
						connection_id_string: store.state.connection.id,
						provider_id_string: store.state.connection.provider_id_string,
						identifier: store.state.connection.id + ':::' + bowser.name + ':::visited:::' + store.state.url + ':::' + visit.utc().toJSON(),
						content: [newContent],
						context: 'Visited web page',
						datetime: visit.utc().toDate(),
						provider_name: bowser.name + ' Extension',
						tagMasks: {
							source: []
						},
						type: 'viewed'
					};

					resolve();
				});

				await apollo.mutate({
					mutation: gql`mutation eventCreateMany($events: String!) {
                              eventCreateMany(events: $events) {
                                id
                              }
                            }`,
					variables: {
						events: JSON.stringify([newEvent])
					},
					fetchPolicy: 'no-cache'
				});
			}

			store.state.lastUrl = store.state.url;

			//Check to see if any whitelisted domains didn't finish their initial data crawl, and run it if they didn't (as long as they're not on Edge).
			if (bowser.name !== 'Microsoft Edge') {
				_.each(store.state.whitelist, async function(whitelistItem) {
					//Handling the edge case where the user adds something to the whitelist, opens a new page and triggers the domain's entry to whitelistPending,
					//but then closes the browser before that fetch and/or Event generation is completed.
					//Pending is an object where the keys are the domains and the values are the time at which the history grab was initiated.
					//If the grab is more than 5 minutes old, it's relatively safe to say that it didn't complete.
					if (store.state.whitelistPending[whitelistItem] && moment().utc().subtract(5, 'minutes').toDate() > store.state.whitelistPending[whitelistItem]) {
						delete store.state.whitelistPending[whitelistItem];
					}

					if (Object.keys(store.state.whitelistPending).indexOf(whitelistItem) === -1 && store.state.whitelistHistory.indexOf(whitelistItem) === -1) {
						let regexp = new RegExp(whitelistItem);

						store.state.whitelistPending[whitelistItem] = moment().utc().toDate();

						store.dispatch({
							type: 'saveUserSettings'
						});

						let baseResults = await new Promise(function(resolve, reject) {
							currentBrowser.history.search({
								text: '',
								startTime: 0,
								maxResults: 1000000
							}, function(results) {
								resolve(results);
							});
						});

						let matches = _.filter(baseResults, function(item) {
							let hostname = url.parse(item.url).hostname;

							return regexp.test(hostname);
						});

						let promises = _.map(matches, async function(match) {
							match.visits = [];

							let hydratedResults = await new Promise(function(resolve, reject) {
								currentBrowser.history.getVisits({
									url: match.url
								}, function(results) {
									resolve(results);
								});
							});

							_.each(hydratedResults, function(result, index) {
								if (index === 0 || (index > 0 && Math.abs(moment(result.visitTime) - moment(hydratedResults[index - 1].visitTime)) > 1000)) {
									match.visits.push(result.visitTime)
								}
							});

							return Promise.resolve();
						});

						await Promise.all(promises);

						promises = [];

						let sliceSize = 1000;
						let events = [];

						_.each(matches, async function(match) {
							let result, newContent;

							promises.push(new Promise(async function(resolve, reject) {
								await new Promise(async function(resolve, reject) {
									try {
										result = await axios.get('https://embed.lifescope.io/iframely?url=' + match.url);

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

										resolve();
									}
									catch(error) {
										newContent = {
											connection_id_string: store.state.connection.id,
											identifier: store.state.connection.id + ':::' + bowser.name + ':::' + match.url,
											tagMasks: {
												source: []
											},
											type: 'web-page',
											url: match.url
										};

										resolve();
									}
								});

								_.each(match.visits, function(visit) {
									let newEvent = {
										connection_id_string: store.state.connection.id,
										provider_id_string: store.state.connection.provider_id_string,
										identifier: store.state.connection.id + ':::' + bowser.name + ':::visited:::' + match.url + ':::' + moment(visit).utc().toJSON(),
										content: [newContent],
										context: 'Visited web page',
										datetime: moment(visit).utc().toDate(),
										provider_name: bowser.name + ' Extension',
										tagMasks: {
											source: []
										},
										type: 'viewed'
									};

									events.push(newEvent);

									resolve();
								});
							}));
						});

						await Promise.all(promises);

						let finished = false;
						let startIndex = 0;

						while (!finished) {
							let slice = events.slice(startIndex, startIndex + sliceSize);

							if (slice.length > 0) {
								await apollo.mutate({
									mutation: gql`mutation eventCreateMany($events: String!) {
                                      eventCreateMany(events: $events) {
                                        id
                                      }
                                    }`,
									variables: {
										events: JSON.stringify(slice)
									},
									fetchPolicy: 'no-cache'
								});
							}

							startIndex += sliceSize;

							if (slice.length < sliceSize) {
								finished = true;
							}
						}

						delete store.state.whitelistPending[whitelistItem];
						store.state.whitelistHistory.push(whitelistItem);

						store.state.whitelistHistory = _.uniq(store.state.whitelistHistory);

						store.dispatch({
							type: 'saveUserSettings'
						});
					}
				});
			}
		}
	});
});
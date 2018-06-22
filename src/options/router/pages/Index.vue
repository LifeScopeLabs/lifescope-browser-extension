<template>
	<div class="page">
		<div class="boxed-group">
			<div class="title">Tracked Pages</div>

			<div class="padded paragraphed">
				<p>
					You must manually approve sites to be tracked on a Whitelist.
					We're not just going to track every single thing you do, because that's creepy.
					This can either be done by manually entering the site domain here, or by navigating to a site,
					clicking the LifeScope extension icon in the upper right, and selecting 'Start tracking this domain'.
				</p>

				<p>Deleting a domain will stop the extension from tracking that going forward, but it will <u>not</u> get rid of anything we've already created.</p>

				<p>
					At this time, there is no option for selectively deleting data gathered using this extension.
					You would need to delete the Connection in the main LifeScope app, delete everything from the whitelist, then add the domains you do want to keep back to the whitelist.
				</p>

				<div class="whitelist">
					<h2>Domain Whitelist</h2>

					<div>
						<p>You can enter the domains of websites you want to track here. Some examples of domains are
							'google.com', 'wikipedia.org', and 'dmv.ca.gov'. Basically, it's everything after the
							'https://' that ends with '.com', '.org', etc.</p>
						<p>If you don't want to enter this information manually, go to the site you want to track, click
							on the button for the LifeScope extension, and select 'track this page'.</p>
					</div>

					<form v-on:submit.prevent="addWhitelistEntry">
						<div class="add-domain flexbox flex-x-center">
							<div class="text-box">
								<input type="text" placeholder="google.com" v-model="newDomain">
							</div>
							<i class="fa fa-plus" v-on:click="addWhitelistEntry"></i>
							<span v-if="$data.showDomainError === true">That was not a valid domain.</span>
						</div>
					</form>

					<div class="entries">
						<div v-for="entry in sortedEntries" class="entry">
							<span>{{ entry }}</span>
							<i class="delete fa fa-times" v-on:click="deleteWhitelistEntry(entry)"></i>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	import _ from 'lodash';
	import axios from 'axios';
	import bowser from 'bowser';
	import gql from 'graphql-tag';
	import moment from 'moment';
	import url from 'url';

	const browser = chrome;

	let audioSites = [
		'Spotify'
	];

	let domainRegex = /^([a-zA-Z0-9]+\.)+[a-zA-Z0-9]+$/g;
	let tagRegex = /#[^#\s]+/g;

	const sliceSize = 1000;

	export default {
		data() {
			return {
				newDomain: '',
				connection: {},
				showDomainError: false
			};
		},

		computed: {
			sortedEntries() {
				return this.$store.state.whitelist.sort();
			},
		},

		methods: {
			addWhitelistEntry: async function() {
				let self = this;
				let events = [];

				let domain = this.$data.newDomain;

				this.$data.newDomain = '';

				if (domain.match(domainRegex) == null) {
					this.$data.showDomainError = true;

					setTimeout(function() {
						self.$data.showDomainError = false;
					}, 1000);

					return;
				}

				let domainExists = this.$store.state.whitelist.indexOf(domain);

				if(domainExists === -1) {
					this.$store.state.whitelist.push(domain);

					this.$store.dispatch({
						type: 'saveUserSettings'
					});
				}

				let regexp = new RegExp(domain);

				let baseResults = await new Promise(function(resolve, reject) {
					browser.history.search({
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
						browser.history.getVisits({
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

				_.each(matches, async function(match) {
					let result, newContent;

					promises.push(new Promise(async function(resolve, reject) {
						try {
							result = await axios.get('https://iframely.lifescope.io/iframely?url=' + match.url);

							let data = result.data;

							newContent = {
								connection_id_string: self.$data.connection.id,
								identifier: self.$data.connection.id + ':::' + bowser.name + ':::' + data.meta.canonical,
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
								connection_id_string: self.$data.connection.id,
								identifier: self.$data.connection.id + ':::' + bowser.name + ':::' + match.url,
								tagMasks:  {
									source: []
								},
								type: 'web-page',
								url: match.url
							};
						}

						_.each(match.visits, function(visit) {
							let newEvent = {
								connection_id_string: self.$data.connection.id,
								identifier: self.$data.connection.id + ':::' + bowser.name + ':::visited:::' + match.url + ':::' + moment(visit).utc().toJSON(),
								content: [newContent],
								context: 'Visited web page',
								datetime: moment(visit).utc().toDate(),
								provider_name: 'Browser Extensions',
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
						await this.$apollo.mutate({
							mutation: gql`mutation eventCreateMany($events: String!) {
					  eventCreateMany(events: $events) {
						id
					  }
					}`,
							variables: {
								events: JSON.stringify(slice)
							}
						});
					}

					startIndex += sliceSize;

					if (slice.length < sliceSize) {
						finished = true;
					}
				}
			},

			deleteWhitelistEntry: function(domain) {
				console.log('Deleting Whitelist entry');
				let index = _.findIndex(this.$store.state.whitelist, function(item) {
					return item === domain;
				});

				if(index >= 0) {
					this.$store.state.whitelist.splice(index, 1);

					this.$store.dispatch({
						type: 'saveUserSettings'
					});
				}
			}
		},

		mounted: async function() {
			let $apollo = this.$apollo.provider.defaultClient;

			await this.$store.dispatch({
				type: 'loadUserSettings'
			});

			let sessionIdCookie = await new Promise(function(resolve, reject) {
				browser.cookies.get({
					url: 'https://app.lifescope.io',
					name: 'sessionid'
				}, function(results) {
					resolve(results);
				});
			});

			if (sessionIdCookie != null) {
				let result = await $apollo.query({
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
					existingBrowserConnection = await $apollo.mutate({
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

				this.$data.connection = existingBrowserConnection;
			}
		}
	};
</script>

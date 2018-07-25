<template>
	<div class="page">
		<div class="boxed-group">
			<div class="title">LifeScope Browser Extension Settings</div>

			<div class="padded paragraphed mobile-margin">
				<p>
					LifeScope can help you organize and search your time on the web.
					We only record visits to sites you care about and have explicitly approved us to track.
					You must manually approve sites to be tracked.
					This can be done by navigating to a site, clicking the LifeScope extension icon in the upper right, and selecting either 'Start tracking this domain' or 'Start tracking this URL'.
					You can also manually add the domain or URL to the list below.
				</p>

				<p v-if="browserName === 'Chrome' || browserName === 'Firefox'">
					When you add a domain to the whitelist, we will retrieve your entire history on that domain from your browser.
					Any further visits to that domain will also be recorded.
					Note that these actions will only occur if you are logged into LifeScope on that device.
				</p>
				<p v-else-if="browserName === 'Microsoft Edge'">
					Microsoft Edge unfortunately does not let us access your browser history at this time.
					We therefore cannot retrieve any previous visits to domains to approve, and can only track future visits.
					Note that you must be logged into LifeScope on that device for future visits to be recorded.
				</p>

				<p>Deleting a domain from the list will stop the extension from tracking that domain going forward, but it will <u>not</u> delete anything already recorded for that domain.</p>

				<p>
					At this time, there is no option for selectively deleting data gathered using this extension.
					You would need to delete the Connection in the main LifeScope app, which will clear your whitelist, then add the domains you do want to keep back to the list.
				</p>

				<div v-if="$data.connection && $data.connection.enabled === false">
					<h2>Extension Connection is disabled</h2>

					<div>
						<p>The Connection for this browser extension is currently disabled. No new visits to any of the domains in your list are being recorded.</p>
						<p>Any new domains that you add to the list will not have their history mapped until the Connection is enabled.</p>
						<p>Any activity on listed sites that occurs when the Connection is disabled will not be restored upon the Connection being enabled.</p>
					</div>
				</div>

				<div class="whitelist">
					<h3>Tracked Domain/URL List</h3>

					<div>
						<p>You can enter the domains or URLs of websites you want to track here. Some examples of domains are
							'google.com', 'wikipedia.org', and 'dmv.ca.gov'. Basically, it's everything after the
							'https://' that ends with '.com', '.org', etc. An example of a URL is 'en.wikipedia.org/Main_Page';
							it's the domain, plus everything after each '/', but not any '?' or '#' or anything following those characters.</p>
						<p>If you don't want to enter this information manually, go to the site you want to track, click
							on the button for the LifeScope extension, and select 'Start tracking this domain' or 'Start tracking this URL'.</p>
					</div>

					<h3>Enter new domains/URLs here</h3>
					<form v-on:submit.prevent="addWhitelistEntry">
						<div class="add-domain flexbox flex-x-center">
							<div class="text-box">
								<input type="text" placeholder="google.com" v-model="newDomain">
							</div>
							<i class="fa fa-plus" v-on:click="addWhitelistEntry"></i>
							<span v-if="$data.invalidDomain === true">That was not a valid domain or site.</span>
						</div>
					</form>

					<h3>Your currently tracked domains/URLs</h3>
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

	let domainRegex = /^([a-zA-Z0-9]+\.)+[a-zA-Z0-9]+$/;
	let siteRegex = /([a-zA-Z0-9]+\.)+[a-zA-Z0-9]+(\/([.a-zA-Z0-9_-~!$&'()*+,;=:@])+)+\/?$/;

	export default {
		data() {
			return {
				domain: null,
				loggedIn: false,
				newDomain: '',
				connection: {},
				invalidDomain: false,
				invalidSite: false
			};
		},

		computed: {
			sortedEntries() {
				return this.$store.state.whitelist.sort();
			},

			browserName: function() {
				return bowser.name;
			}
		},

		methods: {
			addWhitelistEntry: async function() {
				let self = this;

				await this.$store.dispatch({
					type: 'loadUserSettings'
				});

				this.$data.domain = this.$data.newDomain;

				this.$data.newDomain = '';

				if (this.$data.domain.match(domainRegex) == null && this.$data.domain.match(siteRegex) == null) {
					this.$data.invalidDomain = true;

					setTimeout(function() {
						self.$data.invalidDomain = false;
					}, 2000);

					return;
				}

				let domainWhitelistExists = this.$store.state.whitelist.indexOf(this.$data.domain);

				if (domainWhitelistExists === -1) {
					this.$store.state.whitelist.push(this.$data.domain);

					this.$store.dispatch({
						type: 'saveUserSettings'
					});
				}
			},

			deleteWhitelistEntry: function(domain) {
				let index = _.findIndex(this.$store.state.whitelist, function(item) {
					return item === domain;
				});

				if (index >= 0) {
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
				currentBrowser.cookies.get({
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
					result = await $apollo.mutate({
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

					this.$store.state.whitelist = [];
					this.$store.state.whitelistPending = {};
					this.$store.state.whitelistHistory = [];

					this.$store.dispatch({
						type: 'saveUserSettings'
					});
				}

				this.$data.connection = existingBrowserConnection || {};
			}
			else {
				this.$data.connection = {};
			}
		}
	};
</script>

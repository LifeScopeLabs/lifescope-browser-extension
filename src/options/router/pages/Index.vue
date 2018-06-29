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

				<p v-if="browserName === 'Chrome' || browserName === 'Firefox'">
					When you add a domain to the whitelist, we will retrieve your entire history on that domain from your browser and make Events from it.
					Any further visits to that domain will also result in the creation of Events.
					Note that these actions will only occur if you are logged into LifeScope on that device, as we use your LifeScope credentials to authenticate the Event generation.
				</p>
				<p v-else-if="browserName === 'Microsoft Edge'">
					Microsoft Edge unfortunately does not let us access your browser history at this time.
					We therefore cannot make Events from any previous visits to domains you whitelist; we can only do so for future visits.
					Note that you must be logged into LifeScope for visits to be recorded in LifeScope.
				</p>

				<p>Deleting a domain will stop the extension from tracking that domain going forward, but it will <u>not</u> get rid of anything we've already created.</p>

				<p>
					At this time, there is no option for selectively deleting data gathered using this extension.
					You would need to delete the Connection in the main LifeScope app, which will clear your whitelist, then add the domains you do want to keep back to the whitelist.
				</p>

				<div v-if="$data.connection && $data.connection.enabled === false">
					<h2>Extension Connection is disabled</h2>

					<div>
						<p>The Connection for this browser extension is currently disabled. No new Events are being recorded for the sites in the Domain Whitelist.</p>
						<p>Any new domains that you add to the whitelist will not have their history mapped until the Connection is enabled.</p>
						<p>Any activity on whitelisted sites that occurs when the Connection is disabled will not be restored upon the Connection being enabled.</p>
					</div>
				</div>

				<div class="whitelist">
					<h2>Domain Whitelist</h2>

					<div>
						<p>You can enter the domains of websites you want to track here. Some examples of domains are
							'google.com', 'wikipedia.org', and 'dmv.ca.gov'. Basically, it's everything after the
							'https://' that ends with '.com', '.org', etc.</p>
						<p>If you don't want to enter this information manually, go to the site you want to track, click
							on the button for the LifeScope extension, and select 'track this page'.</p>
					</div>

					<h3>Enter new domains here</h3>
					<form v-on:submit.prevent="addWhitelistEntry">
						<div class="add-domain flexbox flex-x-center">
							<div class="text-box">
								<input type="text" placeholder="google.com" v-model="newDomain">
							</div>
							<i class="fa fa-plus" v-on:click="addWhitelistEntry"></i>
							<span v-if="$data.showDomainError === true">That was not a valid domain.</span>
							<span v-if="$data.showDisabledError === true">Please enable the Connection for this browser extension in your <a href="https://app.lifescope.io/settings/connections" target="_blank">LifeScope settings.</a></span>
						</div>
					</form>

					<h3>Your currently-tracked domains</h3>
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

	let domainRegex = /^([a-zA-Z0-9]+\.)+[a-zA-Z0-9]+$/g;

	export default {
		data() {
			return {
				domain: null,
				loggedIn: false,
				newDomain: '',
				connection: {},
				showDisabledError: false,
				showDomainError: false
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

				if (this.$data.domain.match(domainRegex) == null) {
					this.$data.showDomainError = true;

					setTimeout(function() {
						self.$data.showDomainError = false;
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

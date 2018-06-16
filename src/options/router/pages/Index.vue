<template>
	<div class="page">
		<div class="boxed-group">
			<div class="title">Tracked Pages</div>

			<div class="padded paragraphed">
				<p>
					You must manually approve sites to be tracked on a Whitelist.
					We're not just going to track every single thing you do, because that's creepy.
					This can either be done by manually entering the site domain here, or by navigating to a site,
					clicking the LifeScope extension icon in the upper right, and selecting 'Track this site'.
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
	import bowser from 'bowser';
	import gql from 'graphql-tag';
	import url from 'url';

	const browser = chrome;

	export default {
		data() {
			return {
				newDomain: ''
			};
		},

		computed: {
			sortedEntries() {
				console.log(this.$store.state.whitelist);
				return this.$store.state.whitelist.sort();
			},
		},

		methods: {
			addWhitelistEntry: async function() {
				console.log('Adding Whitelist entry');
				let domain = this.$data.newDomain;

				let domainExists = this.$store.state.whitelist.indexOf(domain);

				if(domainExists === -1) {
					this.$store.state.whitelist.push(domain);

					this.$store.dispatch({
						type: 'saveUserSettings'
					});
				}

				this.$data.newDomain = '';

				console.log(browser);

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

					_.each(hydratedResults, function(result) {
						match.visits.push(result.visitTime)
					});

					console.log(match);

					return Promise.resolve();
				});

				await Promise.all(promises);

				_.each(matches, function(match) {

				});
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
			console.log(this.$apollo);
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

			console.log(sessionIdCookie);

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
				console.log(existingBrowserConnection);

				if (existingBrowserConnection == null) {
					await $apollo.mutate({
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
			}
		}
	};
</script>

<style lang="scss" scoped>
</style>

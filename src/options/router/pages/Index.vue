<template>
	<div class="page">
		<div class="boxed-group">
			<div class="title">Tracked Pages</div>

			<div class="padded paragraphed">
				<p>
					You may configure this plugin to either track all of your browsing patterns, or restrict it to only
					sites that you specify.
				</p>

				<div class="flexbox">
					<label v-bind:class="{active: $store.state.whitelist.enabled === false }" class="radio" for="all-domains" v-on:click="toggleWhitelist(false)">
						<input id="all-domains" type="radio" name="domains" value="false" v-model="$store.state.whitelist.enabled"/>
						<span>Track all sites</span>
					</label>
				</div>

				<div class="flexbox">
					<label v-bind:class="{active: $store.state.whitelist.enabled === true }" class="radio" for="whitelisted-domains" v-on:click="toggleWhitelist(true)">
						<input id="whitelisted-domains" type="radio" name="domains" value="true" v-model="$store.state.whitelist.enabled"/>
						<span>Track only specified sites</span>
					</label>
				</div>

				<div>{{ $store.state.whitelist.enabled }}</div>
				<div>{{ $store.state.whitelist.enabled === true }}</div>
				<div v-if="$store.state.whitelist.enabled === true">
					<div>
						<p>You can enter the domains of websites you want to track here. Some examples of domains are
							'google.com', 'wikipedia.org', and 'dmv.ca.gov'. Basically, it's everything after the
							'https://' that ends with '.com', '.org', etc.</p>
						<p>If you don't want to enter this information manually, go to the site you want to track, click
							on the button for the LifeScope plugin, and select 'track this page'.</p>
					</div>
					<div class="add-domain">
						<input type="text" placeholder="google.com" v-model="newDomain">
						<i class="fa fa-plus" v-on:click="addWhitelistEntry"></i>
					</div>

					<div v-for="entry in $store.state.whitelist.entries">
						<span>{{ entry }}</span>
						<i class="delete fa fa-times" v-on:click="deleteWhitelistEntry(entry)"></i>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
	export default {
		data() {
			return {
				newDomain: ''
			};
		},

		methods: {
			addWhitelistEntry: function() {
				console.log('Adding Whitelist entry');
				let domain = this.$data.newDomain;

				let domainExists = this.$store.state.whitelist.entries.indexOf(domain);

				if(domainExists === -1) {
					this.$store.state.whitelist.entries.push(domain);

					this.$store.dispatch({
						type: 'saveUserSettings'
					});
				}

				this.$data.newDomain = '';
			},

			deleteWhitelistEntry: function(domain) {
				console.log('Deleting Whitelist entry');
				let index = _.findIndex(this.$store.state.whitelist.entries, function(item) {
					return item === domain;
				});

				if(index >= 0) {
					this.$store.state.whitelist.entries.splice(index, 1);

					this.$store.dispatch({
						type: 'saveUserSettings'
					});
				}
			},

			toggleWhitelist(enabled) {
				console.log('Toggling Whitelist');
				console.log(enabled);
				this.$store.state.whitelist.enabled = enabled;

				this.$store.dispatch({
					type: 'saveUserSettings'
				});

				console.log(this.$store.state.whitelist.enabled);
				console.log(typeof this.$store.state.whitelist.enabled);
			}
		},

		mounted: function() {
			console.log('pants');
			this.$store.dispatch({
				type: 'loadUserSettings'
			});
		}
	};
</script>

<style lang="scss" scoped>
</style>

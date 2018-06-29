<template>
  <button v-if="domainWhitelisted === true" class="danger" v-on:click="deleteWhitelistEntry">Stop tracking this domain</button>
  <button v-else-if="domainWhitelisted === false" class="primary" v-on:click="addWhitelistEntry">Start tracking this domain</button>
  <!--<a v-else-if="$data.connection == null || $data.connection.enabled === false" style="text-decoration: none" href="https://app.lifescope.io/settings/connections" target="_blank"><button>Enable Connection in LifeScope Settings</button></a>-->
</template>

<script>
	import url from 'url';

	import _ from 'lodash';
	import axios from 'axios';
	import bowser from 'bowser';
	import gql from 'graphql-tag';
	import moment from 'moment';

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
          	  connection: {},
          	  domain: null,
              url: null
          };
        },

        computed: {
	        domainWhitelisted: function() {
		        return this.$store.state.whitelist.indexOf(this.$data.domain) > -1;
	        },
        },

	    methods: {
		    addWhitelistEntry: async function() {
				if (this.$data.domain.match(domainRegex) == null) {
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

		    deleteWhitelistEntry: function() {
				let self = this;

				let index = _.findIndex(this.$store.state.whitelist, function(item) {
					return item === self.$data.domain;
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
        	let self = this;

            let $apollo = this.$apollo.provider.defaultClient;

            await this.$store.dispatch({
                type: 'loadUserSettings'
            });

	        await new Promise(function(resolve, reject) {
		        currentBrowser.tabs.query({
			        active: true
		        }, function(tab) {
			        let active = tab[0];

			        let parsed = url.parse(active.url);

			        self.$data.domain = parsed.hostname;
			        self.$data.url = active.url;

                    resolve();
		        });
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

<style lang="scss" scoped>
  button {
    cursor: pointer;
    position: relative;
    display: inline-block;
    padding: 0.5em 1em;
    font-size: 1em;
    font-weight: 700;
    font-family: Arial, Helvetica, sans-serif;
    font-weight: bold;
  //line-height: 20px;
    color: #333;
    white-space: nowrap;
    vertical-align: middle;
    background-color: #eee;
    background-image: linear-gradient(#fcfcfc, #eee);
    border: 1px solid #d5d5d5;
  //border-radius: 3px;
    border-radius: 1px;
    user-select: none;
    -webkit-appearance: none; // Corrects inability to style clickable `input` types in iOS.
  outline: none;
    text-decoration: none;

  &:hover {
     background-color: #ddd;
     background-image: linear-gradient(#eee, #ddd);
     border-color: #ccc;
   }

  &:active {
     background-color: #dcdcdc;
     background-image: none;
     border-color: #b5b5b5;
     box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
   }

  &.round {
     border-radius: 7px;
   }

  &:disabled,
  &.disabled {
  &,
  &:hover {
     color: rgba(102, 102, 102, 0.5);
     cursor: default;
     background-color: rgba(229, 229, 229, 0.5);
     background-image: none;
     border-color: rgba(197, 197, 197, 0.5);
     box-shadow: none;
   }
  }

  &.danger {
     color: #900;

  &:hover {
     color: #fff;
     background-color: #b33630;
     background-image: linear-gradient(#dc5f59, #b33630);
     border-color: #cd504a;
   }

  &:active {
     color: #fff;
     background-color: #b33630;
     background-image: none;
     border-color: darken(#cd504a, 15%);
   }

  &:disabled,
  &.disabled {
  &,
  &:hover {
     color: #cb7f7f;
     background-color: #efefef;
     background-image: linear-gradient(#fefefe, #efefef);
     border-color: #e1e1e1;
   }
  }
  }

  &.primary {
     $background: #60b044;
     $border: #4a993e;
     $gradient: #8add6d;

   //$background: #009E23;
   //$border: #00CE2E;
   //$gradient: #00E432;

     color: #fff;
     text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.15);
     background-color: $background;
     background-image: linear-gradient($gradient, $background);
     border-color: darken($background, 2%);

  &:hover {
     color: #fff;
     background-color: darken($background, 5%);
     background-image: linear-gradient(darken($gradient, 5%), darken($background, 5%));
     border-color: $border;
   }

  &:active {
     text-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
     background-color: darken($background, 5%);
     background-image: none;
     border-color: darken($border, 5%);
   }

  &:disabled,
  &.disabled {
  &,
  &:hover {
     color: #fefefe;
     background-color: #add39f;
     background-image: linear-gradient(#c3ecb4, #add39f);
     border-color: #b9dcac #b9dcac #a7c89b;
   }
  }
  }

  &.blue {
   //$background: #009E23;
   //$border: #00CE2E;
   //$gradient: #00E432;

     color: #fff;
     text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.15);

  &:hover {
     color: #fff;
   }

  &:active {
     text-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
     background-image: none;
   }

  &:disabled,
  &.disabled {
  &,
  &:hover {
     color: #fefefe;
     background-color: #add39f;
     background-image: linear-gradient(#c3ecb4, #add39f);
     border-color: #b9dcac #b9dcac #a7c89b;
   }
  }
  }
  }
</style>

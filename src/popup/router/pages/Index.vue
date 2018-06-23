<template>
  <button v-if="$data.connection && $data.connection.enabled === true && domainWhitelisted === true" class="danger" v-on:click="deleteWhitelistEntry">Stop tracking this domain</button>
  <button v-else-if="$data.connection && $data.connection.enabled === true && domainWhitelisted === false" class="primary" v-on:click="addWhitelistEntry">Start tracking this domain</button>
  <a v-else-if="$data.connection == null || $data.connection.enabled === false" style="text-decoration: none" href="https://app.lifescope.io/settings/connections" target="_blank"><button>Enable Connection in LifeScope Settings</button></a>
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

	let audioSites = [
		'Spotify'
	];

	let domainRegex = /^([a-zA-Z0-9]+\.)+[a-zA-Z0-9]+$/g;
	let tagRegex = /#[^#\s]+/g;

	const sliceSize = 1000;

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
		    	if (this.$data.connection && this.$data.connection.enabled) {
				    let self = this;
				    let events = [];

				    if (this.$data.domain.match(domainRegex) == null) {
					    return;
				    }

				    let domainWhitelistExists = this.$store.state.whitelist.indexOf(this.$data.domain);
				    let domainWhitelistPendingExists = this.$store.state.whitelistPending.indexOf(this.$data.domain);
				    let domainWhitelistHistoryExists = this.$store.state.whitelistHistory.indexOf(this.$data.domain);

				    if (domainWhitelistExists === -1) {
					    this.$store.state.whitelist.push(this.$data.domain);

					    this.$store.dispatch({
						    type: 'saveUserSettings'
					    });
				    }

				    // if (domainWhitelistPendingExists === -1 && domainWhitelistHistoryExists === -1 && bowser.name !== 'Microsoft Edge') {
					 //    let regexp = new RegExp(this.$data.domain);
					//
					 //    this.$store.state.whitelistPending.push(this.$data.domain);
					//
					 //    this.$store.dispatch({
                     //        type: 'saveUserSettings'
                     //    });
					//
					 //    let baseResults = await new Promise(function(resolve, reject) {
						//     currentBrowser.history.search({
						// 	    text: '',
						// 	    startTime: 0,
						// 	    maxResults: 1000000
						//     }, function(results) {
						// 	    resolve(results);
						//     });
					 //    });
					//
					 //    let matches = _.filter(baseResults, function(item) {
						//     let hostname = url.parse(item.url).hostname;
					//
						//     return regexp.test(hostname);
					 //    });
					//
					 //    let promises = _.map(matches, async function(match) {
						//     match.visits = [];
					//
						//     let hydratedResults = await new Promise(function(resolve, reject) {
						// 	    currentBrowser.history.getVisits({
						// 		    url: match.url
						// 	    }, function(results) {
						// 		    resolve(results);
						// 	    });
						//     });
					//
						//     _.each(hydratedResults, function(result, index) {
						// 	    if (index === 0 || (index > 0 && Math.abs(moment(result.visitTime) - moment(hydratedResults[index - 1].visitTime)) > 1000)) {
						// 		    match.visits.push(result.visitTime)
						// 	    }
						//     });
					//
						//     return Promise.resolve();
					 //    });
					//
					 //    await Promise.all(promises);
					//
					 //    promises = [];
					//
					 //    _.each(matches, async function(match) {
						//     let result, newContent;
					//
						//     promises.push(new Promise(async function(resolve, reject) {
						// 	    try {
						// 		    result = await axios.get('https://iframely.lifescope.io/iframely?url=' + match.url);
					//
						// 		    let data = result.data;
					//
						// 		    newContent = {
						// 			    connection_id_string: self.$data.connection.id,
						// 			    identifier: self.$data.connection.id + ':::' + bowser.name + ':::' + data.meta.canonical,
						// 			    tagMasks: {
						// 				    source: []
						// 			    },
						// 			    url: data.meta.canonical
						// 		    };
					//
						// 		    if (data.rel.indexOf('player') >= 0) {
						// 			    newContent.type = audioSites.indexOf(data.meta.site) >= 0 ? 'audio' : 'video';
						// 		    }
						// 		    else if (data.rel.indexOf('image') >= 0) {
						// 			    newContent.type = 'image';
						// 		    }
						// 		    else {
						// 			    newContent.type = 'web-page';
						// 		    }
					//
						// 		    if (data.meta.description) {
						// 			    newContent.text = data.meta.description;
					//
						// 			    let tags = newContent.text.match(tagRegex);
					//
						// 			    if (tags != null) {
						// 				    for (let j = 0; j < tags.length; j++) {
						// 					    newContent.tagMasks.source.push(tags[j].slice(1));
						// 				    }
						// 			    }
						// 		    }
					//
						// 		    if (data.meta.title) {
						// 			    newContent.title = data.meta.title;
					//
						// 			    let tags = newContent.title.match(tagRegex);
					//
						// 			    if (tags != null) {
						// 				    for (let j = 0; j < tags.length; j++) {
						// 					    newContent.tagMasks.source.push(tags[j].slice(1));
						// 				    }
						// 			    }
						// 		    }
					//
						// 		    newContent.tagMasks.source = _.uniq(newContent.tagMasks.source);
					//
						// 		    let thumbnailLink = _.find(data.links, function(link) {
						// 			    return link.rel.indexOf('thumbnail') >= 0;
						// 		    });
					//
						// 		    if (thumbnailLink != null) {
						// 			    newContent.embed_thumbnail = thumbnailLink.href;
						// 		    }
					//
						// 		    if (data.html) {
						// 			    newContent.embed_content = data.html;
						// 			    newContent.embed_format = 'iframe';
						// 		    }
						// 	    }
						// 	    catch(error) {
						// 		    newContent = {
						// 			    connection_id_string: self.$data.connection.id,
						// 			    identifier: self.$data.connection.id + ':::' + bowser.name + ':::' + match.url,
						// 			    tagMasks: {
						// 				    source: []
						// 			    },
						// 			    type: 'web-page',
						// 			    url: match.url
						// 		    };
						// 	    }
					//
						// 	    _.each(match.visits, function(visit) {
						// 		    let newEvent = {
						// 			    connection_id_string: self.$data.connection.id,
						// 			    identifier: self.$data.connection.id + ':::' + bowser.name + ':::visited:::' + match.url + ':::' + moment(visit).utc().toJSON(),
						// 			    content: [newContent],
						// 			    context: 'Visited web page',
						// 			    datetime: moment(visit).utc().toDate(),
						// 			    provider_name: 'Browser Extensions',
						// 			    tagMasks: {
						// 				    source: []
						// 			    },
						// 			    type: 'viewed'
						// 		    };
					//
						// 		    events.push(newEvent);
					//
						// 		    resolve();
						// 	    });
						//     }));
					 //    });
					//
					 //    await Promise.all(promises);
					//
					 //    let finished = false;
					 //    let startIndex = 0;
					//
					 //    while (!finished) {
						//     let slice = events.slice(startIndex, startIndex + sliceSize);
					//
						//     if (slice.length > 0) {
						// 	    await this.$apollo.mutate({
						// 		    mutation: gql`mutation eventCreateMany($events: String!) {
                     //                  eventCreateMany(events: $events) {
                     //                    id
                     //                  }
                     //                }`,
						// 		    variables: {
						// 			    events: JSON.stringify(slice)
						// 		    }
						// 	    });
						//     }
					//
						//     startIndex += sliceSize;
					//
						//     if (slice.length < sliceSize) {
						// 	    finished = true;
						//     }
					 //    }
					//
					 //    _.pull(this.$store.state.whitelistPending, this.$data.domain);
					 //    this.$store.state.whitelistHistory.push(this.$data.domain);
					//
					 //    this.$store.dispatch({
						//     type: 'saveUserSettings'
					 //    });
				    // }
			    }
		    },

		    deleteWhitelistEntry: function() {
		    	if (this.$data.connection && this.$data.connection.enabled === true) {
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
                                enabled
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
                                    id,
                                    enabled
                                }
                            }`,
                        variables: {
                            browser: bowser.name
                        }
                    });

                    this.$store.state.whitelist = [];
                    this.$store.state.whitelistPending = [];
                    this.$store.state.whitelistHistory = [];

	                this.$store.dispatch({
		                type: 'saveUserSettings'
	                });
                }

                this.$data.connection = existingBrowserConnection;
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

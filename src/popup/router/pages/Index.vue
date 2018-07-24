<template>
  <div class="flexbox flex-column flex-x-center">
    <div class="margin-bottom-1em" style="text-align: center;">
      <a href="https://app.lifescope.io" target="_blank">
        <div v-if="$data.loggedIn === false">Log in to LifeScope to enable this extension</div>
        <div v-else-if="$data.loggedIn === true">You are logged into LifeScope</div>
      </a>
    </div>
    <div class="flexbox">
      <button v-if="domainWhitelisted === true" class="danger margin-bottom-1em" v-on:click="deleteDomainWhitelistEntry" style="margin-right: 0.5em;">Stop tracking this domain</button>
      <button v-else-if="domainWhitelisted === false" class="primary margin-bottom-1em" v-on:click="addDomainWhitelistEntry" style="margin-right: 0.5em">Start tracking this domain</button>
      <button v-if="siteWhitelisted === true" class="danger margin-bottom-1em" v-on:click="deleteSiteWhitelistEntry">Stop tracking this site</button>
      <button v-else-if="siteWhitelisted === false" class="primary margin-bottom-1em" v-on:click="addSiteWhitelistEntry">Start tracking this site</button>
    </div>
    <button v-on:click="openOptionsPage">Open Extension Options</button>

    <div id="tagging" class="flexbox flex-column flex-x-center content padded actions" v-if="domainWhitelisted === true && $data.loggedIn === true">
      <div class="flexbox flex-x-center">
        <div class="title">#Tag this page</div>
        <i class="fa fa-question-circle"><a href="lifescope.io/how-to" target="_blank"></a></i>
      </div>

      <div class="tagging">
        <form v-on:submit.prevent="addTag">
          <div>Tags</div>
          <div class="add-tag">
            <span>#</span>
            <input type="text" placeholder="Add a tag" v-model="tagName">
            <i class="fa fa-plus" v-on:click="addTag"></i>
          </div>
          <div class="tags">
            <div v-if="$data.item && $data.item.tags" v-for="tag in $data.item.tags">
              <span v-on:click="searchTag(tag)">#{{ tag }}</span>
              <i class="delete fa fa-times" v-on:click="removeTag(tag)"></i>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
	import url from 'url';

	import _ from 'lodash';
	import bowser from 'bowser';
	import gql from 'graphql-tag';

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

	let domainRegex = /([a-zA-Z0-9]+\.)+[a-zA-Z0-9]+/;
	let siteRegex = /([a-zA-Z0-9]+\.)+[a-zA-Z0-9]+(\/([.a-zA-Z0-9_-~!$&'()*+,;=:@])+)+\/?$/;

    export default {
        data() {
          return {
          	  loggedIn: false,
          	  connection: {},
          	  domain: null,
              url: null,
              item: {},
              tagName: null
          };
        },

        computed: {
	        domainWhitelisted: function() {
	        	let self = this;
		        let whitelistHit = false;

		        _.each(this.$store.state.whitelist, function(item) {
			        let domainRegex = new RegExp(item);

			        if (domainRegex.test(self.$data.domain) === true) {
				        whitelistHit = true;

				        return;
			        }
		        });

		        return whitelistHit;
	        },

	        siteWhitelisted: function() {
		        let self = this;
		        let whitelistHit = false;

		        _.each(this.$store.state.whitelist, function(item) {
			        let parsedUrl = url.parse('//' + item, false, true);

			        if (parsedUrl.host && parsedUrl.path) {
				        let condensedUrl = parsedUrl.host + parsedUrl.path;

				        let tempRegex = new RegExp(condensedUrl);

				        if (siteRegex.test(item) === true && tempRegex.test(self.$data.url) === true) {
					        whitelistHit = true;

					        return;
				        }
			        }
		        });

		        return whitelistHit;
	        },
        },

	    methods: {
		    addDomainWhitelistEntry: async function() {
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

		    deleteDomainWhitelistEntry: function() {
				let self = this;

                _.eachRight(this.$store.state.whitelist, function(item, i) {
                	let domainRegex = new RegExp(item);

                	if (domainRegex.test(self.$data.domain) === true) {
		                self.$store.state.whitelist.splice(i, 1);
                    }
                });

				// let index = _.findIndex(this.$store.state.whitelist, function(item) {
				// 	return item === self.$data.domain;
				// });

                this.$store.dispatch({
                    type: 'saveUserSettings'
                });
		    },

		    addSiteWhitelistEntry: async function() {
			    if (this.$data.url.match(siteRegex) == null) {
				    return;
			    }

			    let parsedUrl = url.parse(this.$data.url);

			    let condensedUrl = parsedUrl.host + parsedUrl.path;

			    let domainWhitelistExists = this.$store.state.whitelist.indexOf(condensedUrl);

			    if (domainWhitelistExists === -1) {
				    this.$store.state.whitelist.push(condensedUrl);

				    this.$store.dispatch({
					    type: 'saveUserSettings'
				    });
			    }
		    },

		    deleteSiteWhitelistEntry: function() {
			    let self = this;

			    let parsedUrl = url.parse(this.$data.url);

			    let condensedUrl = parsedUrl.host + parsedUrl.path;

			    let index = _.findIndex(this.$store.state.whitelist, function(item) {
				    return item === condensedUrl;
			    });

			    if (index >= 0) {
				    this.$store.state.whitelist.splice(index, 1);

				    this.$store.dispatch({
					    type: 'saveUserSettings'
				    });
			    }
		    },

            openOptionsPage: function() {
		    	if (currentBrowser.runtime.openOptionsPage) {
				    currentBrowser.runtime.openOptionsPage();
			    }
			    else {
				    window.open(currentBrowser.runtime.getURL('options.html'));
                }
            },

		    addTag: async function() {
			    let strippedTag = this.$data.tagName.replace(/[^a-zA-Z0-9\s-]/, '').replace(/\s+/g, ' ');
			    let slugifiedTag = strippedTag.toLowerCase().replace(/\s/g, '-');

			    if (slugifiedTag.length === 0) {
				    this.$data.tagName = 0;

				    return;
			    }

			    await this.$apollo.mutate({
				    mutation: gql`mutation tagContent($id: String, $tags: [String]) {
						tagContent (id: $id, tags: $tags) {
						  id
						}
					}`,
				    variables: {
					    id: this.$data.item.id,
					    tags: [slugifiedTag]
				    }
			    });

			    if (!this.$data.item.tagMasks) {
				    this.$data.item.tagMasks = {};
			    }

			    if (this.$data.item.tagMasks && !this.$data.item.tagMasks.added) {
				    this.$data.item.tagMasks.added = [];
			    }

			    if (this.$data.item.tagMasks && !this.$data.item.tagMasks.removed) {
				    this.$data.item.tagMasks.removed = [];
			    }

			    let addedIndex = _.findIndex(this.$data.item.tagMasks.added, function(item) {
				    return item === strippedTag;
			    });

			    let removedIndex = _.findIndex(this.$data.item.tagMasks.removed, function(item) {
				    return item === strippedTag;
			    });

			    if (addedIndex === -1) {
				    this.$data.item.tagMasks.added.push(strippedTag);
			    }

			    if (removedIndex >= 0) {
				    this.$data.item.tagMasks.removed.splice(removedIndex, 1);
			    }

			    this.$data.tagName = '';
		    },

		    removeTag: async function(tag) {
			    let strippedTag = tag.replace(/[^a-zA-Z0-9\s-]/, '').replace(/\s+/g, ' ');
			    let slugifiedTag = strippedTag.toLowerCase().replace(/\s/g, '-');

			    await this.$apollo.mutate({
				    mutation: gql`mutation untagContent($id: String, $tags: [String]) {
						untagContent (id: $id, tags: $tags) {
						  id
						}
					}`,
				    variables: {
					    id: this.$data.item.id,
					    tags: [slugifiedTag]
				    }
			    });

			    if (!this.$data.item.tagMasks) {
				    this.$data.item.tagMasks = {};
			    }

			    if (this.$data.item.tagMasks && !this.$data.item.tagMasks.added) {
				    this.$data.item.tagMasks.added = [];
			    }

			    if (this.$data.item.tagMasks && !this.$data.item.tagMasks.removed) {
				    this.$data.item.tagMasks.removed = [];
			    }

			    let addedIndex = _.findIndex(this.$data.item.tagMasks.added, function(item) {
				    return item === strippedTag;
			    });

			    let removedIndex = _.findIndex(this.$data.item.tagMasks.removed, function(item) {
				    return item === strippedTag;
			    });

			    if (addedIndex >= 0) {
				    this.$data.item.tagMasks.added.splice(addedIndex, 1);
			    }

			    if (removedIndex === -1) {
				    this.$data.item.tagMasks.removed.push(strippedTag);
			    }
		    },

            searchTag: async function(tag) {
		    	let result = await this.$apollo.mutate({
                    mutation: gql`mutation searchUpsert($query: String, $filters: String, $favorited: Boolean, $icon: String, $icon_color: String, $name: String){
                        searchUpsert(filters: $filters, query: $query, favorited: $favorited, icon: $icon, icon_color: $icon_color, name: $name) {
                            id
                        }
                    }`,
                    variables: {
                    	query: '#' + tag
                    }
                });

		    	let data = result.data.searchUpsert;

		    	if (data && data.id) {
		    		window.open('https://app.lifescope.io/explore?qid=' + data.id);
                }
            }
	    },

        beforeMount: async function() {
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
            	this.$data.loggedIn = true;

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
            	this.$data.loggedIn = false;
            	this.$data.connection = {};
			}

	        let active;

	        await new Promise(function(resolve, reject) {
		        currentBrowser.tabs.query({
			        active: true
		        }, function(tab) {
			        active = tab[0].url;

			        resolve();
		        });
	        });

	        if (this.$data.connection) {
		        let content = await $apollo.query({
			        query: gql`query contentFindByIdentifier($identifier: String!) {
                      contentFindByIdentifier(identifier: $identifier) {
                        id,
                        tagMasks {
                          added,
                          removed,
                          source
                        }
                      }
                    }`,
			        variables: {
				        identifier: this.$data.connection.id + ':::' + bowser.name + ':::' + active,
			        }
		        });

		        let item = _.get(content, 'data.contentFindByIdentifier');

		        if (item != null) {
			        Object.defineProperty(item, 'tags', {
				        get: function() {
					        let tags = [];

					        if (item.tagMasks) {
						        _.forEach(item.tagMasks.source, function(tag) {
							        if (tags.indexOf(tag) === -1) {
								        tags.push(tag);
							        }
						        });

						        _.forEach(item.tagMasks.added, function(tag) {
							        if (tags.indexOf(tag) === -1) {
								        tags.push(tag);
							        }
						        });

						        _.forEach(item.tagMasks.removed, function(tag) {
							        let index = tags.indexOf(tag);

							        if (index > -1) {
								        tags.splice(index, 1);
							        }
						        });
					        }

					        return tags;
				        }
			        });

			        this.$data.item = item;
		        }
	        }
        }
    };
</script>

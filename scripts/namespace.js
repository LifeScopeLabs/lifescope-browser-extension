this.BH = {
  Views: {},
  Modals: {},
  Lib: {},
  Trackers: {},
  Presenters: {},
  Templates: {},
  Init: {},
  Chrome: {},
  lang: 'en',
  version: null
};

if(chrome && chrome.runtime && chrome.runtime.getManifest) {
  this.BH.version = chrome.runtime.getManifest().version;
}

(function() {
  var BrowserActions = function(options) {
    if(!options.chrome) {
      throw("Chrome API not set");
    }
    if(!options.tracker) {
      throw("Tracker not set");
    }

    this.chromeAPI = options.chrome;
    this.tracker = options.tracker;
  };

  BrowserActions.prototype.listen = function() {
    var _this = this;
    if(this.chromeAPI.browserAction) {
      this.chromeAPI.browserAction.onClicked.addListener(function() {
        _this.openHistory();
      });
    }
  };

  BrowserActions.prototype.openHistory = function() {
    this.tracker.browserActionClick();
    this.chromeAPI.tabs.create({url: 'chrome://history'});
  };

  BH.Chrome.BrowserActions = BrowserActions;
})();

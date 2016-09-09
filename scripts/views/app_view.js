(function() {
  var AppView = Backbone.View.extend({
    className: 'app_view',

    template: 'app.html',

    initialize: function() {
      this.menuView = new BH.Views.MenuView();
    },

    render: function(cb) {
      var template = BH.Lib.Template.fetch(this.template);
      var html = Mustache.to_html(template, this.getI18nValues());
      this.$el.html(html);
      this.$('.navigation').append(this.menuView.render().el);
      return this;
    },

    selectNav: function(selector) {
      this.menuView.select(selector);
    },

    getI18nValues: function() {
      return BH.Chrome.I18n.t(['history_title']);
    }
  });

  BH.Views.AppView = AppView;
})();

var GVRouter = Backbone.Router.extend({
  routes: {
    "twitter_accounts": "twitter_accounts",
    "categories": "categories"
  },
  
  twitter_accounts: function(){
    $("#frame").html(gvTwitterAccountsView.el);
    gvTwitterAccountsView.render();
  },

  categories: function(){
    $("#frame").html(gvCategoriesView.el);
    gvCategoriesView.render();
  },
});

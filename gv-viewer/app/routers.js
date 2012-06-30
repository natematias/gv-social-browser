var GVRouter = Backbone.Router.extend({
  routes: {
    "twitter_accounts": "twitter_accounts"
  },
  
  twitter_accounts: function(){
    $("#frame").html(gvTwitterAccountsView.el);
    twitterAccounts.render();
  },
});

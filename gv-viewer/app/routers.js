var GVRouter = Backbone.Router.extend({
  routes: {
    "twitter_accounts": "twitter_accounts",
    "categories/:category": "categories",
    "categories": "nocategory"
  },
  
  twitter_accounts: function(){
    $("#frame").html(gvTwitterAccountsView.el);
    gvTwitterAccountsView.render();
  },

  nocategory: function(){
    this.categories(null);
  },

  categories: function(category){
    $("#frame").html(gvCategoriesView.el);
    $("#twitter_account").remove();
    gvCategoriesView.render(category);
  },
});

window.launch();

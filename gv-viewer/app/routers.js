var GVRouter = Backbone.Router.extend({
  routes: {
    ":category": "categories",
    "": "nocategory"
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

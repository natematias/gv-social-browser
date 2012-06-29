//View ListView
var GVDataView = Backbone.View.extend({
     
  events: function() {
/*      "click #discard": "restartSurvey",
      "click #save_survey": "saveSurvey",
      "click #data_button": "displayData",
      "click #toggle_connection": "toggleConnection",
    }*/
  },

  initialize: function(){
    _.bindAll(this, 'render');
    this.twitter_account_row = _.template($("#twitter_account_rows").html());
    this.twitter_accounts = null;
    this.accounts_by_posts = [];
    this.accounts_by_collocation = [];
    this.render();
  },

  render: function(){
   that = this;
   $(this.el).load("templates/twitter_accounts.template", function(){
     that.loadTwitterData();
   });
    return this;
  },

  loadTwitterData: function(){
    that = this;
    jQuery.getJSON("data/twitter_accounts.json", function(data){
      that.twitter_accounts = data;
      that.renderTwitterData();
    });
  },

  renderTwitterData: function(){
    that = this;
    var datatable = $("#datatable")
    $.each(this.twitter_accounts, function(account_name, account){
      datatable.append(that.twitter_account_row(account));
    });
  }
});

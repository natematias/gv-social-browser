var GVTwitterAccountsView = Backbone.View.extend({
     
  events: function() {
    return {
    "click #collocation_sort": "collocation_sort",
    "click #posts_sort": "posts_sort",
    "click .twitter_account": "view_twitter_account",
    "click #close_twitter_account": "close_twitter_account"
/*      "click #discard": "restartSurvey",
      "click #save_survey": "saveSurvey",
      "click #data_button": "displayData",
      "click #toggle_connection": "toggleConnection",*/
    }
  },

  initialize: function(){
    _.bindAll(this, 'render');
    this.twitter_account_row = _.template($("#twitter_account_rows").html());
    this.twitter_account_head = _.template($("#twitter_account_head").html());
    this.twitter_link_template = _.template('<a class="btn btn-mini btn-info" href="http://twitter.com/#!/<%=account%>">@<%=account%></a>');
    this.post_link_template = _.template('<div><a href="<%=post.link%>"><%=post.title%></a></div>')
    this.twitter_accounts = null;
    this.accounts_by_posts = [];
    this.accounts_by_collocation = [];
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
      that.twitter_accounts = crossfilter(data);
      that.collocated_accounts = that.twitter_accounts.dimension(function(d){return d.collocation_count});
      that.account_posts = that.twitter_accounts.dimension(function(d){return d.posts_count});
      that.begin_date = that.twitter_accounts.dimension(function(d){return new Date(Date.parse(d.first_date))});
      that.end_date = that.twitter_accounts.dimension(function(d){return new Date(Date.parse(d.end_date))});
      that.date_range = that.twitter_accounts.dimension(function(d){return new Date(Date.parse(d.date_range))});
      that.account_name = that.twitter_accounts.dimension(function(d){return d.account});
      that.posts_sort();
    });
  },

  view_twitter_account: function(e){
    that = this;
    var account_button = $(e.target);
    var account_name = account_button.html();
    this.account_name.filter(account_name); //horrible kluge
    var account = this.account_name.top(1)[0];//any better way to select?
    this.account_name.filter(null);//reset filter
    var twitter_accounts_html = "";
    
    // now open the window
    $.ajax({url:"templates/twitter_account.template",
                type: "GET",
                dataType: "text",
                success: function(data){
                  twitter_account_template = _.template(data);
                  $(that.el).append(twitter_account_template(account));
 
                  //now show twitter collocations
                  $.each(account.collocations, function(account, weight){
                    twitter_accounts_html += that.twitter_link_template({account:account});
                  });
                  $('#twitter_collocations').append(twitter_accounts_html);
                  $.each(account.posts, function(post_id, title){
                    //now show the post links
                    jQuery.getJSON("data/postdata/" + post_id + ".json", function(data){
                      $('#post_links').append(that.post_link_template({post:data}));
                    });
                  });
                }
      });
  },

  close_twitter_account: function(e){
    $("#twitter_account").remove();
  },

  collocation_sort: function(){
    this.renderTwitterData(this.collocated_accounts.top(400));
  },
  
  posts_sort: function(){
    this.renderTwitterData(this.account_posts.top(400));
  },

  renderTwitterData: function(dimension){
    that = this;
    var datatable = $("#datatable")
    datatable.empty();
    datatable.append(that.twitter_account_head());
    $.each(dimension, function(account_name, account){
      datatable.append(that.twitter_account_row(account));
    });
  }
});

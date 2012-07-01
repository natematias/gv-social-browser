var GVCategoriesView = Backbone.View.extend({
     
  events: function() {
    return {
      "click .category": "select_category",
      "click #posts_date_sort": "posts_date_sort",
      "click #posts_tweet_sort": "posts_tweet_sort",
      "click .post": "view_post",
      "click #close_post": "close_post"
    }
  },

  initialize: function(){
    _.bindAll(this, 'render');
    that = this;
    this.category_link = _.template('<div class="btn btn-mini category"><%=category%></div>');
    this.category_post_head = _.template($("#category_post_head").html());
    this.category_post = _.template($("#category_post").html());
    jQuery.getJSON("data/categories.json", function(data){
      that.categories = data;
    });
    this.render();
  },

  render: function(){
    that = this;
    $(this.el).load("templates/categories.template", function(){
      var category_element = $('#categories');
      $.each(that.categories, function(category){
        category_element.append(that.category_link({category:that.categories[category]}));
      });
    });
    return this;
  },

  select_category: function(e){
    that = this;
    category_option = $(e.target); 
    category = category_option.html();
    jQuery.getJSON("data/categories/" + category + ".json", function(data){
      that.category_data = crossfilter(data);
      that.publication_dates = that.category_data.dimension(function(d){return new Date(Date.parse(d.publication_date))});
      that.twitter_accounts = that.category_data.dimension(function(d){return d.twitter_accounts.length});
      that.post_ids = that.category_data.dimension(function(d){return d.post_id});
      that.renderCategoryPosts(that.publication_dates.top(200));
    });

    $('.category').removeClass("btn-inverse");
    category_option.addClass("btn-inverse")
  },
  
  renderCategoryPosts: function(dimension){
    that = this;
    var datatable = $("#datatable");
    datatable.empty();
    datatable.append(this.category_post_head());
    $.each(dimension, function(key, post){
      datatable.append(that.category_post({post:post}));
    });
  },

  view_post: function(e){
    var that = this;
    post_row = $(e.target).parent();
    post_id = post_row.attr("id");

    this.post_ids.filter(post_id);// horrible kluge
    var post = this.post_ids.top(1)[0];//any better way to select?
    this.post_ids.filter(null); // reset filter
    
    jQuery.getJSON("data/postdata/" + post_id + ".json", function(data){
      var post_data = data;// probably unnecessary
      $.ajax({url:"templates/post.template",
              type: "GET",
              dataType: "text",
              success: function(data){
                post_template = _.template(data);
                $(that.el).append(post_template({post:post_data}));
              }
            });
      });
  },
 
  close_post: function(e){
    $("#post").remove();
  },
 
  posts_tweet_sort: function(){
    this.renderCategoryPosts(this.twitter_accounts.top(200));
  },

  posts_date_sort: function(){
    this.renderCategoryPosts(this.publication_dates.top(200));
  },
});

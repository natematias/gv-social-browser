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
    var that = this;
    this.category_link = _.template('<div class="btn btn-mini category"><%=category%></div>');
    this.category_post_head = _.template($("#category_post_head").html());
    this.category_post = _.template($("#category_post").html());
    this.yearweek = d3.time.format("%Y%U");
    jQuery.getJSON("data/categories.json", function(data){
      that.categories = data;
    });
    this.render();
  },

  render: function(){
    var that = this;
    $(this.el).load("templates/categories.template", function(){
      var category_element = $('#categories');
      $.each(that.categories, function(category){
        category_element.append(that.category_link({category:that.categories[category]}));
      });
    });
    return this;
  },

  select_category: function(e){
    var that = this;
    category_option = $(e.target); 
    category = category_option.html();
    jQuery.getJSON("data/categories/" + category + ".json", function(data){
      that.category_data = crossfilter(data);
      that.publication_dates = that.category_data.dimension(function(d){return d3.time.day(new Date(d.publication_date))});      
      that.publication_days = that.publication_dates.group(function(date){return that.yearweek(date)});
      that.twitter_accounts = that.category_data.dimension(function(d){return d.twitter_accounts.length});
      that.twitter_group = that.publication_dates.group(function(date){return that.yearweek(date)});
      that.twitter_days = that.twitter_group.reduce(function(p,v){return p+v.twitter_accounts.length}, function(p,v){return p-v.twitter_accounts.length}, function(p,v){return 0;});
      //that.twitter_days = that.twitter_accounts.group(function(date){return that.yearweek(date)});
      that.post_ids = that.category_data.dimension(function(d){return d.post_id});
      that.renderCategoryPosts(that.publication_dates.top(200));
      that.renderCategoryTimeseries(that.publication_dates.top(null));
    });

    $('.category').removeClass("btn-inverse");
    category_option.addClass("btn-inverse")
  },

  renderCategoryTimeseries: function(dimension){
    var that = this;
    nv.addGraph(function() {
      var timeseries = nv.models.multiBarChart();
 
      timeseries.xAxis.tickFormat(d3.format(',f'));
 
      timeseries.yAxis.tickFormat(d3.format(',.1f'));
 
      x= that.exampleData();
      d3.select('#category_timeseries svg').datum(x)
       .transition().duration(500).call(timeseries);
 
      nv.utils.windowResize(timeseries.update);
 
      return timeseries;
    });
  },

  // this is going to be ugly
  buildWeekData:function(data_group){
    var that = this;
    this.earliest_week = this.publication_dates.group().all()[0].key;
    this.last_week = new Date(that.publication_dates.top(1)[0].publication_date);
    var getWeek = d3.time.format("%U");
    graphdata = new Array();
    var start_year = this.earliest_week.getFullYear();
    var start_week = parseInt(getWeek(this.earliest_week));
    var end_year = this.last_week.getFullYear();
    var end_week = parseInt(getWeek(this.last_week));
    var current_week_record = 0;
    var current_week = data_group.all()[current_week_record]
    var incrementor = 0;
    for(var year = start_year; year <= end_year; year++){
      for(week = start_week; true; week++){
        full_week = year.toString() + ("0" + week).slice (-2); //week.toString();
        if(current_week!=null && full_week == current_week.key){
          graphdata.push({x:incrementor, y:current_week.value});
          current_week_record++;
          current_week = data_group.all()[current_week_record];
          if(current_week_record >= data_group.all().length){
            current_week = null;
            break;
          }
        }else{
          graphdata.push({x:incrementor, y:0});
        }
        if(week >= 52){
          start_week=0;
          break;
        }
        incrementor ++;
      }
      if(current_week==null){
        break;
      }
    }
    return graphdata;
  },

  exampleData: function() {
    return [{
      key: "Posts",
      values: this.buildWeekData(this.publication_days)
    },{key:"A", values:[]},
    {key: "Twitter Accts",
     values: this.buildWeekData(this.twitter_days)
    }];
 },
  
  renderCategoryPosts: function(dimension){
    var that = this;
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

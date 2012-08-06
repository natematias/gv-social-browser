var GVCategoriesView = Backbone.View.extend({
     
  events: function() {
    return {
      "click #twitter_collocation_sort": "twitter_collocation_sort",
      "click #twitter_posts_sort": "twitter_posts_sort",
      "click #twitter_cat_collocation_sort": "twitter_cat_collocation_sort",
      "click #twitter_cat_posts_sort": "twitter_cat_posts_sort",
      "click #posts_date_sort": "posts_date_sort",
      "click #posts_tweet_sort": "posts_tweet_sort",
      "click .post": "view_post",
      "click #close_post": "close_post",
      "click #close_twitter_account": "close_twitter_account",
      "click #toggle_post": "toggle_post",
      "click #select_categories": "select_categories",
      "click .twitter_account": "view_twitter_account",
    }
  },

  initialize: function(){
    _.bindAll(this, 'render');
    var that = this;

    this.category_link = _.template('<a href="#/categories/<%=category%>"><div class="btn btn-mini category" id="<%=category%>btn"><%=category%></div></a>');
    this.twitter_account_template = _.template('<a class="label <%=labeltype%> twitter_account_template" href="http://twitter.com/#!/<%=account%>"><%=account%></a>');
    this.category_weight_template = _.template('<a class="label <%=labeltype%> twitter_account_template" href="#/categories/<%=category%>"><%=category%> (<%=count%>)</a>');
    this.datapoint_template = _.template('<div><span class="category_label"><%=label%>: </span> <span class="category_value"><%=value%></span></div>');
    this.twitter_account_row = _.template($("#twitter_account_rows").html());
    this.twitter_account_head = _.template($("#twitter_account_head").html());
    this.category_title = _.template('Whose Voices: <%=category%>');
    this.category_post_head = _.template($("#category_post_head").html());
    this.category_post = _.template($("#category_post").html());
    // abandoned because I want to have all posts for an account listed, not just for that category
    //this.post_link_template = _.template('<div><a class="twitter_post" id="tp<%=post.post_id%>"><%=post.title%></a></div>')
    this.post_link_template = _.template('<div><a class="twitter_post" href="<%=post.link%>"><%=post.title%></a></div>')


    this.yearweek = d3.time.format("%Y%U");

    jQuery.getJSON("data/categories.json", function(data){
      that.categories = data;
    });
    this.render(null);
  },

  render: function(category){
    var that = this;
    if($('#category_title').size()==0){
      $(this.el).load("templates/categories.template", function(){
        var category_element = $('#categories');
        if(category_element.is(':visible')){
          category_element.hide();
        }
        $.each(that.categories, function(category){
          category_element.append(that.category_link({category:that.categories[category]}));
        });
        if(category!=null){
          btn = $('#' + category + "btn");
          that.select_category({"target":btn[0]});
        }
      });
    }else{
      var category_element = $('#categories');
      if(category_element.is(':visible')){
        category_element.hide();
      }
      if(category!=null){
        btn = $('#' + category + "btn");
        that.select_category({"target":btn[0]});
      }
    }
    this.delegateEvents();
    return this;
  },

  select_categories: function(e){
    selection_button=$(e.target);
    categories = $('#categories');
    if(categories.is(':visible')){
      categories.hide();
    }else{
     categories.show();
    }
  },

  select_category: function(e){
    var that = this;
    category_option = $(e.target); 
    this.category = category = category_option.html();
    $('#category_title').html( this.category_title({category:category}));
    $('#category_stats').empty();

    // load category posts
    jQuery.getJSON("data/categories/" + category + ".json", function(data){
      that.category_data = crossfilter(data);
      that.publication_dates = that.category_data.dimension(function(d){return d3.time.day(new Date(d.publication_date))});      
      that.publication_days = that.publication_dates.group(function(date){return that.yearweek(date)});
      that.twitter_accounts = that.category_data.dimension(function(d){return d.twitter_accounts.length});
      that.twitter_group = that.publication_dates.group(function(date){return that.yearweek(date)});
      that.twitter_days = that.twitter_group.reduce(function(p,v){return p+v.twitter_accounts.length}, function(p,v){return p-v.twitter_accounts.length}, function(p,v){return 0;});
      //that.twitter_days = that.twitter_accounts.group(function(date){return that.yearweek(date)});
      that.post_ids = that.category_data.dimension(function(d){return d.post_id});
      that.renderCategoryPosts(that.publication_dates.top(400));
      that.renderCategoryTimeseries(that.publication_dates.top(null));
      that.post_total = data.length;
      $('#category_stats').append(that.datapoint_template({label:"Total Posts", value:that.post_total}));
    });

    // load category twitter data
    jQuery.getJSON("data/twitter/" + category + "_twitter.json", function(data){
      that.twitter_data = crossfilter(data);
      that.twitter_posts = that.twitter_data.dimension(function(d){return d.posts_count});      
      that.twitter_collocations = that.twitter_data.dimension(function(d){return d.collocation_count});
      that.twitter_cat_collocations = that.twitter_data.dimension(function(d){return _.size(d.category_collocations)});
      that.twitter_cat_posts = that.twitter_data.dimension(function(d){return d.category_posts_count});
      that.account_name = that.twitter_data.dimension(function(d){return d.account});
      that.twitter_posts_sort();
      that.category_account_total = data.length;
      $('#category_stats').append(that.datapoint_template({label:"Twitter Accounts Cited", value:that.category_account_total}));
    });


    $('.category').removeClass("btn-inverse");
    //$('#categories').hide();
    category_option.addClass("btn-inverse")
    console.log("made it to the end!");
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
                  account.category = that.category;// add category to template object
                  $(that.el).append(twitter_account_template(account));

                  //now show all twitter collocations
                  $.each(account.collocations, function(account, weight){
                    twitter_accounts_html += that.twitter_account_template({account:account, labeltype:""});
                  });
                  $('#all_twitter_collocations').append(twitter_accounts_html);
                  twitter_accounts_html ="";

                  //show category twitter collocations
                  $.each(account.category_collocations, function(account, weight){
                    twitter_accounts_html += that.twitter_account_template({account:account, labeltype:"label-inverse"});
                  });
                  $('#category_twitter_collocations').append(twitter_accounts_html);

                  category_weight_html = "";
                  $.each(account.categories, function(category, weight){
                    category_weight_html += that.category_weight_template({category:category, labeltype:"label-info", count:weight});
                  });
                  $('#all_categories').append(category_weight_html);

                  window.scrollTo(0,80);
                  $.each(account.posts, function(post_id, title){
                    //now show the post links
                    jQuery.getJSON("data/postdata/" + post_id + ".json", function(data){
                      $('#post_links').append(that.post_link_template({post:data}));
                    });
                  });
                }
      });
  },

  twitter_posts_sort: function(){
   this.render_twitter_table(this.twitter_posts.top(400))
  },

  twitter_collocation_sort: function(){
   this.render_twitter_table(this.twitter_collocations.top(400))
  },

  twitter_cat_collocation_sort: function(){
   this.render_twitter_table(this.twitter_cat_collocations.top(400))
  },

  twitter_cat_posts_sort: function(){
   this.render_twitter_table(this.twitter_cat_posts.top(400))
  },

  close_twitter_account: function(e){
    $("#twitter_account").remove();
  },

  render_twitter_table: function(dimension){
    that = this;
    var twitter_table = $("#twitter_table")
    twitter_table.empty();
    twitter_table.append(that.twitter_account_head());
    $.each(dimension, function(account_name, account){
      twitter_table.append(that.twitter_account_row(account));
    });
  },

  findNameInArray: function(array, name){
    var return_value = -1;
    var i = 0;
    $.each(array, function(key, value){
      if(name==value.name){
        return_value = i;
        return false; //to break the loop
      }
      i++;
    });
    return return_value;
  },

  incrementLink: function(hash, a_index, b_index){
    var found = false;
    $.each(hash.links, function(index, link){
      if( (link.source == a_index && link.target == b_index) || (link.source == b_index && link.target == a_index)){
        link.value++;
        found = true;
        return false;//to break the loop
      }
    });
    if(found == false){
      hash.links.push({source: a_index, target:b_index, value:1});
    }
  },

  renderCategoryTimeseries: function(dimension){
    var that = this;
    $("#post_volume_label").html("Number of Posts, per week, in Global Voices " + this.category + ":")
    $("#twitter_volume_label").html("Unique Twitter Accounts Cited, per week, in Global Voices " + this.category + ":")
    nv.addGraph(function() {
      var post_graph = nv.models.multiBarChart();
      var twitter_graph = nv.models.multiBarChart();
      post_graph.height=160;
      twitter_graph.height=160;

      post_data = [{ key: "Number of " + that.category + " posts, per week", values: that.buildWeekData(that.publication_days)}]
      twitter_data = [{key: "Twitter accounts cited in " + that.category + ", per week", values: that.buildWeekData(that.twitter_days) }];
 
      //post_graph.xAxis.tickFormat(d3.format(',f'));
      var monthyear = d3.time.format("%b, %Y");
      post_graph.xAxis.tickFormat(function(d){
        date = post_data[0].values[d].date;
        return monthyear(date);
      });

      twitter_graph.xAxis.tickFormat(function(d){
        return monthyear(post_data[0].values[d].date);
      });
      //twitter_graph.xAxis.tickFormat(d3.format('d'));
 
      post_graph.yAxis.tickFormat(d3.format(',.1f'));
      twitter_graph.yAxis.tickFormat(d3.format(',.1f'));

     
 
      d3.select('#post_timeseries svg').datum(post_data)
       .transition().duration(500).call(post_graph);
      d3.select('#twitter_timeseries svg').datum(twitter_data)
       .transition().duration(500).call(twitter_graph);
 
      nv.utils.windowResize(post_graph.update);
      nv.utils.windowResize(twitter_graph.update);
    });
  },

  // this is going to be ugly
  buildWeekData:function(data_group){
    var that = this;
    //this.earliest_week = this.publication_dates.group().all()[0].key;
    // WED 27 Oct 2004 was the date of the very first GV post
    this.earliest_week = new Date('Wed, 27 Oct 2004');
    //this.last_week = new Date(that.publication_dates.top(1)[0].publication_date);
    // the 22nd of May is the last date in the dataset from Jer
    this.last_week = new Date("31 July 2012");
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
      date_object = new Date("1 Jan " + year);
      date_object.setDate(date_object.getDate()+7*start_week);
      for(week = start_week; true; week++){
        full_week = year.toString() + ("0" + week).slice (-2); //week.toString();
        if(current_week!=null && full_week == current_week.key){
          graphdata.push({x:incrementor, y:current_week.value, week:full_week, date:new Date(date_object)});
          current_week_record++;
          current_week = data_group.all()[current_week_record];
          if(current_week_record >= data_group.all().length){
            current_week = null;
            break;
          }
        }else{
          graphdata.push({x:incrementor, y:0, date:date_object});
        }
        date_object.setDate(date_object.getDate()+7);
        incrementor++;
        if(week >= 52){
          start_week=0;
          break;
        }
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
    var post_table = $("#post_table");
    post_table.empty();
    post_table.append(this.category_post_head());
    $.each(dimension, function(key, post){
      post_table.append(that.category_post({post:post}));
    });
  },

  view_post: function(e){
    var that = this;
    post_row = $(e.target).parent();
    post_id = post_row.attr("id");
    if(post_row.attr("id") ==undefined){
      post_id = $(e.target).attr("id")
      post_id = post_id.substring(2,post_id.length);
    }

    this.post_ids.filter(post_id);// horrible kluge
    var post = this.post_ids.top(1)[0];//any better way to select?
    this.post_ids.filter(null); // reset filter

    var twitter_accounts_html = "";
    $.each(post.twitter_accounts, function(key, account){
      // first array item due to a bug in the data production code
      twitter_accounts_html += that.twitter_account_template({labeltype:"",account:account});
    });
    
    jQuery.getJSON("data/postdata/" + post_id + ".json", function(data){
      var post_data = data;// probably unnecessary
      $.ajax({url:"templates/post.template",
              type: "GET",
              dataType: "text",
              success: function(data){
                post_template = _.template(data);
                $(that.el).append(post_template({post:post_data}));
                $('#post_twitter_accounts').after(twitter_accounts_html);
                $('#post_content').hide()
                window.scrollTo(0, 80);
              }
            });
      });
  },

  toggle_post: function(e){
    post = $("#post_content");
    if(post.is(":visible")){
      post.hide();
    }else{
      post.show();
    }
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

var GVCategoriesView = Backbone.View.extend({
     
  events: function() {
    return {
      "click .category": "select_category",
      "click #posts_date_sort": "posts_date_sort",
      "click #posts_tweet_sort": "posts_tweet_sort",
      "click .post": "view_post",
      "click #close_post": "close_post",
      "click #toggle_post": "toggle_post",
      "click #select_categories": "select_categories",
      "click #render_social_graph": "renderSocialGraph"
    }
  },

  initialize: function(){
    _.bindAll(this, 'render');
    var that = this;
    this.category_link = _.template('<div class="btn btn-mini category"><%=category%></div>');
    this.twitter_account_template = _.template('<a class="btn btn-mini btn-info" href="http://twitter.com/#!/<%=account%>">@<%=account%></a>');
    this.category_title = _.template('Post and Twitter Volume: <%=category%>');
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
      category_element.hide();
      $.each(that.categories, function(category){
        category_element.append(that.category_link({category:that.categories[category]}));
      });
    });
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
    category = category_option.html();
    $('#categories').hide();
    $('#category_title').html( this.category_title({category:category}));

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

  createCategoryTwitterHash: function(dimension){
    var that = this;
    that.category_twitter_hash= {nodes:[], links:[]};
    
    $.each(dimension.top(Infinity), function(key, post){
      for(var a=0; a < post.twitter_accounts.length; a++){
        account_a = post.twitter_accounts[a][0];
        account_a_index = that.findNameInArray(that.category_twitter_hash.nodes, account_a);
        if(account_a_index == -1){ // if it doesn't exist, make it
          that.category_twitter_hash.nodes.push({name: account_a, group:1});
          account_a_index = that.category_twitter_hash.nodes.length;
        }

        for(var b = a+1; b<post.twitter_accounts.length; b++){
          account_b = post.twitter_accounts[b][0];
          account_b_index = that.findNameInArray(that.category_twitter_hash.nodes, account_b);
          if(account_b_index == -1){ // if it doesn't exist, make it
            that.category_twitter_hash.nodes.push({name: account_b, group:1});
            account_b_index = that.category_twitter_hash.nodes.length;
          }
          that.incrementLink(that.category_twitter_hash, account_a_index, account_b_index);
        }
        
      }
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
    nv.addGraph(function() {
      var post_graph = nv.models.multiBarChart();
      var twitter_graph = nv.models.multiBarChart();
      post_graph.height=150;
      twitter_graph.height=150;
 
      post_graph.xAxis.tickFormat(d3.format(',f'));
      twitter_graph.xAxis.tickFormat(d3.format(',f'));
 
      post_graph.yAxis.tickFormat(d3.format(',.1f'));
      twitter_graph.yAxis.tickFormat(d3.format(',.1f'));

      post_data = [{ key: "Posts", values: that.buildWeekData(that.publication_days)}]
      twitter_data = [{key: "Twitter Accts", values: that.buildWeekData(that.twitter_days) }];
     
 
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

    var twitter_accounts_html = "";
    $.each(post.twitter_accounts, function(key, account){
      // first array item due to a bug in the data production code
      twitter_accounts_html += that.twitter_account_template({account:account[0]});
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
              }
            });
      });
  },

  renderSocialGraph: function(){
    this.createCategoryTwitterHash(this.twitter_accounts);
    $("#twitter_graph svg").remove();
    var that= this;
    var width = 960,
        height = 960;

    var color = d3.scale.category20();

    var force = d3.layout.force()
        .charge(-120)
        .linkDistance(5)
        .size([width, height]);

    var svg = d3.select("#twitter_graph").append("svg")
        .attr("width", width)
        .attr("height", height);

    /*d3.json("data/miserables.json", function(json) {*/
      force
          .nodes(that.category_twitter_hash.nodes)
          .links(that.category_twitter_hash.links)
          .start();

      var link = svg.selectAll("line.link")
          .data(that.category_twitter_hash.links)
          .enter().append("line")
          .attr("class", "link")
          .style("stroke-width", function(d) { return Math.sqrt(d.value); });

      var node = svg.selectAll("circle.node")
          .data(that.category_twitter_hash.nodes)
          .enter().append("circle")
          .attr("class", "node")
          .attr("r", 4)
          .style("fill", function(d) { return color(d.group); })
          .call(force.drag);

      node.append("title")
          .text(function(d) { return d.name; });

      force.on("tick", function() {
        link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

        node.attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
      });
    //});
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

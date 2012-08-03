require 'rubygems'
require 'fileutils'
require 'hpricot'
require 'json'

class Archive
  attr_accessor :xml, :authors, :posts

  def initialize(filename)
    xml = Hpricot::XML(File.open(filename).read)
    @authors = {}
    @posts = []
    (xml/'wp:author').each do |author|
      @authors[(author/'wp:author_id').inner_html] = author
    end
    (xml/'item').each do |item|
      @posts << Post.new(item)
    end
  end

end

class Categories
  @@categories = {}
  def Categories.get_categories
    @@categories
  end
  def Categories.add_post post
    begin
    (post.item/'category').each do |category|
      nicename = category.attributes["nicename"]
      if !(@@categories.has_key? nicename)
        @@categories[nicename] = []
      end
      @@categories[nicename] << post
      #puts "adding #{post.title} to #{nicename}"
    end
    rescue
    end
  end

  def Categories.to_hash
    all_categories = {}
    @@categories.each do |category|
      all_categories[category] = []
      category.posts.each do |post|
        all_categories[category] << post.post_id
      end
    end
    all_categories
  end
end

class Post
  attr_accessor :item, :publication_date, :author, :link, :twitter_accounts, :hashtags, :categories, :title, :post_id

  def initialize(item)
    @item = item
    @publication_date = (item/'pubDate').inner_html
    @post_id = (item/'wp:post_id').inner_html
    @title = (item/'title').inner_html
    @link = (item/'link').inner_html
    @content = (item/'content:encoded').text
    self.scan_for_twitter_accounts
    self.scan_for_twitter_hashtags
    Categories.add_post(self)
  end

  def account_is_invalid account
    return (account[0].match(/\//) or account[0].match(/search/) or account[0].match(/\?|\+|&/) or account[0].match(/favicon/) or account[0].strip =="" or account[0].match(/gmail/))
  end


  def scan_for_twitter_accounts
    accounts = []
    naive_accounts = @content.scan(/twitter.com\/\#\!\/(.*?)[\/|"]/)
    naive_accounts.each do |na|
      accounts << na[0] unless account_is_invalid(na)
    end

    cited_accounts = @content.scan(/@(.*?)[\W]/)
    cited_accounts.each do |account|
      accounts << account[0].downcase unless account_is_invalid(account)
    end

    twitter_match = @content.scan(/twitter.com\/(.*?)["]/)
    # only append things that are not false positives
    twitter_match.each do |m|
      accounts << m[0] unless(account_is_invalid(m))
    end
    @twitter_accounts = accounts.uniq
  end

  def scan_for_twitter_hashtags
    hashtags = @content.scan(/twitter.com.*?search\/%23(.*?)"/)
    hashtags.collect! do |hashtag|
      "%23#{hashtag[0]}"
    end
    @hashtags = hashtags.uniq
  end

  def to_hash
    {:publication_date => @publication_date,
     :title => @title,
     :link => @link,
    # :content => @content,
     :post_id => @post_id,
     :hashtags => @hashtags,
     :twitter_accounts => @twitter_accounts}
  end
end


dirname = ARGV[0]

################
archives = []

Dir.glob(File.join(dirname, "**", "*.xml")).each do |filename|
  print "."
  $stdout.flush 
  archives << Archive.new(filename)
end
#archives << Archive.new("data/GV-English-WXR-May22/globalvoicesonline.wordpress.2010-jan-feb.xml")

puts "Writing graphviz file of posts => accounts"
#graphviz file with per-post collocation
graphviz_post_graph_accounts = []
graphviz_post_graph_posts = []
graphviz_post_graph = ""
graphviz_elements = ""

#File.open("results/graphviz_connected_posts.gv", "w"){|f|
#File.open("results/graphviz_social_media.gv", 'w') {|p| 
#
#archives.each do |archive|
#  print "."
#  $stdout.flush 
#  archive.posts.each do |post|
#    graphviz_post_graph_accounts = graphviz_post_graph_accounts | post.twitter_accounts
#    (0...post.twitter_accounts.size).each do |a|
#      account_a = post.twitter_accounts[a]
#      f.write "#{post.post_id} [color=grey]" + "\n"
#      f.write "#{post.post_id} -> #{account_a} [style=dotted,color=blue]" + "\n"
#      (a+1...post.twitter_accounts.size).each do |b|
#        account_b = post.twitter_accounts[b]
#        p.write "#{account_a} -- #{account_b}" + "\n"
#      end
#    end
#  end
#end
#
#puts ""
#graphviz_post_graph_accounts.each do |account|
#  print "."
#  $stdout.flush 
#  f.write "#{account} [color=blue]" + "\n"
#  p.write "#{account} [color=blue]" + "\n"
#end

#puts "adding categories"
#Categories.get_categories.each do |name,category |
#  f.write "#{name} [color=orange]" + "\n"
#  category.each do |post|
#    f.write "'#{name}' -> #{post.post_id} [color=orange, weight=2]" + "\n"
#  end
#end

#
#}}

#File.open("graphviz_posts.gv", 'w') {|f| f.write(graphviz_elements + graphviz_post_graph) }

#puts "Writing json file for posts"
#File.open("results/posts.json", "w"){|f| 
#  f.write("[")
#  archives.each do |archive|
#    print "."
#    $stdout.flush 
#    count = archive.posts.size
#    archive.posts.each do |post|
#      count -= 1
#      line_end = ","
#      line_end = "" if(count == 0)
#      f.write(post.to_hash.to_json + line_end + "\n")
#    end
#  end
#  f.write("]")
#}

puts "Creating json files for categories"
#File.open("results/categories.json", "w"){|f|
#  f.write("[")
  Categories.get_categories.each do |name, category|
    print "."
    $stdout.flush
    File.open("results/#{name}.json", "w"){|c|
      c.write "["
      count = category.size
      category.each do |post|
        count -= 1
        line_end = ","
        line_end = "" if(count == 0)
#        f.write post.to_hash.to_json + line_end + "\n"
        c.write post.to_hash.to_json + line_end + "\n"
      end
      c.write "]"
    }
  end
#  f.write("]")
#}


#puts "Creating twitter ranking files for categories"
#Categories.get_categories.each do |name, category|
#  print "."
#  $stdout.flush
#  graphviz_post_graph_nodes = []
#  graphviz_post_graph_posts = []
#  graphviz_post_graph_links = []
#  category.each do |post|
#    graphviz_post_graph_accounts = graphviz_post_graph_accounts | post.twitter_accounts
#    graphviz_post_graph_nodes << {"name"=>post.post_id, "group"=>1}
#    post_index = graphviz_post_graph_nodes.size - 1
#     
#    (0...post.twitter_accounts.size).each do |a|
#      account_a = post.twitter_accounts[a]
#      node_index = graphviz_post_graph_nodes.index(account_a)
#      if(node_index.nil?) 
#        graphviz_post_graph_nodes << {"name"=>account_a, "group"=>2}
#        node_index = graphviz_post_graph_nodes.size - 1
#      end 
#      graphviz_post_graph_links << {'source'=>post_index, 'target' => node_index, 'value'=>1}
#      #(a+1...post.twitter_accounts.size).each do |b|
#      #  account_b = post.twitter_accounts[b]
#      #  p.write "#{account_a} -- #{account_b}" + "\n"
#      #end
#    end
#  end
#  File.open("tmp/#{name}.json", "wb") do |f|
#    f.write({"nodes" => graphviz_post_graph_nodes,
#     "links" => graphviz_post_graph_links}.to_json)
#  end
#end
##  File.open("results/c_#{name}_connected_posts.gv", "w"){|f|
##  File.open("results/c_#{name}_social_media.gv", "w"){|p|
##  }}
#

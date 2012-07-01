require 'hpricot'
require 'fileutils'
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
        all_categories[category] << post.to_hash
      end
    end
    all_categories
  end
end

class Post
  attr_accessor :item, :publication_date, :author, :link, :twitter_accounts, :hashtags, :categories, :title, :post_id, :content

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

  def scan_for_twitter_accounts
    accounts = @content.scan(/twitter.com\/\#\!\/(.*?)[\/|"]/)

    twitter_match = @content.scan(/twitter.com\/(.*?)["]/)
    # only append things that are not false positives
    twitter_match.each do |m|
      accounts << m unless( m[0].match(/\//) or m[0].match(/search/))
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
     :content => @content,
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
  archives << Archive.new(filename)
end

puts "Writing one file for each article"
#graphviz file with per-post collocation
graphviz_post_graph_accounts = []
graphviz_post_graph_posts = []
graphviz_post_graph = ""
graphviz_elements = ""

archives.each do |archive|
  print "."
  archive.posts.each do |post|
    File.open("gv-viewer/data/postdata/#{post.post_id}.json", "wb") do |f|
      f.write(post.to_hash.merge({:content=>post.content}).to_json)
    end
  end
end

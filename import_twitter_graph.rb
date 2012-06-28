require 'hpricot'
require 'fileutils'

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

class TwitterAccount
  @@twitter_accounts = {}
  attr_accessor :account, :collocations, :posts, :categories

  def initialize(account_name, post)
    @account = account_name
    @posts = {}
    @collocations = {}
    @categories = {}
    add_post(post)
  end

  def add_post(post)
    @posts[:id] = post.title
    @posts.twitter_accounts.each do |account|
      add_collocation(account) unless account == @account
    end
    @categories.each do |category|
      add_category(category)
    end
  end
  
  def add_collocation(account_name)
    if @collocations.has_key? account_name
      @collocations[account_name] += 1
    else
      @collocations[account_name] = 1
    end
  end

  def add_category(category)
    if @categories.has_key? category
      @categories[category] += 1
    else
      @categories[category] = 1
    end
  end

  def TwitterAccounts.find(account_name)
    return @twitter_accounts[account_name] if @@twitter_accounts.has_key? account_name
    return nil
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

puts "Writing graphviz file of posts => accounts"
#graphviz file with per-post collocation
graphviz_post_graph_accounts = []
graphviz_post_graph_posts = []
graphviz_post_graph = ""
graphviz_elements = ""

archives.each do |archive|
  print "."
  archive.posts.each do |post|
    graphviz_post_graph_accounts = graphviz_post_graph_accounts | post.twitter_accounts
    post.twitter_accounts.each do |account_a|
      graphviz_post_graph += "#{post.post_id} -> #{account_a} [style=dotted,color=blue]" + "\n"
      post.twitter_accounts.each do |account_b|
        if(account_a != account_b)
          graphviz_post_graph += "#{account_a} -- #{account_b}" + "\n"
        end
      end
    end
  end
end

puts "Writing json file for posts"
all_posts = []
archives.each do |archive|
  print "."
  archive.posts.each do |post|
    all_posts << post.to_hash
  end
end
File.open("posts.json", "w"){|f| f.write(Categories.to_hash) }

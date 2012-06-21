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
end

class Post
  attr_accessor :item, :publication_date, :author, :link, :twitter_accounts, :hashtags, :categories, :title

  def initialize(item)
    @item = item
    @publication_date = (item/'pubDate').inner_html
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
     :twitter_accounts => @twitter_accounts}
  end
end


dirname = ARGV[0]

################
Dir.glob(File.join(dirname, "**", "*.xml")).each do |filename|
  puts "============== #{filename} ============="
  archive = Archive.new(filename)
  archive.posts.each do |post|
    puts post.twitter_accounts
  end
  puts Categories.get_categories.size
end

#per week, how many twitter accounts, how many hashtags, avg per article

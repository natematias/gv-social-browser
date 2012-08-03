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

class TwitterAccount
  @@twitter_accounts = {}
  attr_accessor :account, :collocations, :posts, :categories, :first_date, :last_date, :all_dates, :category_collocations

  def initialize(account_name, post)
    @account = account_name
    @posts = {}
    @collocations = {}
    @categories = {}
    @category_collocations = {}
    @all_dates = []
    @first_date = post.publication_date
    add_post(post)
  end

  def add_post(post)
    @posts[post.post_id] = post.title
    @last_date = post.publication_date
    @all_dates << post.publication_date
    post.twitter_accounts.each do |account|
      add_collocation(account) unless account == @account
    end
    post.categories.each do |category|
      add_category(category)
    end

    add_category_collocations(post.categories, post.twitter_accounts)
    
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

  def add_category_collocations(categories, twitter_accounts)
    categories.each do |category|
      @category_collocations[category] = {} if(!@category_collocations.has_key? category)
      twitter_accounts.each do |account|
        if !@category_collocations[category].has_key? account
          @category_collocations[category][account] = 1 
        else
          @category_collocations[category][account] += 1
        end
      end
    end
  end

  def TwitterAccount.all
    @@twitter_accounts
  end

  def TwitterAccount.find(account_name)
    return @@twitter_accounts[account_name] if @@twitter_accounts.has_key? account_name
    return nil
  end

  def TwitterAccount.AddTwitterAccount(account_name, post)
    if TwitterAccount.find(account_name)
      @@twitter_accounts[account_name].add_post(post)
    else
      @@twitter_accounts[account_name] = TwitterAccount.new(account_name, post)
    end
  end

  def to_hash()
    {:account=>@account,
     :collocation_count=>@collocations.size,
     :posts_count=>@posts.size,
     :collocations=>@collocations,
     :posts=>@posts,
     :first_date=>@first_date,
     :last_date=>@last_date,
     :categories=>@categories}
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
  attr_accessor :item, :publication_date, :author, :link, :twitter_accounts, :hashtags, :categories, :title, :post_id

  def initialize(item)
    @item = item
    @publication_date = (item/'pubDate').inner_html
    @post_id = (item/'wp:post_id').inner_html
    @title = (item/'title').inner_html
    @link = (item/'link').inner_html
    @content = (item/'content:encoded').text
    @categories = []
    (item/'category').each do |category|
      nicename = category.attributes["nicename"]
      @categories << nicename
    end
    self.scan_for_twitter_accounts
    self.scan_for_twitter_hashtags
    #Categories.add_post(self)
    @twitter_accounts.each do |twitter_account|
      TwitterAccount.AddTwitterAccount(twitter_account, self)
    end
  end

  def account_is_invalid account
    return (account[0].match(/\//) or account[0].match(/search/) or account[0].match(/\?|\+|&/) or account[0].match(/favicon/) or account[0].strip =="" or account[0].match(/gmail/) or account[0].match(/gmail/) or account[0] =="s" or account[0].downcase == "n00")
  end
 
  def scan_for_twitter_accounts
    accounts = []

    #match links which include #!
    matched_accounts = @content.scan(/twitter.com\/\#\!\/(.*?)[\/|"|\?]/)
    matched_accounts.each do |account|
      accounts << account[0].downcase unless account_is_invalid(account)
    end

    #match links which don't include #!
    twitter_match = @content.scan(/twitter.com\/(.*?)["|\?]/)
    twitter_match.each do |account|
      accounts << account[0].downcase unless account_is_invalid(account)
    end
    
    #match accounts cited without links
    cited_accounts = @content.scan(/@(.*?)[\W]/)
    cited_accounts.each do |account|
      accounts << account[0].downcase unless account_is_invalid(account)
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
#archives << Archive.new("data/GV-English-WXR-May22/globalvoicesonline.wordpress.2011-jan-feb.xml")

puts "Total Twitter Accounts: #{TwitterAccount.all.size}"
twitter_account_array = []

File.open("gv-viewer/data/twitter_accounts.json", "wb") do |f| 
  TwitterAccount.all.each do |account_name, account|
#    puts "#{account.account}: #{account.posts.size}"
#    puts "  collocations: #{account.collocations.size}"
#    puts "  categories: #{account.categories.size}"
    twitter_account_array << account.to_hash
  end
  f.write(twitter_account_array.to_json)
end

#File.open("results/categories/
puts "Constructing hash of per-category twitter citation"
category_accounts = {}
TwitterAccount.all.each do |key, account|
  account.categories.each do |category, value|
    category_accounts[category] = [] if(!category_accounts.has_key? category)
    category_accounts[category] << account.to_hash.merge(:posts_count=>value, :collocations=>account.category_collocations[category])
  end
end

category_accounts.each do |category, data|
  File.open("gv-viewer/data/categories/#{category}_twitter.json", "wb"){|f|
    print "."
    f.write(data.to_json)
  }
end

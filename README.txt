#ruby import_wordpress.rb data/gv-wxr-exports-for-nathan
ruby import_article_text.rb data/gv-wxr-exports-for-nathan
ruby import_twitter_graph.rb data/gv-wxr-exports-for-nathan
ruby import_wordpress_category_network.rb data/gv-wxr-exports-for-nathan
ruby generate_categories_index_json.rb gv-viewer/data/categories
cp results/* gv-viewer/data/categories/

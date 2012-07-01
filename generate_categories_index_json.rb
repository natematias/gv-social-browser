require 'json'
require 'pathname'
filenames = []
dirname = ARGV[0]

Dir.glob(File.join(dirname, "**", "*.json")).each do |filename|
  filename = Pathname.new(filename).basename.to_s
  if(filename.size>6)
    filenames << filename[0..-6]
  end
end

File.open("gv-viewer/data/categories.json", "wb"){|f|
  f.write(filenames.to_json)
}

require 'csv'
require 'fileutils'
require 'set'

# Create config directory if it doesn't exist
FileUtils.mkdir_p('data/config')

# Set to store unique tags
tags = Set.new

# Read all CSV files in the input directory
Dir.glob('data/input/*.csv').each do |file|
  CSV.foreach(file, headers: true) do |row|
    # Extract tags from Note column (words starting with #)
    if row['Note']
      tags_in_note = row['Note'].scan(/#\w+/).map { |tag| tag[1..] }
      tags.merge(tags_in_note)
    end

    # Extract tags from Label column (comma-separated values)
    if row['Labels']
      labels = row['Labels'].split(',').map(&:strip)
      tags.merge(labels)
    end
  end
end

# Sort tags alphabetically
sorted_tags = tags.sort

# Write tags to file
File.write('data/config/tags', sorted_tags.join("\n"))

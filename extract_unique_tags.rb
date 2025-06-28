#!/usr/bin/env ruby

require 'json'
require 'csv'
require 'set'

# Read the JSON file
json_file_path = 'data/input/transaction_tags.json'
output_csv_path = 'unique_tags.csv'
user_id = '7502a93f-93d6-4798-8a7c-f12ca6625774'

begin
  # Read and parse the JSON file
  json_data = JSON.parse(File.read(json_file_path))
  
  # Extract all unique tags
  unique_tags = Set.new
  
  json_data.each do |transaction|
    if transaction['tags'] && transaction['tags'].is_a?(Array)
      transaction['tags'].each do |tag|
        unique_tags.add(tag.strip) if tag && !tag.strip.empty?
      end
    end
  end
  
  # Sort tags alphabetically
  sorted_tags = unique_tags.sort
  
  # Write to CSV file
  CSV.open(output_csv_path, 'w') do |csv|
    # Write header
    csv << ['user_id', 'title']
    
    # Write each unique tag
    sorted_tags.each do |tag|
      csv << [user_id, tag]
    end
  end
  
  puts "Successfully extracted #{sorted_tags.length} unique tags to #{output_csv_path}"
  puts "First few tags: #{sorted_tags.first(10).join(', ')}"
  
rescue JSON::ParserError => e
  puts "Error parsing JSON file: #{e.message}"
  exit 1
rescue Errno::ENOENT => e
  puts "Error: Could not find file #{json_file_path}"
  exit 1
rescue => e
  puts "Unexpected error: #{e.message}"
  exit 1
end 
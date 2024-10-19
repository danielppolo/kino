require 'csv'
require 'time'

# Load configuration from options CSV
def load_options_config
  options = []
  CSV.foreach('./data/options.csv', headers: true) do |row|
    options << {
      source: row['source'],
      type: row['type'],
      rename: row['rename'],
      fallback_category: row['fallback_category']
    }
  end
  options
end

# Find the correct category based on the rules
def find_category(labels, category_name, options)
  category = nil

  labels.each do |label|
    match = options.find { |opt| opt[:source] == label }

    if match
      if match[:type] == 'category'
        category = match[:rename].nil? || match[:rename].empty? ? match[:source] : match[:rename]
      elsif match[:type] == 'label'
        category ||= match[:fallback_category]
      end
    end
  end

  # Fallback to the original Category name if no match is found
  category ||= category_name
  category
end

# Convert transaction date to CST and format as YYYY-MM-DD
def convert_to_cst(date_str)
  # Parse the string into a Time object
  date = Time.parse(date_str)

  # Convert the time to Central Standard Time (CST) without daylight saving
  cst_time = date.getlocal('-06:00')

  # Format the time as YYYY-MM-DD
  cst_time.strftime('%Y-%m-%d')
end

# Process the source transactions CSV and apply the transformations
def transform_transactions(file_path, options)
  transformed_data = []

  CSV.foreach(file_path, headers: true) do |row|
    # Parse and transform the columns according to the rules
    date = convert_to_cst(row['Date'])
    wallet = row['Wallet']
    type = row['Type'].downcase == 'incoming transfer' || row['Type'].downcase == 'outgoing transfer' ? 'transfer' : row['Type'].downcase
    category_name = row['Category name']
    amount = row['Amount']
    currency = row['Currency']
    description = row['Note']
    tags = row['Labels']
    labels = row['Labels']&.split(',')&.map(&:strip) || []

    # Find the correct category based on labels and configuration
    category = find_category(labels, category_name, options)

    # Construct the transformed row
    transformed_data << {
      date: date,
      wallet: wallet,
      type: type,
      category: category,
      amount: amount,
      currency: currency,
      description: description,
      label: category_name,
      tags: tags
    }
  end

  transformed_data
end

# Export the transformed data to CSV
def export_to_csv(transformed_data, output_file_path)
  CSV.open(output_file_path, 'wb') do |csv|
    csv << %w[date wallet type category amount currency description label tags] # Header row

    transformed_data.each do |row|
      csv << [row[:date], row[:wallet], row[:type], row[:category], row[:amount], row[:currency], row[:description],
              row[:label], row[:tags]]
    end
  end
end

# Process all files in the given directory and export transformed files to output directory
def process_directory(input_dir, output_dir, options)
  Dir.foreach(input_dir) do |filename|
    next if ['.', '..'].include?(filename) # Skip special directories

    file_path = File.join(input_dir, filename)

    # Process only CSV files
    if File.file?(file_path) && File.extname(filename) == '.csv'
      puts "Processing file: #{filename}"

      # Transform the data
      transformed_data = transform_transactions(file_path, options)

      # Prepare the output path
      output_file_path = File.join(output_dir, filename)

      # Export the transformed data
      export_to_csv(transformed_data, output_file_path)

      puts "Exported transformed file: #{output_file_path}"
    end
  end
end

# Main process
def main
  # Define the input and output directories
  input_dir = './data/input' # Change this path as needed
  output_dir = './data/output' # Change this path as needed

  # Create the output directory if it doesn't exist
  Dir.mkdir(output_dir) unless Dir.exist?(output_dir)

  # Load the configuration options
  options = load_options_config

  # Process all files in the input directory
  process_directory(input_dir, output_dir, options)
end

main

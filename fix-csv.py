import csv

# Define input and output files
input_file = 'src/data/school.csv'
output_file = 'fixed-school.csv'

# Define the expected order of columns
current_order = ['name', 'ppd', 'level', 'category', 'code', 'address', 'postcode', 'city', 'state', 'longitude', 'latitude']
expected_order = ['code', 'name', 'level', 'category', 'state', 'ppd', 'address', 'postcode', 'city', 'longitude', 'latitude']

# Create a mapping from current position to expected position
current_to_expected = {current_order.index(col): expected_order.index(col) for col in current_order}

# Read the input CSV and write to output CSV with reordered columns
with open(input_file, 'r', encoding='utf-8') as infile, open(output_file, 'w', newline='', encoding='utf-8') as outfile:
    reader = csv.reader(infile)
    writer = csv.writer(outfile)
    
    # First row is headers
    headers = next(reader)
    new_headers = [None] * len(headers)
    
    # Reorder headers
    for i, header in enumerate(headers):
        clean_header = header.strip('"')
        position = expected_order.index(clean_header) if clean_header in expected_order else i
        new_headers[position] = clean_header
    
    # Write headers
    writer.writerow(new_headers)
    
    # Process data rows
    for row in reader:
        # Skip empty rows
        if not any(row):
            continue
            
        # Create a new row with reordered columns
        new_row = [None] * len(row)
        
        # Map each column to its new position
        for old_pos, value in enumerate(row):
            if old_pos < len(current_order):
                new_pos = current_to_expected.get(old_pos, old_pos)
                new_row[new_pos] = value.strip('"')
        
        # Write the reordered row
        writer.writerow(new_row)

print(f"CSV file has been fixed and saved to {output_file}")

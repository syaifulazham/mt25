import csv

# Define input and output files
input_file = 'fixed-school.csv'
output_file = 'school-upload-ready.csv'

# Define the correct headers
correct_headers = ['code', 'name', 'level', 'category', 'state', 'ppd', 'address', 'postcode', 'city', 'longitude', 'latitude']

# Read the input CSV and write to output CSV with corrected headers
with open(input_file, 'r', encoding='utf-8') as infile, open(output_file, 'w', newline='', encoding='utf-8') as outfile:
    reader = csv.reader(infile)
    writer = csv.writer(outfile)
    
    # Skip the first row (incorrect headers)
    next(reader)
    
    # Write the correct headers
    writer.writerow(correct_headers)
    
    # Copy all the data rows
    for row in reader:
        writer.writerow(row)

print(f"CSV file has been fixed with correct headers and saved to {output_file}")

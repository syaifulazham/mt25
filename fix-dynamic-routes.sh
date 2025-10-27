#!/bin/bash

# Script to add 'export const dynamic = "force-dynamic"' to all API routes that use getServerSession
# This fixes the Next.js build error about static rendering with headers()

echo "=========================================="
echo "Adding dynamic export to API routes"
echo "=========================================="
echo ""

# Find all route.ts files in src/app/api that contain getServerSession
# and don't already have 'export const dynamic'
FILES=$(grep -rl "getServerSession" src/app/api --include="route.ts" | while read file; do
  if ! grep -q "export const dynamic" "$file"; then
    echo "$file"
  fi
done)

if [ -z "$FILES" ]; then
  echo "✅ All API routes already have dynamic export or don't need it."
  exit 0
fi

echo "Found routes that need updating:"
echo "$FILES"
echo ""

COUNT=0
for file in $FILES; do
  echo "Processing: $file"
  
  # Create a temporary file
  temp_file="${file}.tmp"
  
  # Add the export after the imports, before the first export function
  awk '
    BEGIN { done = 0 }
    /^export (async )?function (GET|POST|PUT|DELETE|PATCH)/ {
      if (!done) {
        print "// Force dynamic rendering for this route"
        print "export const dynamic = '\''force-dynamic'\'';"
        print ""
        done = 1
      }
    }
    { print }
  ' "$file" > "$temp_file"
  
  # Replace original file with temp file
  mv "$temp_file" "$file"
  
  COUNT=$((COUNT + 1))
done

echo ""
echo "=========================================="
echo "✅ Updated $COUNT API routes"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff src/app/api"
echo "2. Rebuild your application"
echo ""

#!/bin/bash

# Apply Template ID in Serial Number - Quick Apply Script
# This updates serial numbers to include template ID: MT25/PART/T2/000001

echo "=========================================="
echo "Serial Number Format Update"
echo "=========================================="
echo ""
echo "This will update serial numbers to include template ID"
echo ""
echo "Before: MT25/PART/000001"
echo "After:  MT25/PART/T2/000001"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Updating field size to VARCHAR(60)..."
mysql -u azham -p mtdb < update-serial-field-size.sql

if [ $? -eq 0 ]; then
    echo "✅ Field size updated successfully!"
else
    echo "❌ Field size update failed. Please check the error above."
    exit 1
fi

echo ""
echo "Step 2: Updating database constraint..."
mysql -u azham -p mtdb < update-serial-constraint-with-template-id.sql

if [ $? -eq 0 ]; then
    echo "✅ Constraint updated successfully!"
else
    echo "❌ Constraint update failed. Please check the error above."
    exit 1
fi

echo ""
echo "Step 3: Regenerating Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client regenerated successfully!"
else
    echo "❌ Prisma generation failed. Please check the error above."
    exit 1
fi

echo ""
echo "Step 4: Verifying changes..."
echo ""
echo "Field definition:"
mysql -u azham -p mtdb -e "SHOW COLUMNS FROM certificate WHERE Field = 'serialNumber';"

echo ""
echo "Constraint:"
mysql -u azham -p mtdb -e "SHOW INDEX FROM certificate WHERE Column_name = 'serialNumber';"

echo ""
echo "=========================================="
echo "✅ Update Applied Successfully!"
echo "=========================================="
echo ""
echo "Serial numbers now include template ID."
echo ""
echo "Examples:"
echo "  Template 2:  MT25/PART/T2/000001"
echo "  Template 13: MT25/PART/T13/000001"
echo ""
echo "New certificates will use this format automatically."
echo ""

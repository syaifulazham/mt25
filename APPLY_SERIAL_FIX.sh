#!/bin/bash

# Serial Number Constraint Fix - Quick Apply Script
# This script fixes the duplicate serial number issue

echo "=========================================="
echo "Serial Number Constraint Fix"
echo "=========================================="
echo ""
echo "This will change serial numbers from globally unique"
echo "to unique per template."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Applying database migration..."
mysql -u azham -p mtdb < fix-serial-number-constraint.sql

if [ $? -eq 0 ]; then
    echo "✅ Database migration completed successfully!"
else
    echo "❌ Database migration failed. Please check the error above."
    exit 1
fi

echo ""
echo "Step 2: Regenerating Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client regenerated successfully!"
else
    echo "❌ Prisma generation failed. Please check the error above."
    exit 1
fi

echo ""
echo "Step 3: Verifying changes..."
mysql -u azham -p mtdb -e "SHOW INDEX FROM certificate WHERE Key_name = 'unique_serial_per_template';"

echo ""
echo "=========================================="
echo "✅ Fix Applied Successfully!"
echo "=========================================="
echo ""
echo "Serial numbers are now unique per template."
echo "You can now generate winner certificates without conflicts."
echo ""

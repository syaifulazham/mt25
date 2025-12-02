#!/bin/bash

# Script to clean up old certificate files while preserving database records
# Certificates can be regenerated on-demand from database records

echo "=== Certificate Storage Cleanup ==="
echo "This will delete certificate PDF files older than X days"
echo "Database records will be preserved for regeneration"
echo ""

# Configuration
CERT_DIR="public/uploads/certificates"
BACKUP_DIR="public/uploads/certificates-backup"

# Function to show disk usage
show_usage() {
    echo "Current certificate storage:"
    du -sh $CERT_DIR
    echo ""
    echo "Total files:"
    find $CERT_DIR -type f -name "*.pdf" | wc -l
}

echo "=== BEFORE CLEANUP ==="
show_usage
echo ""

# Option 1: Delete files older than 30 days
echo "Option 1: Delete certificates older than 30 days"
echo "Files to be deleted:"
find $CERT_DIR -type f -name "*.pdf" -mtime +30 | wc -l
echo ""
read -p "Proceed with 30-day cleanup? (yes/no): " CONFIRM1

if [ "$CONFIRM1" = "yes" ]; then
    echo "Deleting files older than 30 days..."
    find $CERT_DIR -type f -name "*.pdf" -mtime +30 -delete
    echo "Done!"
fi

# Option 2: Keep only last 7 days
echo ""
echo "Option 2: Keep only last 7 days of certificates"
echo "Files to be deleted:"
find $CERT_DIR -type f -name "*.pdf" -mtime +7 | wc -l
echo ""
read -p "Proceed with 7-day cleanup? (yes/no): " CONFIRM2

if [ "$CONFIRM2" = "yes" ]; then
    echo "Deleting files older than 7 days..."
    find $CERT_DIR -type f -name "*.pdf" -mtime +7 -delete
    echo "Done!"
fi

# Option 3: Archive to compressed backup
echo ""
echo "Option 3: Archive all certificates to compressed backup"
read -p "Create compressed archive? (yes/no): " CONFIRM3

if [ "$CONFIRM3" = "yes" ]; then
    echo "Creating compressed archive..."
    mkdir -p $BACKUP_DIR
    tar -czf "$BACKUP_DIR/certificates-backup-$(date +%Y%m%d).tar.gz" $CERT_DIR
    echo "Backup created at: $BACKUP_DIR/certificates-backup-$(date +%Y%m%d).tar.gz"
    
    read -p "Delete original files after backup? (yes/no): " CONFIRM4
    if [ "$CONFIRM4" = "yes" ]; then
        echo "Deleting original files..."
        find $CERT_DIR -type f -name "*.pdf" -delete
        echo "Done!"
    fi
fi

echo ""
echo "=== AFTER CLEANUP ==="
show_usage
echo ""
echo "Cleanup complete!"
echo ""
echo "NOTE: Certificates can be regenerated from database records"
echo "Use the certificate regeneration API endpoints as needed"

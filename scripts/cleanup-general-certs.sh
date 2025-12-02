#!/bin/bash

# Targeted Certificate Cleanup - GENERAL Type Only
# Deletes only GENERAL certificate PDFs
# Preserves: EVENT_WINNER, TRAINERS, CONTINGENT certificates
#
# Database Authentication:
# This script uses MySQL's default authentication methods:
# - Reads from ~/.my.cnf if present
# - Uses environment variable: DB_NAME (default: mtdb)
# - Uses current user's MySQL credentials

echo "╔════════════════════════════════════════════════════════════╗"
echo "║    Targeted Cleanup - GENERAL Certificates Only           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Database configuration - uses environment variables or defaults
DB_NAME="${DB_NAME:-mtdb}"

# Get certificate distribution
echo "=== Current Certificate Distribution ==="
echo ""
mysql $DB_NAME -t << 'EOF'
SELECT 
    ct.targetType as 'Type',
    COUNT(c.id) as 'Total',
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as 'With Files',
    SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as 'Without Files',
    CASE 
        WHEN ct.targetType = 'GENERAL' THEN '🗑️  DELETE'
        ELSE '✅ KEEP'
    END as 'Action'
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType
ORDER BY ct.targetType;
EOF

echo ""
echo "=== Getting GENERAL Certificate File Paths ==="

# Export file paths to temporary file
mysql $DB_NAME -N -B << 'EOF' > /tmp/general_cert_paths.txt
SELECT DISTINCT CONCAT('public', c.filePath)
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL
  AND c.filePath != '';
EOF

TOTAL_FILES=$(wc -l < /tmp/general_cert_paths.txt)
echo "Found $TOTAL_FILES GENERAL certificate file paths"
echo ""

if [ "$TOTAL_FILES" -eq 0 ]; then
    echo "✓ No GENERAL certificate files to delete!"
    rm /tmp/general_cert_paths.txt
    exit 0
fi

# Show sample files
echo "Sample files to be deleted:"
head -5 /tmp/general_cert_paths.txt
if [ "$TOTAL_FILES" -gt 5 ]; then
    echo "... and $((TOTAL_FILES - 5)) more files"
fi
echo ""

# Confirm deletion
read -p "⚠️  DELETE $TOTAL_FILES GENERAL certificate files? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cancelled by user"
    rm /tmp/general_cert_paths.txt
    exit 0
fi

echo ""
echo "=== Deleting Files ==="

DELETED=0
NOT_FOUND=0
ERRORS=0

# Delete files
while IFS= read -r filepath; do
    if [ -f "$filepath" ]; then
        rm -f "$filepath" 2>/dev/null
        if [ $? -eq 0 ]; then
            ((DELETED++))
        else
            ((ERRORS++))
            echo "Error deleting: $filepath"
        fi
    else
        ((NOT_FOUND++))
    fi
    
    # Progress indicator
    CURRENT=$((DELETED + NOT_FOUND + ERRORS))
    if [ $((CURRENT % 100)) -eq 0 ]; then
        echo -ne "\rProgress: $CURRENT/$TOTAL_FILES files processed"
    fi
done < /tmp/general_cert_paths.txt

echo ""
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                     Cleanup Results                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Files deleted: $DELETED"
echo "Already deleted: $NOT_FOUND"
echo "Errors: $ERRORS"
echo ""

# Update database to mark for regeneration
echo "=== Updating Database ==="
echo "Marking GENERAL certificates for regeneration..."
echo ""

mysql $DB_NAME << 'EOF'
UPDATE certificate c
JOIN cert_template ct ON c.templateId = ct.id
SET 
    c.filePath = NULL,
    c.status = 'LISTED',
    c.updatedAt = NOW()
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL;

SELECT 
    ct.targetType as 'Type',
    COUNT(c.id) as 'Total',
    SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as 'Needs Regen',
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as 'Has PDF'
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType
ORDER BY ct.targetType;
EOF

echo ""
echo "=== Verification ==="
echo ""

# Check disk space
echo "Disk usage:"
df -h / | tail -1

echo ""
echo "Certificate folder size:"
du -sh public/uploads/certificates

echo ""
echo "✅ Cleanup Complete!"
echo ""
echo "📋 Summary:"
echo "   - GENERAL certificates: Deleted and marked for regeneration"
echo "   - EVENT_WINNER certificates: Preserved ✓"
echo "   - TRAINERS certificates: Preserved ✓"
echo "   - CONTINGENT certificates: Preserved ✓"
echo ""
echo "GENERAL certificates will be regenerated on-demand when requested."

# Cleanup temp file
rm /tmp/general_cert_paths.txt

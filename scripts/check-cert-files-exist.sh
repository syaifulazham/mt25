#!/bin/bash

# Check if GENERAL certificate files actually exist on disk
# This helps verify if files were already deleted

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Check GENERAL Certificate Files Existence             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

DB_NAME="${DB_NAME:-mtdb}"

# Get stats from database
echo "=== Database Stats ==="
mysql $DB_NAME -t << 'EOF'
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN filePath IS NOT NULL THEN 1 ELSE 0 END) as with_path,
    SUM(CASE WHEN filePath IS NULL THEN 1 ELSE 0 END) as without_path
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL';
EOF

echo ""
echo "=== Checking File Existence (sample of 100 files) ==="
echo ""

EXISTS=0
NOT_EXISTS=0
CHECKED=0

# Get sample file paths and check if they exist
mysql $DB_NAME -N -B << 'EOF' | head -100 | while read filepath; do
SELECT DISTINCT filePath
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL
  AND c.filePath != '';
EOF
    CHECKED=$((CHECKED + 1))
    
    # Construct full path
    FULL_PATH="public${filepath}"
    
    if [ -f "$FULL_PATH" ]; then
        EXISTS=$((EXISTS + 1))
        echo "✓ EXISTS: $filepath"
    else
        NOT_EXISTS=$((NOT_EXISTS + 1))
        echo "✗ MISSING: $filepath"
    fi
    
    # Progress
    if [ $((CHECKED % 10)) -eq 0 ]; then
        echo "--- Checked $CHECKED files ---"
    fi
done

echo ""
echo "=== Summary (from sample) ==="
echo "Files checked: $CHECKED"
echo "Files exist: $EXISTS"
echo "Files missing: $NOT_EXISTS"
echo ""

# Count all files with paths in database
TOTAL_WITH_PATH=$(mysql $DB_NAME -N -e "SELECT COUNT(*) FROM certificate c JOIN cert_template ct ON c.templateId = ct.id WHERE ct.targetType = 'GENERAL' AND c.filePath IS NOT NULL")
echo "Total GENERAL certs with filePath in DB: $TOTAL_WITH_PATH"
echo ""

if [ "$NOT_EXISTS" -gt 0 ]; then
    echo "⚠️  Some files are missing from disk but still have filePath in database"
    echo "    These records should be updated to set filePath = NULL"
    echo ""
    echo "    Run: ./scripts/update-missing-cert-paths.sh"
fi

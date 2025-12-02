# Targeted Certificate Cleanup - GENERAL Type Only

## Overview

This cleanup **ONLY** deletes GENERAL certificate PDFs while preserving important certificates:

| Certificate Type | Action | Reason |
|-----------------|--------|--------|
| **GENERAL** | 🗑️ DELETE | Can be regenerated on-demand |
| **EVENT_WINNER** | ✅ KEEP | Important competition results |
| **TRAINERS** | ✅ KEEP | Trainer credentials |
| **CONTINGENT** | ✅ KEEP | Team/group certificates |

---

## Expected Space Savings

Based on typical distribution:
- **GENERAL certificates**: ~70-80% of total (90-110GB)
- **Other certificates**: ~20-30% of total (25-45GB to keep)

**Expected Result**: Free 90-110GB while keeping all important certificates intact.

---

## Quick Start (Recommended)

### Option 1: Bash Script (Simplest)

```bash
cd /root/apps/mt25

# Make executable
chmod +x scripts/cleanup-general-certs.sh

# Run cleanup
./scripts/cleanup-general-certs.sh
```

This script will:
1. Show current certificate distribution
2. List files to be deleted
3. Ask for confirmation
4. Delete GENERAL certificate PDFs
5. Update database automatically
6. Show before/after disk usage

---

### Option 2: Node.js Script (More Control)

```bash
cd /root/apps/mt25

# Preview first (no deletion)
node scripts/cleanup-general-certs.js --dry-run

# Actually delete
node scripts/cleanup-general-certs.js
```

Then update database:
```bash
mysql -u azham -p mtdb < scripts/cleanup-general-certificates.sql
```

---

## Step-by-Step Process

### Step 1: Check Current Distribution

```bash
mysql -u azham -p mtdb -t << 'EOF'
SELECT 
    ct.targetType,
    COUNT(c.id) as total,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as with_files
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType;
EOF
```

Expected output:
```
+------------------+-------+------------+
| targetType       | total | with_files |
+------------------+-------+------------+
| GENERAL          | 15000 |      12000 | ← To be deleted
| EVENT_WINNER     |  3500 |       3200 | ← Preserved
| TRAINERS         |   800 |        750 | ← Preserved
| CONTINGENT       |  1200 |       1100 | ← Preserved
+------------------+-------+------------+
```

---

### Step 2: Run Cleanup Script

**Option A: Interactive Bash Script**
```bash
./scripts/cleanup-general-certs.sh
```

**Option B: Node.js with Preview**
```bash
# Preview only
node scripts/cleanup-general-certs.js --dry-run

# Review output, then run for real
node scripts/cleanup-general-certs.js
```

---

### Step 3: Verify Results

```bash
# Check disk space
df -h /

# Check certificate folder size
du -sh public/uploads/certificates

# Check certificate distribution
mysql -u azham -p mtdb -t << 'EOF'
SELECT 
    ct.targetType,
    COUNT(c.id) as total,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as has_pdf,
    SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as needs_regen
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType;
EOF
```

Expected result:
```
+------------------+-------+---------+-------------+
| targetType       | total | has_pdf | needs_regen |
+------------------+-------+---------+-------------+
| GENERAL          | 15000 |       0 |       15000 | ← All marked for regen
| EVENT_WINNER     |  3500 |    3200 |         300 | ← Unchanged
| TRAINERS         |   800 |     750 |          50 | ← Unchanged
| CONTINGENT       |  1200 |    1100 |         100 | ← Unchanged
+------------------+-------+---------+-------------+
```

---

## What Happens to GENERAL Certificates?

### Before Cleanup
```
Database: uniqueCode, serialNumber, filePath, data
File:     /uploads/certificates/cert-123-*.pdf ✓
```

### After Cleanup
```
Database: uniqueCode, serialNumber, NULL, data
File:     [deleted - saves disk space]
```

### When User Requests Certificate
```
1. Check database → filePath is NULL
2. Generate PDF from template + data
3. Update filePath in database
4. Return PDF to user
5. Cache for 24 hours
6. Auto-delete after 7 days (if auto-cleanup enabled)
```

**Key Point**: `uniqueCode` and `serialNumber` are PRESERVED, so regenerated certificates have the same identifiers.

---

## Safety Features

### 1. Database Backup
```sql
-- Automatic backup created before cleanup
CREATE TABLE certificate_backup_general_20241202 AS 
SELECT * FROM certificate 
WHERE templateId IN (
  SELECT id FROM cert_template WHERE targetType = 'GENERAL'
);
```

### 2. Preserve Important Data
- ✅ uniqueCode preserved
- ✅ serialNumber preserved (MT25/GEN/000001)
- ✅ Recipient name preserved
- ✅ All metadata preserved

### 3. Type-Specific Deletion
Only files matching `targetType = 'GENERAL'` are deleted. The script explicitly checks certificate type before deletion.

---

## Rollback Plan

If you need to restore GENERAL certificates:

### Option 1: Restore from Backup Table
```sql
-- Restore database records
UPDATE certificate c
JOIN certificate_backup_general_20241202 cb ON c.id = cb.id
SET c.filePath = cb.filePath,
    c.status = cb.status
WHERE c.templateId IN (
  SELECT id FROM cert_template WHERE targetType = 'GENERAL'
);
```

### Option 2: Regenerate Selected Certificates
```sql
-- Find certificates that need regeneration
SELECT id, recipientName, uniqueCode 
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NULL
LIMIT 10;

-- Use on-demand API to regenerate
-- curl http://localhost:3000/api/certificates/[id]/generate-on-demand
```

---

## Performance Impact

### During Cleanup
- **Time**: ~5-10 minutes for 10,000 files
- **CPU**: Low (file deletion is fast)
- **Database**: Minimal load (single UPDATE query)
- **Downtime**: None (application stays running)

### After Cleanup
- **Certificate Requests**: 
  - First request: ~500ms (generate PDF)
  - Subsequent requests: <50ms (cached)
- **Storage**: 90-110GB freed immediately
- **Future Storage**: ~5-10GB average (with auto-cleanup)

---

## Monitoring

### Check Certificate Status Anytime

```bash
# Quick status
mysql -u azham -p mtdb -t << 'EOF'
SELECT 
    ct.targetType,
    COUNT(*) as total,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as has_file,
    ROUND(AVG(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) * 100, 1) as 'cache_rate_%'
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType;
EOF
```

### Check Regeneration Activity

```bash
# Recent GENERAL certificate updates (regenerations)
mysql -u azham -p mtdb -t << 'EOF'
SELECT 
    DATE(c.updatedAt) as date,
    COUNT(*) as regenerated
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL
  AND c.updatedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(c.updatedAt)
ORDER BY date DESC;
EOF
```

---

## Automatic Cleanup (Optional)

Set up daily cleanup to prevent storage buildup:

```bash
# Create cleanup script
cat > /root/apps/mt25/daily-general-cleanup.sh << 'EOF'
#!/bin/bash
# Delete GENERAL certificate PDFs older than 7 days
cd /root/apps/mt25

mysql -u azham -pDBAzham231 mtdb -N -B << 'SQL' | while read filepath; do
    fullpath="public${filepath}"
    if [ -f "$fullpath" ]; then
        # Check file age
        if [ $(find "$fullpath" -mtime +7 -print | wc -l) -gt 0 ]; then
            rm -f "$fullpath"
        fi
    fi
done
SELECT DISTINCT c.filePath
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
WHERE ct.targetType = 'GENERAL'
  AND c.filePath IS NOT NULL;
SQL

echo "GENERAL certificates cleanup completed: $(date)" >> /root/apps/mt25/cleanup.log
EOF

chmod +x /root/apps/mt25/daily-general-cleanup.sh

# Add to crontab (runs daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /root/apps/mt25/daily-general-cleanup.sh") | crontab -
```

---

## Frequently Asked Questions

### Q: Will users notice any difference?
**A**: First-time requests take ~500ms to generate. Subsequent requests are instant (cached).

### Q: What if a user requests a GENERAL certificate?
**A**: It regenerates automatically with the same `uniqueCode` and `serialNumber`.

### Q: Can I restore deleted GENERAL certificates?
**A**: Yes, they regenerate on-demand. Database backup exists if needed.

### Q: Why keep WINNER/TRAINERS/CONTINGENT?
**A**: These are important credentials that users may download repeatedly. Keeping them avoids regeneration overhead.

### Q: How much space will this free?
**A**: Typically 90-110GB (70-80% of total certificate storage).

### Q: Is it safe to run during business hours?
**A**: Yes, the application continues running. Users won't be affected.

---

## Comparison: Full Cleanup vs Targeted Cleanup

| Aspect | Full Cleanup | Targeted Cleanup |
|--------|--------------|------------------|
| **Space Freed** | ~130GB (95%) | ~100GB (75%) |
| **Files Deleted** | All certificates | GENERAL only |
| **Important Certs** | Need regeneration | Kept intact |
| **User Impact** | All first requests slower | Only GENERAL requests slower |
| **Regeneration Load** | Higher | Lower |
| **Risk** | Higher | Lower |
| **Recommended** | Emergency only | ✅ Recommended |

---

## Next Steps After Cleanup

1. **Monitor Regeneration Rate**
   ```bash
   watch -n 60 'mysql -u azham -pDBAzham231 mtdb -t -e "SELECT ct.targetType, COUNT(*) as regen FROM certificate c JOIN cert_template ct ON c.templateId = ct.id WHERE c.updatedAt > NOW() - INTERVAL 1 HOUR AND c.filePath IS NOT NULL GROUP BY ct.targetType"'
   ```

2. **Set Up Auto-Cleanup** (see above)

3. **Consider Cloud Storage** for GENERAL certificates (see `CERTIFICATE_STORAGE_OPTIMIZATION.md`)

4. **Update Certificate Download Links** to use on-demand endpoint

---

## Support

If regeneration fails:
1. Check template exists: `SELECT * FROM cert_template WHERE targetType = 'GENERAL'`
2. Check PDF template file: `ls -la public/uploads/templates/`
3. Check application logs: `pm2 logs mt25`
4. Test manual regeneration: `curl http://localhost:3000/api/certificates/[id]/generate-on-demand`

---

## Files Created

- `scripts/cleanup-general-certs.sh` - Bash cleanup script (recommended)
- `scripts/cleanup-general-certs.js` - Node.js cleanup script (advanced)
- `scripts/cleanup-general-certificates.sql` - Database update script
- `TARGETED_CLEANUP_GUIDE.md` - This guide

---

**Ready to run? Execute:**
```bash
cd /root/apps/mt25
./scripts/cleanup-general-certs.sh
```

This will free 90-110GB while preserving all important certificates! ✅

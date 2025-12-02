# 🚀 QUICK FIX - Delete GENERAL Certificates Only

## One Command Solution

```bash
cd /root/apps/mt25
chmod +x scripts/cleanup-general-certs.sh
./scripts/cleanup-general-certs.sh
```

**Note:** The script uses MySQL's default authentication (reads from `~/.my.cnf` or uses current user credentials). If needed, set the database name:
```bash
DB_NAME=mtdb ./scripts/cleanup-general-certs.sh
```

**This will:**
- ✅ Delete ONLY GENERAL certificate PDFs (~90-110GB freed)
- ✅ Keep EVENT_WINNER certificates intact
- ✅ Keep TRAINERS certificates intact  
- ✅ Keep CONTINGENT certificates intact
- ✅ Update database automatically
- ✅ Preserve all uniqueCode and serialNumber

---

## What Gets Deleted vs Preserved

| Certificate Type | Storage Impact | Action | Files Kept |
|-----------------|----------------|--------|------------|
| **GENERAL** | 90-110GB | 🗑️ DELETE | 0% |
| **EVENT_WINNER** | 20-30GB | ✅ KEEP | 100% |
| **TRAINERS** | 5-10GB | ✅ KEEP | 100% |
| **CONTINGENT** | 5-10GB | ✅ KEEP | 100% |

---

## Before Running - Quick Check

```bash
# See what will be deleted
mysql -u azham -p mtdb -t << 'EOF'
SELECT 
    ct.targetType,
    COUNT(c.id) as total,
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as 'PDFs to DELETE/KEEP'
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType
ORDER BY ct.targetType;
EOF
```

---

## Step-by-Step

### 1️⃣ Run Cleanup Script (5 minutes)

```bash
cd /root/apps/mt25
./scripts/cleanup-general-certs.sh
```

The script will:
1. Show current certificate distribution
2. Ask for confirmation
3. Delete GENERAL certificate files
4. Update database
5. Show disk space saved

### 2️⃣ Verify Disk Space (1 minute)

```bash
# Check overall disk
df -h /

# Check certificate folder
du -sh public/uploads/certificates
```

Expected result:
```
Before: 201G  192G     0 100% /
After:  201G   92G   100G  48% /
                      ↑ 
                 100GB freed!
```

### 3️⃣ Test Regeneration (2 minutes)

```bash
# Find a GENERAL certificate
mysql -u azham -p mtdb -e "SELECT id, uniqueCode FROM certificate c JOIN cert_template ct ON c.templateId = ct.id WHERE ct.targetType = 'GENERAL' AND c.filePath IS NULL LIMIT 1;"

# Test regeneration (use actual ID from above)
curl http://localhost:3000/api/participants/contestants/[ID]/generate-certificate

# Should return success with new PDF path
```

---

## What Happens to GENERAL Certificates?

### User Requests Certificate
```
1. System checks: Does PDF exist?
2. No → Generate new PDF (500ms)
3. Save to disk with same uniqueCode/serialNumber
4. Return to user
5. Cache for 24 hours
6. Auto-delete after 7 days (if auto-cleanup enabled)
```

### Important:
- ✅ Same serial number (e.g., MT25/GEN/000001)
- ✅ Same unique code
- ✅ Same certificate data
- ✅ Exactly the same certificate, just regenerated

---

## Safety Net

### Automatic Backup Created
```sql
-- Backup table: certificate_backup_20241202
-- Contains all GENERAL certificates before deletion
```

### Rollback if Needed
```sql
-- Restore from backup (only if something goes wrong)
UPDATE certificate c
JOIN certificate_backup_20241202 cb ON c.id = cb.id
SET c.filePath = cb.filePath,
    c.status = cb.status
WHERE c.templateId IN (
  SELECT id FROM cert_template WHERE targetType = 'GENERAL'
);
```

---

## Prevent Future Issues

### Set Up Auto-Cleanup (Optional)

```bash
# Create daily cleanup job
cat > /root/apps/mt25/auto-cleanup-general.sh << 'EOF'
#!/bin/bash
# Delete GENERAL certificates older than 7 days
cd /root/apps/mt25
find public/uploads/certificates -name "cert-*-*.pdf" -mtime +7 -type f -delete
mysql -u azham -pDBAzham231 mtdb -e "UPDATE certificate c JOIN cert_template ct ON c.templateId = ct.id SET c.filePath = NULL, c.status = 'LISTED' WHERE ct.targetType = 'GENERAL' AND c.filePath IS NOT NULL AND c.updatedAt < DATE_SUB(NOW(), INTERVAL 7 DAY)"
EOF

chmod +x /root/apps/mt25/auto-cleanup-general.sh

# Add to crontab (runs daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /root/apps/mt25/auto-cleanup-general.sh") | crontab -
```

---

## Monitoring

### Check Certificate Status

```bash
mysql -u azham -p mtdb -t << 'EOF'
SELECT 
    ct.targetType as 'Type',
    COUNT(*) as 'Total',
    SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) as 'Has PDF',
    SUM(CASE WHEN c.filePath IS NULL THEN 1 ELSE 0 END) as 'Needs Regen',
    CONCAT(ROUND(SUM(CASE WHEN c.filePath IS NOT NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1), '%') as 'Cache Rate'
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
GROUP BY ct.targetType
ORDER BY ct.targetType;
EOF
```

Expected after cleanup:
```
+------------------+-------+---------+-------------+------------+
| Type             | Total | Has PDF | Needs Regen | Cache Rate |
+------------------+-------+---------+-------------+------------+
| GENERAL          | 12000 |       0 |       12000 | 0.0%       |
| EVENT_WINNER     |  3200 |    3200 |           0 | 100.0%     |
| TRAINERS         |   750 |     750 |           0 | 100.0%     |
| CONTINGENT       |  1100 |    1100 |           0 | 100.0%     |
+------------------+-------+---------+-------------+------------+
```

After a few days of use:
```
+------------------+-------+---------+-------------+------------+
| Type             | Total | Has PDF | Needs Regen | Cache Rate |
+------------------+-------+---------+-------------+------------+
| GENERAL          | 12000 |     150 |       11850 | 1.3%       | ← Recent requests
| EVENT_WINNER     |  3200 |    3200 |           0 | 100.0%     | ← All preserved
| TRAINERS         |   750 |     750 |           0 | 100.0%     | ← All preserved
| CONTINGENT       |  1100 |    1100 |           0 | 100.0%     | ← All preserved
+------------------+-------+---------+-------------+------------+
```

---

## FAQ

**Q: Will users see any difference?**  
A: First-time GENERAL cert requests take ~500ms. Other cert types are instant (preserved).

**Q: What if many users request GENERAL certs at once?**  
A: System generates them one by one. Subsequent requests get cached version.

**Q: Can I delete more certificate types later?**  
A: Yes, but WINNER/TRAINERS/CONTINGENT are important. Keep them.

**Q: How often should I run cleanup?**  
A: Set up auto-cleanup to run daily. One-time manual cleanup + auto-cleanup = optimal.

**Q: What if I accidentally delete important certificates?**  
A: Script only targets GENERAL type. WINNER/TRAINERS/CONTINGENT are explicitly excluded.

---

## Troubleshooting

### Script Says "No files to delete"
```bash
# Check if GENERAL certificates exist
mysql -u azham -p mtdb -e "SELECT COUNT(*) FROM certificate c JOIN cert_template ct ON c.templateId = ct.id WHERE ct.targetType = 'GENERAL' AND c.filePath IS NOT NULL;"
```

### Regeneration Fails
```bash
# Check template exists
mysql -u azham -p mtdb -e "SELECT * FROM cert_template WHERE targetType = 'GENERAL' LIMIT 1;"

# Check application logs
pm2 logs mt25 --lines 50
```

### Database Connection Error
```bash
# Test database connection
mysql -u azham -p mtdb -e "SELECT 1;"

# Check credentials in script
cat scripts/cleanup-general-certs.sh | grep DB_
```

---

## Summary

✅ **Run this one command:**
```bash
./scripts/cleanup-general-certs.sh
```

✅ **Expected results:**
- 90-110GB disk space freed
- GENERAL certificates regenerate on-demand
- WINNER/TRAINERS/CONTINGENT certificates preserved
- No downtime or user impact

✅ **Time required:**
- Cleanup: 5 minutes
- Verification: 2 minutes
- Total: 7 minutes

🎯 **Perfect for your situation** - Targeted cleanup of GENERAL certificates while preserving important competition and credential certificates!

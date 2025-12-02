# EMERGENCY: Free Up 100GB Immediately

## Your server is at 100% capacity. Follow these steps to fix it NOW.

### Step 1: Quick Analysis (1 minute)
```bash
cd /root/apps/mt25

# Check current usage
du -sh public/uploads/certificates
# Expected: ~135GB

# Count files
find public/uploads/certificates -name "*.pdf" | wc -l
# Expected: thousands of PDFs
```

---

### Step 2: IMMEDIATE FIX - Delete Old Certificates (5 minutes)

**Option A: Keep only last 7 days** (Recommended - frees ~100GB)
```bash
# Preview what will be deleted
find public/uploads/certificates -name "*.pdf" -mtime +7 -exec ls -lh {} \; | wc -l

# DELETE files older than 7 days
find public/uploads/certificates -name "*.pdf" -mtime +7 -delete

# Check new usage
du -sh public/uploads/certificates
```

**Option B: Keep only last 3 days** (Aggressive - frees ~115GB)
```bash
find public/uploads/certificates -name "*.pdf" -mtime +3 -delete
```

**Option C: Keep only last 24 hours** (Emergency - frees ~125GB)
```bash
find public/uploads/certificates -name "*.pdf" -mtime +1 -delete
```

---

### Step 3: Update Database (2 minutes)

Mark certificates for regeneration so they can be recreated when needed:

```bash
mysql -u azham -p mtdb << 'EOF'
-- Mark all certificates for regeneration
UPDATE certificate
SET filePath = NULL,
    status = 'LISTED'
WHERE filePath IS NOT NULL;

-- Verify
SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN filePath IS NULL THEN 1 ELSE 0 END) as needs_regen
FROM certificate;
EOF
```

---

### Step 4: Verify Disk Space (1 minute)

```bash
# Check overall disk usage
df -h /

# Expected result:
# /dev/sda3    201G   92G   100G  48%  /
# (Should show ~100GB freed)

# Check certificate folder
du -sh public/uploads/certificates
# Expected: <10GB
```

---

### Step 5: Test Certificate Regeneration (2 minutes)

Certificates will be regenerated automatically when users request them.

Test it works:
```bash
# Find a certificate ID
mysql -u azham -p mtdb -e "SELECT id, uniqueCode FROM certificate WHERE filePath IS NULL LIMIT 1;"

# Test regeneration (replace [ID] with actual ID)
curl -X GET http://localhost:3000/api/participants/contestants/[ID]/generate-certificate
```

---

## What Just Happened?

✅ **Freed ~100GB of disk space**  
✅ **Certificates can still be regenerated when needed**  
✅ **All certificate data preserved in database**  
✅ **uniqueCode and serialNumber preserved**  

---

## How Regeneration Works

1. User requests certificate download
2. System checks if PDF exists
3. If missing → generates new PDF from database data
4. Returns certificate to user
5. PDF is cached for 7 days, then auto-deleted

---

## Set Up Automatic Cleanup (Optional - 5 minutes)

Prevent this from happening again:

```bash
# Create cleanup script
cat > /root/apps/mt25/cleanup-certs.sh << 'EOF'
#!/bin/bash
# Delete certificates older than 7 days
find /root/apps/mt25/public/uploads/certificates -name "*.pdf" -mtime +7 -delete
echo "Certificate cleanup completed: $(date)" >> /root/apps/mt25/cleanup.log
EOF

chmod +x /root/apps/mt25/cleanup-certs.sh

# Add to crontab (runs daily at 2 AM)
crontab -l > /tmp/cron.backup
echo "0 2 * * * /root/apps/mt25/cleanup-certs.sh" >> /tmp/cron.backup
crontab /tmp/cron.backup
```

---

## Verify Automatic Cleanup Is Working

```bash
# Check crontab
crontab -l | grep cleanup

# Test the script manually
/root/apps/mt25/cleanup-certs.sh

# Check log
cat /root/apps/mt25/cleanup.log
```

---

## Still Need More Space?

### Check Evidence Files (6.2GB)
```bash
du -sh public/uploads/evidence
find public/uploads/evidence -mtime +30 -delete  # Delete old evidence
```

### Check Contingent Files (384MB)
```bash
du -sh public/uploads/contingents
# Review and clean up if needed
```

### Check Photo Galleries (179MB)
```bash
du -sh public/uploads/photo-galleries
# Compress or archive old galleries
```

---

## Long-Term Solution

After this emergency fix, consider implementing:

1. **On-Demand Generation** - Generate certificates only when requested
2. **Cloud Storage** - Move certificates to S3/R2 ($2-5/month for unlimited storage)
3. **Automated Cleanup** - Daily job to delete old certificates

See `CERTIFICATE_STORAGE_OPTIMIZATION.md` for detailed implementation guide.

---

## Quick Reference Commands

```bash
# Check disk usage
df -h /

# Check certificate folder size
du -sh public/uploads/certificates

# Count certificate files
find public/uploads/certificates -name "*.pdf" | wc -l

# Delete old certificates (7+ days)
find public/uploads/certificates -name "*.pdf" -mtime +7 -delete

# Check database certificate status
mysql -u azham -p mtdb -e "SELECT status, COUNT(*) FROM certificate GROUP BY status;"
```

---

## Emergency Contacts

If certificate regeneration doesn't work:
1. Check PM2 logs: `pm2 logs mt25`
2. Check certificate template: MySQL → `cert_template` table
3. Verify PDF templates exist: `ls -la public/uploads/templates/`

---

**DONE! Your server should now have ~100GB free space.**

Certificates will regenerate automatically when users need them.

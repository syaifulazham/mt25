# Certificate Storage Optimization Guide

## Problem
Server storage at 100% capacity with 135GB consumed by certificate PDF files in `/public/uploads/certificates/`.

```
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda3       201G  192G     0 100% /
```

## Storage Breakdown
```
certificates:     135GB (70% of total usage)
evidence:         6.2GB
contingents:      384MB
photo-galleries:  179MB
templates:        20MB
content:          5.3MB
themes:           728KB
```

---

## Solution Strategies

### Strategy 1: **Immediate Cleanup** (Quick Win)
**Impact:** Free 50-100GB in minutes  
**Risk:** Low - certificates can be regenerated

#### Step 1: Run Cleanup Script
```bash
cd /apps/mt25
chmod +x scripts/cleanup-old-certificates.sh
./scripts/cleanup-old-certificates.sh
```

Options:
- **Option 1:** Delete certificates older than 30 days (~60GB freed)
- **Option 2:** Keep only last 7 days (~100GB freed)
- **Option 3:** Archive to compressed backup then delete (~120GB freed)

#### Step 2: Mark Database Records for Regeneration
```bash
mysql -u azham -p mtdb < scripts/mark-certificates-for-regeneration.sql
```

This updates database to indicate PDFs need regeneration while preserving:
- `uniqueCode` (certificate identifier)
- `serialNumber` (MT25/GEN/000001 format)
- All metadata

---

### Strategy 2: **On-Demand Generation** (Recommended)
**Impact:** Permanent 90%+ storage reduction  
**Approach:** Generate PDFs only when users request them

#### Architecture Change
**Before:**
```
Generate All → Store All → Serve All
(135GB stored permanently)
```

**After:**
```
Store Metadata → Generate on Request → Cache 24h → Auto-Delete
(~5GB average storage)
```

#### Implementation

**1. New On-Demand Endpoint** ✅ Created
```typescript
GET /api/certificates/[id]/generate-on-demand
```

Features:
- Checks if PDF exists and is < 24 hours old
- Returns existing PDF if recent
- Regenerates PDF if missing/old
- Updates database automatically

**2. Update Frontend Links**
Replace direct PDF links with on-demand endpoint:

```typescript
// Before (direct link)
<a href={certificate.filePath}>Download</a>

// After (on-demand)
<a href={`/api/certificates/${certificate.id}/generate-on-demand`}>
  Download
</a>
```

**3. Automatic Cleanup Job** ✅ Created
```typescript
// src/lib/jobs/certificate-cleanup.ts
```

Schedule with cron/pm2:
```bash
# Run daily at 2 AM
0 2 * * * cd /apps/mt25 && node dist/lib/jobs/certificate-cleanup.js
```

Configuration:
- Delete PDFs older than 7 days
- Preserve database records
- Keep 20GB minimum free space

---

### Strategy 3: **Cloud Storage Migration** (Long-term)
**Impact:** Unlimited scalable storage  
**Cost:** ~$3-10/month for 100GB

#### Options

**A. AWS S3** (Cheapest)
```
Cost: $2.30/month for 100GB
Bandwidth: $9/month per TB egress
```

**B. Cloudflare R2** (Best value)
```
Cost: $1.50/month for 100GB
Bandwidth: FREE egress
```

**C. DigitalOcean Spaces** (Simplest)
```
Cost: $5/month for 250GB + bandwidth
```

#### Implementation Steps

1. **Install SDK**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

2. **Create Storage Service**
```typescript
// src/lib/storage/s3-storage.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export class S3StorageService {
  async uploadCertificate(
    pdfBuffer: Buffer,
    filename: string
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: `certificates/${filename}`,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    })
    
    await s3Client.send(command)
    return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/certificates/${filename}`
  }
  
  async generateSignedUrl(key: string): Promise<string> {
    // Generate temporary download URL
    // Expires in 1 hour for security
  }
}
```

3. **Update Certificate Generator**
```typescript
// Modify src/lib/certificate-generator.ts
import { S3StorageService } from '@/lib/storage/s3-storage'

// Instead of saving to local filesystem:
const s3Url = await storageService.uploadCertificate(
  modifiedPdfBytes,
  filename
)

return s3Url // Store S3 URL in database
```

4. **Environment Variables**
```env
# .env
S3_BUCKET=mt25-certificates
S3_REGION=ap-southeast-1
S3_ACCESS_KEY=your_key
S3_SECRET_KEY=your_secret

# For Cloudflare R2
R2_ACCOUNT_ID=your_account
R2_ACCESS_KEY=your_key
R2_SECRET_KEY=your_secret
```

---

## Hybrid Approach (Best Practice)

Combine strategies for optimal result:

```
┌─────────────────────────────────────────────┐
│  Certificate Request                         │
└─────────────┬───────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────┐
│  Check Database                              │
│  - Has filePath?                             │
│  - Is file recent (<24h)?                    │
└─────────────┬───────────────────────────────┘
              │
         ┌────┴────┐
         │         │
    YES  │         │  NO
         ▼         ▼
┌──────────────┐  ┌──────────────────────────┐
│ Return PDF   │  │ Generate On-Demand       │
│ (from S3 or  │  │ 1. Create PDF            │
│  local cache)│  │ 2. Upload to S3          │
└──────────────┘  │ 3. Update database       │
                  │ 4. Return URL            │
                  └──────────────────────────┘
                              │
                              ▼
                  ┌──────────────────────────┐
                  │ Cleanup Job (Daily 2 AM) │
                  │ - Delete local PDFs >7d  │
                  │ - Keep only recent cache │
                  └──────────────────────────┘
```

### Timeline
**Week 1:** Immediate cleanup + on-demand generation  
**Week 2:** Test on-demand system with users  
**Week 3:** Migrate to cloud storage  
**Week 4:** Remove all local certificate files

---

## Database Schema Changes

### Current Schema
```sql
certificate (
  id INT,
  templateId INT,
  recipientName VARCHAR(255),
  filePath VARCHAR(500),      -- Full local path
  uniqueCode VARCHAR(100),
  serialNumber VARCHAR(50),
  status ENUM('DRAFT', 'LISTED', 'READY'),
  ...
)
```

### Optimized Schema
```sql
certificate (
  id INT,
  templateId INT,
  recipientName VARCHAR(255),
  filePath VARCHAR(500),         -- S3 URL or NULL
  fileStorageType ENUM('LOCAL', 'S3', 'R2', 'NONE'),
  lastGeneratedAt TIMESTAMP,     -- Track when PDF was created
  uniqueCode VARCHAR(100),
  serialNumber VARCHAR(50),
  status ENUM('DRAFT', 'LISTED', 'READY'),
  ...
)
```

Migration:
```sql
ALTER TABLE certificate 
ADD COLUMN fileStorageType ENUM('LOCAL', 'S3', 'R2', 'NONE') DEFAULT 'LOCAL',
ADD COLUMN lastGeneratedAt TIMESTAMP NULL;

-- Mark existing certificates
UPDATE certificate 
SET fileStorageType = 'LOCAL',
    lastGeneratedAt = updatedAt
WHERE filePath IS NOT NULL;
```

---

## Performance Considerations

### On-Demand Generation
- **Average generation time:** 500ms per certificate
- **Concurrent requests:** Handle with queue system
- **Cache strategy:** Keep recent PDFs for 24 hours

### Queue System (if needed)
```typescript
// For high-traffic scenarios
import { Queue } from 'bullmq'

const certificateQueue = new Queue('certificates', {
  connection: {
    host: 'localhost',
    port: 6379
  }
})

// Add job to queue instead of immediate generation
await certificateQueue.add('generate', {
  certificateId: 123
}, {
  priority: 1,
  delay: 0
})
```

---

## Monitoring & Alerts

### Storage Monitoring
```bash
# Add to cron (check every hour)
0 * * * * /apps/mt25/scripts/check-storage.sh
```

```bash
#!/bin/bash
# scripts/check-storage.sh

USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $USAGE -gt 90 ]; then
  echo "ALERT: Disk usage at ${USAGE}%"
  # Send email/SMS alert
  curl -X POST $ALERT_WEBHOOK_URL \
    -d "Storage critical: ${USAGE}% used"
fi
```

### Certificate Generation Metrics
```typescript
// Track in database or monitoring service
{
  date: '2024-12-02',
  totalRequests: 1500,
  cacheHits: 1200,    // 80% cache hit rate
  generated: 300,      // 20% new generations
  avgGenerationTime: 450ms,
  errors: 2
}
```

---

## Migration Checklist

### Phase 1: Immediate (Today)
- [ ] Run cleanup script (delete old certificates)
- [ ] Mark database records for regeneration
- [ ] Test certificate regeneration works
- [ ] Verify disk space freed

### Phase 2: On-Demand (This Week)
- [ ] Deploy on-demand generation endpoint
- [ ] Update frontend certificate links
- [ ] Test with sample users
- [ ] Monitor generation performance
- [ ] Set up automated cleanup job

### Phase 3: Cloud Storage (Next Week)
- [ ] Choose cloud provider (Cloudflare R2 recommended)
- [ ] Set up S3/R2 bucket
- [ ] Implement storage service
- [ ] Test upload/download flow
- [ ] Migrate new certificates to cloud

### Phase 4: Full Migration (Next Month)
- [ ] Update all certificate generation endpoints
- [ ] Migrate existing certificates to cloud
- [ ] Remove local file generation
- [ ] Clean up all local PDFs
- [ ] Update documentation

---

## Cost Comparison

### Current (Local Storage)
```
Server storage: 201GB SSD
Cost: ~$50/month for storage
Problem: Limited, hits 100% capacity
```

### After Optimization

**Option A: On-Demand + Local**
```
Storage: ~5GB average (dynamic)
Cost: $0 additional
Savings: 130GB freed for other uses
```

**Option B: On-Demand + Cloud**
```
Storage: ~1GB local cache
Cloud: 100GB S3/R2
Cost: $2-5/month for cloud
Savings: 134GB server space freed
Benefit: Unlimited scalability
```

---

## Rollback Plan

If issues occur:

1. **Immediate:** Keep backup of certificates for 30 days
```bash
# Archive created by cleanup script
public/uploads/certificates-backup/certificates-backup-20241202.tar.gz
```

2. **Restore:**
```bash
cd public/uploads
tar -xzf certificates-backup/certificates-backup-20241202.tar.gz
```

3. **Database Reset:**
```sql
-- Restore from backup table
UPDATE certificate c
JOIN certificate_backup_20241202 cb ON c.id = cb.id
SET c.filePath = cb.filePath,
    c.status = cb.status;
```

---

## Recommendations

### Immediate Action (Today)
```bash
# 1. Free up space NOW
cd /apps/mt25
./scripts/cleanup-old-certificates.sh

# Choose Option 2: Keep only last 7 days
# This will free ~100GB immediately

# 2. Mark database for regeneration
mysql -u azham -p mtdb < scripts/mark-certificates-for-regeneration.sql
```

### This Week
1. Deploy on-demand generation endpoint
2. Update certificate download links
3. Set up automated cleanup (runs daily)
4. Monitor regeneration performance

### Long-term (Next Month)
1. Migrate to **Cloudflare R2** (best value)
2. Update all generation endpoints to upload to R2
3. Remove all local PDF generation
4. Keep minimal cache for recent certificates

---

## Support & Troubleshooting

### Certificate Regeneration Fails
```typescript
// Check template exists
SELECT * FROM cert_template WHERE id = [templateId];

// Check certificate data
SELECT * FROM certificate WHERE id = [certificateId];

// Regenerate manually
curl -X GET http://localhost:3000/api/certificates/[id]/generate-on-demand
```

### Storage Still Full
```bash
# Check what else is using space
du -sh /apps/mt25/* | sort -h

# Check evidence folder
du -sh /apps/mt25/public/uploads/evidence/*

# Check logs
du -sh /apps/mt25/logs/*
```

### Performance Issues
- Add Redis caching for frequently requested certificates
- Use CDN for certificate distribution
- Implement queue system for bulk generation

---

## Files Created

1. `scripts/cleanup-old-certificates.sh` - Immediate cleanup script
2. `scripts/mark-certificates-for-regeneration.sql` - Database update script
3. `src/app/api/certificates/[id]/generate-on-demand/route.ts` - On-demand endpoint
4. `src/lib/jobs/certificate-cleanup.ts` - Automated cleanup job

---

## Questions?

Contact system administrator or review this document for implementation details.

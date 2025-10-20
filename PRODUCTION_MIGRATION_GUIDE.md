# Production Database Migration Guide
## Certificate Bulk Generation Feature

**Date:** October 21, 2025  
**Feature:** Bulk Certificate Generation for Event Participants  
**Database:** mt25_db

---

## Overview

This migration adds support for:
- Certificate regeneration with preserved serial numbers
- Enhanced participant data tracking (team name, contest name, email)
- Real-time progress tracking during bulk generation
- Complete audit trail with issuedAt timestamp

---

## Database Changes

### Certificate Table Modifications

The following columns are added to the `certificate` table:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `recipientEmail` | VARCHAR(255) | YES | Contestant's email address |
| `team_name` | VARCHAR(255) | YES | Team name from teamMembers relation |
| `contestName` | VARCHAR(255) | YES | Contest code + name (e.g., "C01 Web Development") |
| `issuedAt` | DATETIME | YES | Timestamp when certificate was issued |
| `ownership` | JSON | YES | Ownership metadata (year, contingentId, contestantId) |

### Indexes Added

| Index Name | Column | Purpose |
|------------|--------|---------|
| `idx_certificate_recipientEmail` | recipientEmail | Fast email lookups |
| `idx_certificate_ic_number` | ic_number | Fast IC number lookups (used in regeneration) |

---

## Migration Steps

### Step 1: Backup Database

```bash
# Create backup before migration
mysqldump -u root -p mt25_db > mt25_db_backup_$(date +%Y%m%d_%H%M%S).sql

# Or if you have a specific host/port
mysqldump -h localhost -P 3306 -u root -p mt25_db > mt25_db_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Migration Script

```bash
# Connect to MySQL
mysql -u root -p mt25_db

# Or from file
mysql -u root -p mt25_db < database-migration-certificate-bulk-generation.sql
```

### Step 3: Verify Migration

Run the verification queries at the end of the migration script to confirm:
- All columns are created
- All indexes are in place
- Existing data is intact

### Step 4: Update Application

```bash
# Regenerate Prisma Client
npx prisma generate

# Restart the application
npm run build
pm2 restart mt25  # or your process manager command
```

---

## SQL Migration Script

Location: `database-migration-certificate-bulk-generation.sql`

### Key Commands:

```sql
-- Add new columns
ALTER TABLE certificate ADD COLUMN IF NOT EXISTS recipientEmail VARCHAR(255) NULL;
ALTER TABLE certificate ADD COLUMN IF NOT EXISTS team_name VARCHAR(255) NULL;
ALTER TABLE certificate ADD COLUMN IF NOT EXISTS contestName VARCHAR(255) NULL;
ALTER TABLE certificate ADD COLUMN IF NOT EXISTS issuedAt DATETIME NULL;
ALTER TABLE certificate ADD COLUMN IF NOT EXISTS ownership JSON NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_certificate_recipientEmail ON certificate(recipientEmail);
CREATE INDEX IF NOT EXISTS idx_certificate_ic_number ON certificate(ic_number);
```

---

## Data Population

After migration, new fields will be populated as follows:

### For New Certificates:
- All fields populated automatically during generation

### For Existing Certificates:
Fields will remain NULL until regenerated. Optional update query:

```sql
-- Set issuedAt to createdAt for existing generated certificates
UPDATE certificate 
SET issuedAt = createdAt 
WHERE issuedAt IS NULL 
  AND filePath IS NOT NULL;
```

---

## Feature Capabilities Post-Migration

### 1. Certificate Regeneration
- Preserves: `ic_number`, `uniqueCode`, `serialNumber`
- Updates: All other fields including `team_name`, `contestName`, `recipientEmail`

### 2. Enhanced Data Tracking
```json
// ownership field example
{
  "year": 2025,
  "contingentId": 123,
  "contestantId": 6501
}
```

### 3. Contest Name Format
- Source: `attendanceContestant.contestId → contest.code + contest.name`
- Example: "C01 Web Development"

### 4. Real-time Progress
- Sequential certificate generation
- Visual feedback with status indicators
- Error tracking per certificate

---

## Rollback Procedure

If you need to rollback changes:

```sql
-- WARNING: This will remove the new columns and their data
ALTER TABLE certificate DROP COLUMN IF EXISTS recipientEmail;
ALTER TABLE certificate DROP COLUMN IF EXISTS team_name;
ALTER TABLE certificate DROP COLUMN IF EXISTS contestName;
ALTER TABLE certificate DROP COLUMN IF EXISTS issuedAt;
ALTER TABLE certificate DROP COLUMN IF EXISTS ownership;
DROP INDEX IF EXISTS idx_certificate_recipientEmail ON certificate;
```

Then restore from backup:
```bash
mysql -u root -p mt25_db < mt25_db_backup_YYYYMMDD_HHMMSS.sql
```

---

## Testing Checklist

After migration, verify:

- [ ] Migration script runs without errors
- [ ] All new columns exist in certificate table
- [ ] All indexes are created
- [ ] Existing certificate data is intact
- [ ] Application starts without errors
- [ ] Can view existing certificates
- [ ] Can generate new certificates
- [ ] Can regenerate existing certificates
- [ ] Progress tracking works during generation
- [ ] Contest name displays correctly (code + name)
- [ ] Team name populates from team relation
- [ ] Email field populates correctly

---

## Support and Troubleshooting

### Common Issues

**Issue 1: Column already exists**
```
Error: Duplicate column name 'recipientEmail'
```
Solution: Safe to ignore if using `IF NOT EXISTS` clause

**Issue 2: Index already exists**
```
Error: Duplicate key name 'idx_certificate_recipientEmail'
```
Solution: Safe to ignore if using `IF NOT EXISTS` clause

**Issue 3: Prisma Client type errors**
```
Error: Property 'ownership' does not exist on type...
```
Solution: Run `npx prisma generate` to regenerate client

---

## Related Files Modified

### Backend
- `/src/app/api/certificates/templates/[id]/bulk-generate/route.ts` - Enhanced generation logic
- `/src/lib/services/template-service.ts` - Added event relation to template fetch

### Frontend
- `/src/app/organizer/certificates/templates/[id]/generate/page.tsx` - Progress tracking UI

### Documentation
- `/CERTIFICATE_BULK_GENERATION_EVENT_PARTICIPANTS.md` - Complete feature guide

---

## Contact

For questions or issues during migration, contact the development team.

**Migration Author:** Development Team  
**Review Date:** October 21, 2025  
**Status:** Ready for Production

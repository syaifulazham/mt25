# Production Database Migration Scripts
## All ALTER TABLE Scripts for Certificate Feature

**Date:** October 21, 2025  
**Database:** mt25_db

---

## Migration Files

### 1. **`database-migration-prerequisites-ownership.sql`** (CORE SCHEMA)
**Run this FIRST** - Core JSON column additions

```sql
-- Add prerequisites column to cert_template
ALTER TABLE cert_template
ADD COLUMN IF NOT EXISTS prerequisites JSON NULL;

-- Add ownership column to certificate  
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS ownership JSON NULL;
```

### 2. **`database-migration-certificate-bulk-generation.sql`** (BULK GENERATION FEATURES)
**Run this SECOND** - Bulk generation enhancements

```sql
-- Add recipientEmail
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS recipientEmail VARCHAR(255) NULL;

-- Add team_name
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS team_name VARCHAR(255) NULL;

-- Add contestName
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS contestName VARCHAR(255) NULL;

-- Add issuedAt
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS issuedAt DATETIME NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_certificate_recipientEmail ON certificate(recipientEmail);
CREATE INDEX IF NOT EXISTS idx_certificate_ic_number ON certificate(ic_number);
```

---

## Quick Execution Commands

### Option A: Run Both Scripts Separately

```bash
# Backup first!
mysqldump -u root -p mt25_db > mt25_db_backup_$(date +%Y%m%d_%H%M%S).sql

# Run prerequisites & ownership migration
mysql -u root -p mt25_db < database-migration-prerequisites-ownership.sql

# Run bulk generation migration
mysql -u root -p mt25_db < database-migration-certificate-bulk-generation.sql
```

### Option B: Run as Single Script

```bash
# Backup first!
mysqldump -u root -p mt25_db > mt25_db_backup_$(date +%Y%m%d_%H%M%S).sql

# Combine and run
cat database-migration-prerequisites-ownership.sql \
    database-migration-certificate-bulk-generation.sql | \
    mysql -u root -p mt25_db
```

---

## Complete List of Changes

### `cert_template` Table

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `prerequisites` | JSON | YES | Survey prerequisites for certificate generation |

**Example Value:**
```json
[
  {"prerequisite": "survey", "id": 1},
  {"prerequisite": "survey", "id": 2}
]
```

### `certificate` Table

| Column | Type | Nullable | Purpose |
|--------|------|----------|---------|
| `ownership` | JSON | YES | Ownership metadata (year, contingentId, contestantId) |
| `recipientEmail` | VARCHAR(255) | YES | Contestant's email address |
| `team_name` | VARCHAR(255) | YES | Team name from relation |
| `contestName` | VARCHAR(255) | YES | Contest code + name |
| `issuedAt` | DATETIME | YES | Certificate issue timestamp |

**Ownership Example Value:**
```json
{
  "year": 2025,
  "contingentId": 123,
  "contestantId": 6501
}
```

### Indexes Added

| Table | Index Name | Column |
|-------|------------|--------|
| certificate | `idx_certificate_recipientEmail` | recipientEmail |
| certificate | `idx_certificate_ic_number` | ic_number |

---

## All-in-One Script

If you prefer a single consolidated script, here it is:

```sql
-- ============================================================================
-- CONSOLIDATED MIGRATION SCRIPT - All Certificate Features
-- ============================================================================

USE mt25_db;

-- 1. CERT_TEMPLATE - Add prerequisites
ALTER TABLE cert_template
ADD COLUMN IF NOT EXISTS prerequisites JSON NULL
COMMENT 'Survey prerequisites for certificate generation';

-- 2. CERTIFICATE - Add ownership
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS ownership JSON NULL
COMMENT 'Ownership metadata (year, contingentId, contestantId)';

-- 3. CERTIFICATE - Add recipientEmail
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS recipientEmail VARCHAR(255) NULL
AFTER recipientName;

-- 4. CERTIFICATE - Add team_name
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS team_name VARCHAR(255) NULL
AFTER contingent_name;

-- 5. CERTIFICATE - Add contestName
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS contestName VARCHAR(255) NULL
AFTER ic_number;

-- 6. CERTIFICATE - Add issuedAt
ALTER TABLE certificate
ADD COLUMN IF NOT EXISTS issuedAt DATETIME NULL
AFTER status;

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_certificate_recipientEmail ON certificate(recipientEmail);
CREATE INDEX IF NOT EXISTS idx_certificate_ic_number ON certificate(ic_number);

-- Verify
SELECT 'cert_template' as table_name, COUNT(*) as row_count FROM cert_template
UNION ALL
SELECT 'certificate', COUNT(*) FROM certificate;
```

---

## Verification Queries

After running migrations, verify with:

```sql
-- Check cert_template.prerequisites column
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mt25_db'
    AND TABLE_NAME = 'cert_template'
    AND COLUMN_NAME = 'prerequisites';

-- Check certificate columns
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mt25_db'
    AND TABLE_NAME = 'certificate'
    AND COLUMN_NAME IN ('ownership', 'recipientEmail', 'team_name', 'contestName', 'issuedAt');

-- Check indexes
SHOW INDEXES FROM certificate WHERE Key_name LIKE 'idx_certificate%';
```

---

## Rollback (Emergency Only)

```sql
-- CERT_TEMPLATE
ALTER TABLE cert_template DROP COLUMN IF EXISTS prerequisites;

-- CERTIFICATE
ALTER TABLE certificate DROP COLUMN IF EXISTS ownership;
ALTER TABLE certificate DROP COLUMN IF EXISTS recipientEmail;
ALTER TABLE certificate DROP COLUMN IF EXISTS team_name;
ALTER TABLE certificate DROP COLUMN IF EXISTS contestName;
ALTER TABLE certificate DROP COLUMN IF EXISTS issuedAt;
DROP INDEX IF EXISTS idx_certificate_recipientEmail ON certificate;
DROP INDEX IF EXISTS idx_certificate_ic_number ON certificate;
```

---

## Post-Migration Steps

1. **Regenerate Prisma Client**
   ```bash
   npx prisma generate
   ```

2. **Rebuild Application**
   ```bash
   npm run build
   ```

3. **Restart Application**
   ```bash
   pm2 restart mt25
   # or
   systemctl restart mt25
   ```

---

## Files Reference

- ✅ `database-migration-prerequisites-ownership.sql` - Core JSON columns
- ✅ `database-migration-certificate-bulk-generation.sql` - Bulk generation features
- ✅ `PRODUCTION_MIGRATION_GUIDE.md` - Detailed migration guide
- ✅ `PRODUCTION_MIGRATION_SCRIPTS_SUMMARY.md` - This file

---

## Summary

**Total Changes:**
- 1 column added to `cert_template`
- 5 columns added to `certificate`
- 2 indexes created on `certificate`

**Safe to Run:**
- ✅ Uses `IF NOT EXISTS` - safe to re-run
- ✅ All columns are NULL - won't affect existing data
- ✅ Non-destructive - no data loss

**Estimated Time:** < 1 minute on typical databases

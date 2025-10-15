# Production Certificate createdBy Fix

## Issue
Error on production: `Column 'createdBy' cannot be null`

```json
{
    "error": "Failed to generate certificate",
    "details": "Raw query failed. Code: `1048`. Message: `Column 'createdBy' cannot be null`",
    "code": "P2010"
}
```

## Root Cause
The `certificate.createdBy` column has a NOT NULL constraint, but participant-generated certificates need to use NULL (since participants are in `user_participant` table, not `user` table).

## Solution
Run the migration on the production database to make `createdBy` nullable.

## Steps to Fix

### 1. Upload Migration File to Server
```bash
# From local machine, upload the migration file to production server
scp database-migration-certificate-createdby-nullable.sql user@techlympics.my:/path/to/migrations/
```

### 2. SSH to Production Server
```bash
ssh user@techlympics.my
```

### 3. Run the Migration
```bash
# Navigate to the migrations directory
cd /path/to/migrations/

# Run the migration (update credentials as needed)
mysql -u username -p mtdb < database-migration-certificate-createdby-nullable.sql
```

**Example with actual credentials:**
```bash
mysql -u your_db_user -p mtdb < database-migration-certificate-createdby-nullable.sql
# Enter password when prompted
```

### 4. Verify the Change
Check if the column is now nullable:
```sql
mysql -u username -p mtdb -e "
SELECT 
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_TYPE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mtdb' 
  AND TABLE_NAME = 'certificate' 
  AND COLUMN_NAME = 'createdBy';
"
```

**Expected Output:**
```
COLUMN_NAME | IS_NULLABLE | COLUMN_TYPE | COLUMN_COMMENT
createdBy   | YES         | int         | References user.id (admin/operators). NULL for participant-generated certificates.
```

### 5. Restart Application (if needed)
```bash
# If using pm2
pm2 restart mt25

# Or if using different process manager
systemctl restart your-app-service
```

## Alternative: Direct SQL on Production

If you have direct database access, run these commands:

```sql
-- Make createdBy nullable
ALTER TABLE certificate 
MODIFY COLUMN createdBy INT NULL
COMMENT 'References user.id (admin/operators). NULL for participant-generated certificates.';

-- Verify
SELECT 
    COLUMN_NAME,
    IS_NULLABLE,
    COLUMN_TYPE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'mtdb' 
  AND TABLE_NAME = 'certificate' 
  AND COLUMN_NAME = 'createdBy';
```

## Testing After Migration

### Test Certificate Generation
1. Go to: `https://techlympics.my/participants/contestants?cert=enabled`
2. Click actions menu (⋮) on a contestant
3. Click "Generate Certificate"
4. Should now work without the NULL error ✅

### Check the Database
```sql
-- View recently created certificates
SELECT 
    id,
    recipientName,
    contingent_name,
    serialNumber,
    createdBy,
    status,
    createdAt
FROM certificate 
ORDER BY createdAt DESC 
LIMIT 10;
```

**Expected:** New participant-generated certificates should have `createdBy = NULL`

## Rollback (if needed)

If you need to revert the change:

```sql
-- Make createdBy NOT NULL again (requires setting a default value first)
UPDATE certificate 
SET createdBy = 1 
WHERE createdBy IS NULL;

ALTER TABLE certificate 
MODIFY COLUMN createdBy INT NOT NULL;
```

**Warning:** This will break participant certificate generation again!

## Production Migration Checklist

- [ ] Backup database before migration
- [ ] Upload migration file to production server
- [ ] Run migration SQL script
- [ ] Verify column is now nullable
- [ ] Test certificate generation
- [ ] Check application logs for errors
- [ ] Restart application if needed
- [ ] Monitor for issues

## Quick Command Reference

```bash
# 1. Backup database
mysqldump -u username -p mtdb > mtdb_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run migration
mysql -u username -p mtdb < database-migration-certificate-createdby-nullable.sql

# 3. Verify
mysql -u username -p mtdb -e "DESCRIBE certificate" | grep createdBy

# 4. Restart app
pm2 restart mt25
```

## Related Files

- `/database-migration-certificate-createdby-nullable.sql` - Migration file
- `/PARTICIPANT_CERTIFICATE_OWNERSHIP.md` - Documentation on NULL createdBy design
- `/src/app/api/participants/contestants/[id]/generate-certificate/route.ts` - API using NULL

## Summary

The production database needs the migration to allow `createdBy` to be NULL for participant-generated certificates. Run the migration script on the production server to fix the 500 error.

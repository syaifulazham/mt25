# Serial Number Constraint Fix

## Problem

When generating winner certificates, getting error:
```
Duplicate entry 'MT25/WIN/000002' for key 'certificate.unique_serial_number'
```

**Root Cause:** The `serialNumber` column had a UNIQUE constraint applied globally across ALL certificates. This meant that serial numbers like `MT25/WIN/000001` could only exist once in the entire database, regardless of which template generated it.

## Issue

Different certificate templates should be able to have their own serial number sequences:
- Template A: MT25/WIN/000001, MT25/WIN/000002, MT25/WIN/000003...
- Template B: MT25/WIN/000001, MT25/WIN/000002, MT25/WIN/000003...
- Template C: MT25/PART/000001, MT25/PART/000002, MT25/PART/000003...

**Expected Behavior:** Serial numbers should be unique PER TEMPLATE, not globally unique.

## Solution

Change the database constraint from:
- **Before:** `serialNumber` is globally unique
- **After:** `(templateId, serialNumber)` combination is unique

This allows multiple templates to use the same serial number patterns independently.

## Migration Steps

### 1. Run the Database Migration

Execute the SQL migration script:

```bash
mysql -u azham -p mtdb < fix-serial-number-constraint.sql
```

Or manually run the SQL commands:

```sql
-- Drop the existing unique constraint
ALTER TABLE certificate 
DROP INDEX unique_serial_number;

-- Add composite unique constraint
ALTER TABLE certificate
ADD CONSTRAINT unique_serial_per_template UNIQUE (templateId, serialNumber);
```

### 2. Regenerate Prisma Client

After running the migration, regenerate the Prisma client:

```bash
npx prisma generate
```

### 3. Verify the Changes

Check the constraint was applied correctly:

```sql
SHOW INDEX FROM certificate WHERE Key_name = 'unique_serial_per_template';
```

Expected output:
```
+-------------+------------+------------------------------+--------------+-------------+
| Table       | Non_unique | Key_name                     | Seq_in_index | Column_name |
+-------------+------------+------------------------------+--------------+-------------+
| certificate | 0          | unique_serial_per_template   | 1            | templateId  |
| certificate | 0          | unique_serial_per_template   | 2            | serialNumber|
+-------------+------------+------------------------------+--------------+-------------+
```

## Schema Changes

### Prisma Schema Update

**Before:**
```prisma
model Certificate {
  // ...
  serialNumber   String?      @unique(map: "unique_serial_number") @db.VarChar(50)
  // ...
}
```

**After:**
```prisma
model Certificate {
  // ...
  serialNumber   String?      @db.VarChar(50)
  // ...
  
  @@unique([templateId, serialNumber], map: "unique_serial_per_template")
}
```

## Impact

### What Changes

✅ **Serial numbers are now scoped per template**
- Template 1 can have MT25/WIN/000001
- Template 2 can also have MT25/WIN/000001
- No more duplicate entry errors when generating certificates from different templates

### What Stays the Same

✅ **Serial numbers within a template remain unique**
- Template 1 cannot have two certificates with MT25/WIN/000001
- Serial number sequences within each template are still protected

✅ **Existing certificates are preserved**
- No data loss
- Existing serial numbers remain valid

## Examples

### Scenario: Multiple Winner Certificate Templates

**Template A** (Position 1-3 Winners):
```
MT25/WIN/000001 - John Doe (1st Place)
MT25/WIN/000002 - Jane Smith (2nd Place)
MT25/WIN/000003 - Bob Johnson (3rd Place)
```

**Template B** (Overall Winners):
```
MT25/WIN/000001 - Alice Brown (Overall Champion)
MT25/WIN/000002 - Charlie Davis (Overall Runner-up)
```

Both templates can now coexist with their own serial number sequences starting from 000001.

## Database Queries

### Find All Serial Numbers by Template

```sql
SELECT 
  templateId,
  serialNumber,
  recipientName,
  awardTitle
FROM certificate
WHERE serialNumber IS NOT NULL
ORDER BY templateId, serialNumber;
```

### Check for Duplicate Serial Numbers Within Template

```sql
SELECT 
  templateId,
  serialNumber,
  COUNT(*) as count
FROM certificate
WHERE serialNumber IS NOT NULL
GROUP BY templateId, serialNumber
HAVING count > 1;
```

Should return **0 rows** after the fix.

### Count Certificates by Template

```sql
SELECT 
  t.templateName,
  COUNT(c.id) as certificate_count,
  MIN(c.serialNumber) as first_serial,
  MAX(c.serialNumber) as last_serial
FROM certificate c
JOIN cert_template t ON c.templateId = t.id
WHERE c.serialNumber IS NOT NULL
GROUP BY t.id, t.templateName
ORDER BY t.templateName;
```

## Files Changed

1. **`/fix-serial-number-constraint.sql`** - Database migration script
2. **`/prisma/schema.prisma`** - Updated constraint definition
3. **`/SERIAL_NUMBER_CONSTRAINT_FIX.md`** - This documentation

## Testing

After applying the fix, test certificate generation:

1. Generate certificates from Template A
2. Generate certificates from Template B with the same serial number pattern
3. Verify both succeed without duplicate entry errors
4. Verify serial numbers are unique within each template

## Rollback (If Needed)

If you need to revert to the old behavior:

```sql
-- Drop composite constraint
ALTER TABLE certificate 
DROP INDEX unique_serial_per_template;

-- Add back global unique constraint
ALTER TABLE certificate
ADD CONSTRAINT unique_serial_number UNIQUE (serialNumber);
```

**Note:** Rollback will fail if you have duplicate serial numbers across different templates.

## Benefits

1. ✅ **Template Independence**: Each template manages its own serial number sequence
2. ✅ **No Conflicts**: Different templates can use the same serial number patterns
3. ✅ **Data Integrity**: Serial numbers remain unique within each template
4. ✅ **Flexibility**: Supports multiple certificate types with their own numbering schemes
5. ✅ **Scalability**: Add new templates without worrying about global serial number conflicts

## Summary

This fix changes the serial number uniqueness from **global** to **per-template**, allowing each certificate template to maintain its own independent serial number sequence while still preventing duplicates within the same template.

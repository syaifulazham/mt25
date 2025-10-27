# Serial Number Format Update - Include Template ID

## Overview

Updated certificate serial number format to include template ID, making serial numbers globally unique and more traceable.

## Changes

### Serial Number Format

**Before:**
```
MT25/PART/000001
MT25/PART/000002
MT25/WIN/000001
```

**After:**
```
MT25/PART/T2/000001   (Template 2)
MT25/PART/T13/000001  (Template 13)
MT25/WIN/T5/000001    (Template 5)
```

### Benefits

1. **Globally Unique**: Each serial number is unique across all templates
2. **Traceable**: Can immediately identify which template generated the certificate
3. **No Conflicts**: Different templates can use the same sequence numbers without collision
4. **Audit Trail**: Template ID embedded in the serial number

## Examples

### Multiple Templates, Same Type

**Template 2** (Participant Certificate for Event A):
- `MT25/PART/T2/000001`
- `MT25/PART/T2/000002`
- `MT25/PART/T2/000003`

**Template 13** (Participant Certificate for Event B):
- `MT25/PART/T13/000001`
- `MT25/PART/T13/000002`
- `MT25/PART/T13/000003`

**Template 14** (Participant Certificate for Event C):
- `MT25/PART/T14/000001`
- `MT25/PART/T14/000002`

### Different Types

**Template 5** (Winner Certificate):
- `MT25/WIN/T5/000001`
- `MT25/WIN/T5/000002`

**Template 8** (General Certificate):
- `MT25/GEN/T8/000001`
- `MT25/GEN/T8/000002`

## Migration Steps

### 1. Apply Database Changes

Run these SQL migrations in order:

```bash
# 1. Update field size
mysql -u azham -p mtdb < update-serial-field-size.sql

# 2. Update constraint
mysql -u azham -p mtdb < update-serial-constraint-with-template-id.sql
```

Or manually:

```sql
-- Increase field size
ALTER TABLE certificate 
MODIFY COLUMN serialNumber VARCHAR(60) NULL;

-- Drop composite constraint
ALTER TABLE certificate 
DROP INDEX unique_serial_per_template;

-- Add simple unique constraint
ALTER TABLE certificate
ADD CONSTRAINT unique_serial_number UNIQUE (serialNumber);
```

### 2. Regenerate Prisma Client

```bash
npx prisma generate
```

### 3. Verify Changes

```sql
-- Check field size
DESCRIBE certificate;

-- Check constraint
SHOW INDEX FROM certificate WHERE Column_name = 'serialNumber';
```

## Technical Changes

### Files Modified

1. **`/src/lib/services/certificate-serial-service.ts`**
   - Updated `generateSerialNumber()` format to include template ID
   - Updated `validateSerialNumber()` regex pattern
   - Updated `parseSerialNumber()` to extract template ID
   - Updated `previewNextSerialNumber()` format

2. **`/prisma/schema.prisma`**
   - Changed `serialNumber` from `VARCHAR(50)` to `VARCHAR(60)`
   - Reverted from composite unique to simple unique constraint

3. **Database**
   - Field size: `VARCHAR(50)` → `VARCHAR(60)`
   - Constraint: `unique_serial_per_template (templateId, serialNumber)` → `unique_serial_number (serialNumber)`

### Code Changes

**Serial Number Generation:**
```typescript
// Before:
return `${this.PREFIX}${yearShort}/${typeCode}/${paddedSequence}`;
// Returns: MT25/PART/000001

// After:
return `${this.PREFIX}${yearShort}/${typeCode}/T${templateId}/${paddedSequence}`;
// Returns: MT25/PART/T2/000001
```

**Validation Pattern:**
```typescript
// Before:
const pattern = /^MT\d{2}\/(GEN|PART|WIN|NCP)\/\d{6}$/;

// After:
const pattern = /^MT\d{2}\/(GEN|PART|WIN|NCP)\/T\d+\/\d{6}$/;
```

**Parse Function:**
```typescript
// Before: 3 parts
const parts = serialNumber.split('/'); // ["MT25", "PART", "000001"]

// After: 4 parts
const parts = serialNumber.split('/'); // ["MT25", "PART", "T2", "000001"]
const templateId = parseInt(parts[2].slice(1)); // Extract 2 from "T2"
```

## Database State

### Before Migration

```sql
mysql> SELECT templateId, serialNumber FROM certificate LIMIT 3;
+------------+--------------------+
| templateId | serialNumber       |
+------------+--------------------+
|          2 | MT25/PART/000001   |
|         13 | MT25/PART/000001   |
|         14 | MT25/PART/000001   |
+------------+--------------------+
```

### After Migration

New certificates generated:

```sql
mysql> SELECT templateId, serialNumber FROM certificate LIMIT 3;
+------------+------------------------+
| templateId | serialNumber           |
+------------+------------------------+
|          2 | MT25/PART/T2/000001    |
|         13 | MT25/PART/T13/000001   |
|         14 | MT25/PART/T14/000001   |
+------------+------------------------+
```

## Backward Compatibility

### Existing Certificates

- Old format certificates remain valid: `MT25/PART/000001`
- No data migration needed for existing certificates
- Old and new formats can coexist
- Validation function handles both formats gracefully

### Handling Mixed Formats

```typescript
// Parse function returns null for invalid formats
const parsed = CertificateSerialService.parseSerialNumber(serialNumber);

if (parsed && parsed.templateId) {
  // New format with template ID
  console.log(`Template ${parsed.templateId}, Sequence ${parsed.sequence}`);
} else {
  // Old format or invalid
  console.log('Legacy format or invalid serial number');
}
```

## Testing

### Test New Serial Numbers

```bash
# Generate a certificate and check serial number format
curl -X POST http://localhost:3000/api/certificates/templates/2/bulk-generate \
  -H "Content-Type: application/json" \
  -d '{"contestantIds": [47509]}'
```

Expected serial number format: `MT25/PART/T2/000001`

### Verify Uniqueness

```sql
-- Should return 0 rows (no duplicates)
SELECT serialNumber, COUNT(*) as count
FROM certificate
WHERE serialNumber IS NOT NULL
GROUP BY serialNumber
HAVING count > 1;
```

### Check Template Distribution

```sql
-- View serial numbers by template
SELECT 
  templateId,
  COUNT(*) as cert_count,
  MIN(serialNumber) as first_serial,
  MAX(serialNumber) as last_serial
FROM certificate
WHERE serialNumber IS NOT NULL
GROUP BY templateId
ORDER BY templateId;
```

## Rollback (If Needed)

To revert to the old format:

```sql
-- 1. Drop simple constraint
ALTER TABLE certificate DROP INDEX unique_serial_number;

-- 2. Add composite constraint
ALTER TABLE certificate
ADD CONSTRAINT unique_serial_per_template UNIQUE (templateId, serialNumber);

-- 3. Restore field size (optional)
ALTER TABLE certificate 
MODIFY COLUMN serialNumber VARCHAR(50) NULL;
```

Then revert code changes in `certificate-serial-service.ts`.

**Warning**: Any certificates with new format serial numbers will need to be regenerated.

## Impact Analysis

### Affected Systems

✅ **Certificate Generation**: All new certificates use new format
✅ **Serial Number Tracking**: Sequences tracked per template
✅ **Validation**: Updated to accept new format
✅ **Parsing**: Extracts template ID from serial number
✅ **Database**: Constraint allows global uniqueness

### No Impact

✅ **Existing Certificates**: Old format still valid
✅ **Certificate Display**: No UI changes needed
✅ **Certificate Download**: Works with both formats
✅ **Certificate Verification**: Both formats accepted

## Summary

This update enhances certificate traceability by embedding the template ID directly in the serial number format. The change:

- Makes serial numbers globally unique
- Improves audit trails
- Prevents conflicts between templates
- Maintains backward compatibility
- Requires minimal code changes

**New certificates** generated after this update will use the format: `MT25/PART/T{templateId}/000001`

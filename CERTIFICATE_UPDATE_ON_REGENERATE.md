# Certificate Update on Regenerate

## Feature
When generating a certificate for a contestant, if a certificate already exists for the same IC number and template, the system will **update** the existing certificate instead of creating a duplicate.

## Behavior

### Check for Existing Certificate
```sql
SELECT * FROM certificate 
WHERE ic_number = ? 
  AND templateId = ?
LIMIT 1
```

### If Certificate EXISTS (Update)
- **Keeps unchanged:** 
  - `uniqueCode` (original code preserved)
  - `serialNumber` (original serial preserved)
  - `templateId` (same template)
  - `ic_number` (same person)
  
- **Updates:**
  - `recipientName` (current contestant name)
  - `contingent_name` (current contingent)
  - `recipientType` ('PARTICIPANT')
  - `status` (reset to 'DRAFT', then 'READY' after PDF)
  - `filePath` (new PDF file)
  - `updatedAt` (current timestamp)

### If Certificate DOES NOT EXIST (Create)
- Generates new `uniqueCode`
- Generates new `serialNumber`
- Creates new certificate record
- Generates PDF

## Use Cases

### Use Case 1: Name Change
**Scenario:** Contestant's name was corrected after initial certificate generation

**Before:**
- Certificate exists with old name "Muhd Azham"
- IC: 990813105535
- Serial: MT25/GEN/000001

**After Regenerate:**
- Certificate updated with new name "Muhammad Azham"
- IC: 990813105535 (unchanged)
- Serial: MT25/GEN/000001 (unchanged)
- New PDF generated with corrected name

### Use Case 2: Contingent Transfer
**Scenario:** Contestant moved to different contingent

**Before:**
- Certificate exists with "Haji Abu Family"
- Serial: MT25/GEN/000001

**After Regenerate:**
- Certificate updated with "New Contingent Name"
- Serial: MT25/GEN/000001 (unchanged)
- New PDF generated with new contingent

### Use Case 3: First Time Generation
**Scenario:** No existing certificate for this IC + template

**Action:**
- Creates new certificate
- Generates new serial: MT25/GEN/000002
- Creates new PDF

## Implementation

### API Endpoint
`POST /api/participants/contestants/[id]/generate-certificate`

### Logic Flow
```typescript
// 1. Check if certificate exists
const existingCert = await prisma.$queryRaw`
  SELECT * FROM certificate 
  WHERE ic_number = ${contestant.ic}
    AND templateId = ${template.id}
`;

if (existingCert.length > 0) {
  // 2a. UPDATE existing certificate
  await prisma.$executeRaw`
    UPDATE certificate 
    SET recipientName = ${contestant.name},
        contingent_name = ${contestant.contingent.name},
        recipientType = 'PARTICIPANT',
        status = 'DRAFT',
        updatedAt = NOW()
    WHERE id = ${existingCert[0].id}
  `;
  
  certificate = existingCert[0];
  isUpdate = true;
} else {
  // 2b. CREATE new certificate
  const uniqueCode = generateUniqueCode();
  const serialNumber = await generateSerialNumber();
  
  await prisma.$executeRaw`
    INSERT INTO certificate (...)
    VALUES (...)
  `;
  
  certificate = await getCreatedCertificate();
  isUpdate = false;
}

// 3. Generate PDF (same process for both)
const pdf = generatePDF(certificate);

// 4. Update certificate with PDF path
await prisma.$executeRaw`
  UPDATE certificate 
  SET filePath = ${pdfPath},
      status = 'READY',
      issuedAt = NOW()
  WHERE id = ${certificate.id}
`;
```

### Response
```json
{
  "success": true,
  "certificate": {
    "id": 123,
    "uniqueCode": "CERT-1729...",
    "serialNumber": "MT25/GEN/000001",
    "filePath": "/uploads/certificates/cert-CERT-1729....pdf",
    "status": "READY"
  },
  "isUpdate": true,
  "message": "Certificate updated and regenerated successfully"
}
```

## Benefits

### 1. No Duplicate Certificates
Same person + same template = one certificate only

### 2. Consistent Serial Numbers
Serial numbers don't change when regenerating, maintaining certificate history

### 3. Audit Trail Preserved
Original `uniqueCode` and `serialNumber` preserved for reference

### 4. Data Accuracy
Always uses latest contestant information (name, contingent)

### 5. Simpler Management
No need to manually delete old certificates before regenerating

## Database Impact

### Query Pattern
```sql
-- Check for existing certificate
SELECT * FROM certificate 
WHERE ic_number = '990813105535' 
  AND templateId = 2
LIMIT 1;

-- If found: UPDATE
UPDATE certificate 
SET recipientName = 'Muhammad Azham',
    contingent_name = 'Haji Abu Family',
    status = 'DRAFT',
    updatedAt = NOW()
WHERE id = 123;

-- If not found: INSERT
INSERT INTO certificate (...) VALUES (...);
```

### Index Usage
Queries use composite index for efficient lookups:
```sql
-- Existing indexes used
idx_certificate_ic_number  -- on ic_number
idx_certificate_templateId -- on templateId
```

### Recommended Index (Optional)
For even better performance:
```sql
CREATE INDEX idx_certificate_ic_template 
ON certificate(ic_number, templateId);
```

## Edge Cases

### Case 1: IC Number Changed
**Scenario:** Contestant's IC was corrected in database

**Behavior:**
- Old IC + template: Old certificate remains
- New IC + template: New certificate created
- Result: Two certificates (different people technically)

**Solution:** Manually delete old certificate if needed

### Case 2: Multiple Templates
**Scenario:** Generating certificates using different templates

**Behavior:**
- IC + Template A: Certificate 1 (Serial: MT25/GEN/000001)
- IC + Template B: Certificate 2 (Serial: MT25/GEN/000002)
- Each template gets its own certificate

**Result:** One certificate per template per person ✓

### Case 3: Null IC Number
**Scenario:** Contestant has no IC number

**Behavior:**
- Check uses `ic_number IS NULL AND templateId = ?`
- Updates existing certificate with null IC
- Or creates new one if none exists

**Caveat:** Multiple contestants with null IC + same template will share certificate

### Case 4: Template Changed
**Scenario:** Template was modified after certificate generation

**Behavior:**
- Regenerates PDF using NEW template design
- Keeps same serial number
- Certificate reflects latest template layout

## Testing

### Test 1: First Generation
```bash
# Generate certificate for contestant with IC 990813105535
POST /api/participants/contestants/159239/generate-certificate

# Expected Result:
# - New certificate created
# - Serial: MT25/GEN/000001
# - isUpdate: false
```

### Test 2: Regeneration (Same Data)
```bash
# Generate again for same contestant
POST /api/participants/contestants/159239/generate-certificate

# Expected Result:
# - Certificate updated
# - Serial: MT25/GEN/000001 (same!)
# - isUpdate: true
# - PDF regenerated with same data
```

### Test 3: Regeneration (Changed Name)
```bash
# Update contestant name in database
UPDATE contestant SET name = 'Muhammad Azham' WHERE id = 159239;

# Generate certificate
POST /api/participants/contestants/159239/generate-certificate

# Expected Result:
# - Certificate updated
# - Serial: MT25/GEN/000001 (same!)
# - isUpdate: true
# - PDF shows NEW name
```

### Test 4: Different Template
```bash
# Change to different template (if available)
# Generate certificate with template ID 3

# Expected Result:
# - NEW certificate created (different template)
# - Serial: MT25/GEN/000002
# - isUpdate: false
# - Both certificates exist (one per template)
```

## Logging

The API logs indicate update vs create:
```
// Update scenario
Certificate already exists for IC: 990813105535
Updating existing certificate: { id: 123, uniqueCode: 'CERT-...', serialNumber: 'MT25/GEN/000001' }
Certificate updated successfully
Certificate updated - uniqueCode: CERT-..., serialNumber: MT25/GEN/000001

// Create scenario
Creating new certificate for IC: 990813105535
Generated uniqueCode: CERT-1729...
Generated serialNumber: MT25/GEN/000002
Certificate created - uniqueCode: CERT-..., serialNumber: MT25/GEN/000002
```

## Related Files

- `/src/app/api/participants/contestants/[id]/generate-certificate/route.ts` - API implementation
- `/CONTESTANT_CERT_FIX.md` - Original certificate generation docs
- `/CERTIFICATE_SERIAL_NUMBERS.md` - Serial number documentation

## Summary

The certificate generation system now intelligently handles regeneration by:
1. Checking if certificate exists for IC + template
2. **Updating** existing certificate (preserving serial number)
3. **Creating** new certificate only when none exists
4. Always generating fresh PDF with latest data

This prevents duplicate certificates while maintaining serial number consistency and allowing for data corrections.

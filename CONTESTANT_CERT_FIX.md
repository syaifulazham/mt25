# Contestant Certificate Generation - Database Fix

## Issue
POST `/api/participants/contestants/[id]/generate-certificate` was returning 500 error due to database schema mismatches.

## Date Fixed
October 15, 2025

## Root Causes

### 1. Wrong `recipientType` Value
**Problem**: Used `'CONTESTANT'` but database expects `'PARTICIPANT'`
**Fixed**: Changed to `'PARTICIPANT'` to match organizer certificates

### 2. Different uniqueCode Format
**Problem**: Used simple format `CERT-{timestamp}-{id}`
**Fixed**: Now uses same format as organizer: `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

### 3. Serial Number Generation Issues
**Problem**: Tried to use Prisma ORM methods that don't exist for `certificate_serial` table
**Fixed**: Now uses `CertificateSerialService.generateSerialNumber()` which uses raw SQL

### 4. Certificate Creation Method
**Problem**: Used Prisma ORM `create()` which had type conflicts with `serialNumber` field
**Fixed**: Now uses raw SQL `$executeRaw` like organizer certificates

## Changes Made

### API Route Updated
**File**: `/src/app/api/participants/contestants/[id]/generate-certificate/route.ts`

#### 1. Updated Imports
```typescript
// Before
import prisma from '@/lib/prisma';

// After
import { PrismaClient } from '@prisma/client';
import { CertificateSerialService } from '@/lib/services/certificate-serial-service';
const prisma = new PrismaClient();
```

#### 2. Updated uniqueCode Generation
```typescript
// Before
const uniqueCode = `CERT-${Date.now()}-${contestantId}`;

// After (matches organizer)
const uniqueCode = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
```

#### 3. Updated Serial Number Generation
```typescript
// Before (Prisma ORM with type issues)
const serialRecord = await prisma.$transaction(async (tx: any) => {
  const record = await (tx as any).certificateSerial.upsert({...});
});

// After (using CertificateSerialService)
const serialNumber = await CertificateSerialService.generateSerialNumber(
  template.id,
  'GENERAL',
  new Date().getFullYear()
);
```

#### 4. Updated Certificate Creation
```typescript
// Before (Prisma ORM)
certificate = await prisma.certificate.create({
  data: {
    recipientType: 'CONTESTANT', // Wrong!
    serialNumber,  // Type error
    // ... other fields
  } as any
});

// After (Raw SQL)
await prisma.$executeRaw`
  INSERT INTO certificate 
  (templateId, recipientName, recipientEmail, recipientType, 
   contingent_name, team_name, ic_number, contestName, awardTitle,
   uniqueCode, serialNumber, status, createdAt, updatedAt, createdBy)
  VALUES (
    ${template.id},
    ${contestant.name},
    ${null},
    'PARTICIPANT',  // Correct!
    ${contestant.contingent.name},
    ${null},
    ${contestant.ic || null},
    ${null},
    ${null},
    ${uniqueCode},
    ${serialNumber},
    'DRAFT',
    NOW(),
    NOW(),
    ${userId}
  )
`;
```

#### 5. Updated Certificate Update
```typescript
// Before (Prisma ORM)
await prisma.certificate.update({
  where: { id: certificate.id },
  data: { filePath, status: 'READY', issuedAt: new Date() }
});

// After (Raw SQL)
await prisma.$executeRaw`
  UPDATE certificate 
  SET filePath = ${filePath},
      status = 'READY',
      issuedAt = NOW(),
      updatedAt = NOW()
  WHERE id = ${certificate.id}
`;
```

## Database Schema Alignment

### Certificate Table - Required Fields
```sql
CREATE TABLE certificate (
  id INT PRIMARY KEY AUTO_INCREMENT,
  templateId INT NOT NULL,
  recipientName VARCHAR(255) NOT NULL,
  recipientEmail VARCHAR(255),
  recipientType ENUM('PARTICIPANT', 'JUDGE', 'ORGANIZER') NOT NULL,
  contingent_name VARCHAR(255),
  team_name VARCHAR(255),
  ic_number VARCHAR(50),
  contestName VARCHAR(255),
  awardTitle VARCHAR(255),
  uniqueCode VARCHAR(100) NOT NULL UNIQUE,
  serialNumber VARCHAR(50) UNIQUE,
  status VARCHAR(20) DEFAULT 'DRAFT',
  filePath VARCHAR(500),
  issuedAt DATETIME,
  createdAt DATETIME DEFAULT NOW(),
  updatedAt DATETIME DEFAULT NOW(),
  createdBy INT NOT NULL,
  FOREIGN KEY (templateId) REFERENCES cert_template(id)
);
```

### Certificate Flows Comparison

#### Organizer Certificates
- Used for: Non-contestant participants (judges, organizers, etc.)
- Template Type: NON_CONTEST_PARTICIPANT
- recipientType: PARTICIPANT
- Serial Format: MT25/NCP/000001

#### Contestant Certificates (This Implementation)
- Used for: Contestants/participants
- Template Type: GENERAL
- recipientType: PARTICIPANT (now matches!)
- Serial Format: MT25/GEN/000001

## Why Raw SQL Instead of Prisma ORM?

### Advantages of Raw SQL for This Use Case

1. **Type Safety Issues**: Prisma's generated types don't always match exact database schema
2. **NULL Handling**: Raw SQL gives better control over NULL values
3. **ENUM Values**: Direct SQL ensures enum values match exactly
4. **Consistency**: Matches existing organizer certificate code
5. **Debugging**: Easier to see exact SQL being executed

### When to Use Each

**Use Prisma ORM when:**
- Reading data (queries)
- Simple CRUD operations
- Type safety is paramount
- Schema matches generated types

**Use Raw SQL when:**
- Complex insertions with many nullable fields
- ENUM values that may not match TypeScript types
- Need exact control over SQL
- Matching existing raw SQL patterns

## Testing the Fix

### 1. Ensure Database is Ready
```bash
# Run migrations if not already done
mysql -u username -p mtdb < database-migration-certificates-complete.sql

# Verify certificate table structure
mysql -u username -p mtdb
> DESCRIBE certificate;
> SELECT * FROM certificate_status_enum;
```

### 2. Create GENERAL Template
- Go to `/organizer/certificates/templates/create`
- Upload PDF background
- Set targetType: GENERAL
- Add text elements (name, ic, etc.)
- Save and set status to ACTIVE

### 3. Test Certificate Generation
```bash
# Test the endpoint
POST http://localhost:3000/api/participants/contestants/166132/generate-certificate
Authorization: Bearer {your-token}
```

### 4. Verify Database Records
```sql
-- Check certificate was created
SELECT 
  id, templateId, recipientName, recipientType, 
  uniqueCode, serialNumber, status, filePath
FROM certificate
ORDER BY id DESC LIMIT 1;

-- Should show:
-- recipientType: 'PARTICIPANT'
-- serialNumber: 'MT25/GEN/000001' (or next number)
-- status: 'READY'
-- filePath: '/uploads/certificates/cert-CERT-...'

-- Check serial number tracking
SELECT * FROM certificate_serial 
WHERE targetType = 'GENERAL' 
ORDER BY id DESC LIMIT 1;
```

### 5. Test from UI
1. Go to `http://localhost:3000/participants/contestants`
2. Click actions menu (⋮) on a contestant
3. Click "Generate Certificate"
4. Should download PDF automatically
5. Check database to verify record created correctly

## Expected Results

### Successful Response
```json
{
  "success": true,
  "certificate": {
    "id": 123,
    "uniqueCode": "CERT-1729012345678-XYZ12345",
    "serialNumber": "MT25/GEN/000042",
    "filePath": "/uploads/certificates/cert-CERT-1729012345678-XYZ12345.pdf",
    "status": "READY"
  },
  "message": "Certificate generated successfully"
}
```

### Database Record
```
id: 123
templateId: 4
recipientName: John Doe
recipientType: PARTICIPANT
contingent_name: Sekolah XYZ  
ic_number: 012345678901
uniqueCode: CERT-1729012345678-XYZ12345
serialNumber: MT25/GEN/000042
status: READY
filePath: /uploads/certificates/cert-CERT-1729012345678-XYZ12345.pdf
createdBy: 1
```

## Common Errors Fixed

### Error 1: recipientType Mismatch
```
Error: Enum error for recipientType
Fixed: Changed 'CONTESTANT' to 'PARTICIPANT'
```

### Error 2: serialNumber Type Error
```
Error: serialNumber does not exist in type CertificateCreateInput
Fixed: Use raw SQL instead of Prisma ORM
```

### Error 3: certificateSerial Property Not Found
```
Error: Property 'certificateSerial' does not exist on type Prisma...
Fixed: Use CertificateSerialService instead of direct Prisma access
```

### Error 4: Foreign Key Constraint (createdBy)
```
Error: Code: 1452. Cannot add or update a child row: a foreign key constraint fails
       (`mtdb`.`certificate`, CONSTRAINT `fk_certificate_createdBy` 
       FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`))
       
Root Cause: Participants are in user_participant table, but certificate.createdBy 
            references user table (admin/operators only)
            
Fixed: Use system admin user ID instead of participant user ID for createdBy field
```

**Solution:**
```typescript
// Find an admin user to use as creator
const systemUser = await prisma.$queryRaw`
  SELECT id FROM user WHERE role = 'ADMIN' ORDER BY id ASC LIMIT 1
` as any[];
const createdByUserId = systemUser[0]?.id || 1; // Default to ID 1

// Use system user ID in INSERT
await prisma.$executeRaw`
  INSERT INTO certificate (..., createdBy)
  VALUES (..., ${createdByUserId})
`;
```

## Benefits of This Approach

1. **Consistency**: Matches organizer certificate generation exactly
2. **Reliability**: Uses battle-tested raw SQL approach
3. **Maintainability**: Single pattern for all certificate types
4. **Type Safety**: Explicit SQL avoids Prisma type mismatches
5. **Debugging**: Clear SQL makes troubleshooting easier

## Related Files

- `/src/app/api/participants/contestants/[id]/generate-certificate/route.ts` - Fixed API
- `/src/lib/services/certificate-serial-service.ts` - Serial number service
- `/src/app/api/certificates/create-non-contestant/route.ts` - Reference implementation
- `/database-migration-certificates-complete.sql` - Database schema

## Future Improvements

1. **Duplicate Check**: Add check before creation to return existing certificate
2. **Batch Generation**: Generate multiple certificates at once
3. **Error Handling**: More specific error messages
4. **Validation**: Validate template has all required fields
5. **Logging**: Add detailed logging for troubleshooting

## Summary

The fix aligns contestant certificate generation with the proven organizer certificate approach by:
- Using correct `recipientType: 'PARTICIPANT'`
- Using `CertificateSerialService` for serial numbers
- Using raw SQL for database operations
- Matching uniqueCode format exactly
- Following established patterns from working code

The API now successfully creates certificate records in the database before generating PDFs, ensuring data consistency and proper serial number tracking.

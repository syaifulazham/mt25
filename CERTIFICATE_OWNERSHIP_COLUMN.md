# Certificate Ownership Column

## Overview
Added a nullable JSON `ownership` column to the `certificate` table to store ownership information including year, contingent ID, and contestant ID.

## Date Implemented
October 21, 2025

## Database Schema Change

### Column Details
- **Column Name**: `ownership`
- **Data Type**: `JSON`
- **Nullable**: `YES` (NULL allowed)
- **Position**: After `updatedAt` column
- **Comment**: "Ownership information in JSON format"

### SQL Migration
```sql
ALTER TABLE certificate 
ADD COLUMN ownership JSON NULL 
COMMENT 'Ownership information in JSON format. Example: {"year": 2025, "contingentId": 212, "contestantId": 6501}'
AFTER updatedAt;
```

### Prisma Schema Update
```prisma
model Certificate {
  id             Int          @id @default(autoincrement())
  templateId     Int
  recipientName  String       @db.VarChar(255)
  recipientEmail String?      @db.VarChar(255)
  recipientType  String       @db.VarChar(50)
  contingent_name String?     @db.VarChar(255)
  team_name      String?      @db.VarChar(255)
  ic_number      String?      @db.VarChar(50)
  contestName    String?      @db.VarChar(255)
  awardTitle     String?      @db.VarChar(255)
  uniqueCode     String       @unique @db.VarChar(50)
  serialNumber   String?      @unique @db.VarChar(50)
  filePath       String?      @db.VarChar(1000)
  status         String       @default("DRAFT") @db.VarChar(20)
  issuedAt       DateTime?    @db.DateTime(0)
  createdAt      DateTime     @default(now()) @db.DateTime(0)
  updatedAt      DateTime     @default(now()) @updatedAt @db.DateTime(0)
  ownership      Json?        // ← New field
  createdBy      Int?
  // ... relations
}
```

## Data Format

### JSON Structure
```json
{
  "year": 2025,
  "contingentId": 212,
  "contestantId": 6501
}
```

### Field Descriptions

#### year (Number)
- **Type**: Integer
- **Description**: The year the certificate belongs to
- **Example**: `2025`
- **Purpose**: Track certificate ownership by year/event period

#### contingentId (Number)
- **Type**: Integer
- **Description**: The ID of the contingent that owns the certificate
- **Example**: `212`
- **Purpose**: Link certificate to contingent for access control and filtering
- **References**: `contingent.id` table

#### contestantId (Number)
- **Type**: Integer
- **Description**: The ID of the contestant who owns the certificate
- **Example**: `6501`
- **Purpose**: Link certificate to specific contestant for ownership verification
- **References**: `contestant.id` table

## Usage Examples

### TypeScript/Prisma

#### Create Certificate with Ownership
```typescript
const certificate = await prisma.certificate.create({
  data: {
    templateId: 5,
    recipientName: "John Doe",
    recipientType: "PARTICIPANT",
    uniqueCode: "CERT-ABC123",
    serialNumber: "MT25/GEN/000001",
    status: "READY",
    ownership: {
      year: 2025,
      contingentId: 212,
      contestantId: 6501
    }
  }
});
```

#### Update Certificate Ownership
```typescript
await prisma.certificate.update({
  where: { id: 123 },
  data: {
    ownership: {
      year: 2025,
      contingentId: 212,
      contestantId: 6501
    }
  }
});
```

#### Query Certificates by Ownership
```typescript
// Find certificates for a specific contestant
const certificates = await prisma.certificate.findMany({
  where: {
    ownership: {
      path: ['contestantId'],
      equals: 6501
    }
  }
});

// Find certificates for a specific contingent and year
const contingentCerts = await prisma.certificate.findMany({
  where: {
    AND: [
      {
        ownership: {
          path: ['contingentId'],
          equals: 212
        }
      },
      {
        ownership: {
          path: ['year'],
          equals: 2025
        }
      }
    ]
  }
});
```

#### Type-safe Ownership
```typescript
// Define ownership type
type CertificateOwnership = {
  year: number;
  contingentId: number;
  contestantId: number;
};

// Use in functions
function createCertificateWithOwnership(
  templateId: number,
  recipientName: string,
  ownership: CertificateOwnership
) {
  return prisma.certificate.create({
    data: {
      templateId,
      recipientName,
      recipientType: "PARTICIPANT",
      uniqueCode: generateUniqueCode(),
      ownership: ownership as any, // Cast for Prisma JSON type
      status: "DRAFT"
    }
  });
}

// Type assertion for reading
const cert = await prisma.certificate.findUnique({ where: { id: 1 } });
const ownership = cert?.ownership as CertificateOwnership | null;

if (ownership) {
  console.log(`Year: ${ownership.year}`);
  console.log(`Contingent: ${ownership.contingentId}`);
  console.log(`Contestant: ${ownership.contestantId}`);
}
```

### SQL Queries

#### Find by Year
```sql
SELECT id, recipientName, uniqueCode, ownership
FROM certificate
WHERE ownership IS NOT NULL
  AND JSON_EXTRACT(ownership, '$.year') = 2025;
```

#### Find by Contingent
```sql
SELECT id, recipientName, uniqueCode, ownership
FROM certificate
WHERE ownership IS NOT NULL
  AND JSON_EXTRACT(ownership, '$.contingentId') = 212;
```

#### Find by Contestant
```sql
SELECT id, recipientName, uniqueCode, ownership
FROM certificate
WHERE ownership IS NOT NULL
  AND JSON_EXTRACT(ownership, '$.contestantId') = 6501;
```

#### Find by Contingent and Year
```sql
SELECT id, recipientName, uniqueCode, serialNumber, ownership
FROM certificate
WHERE JSON_EXTRACT(ownership, '$.year') = 2025
  AND JSON_EXTRACT(ownership, '$.contingentId') = 212
ORDER BY createdAt DESC;
```

#### Count Certificates by Year
```sql
SELECT 
    JSON_EXTRACT(ownership, '$.year') as year,
    COUNT(*) as certificate_count
FROM certificate
WHERE ownership IS NOT NULL
GROUP BY JSON_EXTRACT(ownership, '$.year')
ORDER BY year DESC;
```

#### Count Certificates by Contingent (for specific year)
```sql
SELECT 
    JSON_EXTRACT(ownership, '$.contingentId') as contingentId,
    COUNT(*) as certificate_count
FROM certificate
WHERE ownership IS NOT NULL
  AND JSON_EXTRACT(ownership, '$.year') = 2025
GROUP BY JSON_EXTRACT(ownership, '$.contingentId')
ORDER BY certificate_count DESC;
```

#### List Contingent's Certificates with Details
```sql
SELECT 
    c.id,
    c.recipientName,
    c.serialNumber,
    c.uniqueCode,
    c.status,
    JSON_EXTRACT(c.ownership, '$.year') as year,
    JSON_EXTRACT(c.ownership, '$.contingentId') as contingentId,
    JSON_EXTRACT(c.ownership, '$.contestantId') as contestantId,
    ct.name as contestantName,
    cg.name as contingentName
FROM certificate c
LEFT JOIN contestant ct ON JSON_EXTRACT(c.ownership, '$.contestantId') = ct.id
LEFT JOIN contingent cg ON JSON_EXTRACT(c.ownership, '$.contingentId') = cg.id
WHERE JSON_EXTRACT(c.ownership, '$.contingentId') = 212
  AND JSON_EXTRACT(c.ownership, '$.year') = 2025
ORDER BY c.createdAt DESC;
```

## Use Cases

### 1. Access Control
**Scenario**: Contingent participants should only see their own contingent's certificates

```typescript
async function getContingentCertificates(contingentId: number, year: number) {
  return await prisma.certificate.findMany({
    where: {
      AND: [
        {
          ownership: {
            path: ['contingentId'],
            equals: contingentId
          }
        },
        {
          ownership: {
            path: ['year'],
            equals: year
          }
        }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });
}
```

### 2. Contestant Certificate Verification
**Scenario**: Verify a contestant owns a specific certificate

```typescript
async function verifyContestantOwnership(
  certificateId: number,
  contestantId: number
): Promise<boolean> {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: { ownership: true }
  });
  
  if (!certificate?.ownership) return false;
  
  const ownership = certificate.ownership as any;
  return ownership.contestantId === contestantId;
}
```

### 3. Year-based Certificate Management
**Scenario**: Archive or list certificates by year

```typescript
async function getCertificatesByYear(year: number) {
  return await prisma.certificate.findMany({
    where: {
      ownership: {
        path: ['year'],
        equals: year
      }
    },
    include: {
      template: {
        select: {
          templateName: true
        }
      }
    }
  });
}
```

### 4. Contingent Dashboard Statistics
**Scenario**: Show certificate statistics for a contingent

```typescript
async function getContingentCertificateStats(contingentId: number, year: number) {
  const certificates = await prisma.certificate.findMany({
    where: {
      AND: [
        {
          ownership: {
            path: ['contingentId'],
            equals: contingentId
          }
        },
        {
          ownership: {
            path: ['year'],
            equals: year
          }
        }
      ]
    },
    select: {
      status: true,
      createdAt: true
    }
  });
  
  return {
    total: certificates.length,
    ready: certificates.filter(c => c.status === 'READY').length,
    draft: certificates.filter(c => c.status === 'DRAFT').length,
    issued: certificates.filter(c => c.status === 'ISSUED').length,
  };
}
```

### 5. Bulk Certificate Generation
**Scenario**: Generate certificates for all contestants in a contingent

```typescript
async function generateContingentCertificates(
  contingentId: number,
  year: number,
  templateId: number
) {
  // Get all contestants from contingent
  const contestants = await prisma.contestant.findMany({
    where: { contingentId },
    include: { contingent: true }
  });
  
  // Generate certificate for each contestant
  const certificates = await Promise.all(
    contestants.map(contestant =>
      prisma.certificate.create({
        data: {
          templateId,
          recipientName: contestant.name,
          recipientType: "PARTICIPANT",
          contingent_name: contestant.contingent.name,
          ic_number: contestant.ic,
          uniqueCode: generateUniqueCode(),
          serialNumber: await generateSerialNumber(templateId),
          status: "DRAFT",
          ownership: {
            year,
            contingentId,
            contestantId: contestant.id
          }
        }
      })
    )
  );
  
  return certificates;
}
```

## Migration Steps

### 1. Run SQL Migration
```bash
mysql -u azham -p mtdb < database-migration-certificate-ownership.sql
```

### 2. Verify Column Added
```sql
DESCRIBE certificate;
```

Expected output should show:
```
ownership | json | YES | NULL |
```

### 3. Prisma Schema Already Updated
The schema has been updated with:
```prisma
ownership      Json?
```

### 4. Regenerate Prisma Client
```bash
npx prisma generate
```

### 5. Update Existing Code (if needed)
Update certificate creation/update logic to include ownership information.

## Integration Points

### Certificate Generation API
Update certificate generation endpoints to set ownership:

```typescript
// In /api/participants/contestants/[id]/generate-certificate/route.ts
const certificate = await prisma.certificate.create({
  data: {
    // ... existing fields
    ownership: {
      year: new Date().getFullYear(),
      contingentId: contestant.contingentId,
      contestantId: contestant.id
    }
  }
});
```

### Participant Dashboard
Filter certificates by logged-in participant's contingent:

```typescript
// Get participant session
const participant = await getParticipantFromSession();

// Fetch only their contingent's certificates
const certificates = await prisma.certificate.findMany({
  where: {
    ownership: {
      path: ['contingentId'],
      equals: participant.contingentId
    }
  }
});
```

### Admin Dashboard
Show certificate statistics grouped by contingent and year:

```typescript
const stats = await prisma.$queryRaw`
  SELECT 
    JSON_EXTRACT(ownership, '$.year') as year,
    JSON_EXTRACT(ownership, '$.contingentId') as contingentId,
    COUNT(*) as count,
    SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as ready_count
  FROM certificate
  WHERE ownership IS NOT NULL
  GROUP BY 
    JSON_EXTRACT(ownership, '$.year'),
    JSON_EXTRACT(ownership, '$.contingentId')
  ORDER BY year DESC, count DESC
`;
```

## Backward Compatibility

### Existing Certificates
- Certificates created before this update will have `ownership = NULL`
- This is acceptable and won't break functionality
- Can be backfilled if needed:

```typescript
// Backfill ownership for existing certificates
async function backfillOwnership() {
  const certificates = await prisma.certificate.findMany({
    where: {
      ownership: null,
      ic_number: { not: null }
    },
    include: {
      template: true
    }
  });
  
  for (const cert of certificates) {
    // Find contestant by IC number
    const contestant = await prisma.contestant.findFirst({
      where: { ic: cert.ic_number }
    });
    
    if (contestant) {
      await prisma.certificate.update({
        where: { id: cert.id },
        data: {
          ownership: {
            year: cert.createdAt.getFullYear(),
            contingentId: contestant.contingentId,
            contestantId: contestant.id
          }
        }
      });
    }
  }
}
```

### Null Handling
Always check for null before accessing ownership:

```typescript
const certificate = await prisma.certificate.findUnique({ where: { id } });

if (certificate.ownership) {
  const ownership = certificate.ownership as any;
  console.log(`Contingent: ${ownership.contingentId}`);
} else {
  console.log('Legacy certificate without ownership info');
}
```

## Best Practices

### 1. Always Set Ownership for New Certificates
```typescript
// ✅ Good
await prisma.certificate.create({
  data: {
    // ... fields
    ownership: {
      year: 2025,
      contingentId: 212,
      contestantId: 6501
    }
  }
});

// ❌ Avoid - missing ownership
await prisma.certificate.create({
  data: {
    // ... fields without ownership
  }
});
```

### 2. Use Type Definitions
```typescript
type CertificateOwnership = {
  year: number;
  contingentId: number;
  contestantId: number;
};

// Ensures all required fields are present
const ownership: CertificateOwnership = {
  year: 2025,
  contingentId: 212,
  contestantId: 6501
};
```

### 3. Validate Ownership Data
```typescript
function validateOwnership(ownership: any): ownership is CertificateOwnership {
  return (
    typeof ownership === 'object' &&
    ownership !== null &&
    typeof ownership.year === 'number' &&
    typeof ownership.contingentId === 'number' &&
    typeof ownership.contestantId === 'number'
  );
}
```

### 4. Index Consideration
For frequent queries on ownership fields, consider adding MySQL generated columns and indexes:

```sql
-- Add generated columns for better query performance
ALTER TABLE certificate
ADD COLUMN ownership_year INT GENERATED ALWAYS AS (JSON_EXTRACT(ownership, '$.year')) STORED,
ADD COLUMN ownership_contingentId INT GENERATED ALWAYS AS (JSON_EXTRACT(ownership, '$.contingentId')) STORED,
ADD COLUMN ownership_contestantId INT GENERATED ALWAYS AS (JSON_EXTRACT(ownership, '$.contestantId')) STORED;

-- Add indexes
CREATE INDEX idx_certificate_ownership_year ON certificate(ownership_year);
CREATE INDEX idx_certificate_ownership_contingentId ON certificate(ownership_contingentId);
CREATE INDEX idx_certificate_ownership_contestantId ON certificate(ownership_contestantId);
CREATE INDEX idx_certificate_ownership_composite ON certificate(ownership_year, ownership_contingentId);
```

## Files Modified

- `/prisma/schema.prisma` - Added `ownership Json?` field to Certificate model
- `/database-migration-certificate-ownership.sql` - SQL migration to add column
- `/CERTIFICATE_OWNERSHIP_COLUMN.md` - This documentation

## Summary

The `ownership` JSON column provides:
- ✅ Flexible ownership tracking
- ✅ Contingent-scoped access control
- ✅ Year-based certificate management
- ✅ Contestant verification
- ✅ Backward compatible (nullable)
- ✅ Rich querying capabilities
- ✅ Support for future ownership attributes

This enables proper multi-tenant certificate management where contingents and contestants can only access their own certificates, while maintaining system-wide certificate tracking by year.

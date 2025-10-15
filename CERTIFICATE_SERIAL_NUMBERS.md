# Certificate Serial Number System

## Overview

This system provides automatic generation of unique, trackable serial numbers for certificates issued through the MT25 platform.

## Serial Number Format

**Format**: `MT{YY}/{TYPE_CODE}/{SEQUENCE}`

**Example**: `MT25/GEN/000001`

### Components:
- **MT**: Malaysia Techlympics prefix
- **YY**: Last 2 digits of year (e.g., 25 for 2025)
- **TYPE_CODE**: Certificate type identifier
  - `GEN` - General certificates
  - `PART` - Event Participant certificates
  - `WIN` - Event Winner certificates
  - `NCP` - Non-Contest Participant certificates
- **SEQUENCE**: 6-digit auto-incrementing number (resets each year per type)

## Database Tables

### certificate_serial
Tracks serial number sequences for each certificate type/year combination.

```sql
CREATE TABLE certificate_serial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year INT NOT NULL,
  templateId INT NOT NULL,
  targetType ENUM('GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER', 'NON_CONTEST_PARTICIPANT'),
  typeCode VARCHAR(10) NOT NULL,
  lastSequence INT NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_year_type (year, targetType, templateId)
);
```

### certificate (updated)
Added `serialNumber` column to store the generated serial number.

```sql
ALTER TABLE certificate 
ADD COLUMN serialNumber VARCHAR(50) NULL AFTER uniqueCode,
ADD UNIQUE INDEX unique_serial_number (serialNumber);
```

## Usage

### 1. Basic Serial Number Generation

```typescript
import { CertificateSerialService } from '@/lib/services/certificate-serial-service';

// Generate serial number
const serialNumber = await CertificateSerialService.generateSerialNumber(
  templateId, 
  'EVENT_WINNER', 
  2025
);

// Result: MT25/WIN/000001
```

### 2. Create Certificate with Serial Number

```typescript
import { createCertificateWithSerial } from '@/lib/utils/certificate-helper';

const certificate = await createCertificateWithSerial({
  templateId: 1,
  recipientName: 'John Doe',
  recipientEmail: 'john@example.com',
  recipientType: 'contestant',
  contingent_name: 'ABC School',
  team_name: 'Team Alpha',
  ic_number: '990101-10-1234',
  contestName: 'Coding Challenge',
  awardTitle: 'First Place',
  targetType: 'EVENT_WINNER',
  status: 'ISSUED',
  createdBy: 1
});

// Certificate will have both uniqueCode and serialNumber
console.log(certificate.serialNumber); // MT25/WIN/000001
```

### 3. Batch Create Certificates

```typescript
import { batchCreateCertificatesWithSerial } from '@/lib/utils/certificate-helper';

const certificates = await batchCreateCertificatesWithSerial([
  {
    templateId: 1,
    recipientName: 'Alice Smith',
    targetType: 'EVENT_PARTICIPANT',
    // ... other fields
  },
  {
    templateId: 1,
    recipientName: 'Bob Johnson',
    targetType: 'EVENT_PARTICIPANT',
    // ... other fields
  }
]);

// Each certificate will have sequential serial numbers:
// MT25/PART/000001
// MT25/PART/000002
```

### 4. Preview Next Serial Number

```typescript
import { getNextSerialPreview } from '@/lib/utils/certificate-helper';

const nextSerial = await getNextSerialPreview(
  templateId: 1,
  targetType: 'GENERAL'
);

console.log(nextSerial); // MT25/GEN/000015 (example)
```

### 5. Verify Certificate by Serial Number

```typescript
import { verifyCertificateBySerial } from '@/lib/utils/certificate-helper';

const certificate = await verifyCertificateBySerial('MT25/WIN/000001');

if (certificate) {
  console.log(`Certificate for ${certificate.recipientName}`);
  console.log(`Issued: ${certificate.issuedAt}`);
} else {
  console.log('Certificate not found or invalid serial number');
}
```

### 6. Get Serial Number Statistics

```typescript
import { CertificateSerialService } from '@/lib/services/certificate-serial-service';

// Get stats for current year
const stats = await CertificateSerialService.getSerialStats();

// Get stats for specific year
const stats2024 = await CertificateSerialService.getSerialStats(2024);

// Returns array of:
// {
//   year: 2025,
//   targetType: 'EVENT_WINNER',
//   typeCode: 'WIN',
//   lastSequence: 45,
//   templateName: 'Winner Certificate',
//   certificatesIssued: 45
// }
```

### 7. Get Current Sequence Number

```typescript
import { CertificateSerialService } from '@/lib/services/certificate-serial-service';

const currentSeq = await CertificateSerialService.getCurrentSequence(
  templateId: 1,
  targetType: 'GENERAL',
  year: 2025
);

console.log(`Current sequence: ${currentSeq}`); // e.g., 123
console.log(`Next will be: ${currentSeq + 1}`); // e.g., 124
```

## API Endpoints

### GET /api/certificates/serial-stats

Get statistics for serial number generation.

**Query Parameters:**
- `year` (optional): Year to get stats for (defaults to current year)

**Response:**
```json
{
  "stats": [
    {
      "year": 2025,
      "targetType": "EVENT_WINNER",
      "typeCode": "WIN",
      "lastSequence": 45,
      "templateName": "Winner Certificate",
      "certificatesIssued": 45
    }
  ],
  "year": 2025
}
```

## Features

### Automatic Sequence Management
- Automatically increments sequence for each certificate type
- Resets sequence each year
- Prevents gaps in sequence numbers

### Thread-Safe Generation
- Uses database transactions with row-level locking
- Prevents duplicate serial numbers even under high concurrency
- Atomic increment operations

### Validation
- Built-in format validation
- Serial number parsing utilities
- Existence checking

### Statistics & Reporting
- Track certificates issued per type/year
- Monitor sequence progress
- Audit trail through certificate_serial table

## Best Practices

1. **Always use the service to generate serial numbers**
   - Don't manually create serial numbers
   - Don't bypass the service methods

2. **Handle errors appropriately**
   ```typescript
   try {
     const serialNumber = await CertificateSerialService.generateSerialNumber(...);
   } catch (error) {
     console.error('Failed to generate serial number:', error);
     // Implement retry logic or notify admin
   }
   ```

3. **Use batch operations for multiple certificates**
   - More efficient than individual creates
   - Maintains sequential numbering
   - Reduces database connections

4. **Monitor sequence numbers**
   - Regular check stats to track usage
   - Alert when approaching limits (e.g., sequence > 90000)
   - Plan for year rollover

5. **Backup serial records**
   - Include certificate_serial table in backups
   - Critical for maintaining sequence integrity
   - Essential for audit trail

## Troubleshooting

### Serial Number Already Exists
If you encounter unique constraint violations:
```typescript
// Check if serial number exists
const exists = await CertificateSerialService.serialNumberExists(serialNumber);
if (exists) {
  // Regenerate or investigate duplicate
}
```

### Sequence Reset Needed
Only in rare cases where you need to reset:
```typescript
// WARNING: Use with extreme caution
await CertificateSerialService.resetSequence(
  templateId: 1,
  targetType: 'GENERAL',
  year: 2025
);
```

### Gap in Sequence
Gaps can occur if certificate creation fails after serial generation. This is normal and acceptable. Serial numbers don't need to be perfectly sequential.

## Future Enhancements

Potential additions to the system:

1. **QR Code Integration**: Embed serial number in QR codes
2. **Public Verification API**: Allow public verification of certificates
3. **Batch Reservation**: Reserve ranges of serial numbers for bulk operations
4. **Multi-Event Prefixes**: Different prefixes for different events
5. **Expiry Tracking**: Track when certificates expire
6. **Revocation System**: Mark certificates as revoked while preserving serial number

## Support

For issues or questions about the serial number system:
- Check this documentation
- Review the service code: `/src/lib/services/certificate-serial-service.ts`
- Check API endpoints: `/src/app/api/certificates/serial-stats/`

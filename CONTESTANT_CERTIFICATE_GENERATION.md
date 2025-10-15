# Contestant Certificate Generation Feature

## Overview
Participants can now generate and download GENERAL type certificates directly from the contestants management page (`/participants/contestants`).

## Implementation Date
October 15, 2025

## Features

### 1. Certificate Generation for Contestants
- **Location**: `/participants/contestants` page
- **Certificate Type**: GENERAL  
- **Target Users**: Participants (managing their own contestants)
- **Access**: Available in the contestant actions dropdown menu

### 2. Automatic Certificate Creation
- Generates unique serial numbers (format: MT25/GEN/000001)
- Uses the most recent active GENERAL template
- Includes contestant details:
  - Recipient name
  - IC number
  - Contingent name
  - Institution name
  - Issue date
  - Unique code
  - Serial number

### 3. Duplicate Prevention
- Checks if certificate already exists for the contestant
- If certificate exists and is ready, returns existing certificate
- Prevents multiple certificates for the same contestant/template combination

### 4. Immediate Download
- Certificate automatically downloads after generation
- Uses dynamic PDF serving to avoid caching issues
- No server restart required

## Files Created/Modified

### New API Route
**`/src/app/api/participants/contestants/[id]/generate-certificate/route.ts`**
- **Method**: POST
- **Authentication**: Required (NextAuth session)
- **Purpose**: Generate GENERAL certificate for a specific contestant

**Features:**
- Validates contestant existence
- Finds active GENERAL template
- Generates serial number with proper sequencing
- Creates/updates certificate record
- Generates PDF with calibration settings applied
- Returns certificate details with file path

### UI Updates  
**`/src/app/participants/contestants/page.tsx`**

**Changes:**
1. **Import**: Added `Award` icon from lucide-react
2. **State**: Added `generatingCertificateId` to track generation status
3. **Handler**: Added `handleGenerateCertificate()` function
4. **UI**: Added "Generate Certificate" menu item in dropdown

**Menu Item Features:**
- Green color for positive action
- Award icon for visual recognition
- Loading state with "Generating..." text
- Disabled during generation
- Automatic download on success
- Toast notifications for user feedback

## API Endpoint

### POST `/api/participants/contestants/[id]/generate-certificate`

**Request:**
```bash
POST /api/participants/contestants/123/generate-certificate
Authorization: Bearer {session-token}
```

**Response (Success):**
```json
{
  "success": true,
  "certificate": {
    "id": 456,
    "uniqueCode": "CERT-1729012345678-123",
    "serialNumber": "MT25/GEN/000042",
    "filePath": "/uploads/certificates/cert-CERT-1729012345678-123.pdf",
    "status": "READY"
  }
}
```

**Response (Already Exists):**
```json
{
  "success": true,
  "certificate": {
    "id": 456,
    "uniqueCode": "CERT-1729012345678-123",
    "filePath": "/uploads/certificates/cert-CERT-1729012345678-123.pdf",
    "status": "READY",
    "message": "Certificate already generated"
  }
}
```

**Response (Error):**
```json
{
  "error": "No active GENERAL certificate template found"
}
```

## User Flow

1. **Navigate** to `/participants/contestants`
2. **Find** the contestant in the list
3. **Click** the actions menu (⋮)
4. **Select** "Generate Certificate"
5. **Wait** for generation (loading state shows)
6. **Download** starts automatically
7. **Success** toast notification appears

## Certificate Generation Process

### 1. Authentication Check
- Validates user session
- Ensures user is logged in

### 2. Contestant Validation
- Verifies contestant exists
- Checks contestant belongs to user's contingent
- Loads institution details

### 3. Template Selection
- Finds most recent active GENERAL template
- Validates template has PDF background
- Loads template configuration

### 4. Serial Number Generation
- Format: `MT{YY}/{TYPE}/{SEQUENCE}`
- Example: `MT25/GEN/000042`
- Atomic increment using transaction
- Unique per year/type/template

### 5. Certificate Record
- Creates or updates certificate in database
- Status: DRAFT → READY
- Stores file path for future access

### 6. PDF Generation
- Loads base PDF template
- Applies calibration settings
- Draws text elements with proper positioning
- Saves to `/public/uploads/certificates/`

### 7. Response
- Returns certificate details
- Client triggers download
- Shows success notification

## Technical Details

### Serial Number Management
Uses `CertificateSerial` table to track sequences:
```typescript
const serialRecord = await prisma.$transaction(async (tx: any) => {
  const record = await (tx as any).certificateSerial.upsert({
    where: {
      year_targetType_templateId: {
        year,
        targetType: 'GENERAL',
        templateId: template.id
      }
    },
    create: {
      year,
      templateId: template.id,
      targetType: 'GENERAL',
      typeCode,
      lastSequence: 1
    },
    update: {
      lastSequence: {
        increment: 1
      }
    }
  });
  return record;
});
```

### PDF Calibration
Applies calibration settings from template:
```typescript
const calibration = config.calibration || {
  scaleX: 1,
  scaleY: 1,
  offsetY: 0,
  baselineRatio: 0.35
};

// Apply to positions
let x = element.position.x * calibration.scaleX;
let y = height - (element.position.y * calibration.scaleY + calibration.offsetY);
```

### Dynamic PDF Serving
Downloads use dynamic API route to avoid caching:
```typescript
const link = document.createElement('a');
link.href = `/api/certificates/serve-pdf?path=${encodeURIComponent(data.certificate.filePath)}`;
link.download = `certificate-${data.certificate.uniqueCode}.pdf`;
link.click();
```

## Security Considerations

1. **Authentication Required**: All endpoints require valid session
2. **Contestant Ownership**: Users can only generate for their own contestants
3. **Path Validation**: PDF serving only allows `/uploads/` directory
4. **Template Validation**: Only uses ACTIVE templates
5. **Duplicate Prevention**: Checks existing certificates before generation

## UI/UX Features

### Visual Indicators
- **Award icon** (🏆) for easy recognition
- **Green color** for positive action
- **Loading state** during generation
- **Disabled state** prevents multiple clicks

### User Feedback
- **Loading toast**: "Generating certificate..."
- **Success toast**: "Certificate generated successfully!"
- **Error toast**: Specific error messages
- **Automatic download**: No manual action needed

### Accessibility
- Clear menu item text
- Icon + text combination
- Loading state indication
- Error message display

## Error Handling

### Common Errors

1. **No Active Template**
   - Error: "No active GENERAL certificate template found"
   - Solution: Create and activate a GENERAL template

2. **Contestant Not Found**
   - Error: "Contestant not found"
   - Solution: Verify contestant ID and access rights

3. **PDF Generation Failed**
   - Error: "Failed to generate certificate"
   - Solution: Check template PDF file exists and is valid

4. **Unauthorized Access**
   - Error: "Unauthorized"
   - Solution: User must be logged in

## Database Requirements

Ensure these tables exist:
- ✅ `certificate` - with `serialNumber` column
- ✅ `certificate_serial` - for serial number tracking
- ✅ `certificate_status_enum` - with 'ACTIVE', 'DRAFT', 'READY' values
- ✅ `cert_template` - with GENERAL templates

## Testing Checklist

### Prerequisites
- [ ] At least one active GENERAL template exists
- [ ] Template has valid PDF background
- [ ] User is logged in as participant
- [ ] User has at least one contestant

### Test Steps
1. [ ] Navigate to `/participants/contestants`
2. [ ] Click actions menu on a contestant
3. [ ] Click "Generate Certificate"
4. [ ] Verify loading state shows
5. [ ] Verify PDF downloads automatically
6. [ ] Verify success toast appears
7. [ ] Verify certificate opens correctly
8. [ ] Verify serial number is correct format
9. [ ] Try generating again for same contestant
10. [ ] Verify duplicate returns existing certificate

### Edge Cases
- [ ] No active GENERAL template
- [ ] Invalid contestant ID
- [ ] Missing PDF file
- [ ] Network error during generation
- [ ] Multiple rapid clicks

## Future Enhancements

### Potential Improvements
1. **Certificate History**: View list of generated certificates
2. **Regenerate Option**: Force regenerate even if exists
3. **Batch Generation**: Generate for multiple contestants
4. **Email Delivery**: Send certificate via email
5. **Certificate Preview**: Preview before download
6. **Custom Templates**: Allow template selection
7. **Certificate Validation**: QR code for verification

## Related Documentation
- `/PDF_CACHING_FIX.md` - Dynamic PDF serving solution
- `/CERTIFICATE_SERIAL_NUMBERS.md` - Serial number format
- `/database-migration-certificates-complete.sql` - Database schema

## Support

For issues or questions:
1. Check error messages in browser console
2. Verify database migrations are applied
3. Ensure template exists and is active
4. Check file permissions on uploads directory
5. Review server logs for detailed errors

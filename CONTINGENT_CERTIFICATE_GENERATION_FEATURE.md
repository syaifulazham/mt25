# Contingent Certificate Generation Feature

## Overview
Added functionality to generate certificates for contingents (team/group level certificates) with a comprehensive management interface.

## Date
November 18, 2025

## Features Implemented

### 1. Generate Certificates Button
**Location:** `/organizer/certificates` (Templates tab)

- **Visibility:** Appears on CONTINGENT certificate template cards
- **Button Color:** Purple (distinguishes from EVENT_PARTICIPANT green)
- **Icon:** Group/users icon
- **Action:** Redirects to `/organizer/certificates/templates/{id}/generate-contingent`

### 2. Contingent Certificate Generation Page
**URL:** `/organizer/certificates/templates/{id}/generate-contingent`

#### Statistics Dashboard
- **Total Contingents:** Count of all contingents in system
- **Generated:** Certificates already created
- **Pending:** Certificates not yet generated
- **Selected:** Currently selected contingents

#### Table Columns
1. **Type** - Badge with background color differentiation:
   - 🏫 **School** (Blue badge with building icon)
   - 👥 **Independent** (Orange badge with users icon)

2. **Contingent Name** - Automatically removes "Contingent" or "Kontinjen" from name

3. **State** - Location pin icon with state name

4. **Contestants** - Count of registered contestants in contingent

5. **Zone Teams** - Number of teams registered for zone events (from `attendanceContingent`, ignoring `attendanceStatus`)

6. **National Teams** - Number of teams registered for national events (from `attendanceContingent`, ignoring `attendanceStatus`)

7. **Certificate** - Status indicator:
   - ✅ **Generated:** Shows view and download options
   - ⚠️ **Not Generated:** Gray text

8. **Action** - Generate button for pending certificates

#### Filters
- **Search Box:** Search contingent names in real-time
- **Type Dropdown:** Filter by School/Independent
- **State Dropdown:** Filter by state location

#### Bulk Operations
- **Select All:** Checkbox to select all non-generated contingents
- **Bulk Generate:** Generate certificates for all selected contingents
- **Bulk Download:** Download all selected generated certificates

#### Visual Indicators
- **Green Background:** Rows with generated certificates
- **Disabled Checkbox:** Cannot select already-generated certificates
- **Loading States:** Spinner during generation process

## API Endpoints

### 1. Get Contingents for Template
```
GET /api/certificates/templates/{id}/contingents
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "SMK Sultan Abdul Samad",
    "contingentType": "SCHOOL",
    "stateId": 10,
    "stateName": "Selangor",
    "contestantsCount": 45,
    "zoneTeamsCount": 8,
    "nationalTeamsCount": 3,
    "certificate": {
      "id": 123,
      "filePath": "/uploads/certificates/...",
      "serialNumber": "MT25/CONT/T5/000001"
    } | null
  }
]
```

**Query Logic:**
- Fetches all contingents with state information
- Counts contestants per contingent
- Counts zone event teams (from `attendanceContingent`)
- Counts national event teams (from `attendanceContingent`)
- Checks existing certificates using `ownership.contingentId`

### 2. Generate Contingent Certificates
```
POST /api/certificates/templates/{id}/generate-contingent
Body: { "contingentIds": [1, 2, 3] }
```

**Response:**
```json
{
  "success": true,
  "successCount": 2,
  "failedCount": 1,
  "errors": [
    {
      "contingentId": 3,
      "error": "Certificate already exists"
    }
  ]
}
```

**Generation Process:**
1. Validate template is CONTINGENT type
2. Fetch contingent details with state
3. Check for existing certificates (prevent duplicates)
4. Generate unique code: `CERT-{timestamp}-{random}`
5. Generate serial number: `MT25/CONT/T{templateId}/{sequence}`
6. Generate PDF using template configuration
7. Store certificate with ownership data

## Database Schema

### Certificate Ownership
Contingent certificates use the `ownership` JSON column:

```json
{
  "year": 2025,
  "contingentId": 212
}
```

**Certificate Query:**
```sql
SELECT * FROM certificate
WHERE templateId = ?
AND JSON_EXTRACT(ownership, '$.contingentId') = ?
```

## UI/UX Features

### Name Cleaning
Automatically removes common prefixes from contingent names:
- "Contingent" → Removed
- "Kontinjen" → Removed

Example: "Contingent SMK Sultan Abdul Samad" → "SMK Sultan Abdul Samad"

### Color Coding
- **Purple Theme:** Contingent-specific actions use purple
- **Type Badges:**
  - School: Blue background with building icon
  - Independent: Orange background with users icon
- **Row Highlighting:** Green background for generated certificates

### Search & Filtering
- **Real-time Search:** Filters as you type
- **Combined Filters:** Search + Type + State filters work together
- **Smart Selection:** Select All only selects non-generated contingents

### Bulk Operations
1. **Select Multiple:** Check contingents individually or use Select All
2. **Bulk Generate:** Click "Generate (X)" button
3. **Bulk Download:** Download all selected certificates with delay between files
4. **Progress Feedback:** Toast notifications for success/errors

## Files Created

### Frontend
- `/src/app/organizer/certificates/templates/[id]/generate-contingent/page.tsx`
  - Full-featured certificate generation UI
  - Statistics dashboard
  - Advanced filtering
  - Bulk operations

### Backend
- `/src/app/api/certificates/templates/[id]/contingents/route.ts`
  - GET endpoint for contingent listing
  - Includes counts and certificate status

- `/src/app/api/certificates/templates/[id]/generate-contingent/route.ts`
  - POST endpoint for bulk certificate generation
  - Handles PDF generation and database storage

### Modified Files
- `/src/app/organizer/certificates/_components/CertTemplateList.tsx`
  - Added Generate Certificates button for CONTINGENT templates
  - Updated Template interface to include CONTINGENT type

## Security & Permissions

**Required Roles:** ADMIN, OPERATOR

**Validation:**
- Template must exist
- Template must be CONTINGENT type
- User must be authenticated
- User must have appropriate role

## Certificate Generation Details

### Serial Number Format
```
MT25/CONT/T{templateId}/{sequence}
```

Example: `MT25/CONT/T5/000001`

### Unique Code Format
```
CERT-{timestamp}-{randomString}
```

Example: `CERT-1737180000000-A1B2C3D4`

### PDF Generation
Uses template configuration to:
- Place dynamic text elements
- Apply font styles and colors
- Position serial numbers and unique codes
- Format recipient names and contingent details

### Certificate Status
- **READY:** Certificate generated and available for download
- Stored with ownership information for access control

## Usage Workflow

### For Organizers

1. **Navigate to Templates**
   - Go to `/organizer/certificates`
   - Click "Templates" tab

2. **Find CONTINGENT Template**
   - Look for templates with purple "Generate Certificates" button
   - Template must have targetType = 'CONTINGENT'

3. **Access Generation Page**
   - Click "Generate Certificates" button
   - View statistics and contingent list

4. **Filter Contingents** (Optional)
   - Search by name
   - Filter by type (School/Independent)
   - Filter by state

5. **Generate Certificates**
   - **Single:** Click "Generate" button for specific contingent
   - **Bulk:** Select multiple contingents, click "Generate (X)"

6. **Download Certificates**
   - **Single:** Click download icon for specific certificate
   - **Bulk:** Select multiple generated certificates, click download icon

## Integration Points

### Existing Systems
- **Contingent Table:** Source of contingent data
- **State Table:** For location information
- **Contestant Table:** For contestant counts
- **AttendanceContingent Table:** For team counts (zone/national)
- **Certificate Table:** For storing generated certificates

### Certificate Serial Service
- Uses existing `CertificateSerialService`
- Type code: 'CONT' (4 characters)
- Follows same serial number pattern as other types

### PDF Generator
- Uses existing `generateCertificatePDF` function
- Supports all dynamic placeholders
- Applies template configuration

## Testing Checklist

- [ ] CONTINGENT template shows Generate Certificates button
- [ ] Button redirects to generation page correctly
- [ ] Statistics display correctly
- [ ] Table shows all contingents with correct data
- [ ] Type badges display correctly (School/Independent)
- [ ] Contingent names cleaned properly
- [ ] Search filter works
- [ ] Type filter works
- [ ] State filter works
- [ ] Combined filters work together
- [ ] Single certificate generation works
- [ ] Bulk certificate generation works
- [ ] Select All functionality works
- [ ] Generated certificates show green background
- [ ] Generated certificates cannot be re-selected
- [ ] View certificate opens in new tab
- [ ] Download certificate works
- [ ] Bulk download works with delay
- [ ] Toast notifications appear
- [ ] Serial numbers follow format MT25/CONT/T{id}/{seq}
- [ ] Ownership stored correctly in JSON

## Error Handling

### Frontend
- Loading states during data fetch
- Toast notifications for errors
- Disabled buttons during generation
- Clear error messages

### Backend
- Validates template existence and type
- Checks for duplicate certificates
- Returns detailed error information
- Handles individual failures in bulk operations

## Performance Considerations

### Database Queries
- Uses raw SQL with JOINs for better performance
- Single query to fetch all contingent data
- Indexed ownership JSON column for fast lookups

### Bulk Generation
- Processes contingents sequentially
- Reports progress through results object
- Continues on individual failures

### Bulk Download
- 500ms delay between downloads
- Prevents browser blocking
- Individual file downloads (not ZIP)

## Future Enhancements

### Potential Improvements
- [ ] Add PDF preview before generation
- [ ] Support batch regeneration of existing certificates
- [ ] Export contingent list to CSV
- [ ] Add email delivery option
- [ ] Support custom certificate templates per contingent type
- [ ] Add certificate expiry dates
- [ ] Implement certificate revocation
- [ ] Add QR code verification

## Related Documentation

- Certificate Serial Numbers: `/CERTIFICATE_SERIAL_NUMBERS.md`
- Contingent Certificate Type: `/CONTINGENT_CERTIFICATE_TYPE_IMPLEMENTATION.md`
- Certificate Bulk Generation: `/CERTIFICATE_BULK_GENERATION_EVENT_PARTICIPANTS.md`
- Certificate Ownership: Memory about ownership JSON column

## Notes

- Contingent certificates are different from participant certificates
- One certificate per contingent (not per contestant)
- Useful for institutional recognition
- Team/group level awards
- Can be used for school participation certificates
- Serial number format distinguishes contingent certificates (CONT)

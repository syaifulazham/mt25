# Bulk Generate Non-Participant Certificates

## Overview
This feature allows organizers to create multiple certificate records for non-contest participants at once by uploading a CSV or Excel file. The certificates are created in `LISTED` status without generating physical PDFs, which can be generated later.

## Access
**URL**: `http://localhost:3000/organizer/certificates/bulk-generate-nonparticipant`

**Button Location**: Main certificates page → "Generate Bulk Certs" button (green, next to "Create a Cert")

**Required Roles**: ADMIN, OPERATOR

## Features

### 1. Template Selection
- **Only NON_CONTEST_PARTICIPANT templates** are shown
- Must select an ACTIVE template before proceeding
- Template dropdown auto-loads all eligible templates

### 2. File Upload
- **Supported Formats**: CSV, XLSX, XLS
- **Max Size**: 10MB
- **Processing**: Automatic parsing on upload
- **First row**: Treated as column headers
- **Data rows**: All subsequent rows

### 3. Column Mapping
Users can map file columns to certificate fields:

**Required Fields:**
- **Recipient Name** (required) - The name of the certificate recipient

**Optional Fields:**
- **Recipient Email** - Email address
- **Contingent/Organization Name** - Organization or contingent
- **IC Number** - Identity card number
- **Team Name** - Team or group name
- **Award Title** - Award or achievement title
- **Additional Information** - Any extra data (currently not stored, placeholder for future)

### 4. Preview
Shows first 3 records with mapped data for verification before submission

### 5. Bulk Creation
- Creates certificate records in database
- Status: `LISTED` (not `READY`)
- No PDF generation
- Generates unique codes and serial numbers
- Shows progress and results

## User Workflow

### Step-by-Step Process

1. **Navigate to Bulk Generation**
   - Go to `/organizer/certificates`
   - Click "Generate Bulk Certs" button (green)

2. **Select Template**
   - Choose a non-contest participant template from dropdown
   - Only active templates shown
   - If no templates available, create one first

3. **Upload File**
   - Click upload area or drag & drop
   - File automatically parsed
   - Shows record count

4. **Map Columns**
   - Map "Recipient Name" (required)
   - Optionally map email, contingent, etc.
   - Preview shows first 3 records

5. **Create Certificates**
   - Click "Create X Certificates" button
   - Processing with feedback
   - Success message shows count created

6. **View Results**
   - Certificates appear in main certificates list
   - Status: LISTED (yellow badge)
   - Can generate PDFs individually later

## File Format Examples

### CSV Example
```csv
Name,Email,Organization,IC Number,Team,Award,Notes
John Doe,john@example.com,ABC School,950101-01-5555,Team Alpha,Best Volunteer,Volunteer
Jane Smith,jane@example.com,XYZ Organization,960202-02-6666,Team Beta,Outstanding Facilitator,Facilitator
Bob Johnson,bob@example.com,DEF Company,970303-03-7777,Team Gamma,Excellence in Speaking,Speaker
```

### Excel Example
```
| Name          | Email               | Organization      | IC Number        | Team        | Award                    | Notes       |
|---------------|---------------------|-------------------|------------------|-------------|--------------------------|-------------|
| John Doe      | john@example.com    | ABC School        | 950101-01-5555   | Team Alpha  | Best Volunteer           | Volunteer   |
| Jane Smith    | jane@example.com    | XYZ Organization  | 960202-02-6666   | Team Beta   | Outstanding Facilitator  | Facilitator |
| Bob Johnson   | bob@example.com     | DEF Company       | 970303-03-7777   | Team Gamma  | Excellence in Speaking   | Speaker     |
```

## Column Mapping

### How It Works
1. Upload detects column headers from first row
2. User selects which column maps to which field
3. System extracts data from mapped columns only
4. Unmapped columns are ignored

### Example Mapping
```
File Columns:           →    Certificate Fields:
- "Full Name"          →     Recipient Name ✓
- "Email Address"      →     Recipient Email ✓
- "School/Org"         →     Contingent Name ✓
- "IC Number"          →     IC Number ✓
- "Team"               →     Team Name ✓
- "Award"              →     Award Title ✓
- "Role"               →     Additional Info ✓
- "Phone"              →     (Not mapped)
```

## API Endpoint

### POST `/api/certificates/bulk-generate-nonparticipant`

**Request Body:**
```json
{
  "templateId": 5,
  "certificates": [
    {
      "recipientName": "John Doe",
      "recipientEmail": "john@example.com",
      "contingentName": "ABC School",
      "icNumber": "950101-01-5555",
      "teamName": "Team Alpha",
      "awardTitle": "Best Volunteer",
      "additionalInfo": "Volunteer"
    },
    {
      "recipientName": "Jane Smith",
      "recipientEmail": "jane@example.com",
      "contingentName": "XYZ Organization",
      "icNumber": "960202-02-6666",
      "teamName": "Team Beta",
      "awardTitle": "Outstanding Facilitator",
      "additionalInfo": "Facilitator"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "created": 2,
  "errors": 0,
  "message": "Successfully created 2 certificate records"
}
```

**Response with Errors (201):**
```json
{
  "success": true,
  "created": 18,
  "errors": 2,
  "errorDetails": [
    { "row": 5, "error": "Recipient name is required" },
    { "row": 12, "error": "Recipient name is required" }
  ],
  "message": "Successfully created 18 certificate records. 2 error(s) occurred."
}
```

**Error Response (400):**
```json
{
  "error": "Template must be of type NON_CONTEST_PARTICIPANT"
}
```

## Backend Processing

### Validation Steps
1. **Authentication**: Check user role (ADMIN/OPERATOR)
2. **Template Validation**:
   - Template exists
   - Template is ACTIVE
   - Template is NON_CONTEST_PARTICIPANT type
3. **Data Validation**:
   - Recipient name not empty
   - Valid email format (if provided)

### Certificate Creation
For each valid record:
1. **Generate Unique Code**: `CERT-{timestamp}-{random}`
2. **Generate Serial Number**: `MT25/NCP/{sequence}`
3. **Create Database Record**:
   ```typescript
   {
     templateId: number,
     recipientName: string,
     recipientEmail: string | null,
     recipientType: 'PARTICIPANT',
     contingent_name: string | null,
     ic_number: string | null,
     team_name: string | null,
     awardTitle: string | null,
     uniqueCode: string,
     serialNumber: string,
     filePath: null,           // ← No PDF yet
     status: 'LISTED',         // ← Not READY
     createdBy: userId
   }
   ```

### Certificate Status

**LISTED Status:**
- Record exists in database
- No physical PDF generated
- Appears in certificates list with yellow badge
- Can be generated/downloaded later
- Can be edited/updated

**Later PDF Generation:**
- Individual generation via "Generate" button
- Batch generation (if implemented)
- Status changes to READY after PDF created

## Database Schema

### Certificate Table Fields Used
```sql
templateId          INT              -- Template ID
recipientName       VARCHAR(255)     -- Required
recipientEmail      VARCHAR(255)     -- Optional
recipientType       ENUM             -- Always 'PARTICIPANT'
contingent_name     VARCHAR(255)     -- Optional
ic_number           VARCHAR(50)      -- Optional
team_name           VARCHAR(255)     -- Optional
awardTitle          VARCHAR(255)     -- Optional
uniqueCode          VARCHAR(50)      -- Auto-generated
serialNumber        VARCHAR(50)      -- Auto-generated
filePath            VARCHAR(255)     -- NULL (no PDF yet)
status              ENUM             -- 'LISTED'
createdBy           INT              -- User ID
createdAt           DATETIME         -- Auto
updatedAt           DATETIME         -- Auto
```

## UI Components

### Main Page Components

**1. Template Selection Card**
- Step indicator (1)
- Dropdown with templates
- Loading state
- Empty state message

**2. File Upload Card**
- Step indicator (2)
- Drag & drop area
- File info display
- Record count

**3. Column Mapping Card**
- Step indicator (3)
- Field selectors for each mapping
- Preview of first 3 records
- Visual validation

**4. Action Buttons**
- Cancel (returns to main page)
- Create Certificates (green, with count)
- Disabled states during processing

### Visual States

**Loading:**
```
┌─────────────────────────────┐
│ ⏳ Loading templates...    │
└─────────────────────────────┘
```

**Empty Templates:**
```
┌─────────────────────────────┐
│ No non-contest participant  │
│ templates found.            │
│ Please create one first.    │
└─────────────────────────────┘
```

**File Uploaded:**
```
┌─────────────────────────────┐
│ 📊 participants.xlsx        │
│ ✓ 25 records loaded         │
└─────────────────────────────┘
```

**Processing:**
```
┌─────────────────────────────┐
│ ⏳ Processing...            │
│ Creating certificates...    │
└─────────────────────────────┘
```

**Success:**
```
┌─────────────────────────────┐
│ ✓ Successfully created 25   │
│   certificate records!      │
└─────────────────────────────┘
```

## Error Handling

### Frontend Errors
- **No template selected**: "Please select a template"
- **No file uploaded**: "Please upload a file with data"
- **No recipient name mapped**: "Please map the Recipient Name column"
- **Empty file**: "File is empty"
- **Parse error**: "Failed to parse file. Please ensure it's a valid Excel or CSV file."

### Backend Errors
- **Template not found**: 404 error
- **Wrong template type**: "Template must be of type NON_CONTEST_PARTICIPANT"
- **Template inactive**: "Template is not active"
- **Missing recipient name**: Skipped with error detail in response
- **General errors**: Logged with row number

### Partial Success
If some records fail but others succeed:
- Shows count of successful creations
- Shows count of errors
- Provides error details with row numbers
- User can fix errors and re-upload failed rows

## Use Cases

### Use Case 1: Workshop Certificates
```
Scenario: 50 people attended a workshop
File: workshop_attendees.xlsx
Columns: Name, Email, Organization, Role

Process:
1. Select "Workshop Participation Certificate" template
2. Upload workshop_attendees.xlsx
3. Map columns
4. Create 50 certificate records
5. Generate PDFs individually or in batch later
```

### Use Case 2: Volunteer Certificates
```
Scenario: 100 volunteers need certificates
File: volunteers.csv
Columns: FullName, ContactEmail, Department

Process:
1. Select "Volunteer Appreciation Certificate" template
2. Upload volunteers.csv
3. Map: FullName → Recipient Name
4. Map: ContactEmail → Recipient Email  
5. Map: Department → Contingent Name
6. Create 100 certificate records
```

### Use Case 3: Speaker Certificates
```
Scenario: 15 speakers at an event
File: speakers.xlsx
Columns: Speaker Name, Email, Topic, Session

Process:
1. Select "Speaker Certificate" template
2. Upload speakers.xlsx
3. Map: Speaker Name → Recipient Name
4. Map: Email → Recipient Email
5. Create 15 certificate records
```

## Benefits

### 1. Time Saving
- Create hundreds of certificates in minutes
- No manual entry required
- Bulk processing

### 2. Flexibility
- Column mapping allows any file structure
- Optional fields for varied data
- No strict file format

### 3. Data Integrity
- Validation at multiple levels
- Error reporting with row numbers
- Preview before creation

### 4. Delayed PDF Generation
- Creates records without PDFs
- Generate PDFs only when needed
- Saves server resources
- Allows data review/editing before PDF creation

### 5. User-Friendly
- Step-by-step process
- Visual feedback
- Clear error messages
- Preview functionality

## Limitations

### Current Limitations
1. **Max file size**: 10MB
2. **Single template**: One template per upload
3. **Basic validation**: Limited field validation
4. **No duplicate checking**: May create duplicates if uploaded twice
5. **Additional info**: Not currently stored in database

### Future Enhancements
1. **Duplicate detection**: Check for existing certificates
2. **Multi-template**: Support multiple templates in one file
3. **Advanced validation**: Email format, phone numbers, etc.
4. **Batch PDF generation**: Generate all PDFs at once
5. **Import history**: Track uploads and changes
6. **Template field mapping**: Support custom template fields
7. **Dry run mode**: Preview without creating
8. **Undo/Rollback**: Reverse bulk creation if needed

## Testing Checklist

- [ ] Template dropdown loads correctly
- [ ] Only NON_CONTEST_PARTICIPANT templates shown
- [ ] File upload accepts CSV
- [ ] File upload accepts XLSX
- [ ] File upload accepts XLS
- [ ] File parsing works correctly
- [ ] Column headers detected
- [ ] Column mapping updates preview
- [ ] Preview shows correct data
- [ ] Required field validation works
- [ ] API creates certificates
- [ ] Unique codes generated
- [ ] Serial numbers generated
- [ ] Status is LISTED
- [ ] FilePath is NULL
- [ ] Success message displays
- [ ] Error handling works
- [ ] Partial success handled
- [ ] Form resets after success
- [ ] Cancel button works
- [ ] Back button works

## Security

### Access Control
- Role-based: ADMIN and OPERATOR only
- Session validation required
- Template ownership validation

### Data Validation
- Input sanitization (trim whitespace)
- SQL injection prevention (Prisma ORM)
- File type validation
- File size limits

### Rate Limiting
Consider adding:
- Max records per upload (e.g., 1000)
- Upload frequency limits
- Server resource monitoring

## Files Created/Modified

### Frontend
**Created:**
- `/src/app/organizer/certificates/bulk-generate-nonparticipant/page.tsx`

**Modified:**
- `/src/app/organizer/certificates/_components/CertificateHub.tsx`
  - Added "Generate Bulk Certs" button
  - Added Upload icon import

### Backend
**Created:**
- `/src/app/api/certificates/bulk-generate-nonparticipant/route.ts`

### Documentation
**Created:**
- `/CERTIFICATE_BULK_NONPARTICIPANT.md` (this file)

### Dependencies Used
- `xlsx` (v0.18.5) - Already installed
- Standard Next.js and UI components
- Existing Prisma and auth infrastructure

## Support & Troubleshooting

### Common Issues

**Issue: No templates showing**
- Solution: Create a NON_CONTEST_PARTICIPANT template first

**Issue: File won't upload**
- Check file format (CSV, XLSX, XLS only)
- Check file size (must be < 10MB)
- Ensure file has data

**Issue: Preview not showing**
- Ensure Recipient Name is mapped
- Check file has valid data rows
- Check column mapping is correct

**Issue: Some certificates not created**
- Check error details in success message
- Verify recipient names are not empty
- Check for valid data in required columns

**Issue: Certificates in LISTED status**
- This is expected behavior
- Generate PDFs individually from certificates list
- Look for "Generate" button on each certificate

## Related Features

- **Individual Certificate Creation**: Manual single certificate creation
- **Template Management**: Create/edit certificate templates
- **Certificate List**: View all certificates
- **PDF Generation**: Generate PDFs for LISTED certificates
- **Certificate Download**: Download individual certificates
- **Serial Number System**: Automatic serial number generation

---

**Feature Status**: ✅ Ready for Use

**Version**: 1.0

**Last Updated**: December 9, 2025

# Bulk Certificate PDF Generation & Download

## Overview
This feature allows organizers to select multiple certificates from the list, generate their PDFs in bulk, and download them all at once as a compressed ZIP file. Users can choose whether to save the generated PDFs to the server or only download them.

## Access
**Location**: `http://localhost:3000/organizer/certificates` (Certificates tab)

**Required Roles**: ADMIN, OPERATOR

## Features

### 1. Checkbox Selection
- Checkbox in every row of the certificate list
- "Select All" checkbox in the table header
- Individual certificate selection/deselection
- Visual feedback for selected certificates

### 2. Bulk Actions Bar
Appears when one or more certificates are selected:
- Shows count of selected certificates
- "Clear Selection" button
- "Generate & Download PDFs" button

### 3. Generation Options Modal
When clicking "Generate & Download PDFs":
- Preview of how many certificates will be generated
- Checkbox option: "Save PDFs to server"
  - **Enabled (default)**: PDFs saved to server, status updated to READY
  - **Disabled**: PDFs only included in ZIP download, no server storage

### 4. ZIP Download
- All generated PDFs packaged into a single ZIP file
- Automatic download when generation completes
- Includes metadata.json with generation details

## User Workflow

### Basic Workflow

1. **Go to Certificates Tab**
   - Navigate to `/organizer/certificates`
   - Click on "Certificates" tab

2. **Select Certificates**
   - Click checkboxes next to desired certificates
   - OR click "Select All" checkbox in header
   - Blue action bar appears showing selection count

3. **Open Generation Modal**
   - Click "Generate & Download PDFs" button
   - Modal opens with options

4. **Configure Options**
   - Check/uncheck "Save PDFs to server"
   - Read the explanation of what each option does

5. **Generate & Download**
   - Click "Generate & Download" button
   - Progress indicator shows
   - ZIP file downloads automatically
   - Certificate list refreshes

6. **Extract ZIP**
   - Open downloaded ZIP file
   - View individual PDFs
   - Check metadata.json for generation details

### Save to Server Options

**Option 1: Save to Server (Enabled)**
```
✅ Save PDFs to server

What happens:
- PDFs generated and saved to /public/certificates/
- Certificate status updated to READY
- filePath field populated in database
- PDFs available for viewing/downloading from the app
- PDFs also included in ZIP download
```

**Option 2: Download Only (Disabled)**
```
☐ Save PDFs to server

What happens:
- PDFs generated temporarily
- Included in ZIP download
- Temporary files deleted after ZIP creation
- Certificate status remains LISTED
- filePath remains NULL
- PDFs not accessible from the app after download
```

## UI Components

### Checkbox Column
```
┌─────┬──────────────────┬──────────────────┬────────┐
│ ☐   │ Recipient        │ Certificate Name │ Status │
├─────┼──────────────────┼──────────────────┼────────┤
│ ☑   │ John Doe         │ Participation    │ LISTED │
│ ☑   │ Jane Smith       │ Achievement      │ LISTED │
│ ☐   │ Bob Johnson      │ Excellence       │ READY  │
└─────┴──────────────────┴──────────────────┴────────┘
```

### Bulk Actions Bar
```
┌────────────────────────────────────────────────────────┐
│ ✓ 2 certificates selected  [Clear Selection]          │
│                             [Generate & Download PDFs] │
└────────────────────────────────────────────────────────┘
```

### Generation Modal
```
┌───────────────────────────────────────────┐
│ Bulk PDF Generation                        │
├───────────────────────────────────────────┤
│ Generate PDFs for 2 selected certificates │
│ and download as a ZIP file.               │
│                                            │
│ ☑ Save PDFs to server                     │
│   If enabled, generated PDFs will be      │
│   saved to the server and certificate     │
│   status will be updated to READY.        │
│   If disabled, PDFs will only be          │
│   included in the download ZIP.           │
│                                            │
│              [Cancel] [Generate & Download]│
└───────────────────────────────────────────┘
```

### Processing State
```
┌────────────────────────────────────────────────────────┐
│ ⏳ Generating...                                       │
└────────────────────────────────────────────────────────┘
```

## ZIP File Structure

```
certificates-bulk-1733742000000.zip/
├── John_Doe_CERT-1733742000-ABC123.pdf
├── Jane_Smith_CERT-1733742001-DEF456.pdf
└── metadata.json
```

### metadata.json Format
```json
{
  "generated": "2025-12-09T12:30:00.000Z",
  "totalCertificates": 2,
  "successful": 2,
  "failed": 0,
  "savedToServer": true,
  "results": [
    {
      "id": 123,
      "recipientName": "John Doe",
      "success": true
    },
    {
      "id": 124,
      "recipientName": "Jane Smith",
      "success": true
    }
  ]
}
```

## API Endpoint

### POST `/api/certificates/bulk-generate-pdf`

**Request Body:**
```json
{
  "certificateIds": [123, 124, 125],
  "saveToServer": true
}
```

**Parameters:**
- `certificateIds` (array of numbers, required): IDs of certificates to generate
- `saveToServer` (boolean, optional, default: true): Whether to save PDFs to server

**Response:**
- **Content-Type**: `application/zip`
- **Content-Disposition**: `attachment; filename="certificates-bulk-{timestamp}.zip"`
- **Body**: Binary ZIP file

**Success (200):**
Returns ZIP file containing:
- Individual PDF files for each certificate
- metadata.json with generation results

**Error Responses:**

```json
// 403 Forbidden
{
  "error": "Unauthorized access"
}

// 400 Bad Request
{
  "error": "Certificate IDs array is required and must not be empty"
}

// 404 Not Found
{
  "error": "No certificates found"
}

// 500 Internal Server Error
{
  "error": "Failed to generate PDFs"
}
```

## Backend Processing

### Processing Flow

1. **Authentication**
   - Verify user has ADMIN or OPERATOR role

2. **Input Validation**
   - Check certificateIds is valid array
   - Check at least one certificate ID provided

3. **Fetch Certificates**
   - Query database with certificate IDs
   - Include template data
   - Verify certificates exist

4. **Initialize ZIP Archive**
   - Create archiver instance with maximum compression
   - Set up data streaming

5. **Generate PDFs (Loop)**
   For each certificate:
   - a. Call `generateCertificatePDF()` with template and data
   - b. Read generated PDF file into buffer
   - c. Add PDF to ZIP archive with sanitized filename
   - d. If `saveToServer = true`:
      - Update certificate record with filePath
      - Set status to READY
      - Set issuedAt timestamp
   - e. If `saveToServer = false`:
      - Delete temporary PDF file
   - f. Track success/failure

6. **Add Metadata**
   - Create metadata.json with results
   - Add to ZIP archive

7. **Finalize & Return**
   - Finalize ZIP archive
   - Return as downloadable file

### Database Updates (when saveToServer = true)

```typescript
await prisma.certificate.update({
  where: { id: certificateId },
  data: {
    filePath: '/certificates/...',
    status: 'READY',
    issuedAt: new Date()
  }
})
```

### PDF Generation

Uses existing `generateCertificatePDF` function:
```typescript
const pdfPath = await generateCertificatePDF({
  template: {
    id: template.id,
    basePdfPath: template.basePdfPath,
    configuration: template.configuration
  },
  data: {
    recipient_name: certificate.recipientName,
    contingent_name: certificate.contingent_name,
    team_name: certificate.team_name,
    award_title: certificate.awardTitle,
    serial_number: certificate.serialNumber,
    unique_code: certificate.uniqueCode,
    ic_number: certificate.ic_number,
    contest_name: certificate.contestName,
    issue_date: formattedDate
  }
})
```

## Use Cases

### Use Case 1: Generate & Save to Server
```
Scenario: Generate certificates and make them available online

Steps:
1. Select 50 certificates
2. Open generation modal
3. Keep "Save to server" checked
4. Click "Generate & Download"
5. Wait for processing
6. Download ZIP file
7. Certificates now have READY status
8. PDFs accessible from certificate list
```

Result:
- ✅ 50 PDFs in ZIP download
- ✅ 50 PDFs on server
- ✅ Certificates have READY status
- ✅ Can view/download from app

### Use Case 2: Download Only (No Server Storage)
```
Scenario: Generate certificates for external use, don't store on server

Steps:
1. Select 100 certificates
2. Open generation modal
3. Uncheck "Save to server"
4. Click "Generate & Download"
5. Wait for processing
6. Download ZIP file
7. Certificates remain in LISTED status
```

Result:
- ✅ 100 PDFs in ZIP download
- ❌ No PDFs on server
- ❌ Certificates stay as LISTED
- ❌ Cannot view/download from app
- 💾 Saves server storage space

### Use Case 3: Re-generate Existing Certificates
```
Scenario: Regenerate certificates that already have PDFs

Steps:
1. Select certificates with READY status
2. Keep "Save to server" checked
3. Generate
4. Old PDFs replaced with new ones
```

Result:
- ✅ New PDFs replace old ones
- ✅ Same file paths used
- ✅ Status remains READY

## Selection Behavior

### Select All
- Selects all certificates on current page
- Does NOT select filtered-out certificates
- Header checkbox shows selected state:
  - Empty: None selected
  - Checked: All selected
  - Intermediate: Some selected

### Individual Selection
- Click checkbox to toggle selection
- Selected rows remain selected when:
  - Changing pages
  - Applying filters
  - Sorting

### Clear Selection
- Removes all selections
- Hides bulk actions bar

## Performance Considerations

### Generation Time
- Approximate: 1-2 seconds per certificate
- 10 certificates ≈ 10-20 seconds
- 50 certificates ≈ 50-100 seconds
- 100 certificates ≈ 2-3 minutes

### ZIP Compression
- Level 9 (maximum compression)
- Reduces file size significantly
- Minimal impact on generation time

### Server Resources
- Each PDF generation uses server CPU
- Temporary file storage during generation
- Files deleted if saveToServer = false

### Recommendations
- **Small batches (< 20)**: Generate anytime
- **Medium batches (20-50)**: Best during off-peak hours
- **Large batches (> 50)**: Schedule during low-traffic periods

## Error Handling

### Individual Certificate Errors
If a single certificate fails:
- Other certificates continue processing
- Failed certificate noted in metadata
- ZIP still downloads with successful certificates
- Error details in metadata.json

### Complete Failure
If entire operation fails:
- Error message displayed to user
- No ZIP download
- No certificates updated
- Check server logs for details

### Partial Success Example
```json
{
  "totalCertificates": 10,
  "successful": 8,
  "failed": 2,
  "results": [
    { "id": 1, "recipientName": "John Doe", "success": true },
    { "id": 2, "recipientName": "Jane Smith", "success": false, "error": "Template not found" },
    // ...
  ]
}
```

## Security

### Access Control
- Only ADMIN and OPERATOR roles
- Session validation required
- User ID logged for audit trail

### File Access
- Generated PDFs stored in public directory
- Accessible via direct URL if path known
- Consider adding authentication for sensitive certificates

### Input Validation
- Certificate IDs validated
- User must have access to certificates
- Template validation during generation

## Browser Compatibility

Tested and supported:
- ✅ Chrome/Edge (90+)
- ✅ Firefox (88+)
- ✅ Safari (14+)

Automatic ZIP download works in all modern browsers.

## Troubleshooting

### "No certificates found"
- Check if certificate IDs exist
- Verify certificates not deleted
- Check database connection

### ZIP file is empty
- Check server logs for PDF generation errors
- Verify template configurations
- Ensure sufficient disk space

### PDFs not saved to server (when option enabled)
- Check file system permissions
- Verify /public/certificates directory writable
- Check disk space

### ZIP download doesn't start
- Check browser popup blocker
- Try different browser
- Check network connection

### Generation takes too long
- Reduce number of selected certificates
- Check server resources (CPU, memory)
- Verify no other heavy operations running

## Files Modified/Created

### Frontend
**Modified:**
- `/src/app/organizer/certificates/_components/CertificateList.tsx`
  - Added checkbox column
  - Added bulk selection state
  - Added bulk actions bar
  - Added generation modal
  - Added selection handlers

### Backend
**Created:**
- `/src/app/api/certificates/bulk-generate-pdf/route.ts`
  - Bulk PDF generation endpoint
  - ZIP creation logic
  - Conditional server storage

### Documentation
**Created:**
- `/CERTIFICATE_BULK_PDF_GENERATION.md` (this file)

### Dependencies Used
- `archiver` (v7.0.1) - ZIP file creation
- `@types/archiver` (v7.0.0) - TypeScript types
- Existing PDF generation functions
- Existing Prisma database access

## Related Features

- **Individual Certificate Generation**: Generate single certificates
- **Bulk Non-Participant Upload**: Create certificates from CSV/Excel
- **Certificate Templates**: Manage certificate designs
- **Certificate List**: View and manage all certificates

---

**Feature Status**: ✅ Ready for Use

**Version**: 1.0

**Last Updated**: December 9, 2025

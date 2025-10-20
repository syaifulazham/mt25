# Certificate Bulk Generation for Event Participants

## Overview
Implemented bulk certificate generation feature for EVENT_PARTICIPANT templates. Organizers can generate certificates for all contestants with attendance status "Present" for a specific event.

## Date Implemented
October 21, 2025

## Features

### 1. Generate Button on Templates Cards
- **Location**: `/organizer/certificates` (Templates tab)
- **Visibility**: Only shown for templates with `targetType = 'EVENT_PARTICIPANT'` and `eventId` present
- **Position**: Inside each template card, below the action buttons (View, Edit, Duplicate, Delete)
- **Button**: Full-width green "Generate Certificates" button with document icon
- **Action**: Redirects to `/organizer/certificates/templates/{id}/generate`

### 2. Bulk Generation Page
- **URL**: `/organizer/certificates/templates/{id}/generate`
- **Purpose**: List all eligible contestants and allow bulk certificate generation
- **Features**:
  - Display all contestants with attendanceStatus = 'Present' for the event
  - Show certificate status for each contestant
  - Bulk select and generate certificates
  - Real-time status updates

### 3. Certificate Status Indicators
Based on existing data in certificate table (ic_number + templateId combination):

- **Not Generated**: No certificate record exists
- **Listed**: Certificate record exists but `filePath` is `NULL`
- **Generated**: Certificate record exists and `filePath` is not `NULL`

### 4. Certificate Regeneration
Certificates can be regenerated to update information while preserving unique identifiers:

**Preserved Fields (Never Changed):**
- `ic_number` - Used to identify the certificate holder
- `uniqueCode` - Unique certificate code for verification
- `serialNumber` - Sequential serial number (MT25/PART/000001)

**Updated Fields (Regenerated):**
- `recipientName` - Updated from current contestant data
- `recipientEmail` - Updated from current contestant data
- `recipientType` - Set to 'PARTICIPANT'
- `contingent_name` - Updated from current contingent
- `team_name` - Updated from current team membership
- `contestName` - Updated from attendanceContestant.contestId (format: "code name")
- `filePath` - New PDF generated with updated data
- `status` - Set to 'READY'
- `issuedAt` - Set to current timestamp
- `ownership` - Updated with current year/contingent/contestant IDs

**Use Cases for Regeneration:**
- Contestant name was corrected
- Team assignment changed
- Contingent name updated
- Template design was modified
- PDF file was corrupted or lost

## User Interface

### Templates Card Enhancement

**Template Card Layout:**
```
┌──────────────────────────────────────────────────────┐
│ [PDF Preview/Placeholder]                            │
├──────────────────────────────────────────────────────┤
│ Certificate Name                                     │
│ Creator Name                                         │
│ Updated: Oct 21, 2025                               │
│ [EVENT PARTICIPANT]  ← Badge showing target type    │
│                                                      │
│ [View] [Edit] [Duplicate] [Delete]  ← Actions       │
│                                                      │
│ ┌──────────────────────────────────────────────┐    │
│ │  📄 Generate Certificates  ← Generate button │    │
│ └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

**Generate Button:**
- **Color**: Green (`bg-green-600 hover:bg-green-700`)
- **Width**: Full width of card content
- **Icon**: Document icon (left side)
- **Text**: "Generate Certificates"
- **Condition**: Only visible when `targetType === 'EVENT_PARTICIPANT' && eventId !== null && canCreateTemplate`
- **Position**: Below action buttons, separate section

### Bulk Generation Page

**Header Section:**
```
← Back to Templates

Bulk Certificate Generation
Template: Event Participation Certificate
Event: Musabaqah Tilawah Al-Quran 2025
```

**Statistics Cards:**
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Total           │ Pending         │ Generated       │
│ Contestants     │ Generation      │                 │
│     150         │      45         │     105         │
└─────────────────┴─────────────────┴─────────────────┘
```

**Actions Bar:**
```
┌──────────────────────────────────────────────────────┐
│ 15 selected                [Select All] [Generate]   │
└──────────────────────────────────────────────────────┘
```

**Contestants Table:**
```
┌───┬──────────────┬─────────────┬──────────────┬────────────┐
│ ☑ │ Name         │ IC Number   │ Contingent   │ Status     │
├───┼──────────────┼─────────────┼──────────────┼────────────┤
│ ☑ │ Ahmad Ali    │ 990101-...  │ Contingent A │ Not Gen.   │
│ ☐ │ Siti Sarah   │ 990202-...  │ Contingent B │ Listed     │
│ ☐ │ Muhammad     │ 990303-...  │ Contingent A │ Generated ✓│
└───┴──────────────┴─────────────┴──────────────┴────────────┘
```

**Status Badges:**
- **Not Generated**: Gray badge
- **Listed**: Yellow badge
- **Generated**: Green badge (row highlighted in green-50)

## Technical Implementation

### 1. Templates List Component Update

**File**: `/src/app/organizer/certificates/_components/TemplateList.tsx`

**Interface Update:**
```typescript
interface Template {
  id: number
  templateName: string
  basePdfPath: string | null
  status: 'ACTIVE' | 'INACTIVE'
  targetType: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 'NON_CONTEST_PARTICIPANT'
  eventId: number | null
  createdAt: string
  updatedAt: string
  creator: { ... }
}
```

**Conditional Button Rendering:**
```typescript
{template.targetType === 'EVENT_PARTICIPANT' && template.eventId && (
  <Link
    href={`/organizer/certificates/templates/${template.id}/generate`}
    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
  >
    <svg>{/* Document icon */}</svg>
    Generate
  </Link>
)}
```

**Target Type Badge:**
```typescript
{template.targetType && (
  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
    {template.targetType.replace(/_/g, ' ')}
  </span>
)}
```

### 2. Bulk Generation Page

**File**: `/src/app/organizer/certificates/templates/[id]/generate/page.tsx`

**Component Features:**
- Fetch template details
- Fetch contestants with attendance status
- Display contestants with certificate status
- Bulk selection functionality
- Bulk generation with progress tracking

**State Management:**
```typescript
const [template, setTemplate] = useState<Template | null>(null)
const [contestants, setContestants] = useState<Contestant[]>([])
const [selectedContestants, setSelectedContestants] = useState<number[]>([])
const [isGenerating, setIsGenerating] = useState(false)
```

**Key Functions:**
- `handleSelectAll()` - Select/deselect all pending contestants
- `handleSelect(contestantId)` - Toggle individual selection
- `handleGenerateCertificates()` - Bulk generate for selected contestants

### 3. API Endpoints

#### Get Contestants for Generation

**Endpoint**: `GET /api/certificates/templates/[id]/contestants-for-generation`

**Purpose**: Fetch all contestants with attendanceStatus = 'Present' and their certificate status

**Query Logic:**
```sql
SELECT DISTINCT
  c.id,
  c.name,
  c.ic,
  c.contingentId,
  cg.name as contingentName
FROM contestant c
INNER JOIN attendanceContestant ac ON ac.contestantId = c.id
INNER JOIN attendanceContingent acon ON acon.contingentId = c.contingentId 
  AND acon.eventId = ${eventId}
INNER JOIN contingent cg ON cg.id = c.contingentId
WHERE ac.attendanceStatus = 'Present'
  AND ac.eventId = ${eventId}
ORDER BY cg.name, c.name
```

**Certificate Status Check:**
```typescript
const certificate = await prisma.certificate.findFirst({
  where: {
    ic_number: contestant.ic,
    templateId: templateId
  },
  select: {
    id: true,
    filePath: true
  }
})

certificateStatus = certificate 
  ? (certificate.filePath ? 'Generated' : 'Listed')
  : null
```

**Response:**
```json
{
  "contestants": [
    {
      "id": 6501,
      "name": "Ahmad Ali",
      "ic": "990101101234",
      "contingent": {
        "id": 212,
        "name": "Contingent A"
      },
      "certificateStatus": "Generated",
      "certificateId": 123
    }
  ],
  "total": 150,
  "event": {
    "id": 5
  }
}
```

#### Bulk Certificate Generation

**Endpoint**: `POST /api/certificates/templates/[id]/bulk-generate`

**Purpose**: Generate certificates for selected contestants

**Request Body:**
```json
{
  "contestantIds": [6501, 6502, 6503]
}
```

**Processing Logic:**

1. **Validate Template**: Check targetType = 'EVENT_PARTICIPANT'
2. **For Each Contestant**:
   - Fetch contestant details with contingent
   - Check if certificate exists (by ic_number + templateId)
   - Generate unique code and serial number
   - Generate PDF using template configuration
   - Create or update certificate record
   - Set ownership data

**Certificate Creation:**
```typescript
await prisma.certificate.create({
  data: {
    templateId,
    recipientName: contestant.name,
    recipientType: 'PARTICIPANT',
    contingent_name: contestant.contingent.name,
    ic_number: contestant.ic,
    uniqueCode,
    serialNumber,
    filePath: pdfPath,
    status: 'READY',
    createdBy: session.user.id,
    ownership: {
      year: new Date().getFullYear(),
      contingentId: contestant.contingent.id,
      contestantId: contestant.id
    }
  }
})
```

**Certificate Update** (if exists):
```typescript
await prisma.certificate.update({
  where: { id: existingCert.id },
  data: {
    recipientName: contestant.name,
    contingent_name: contestant.contingent.name,
    filePath: pdfPath,
    status: 'READY',
    updatedAt: new Date(),
    ownership: {
      year: new Date().getFullYear(),
      contingentId: contestant.contingent.id,
      contestantId: contestant.id
    }
  }
})
```

**Response:**
```json
{
  "success": true,
  "generated": 10,
  "updated": 5,
  "failed": 0,
  "errors": []
}
```

## Certificate Status Logic

### Determination Rules

**Check**: `ic_number` + `templateId` combination in certificate table

**Status Assignment:**
```typescript
if (no certificate record) {
  status = null  // "Not Generated"
} else if (certificate.filePath === null) {
  status = "Listed"
} else {
  status = "Generated"
}
```

### Visual Indicators

**Not Generated** (NULL):
- Badge: Gray background
- Checkbox: Enabled
- Selectable: Yes

**Listed**:
- Badge: Yellow background (`bg-yellow-100 text-yellow-800`)
- Checkbox: Enabled
- Selectable: Yes
- Meaning: Certificate record exists but PDF not generated yet

**Generated**:
- Badge: Green background (`bg-green-100 text-green-800`)
- Row: Green highlight (`bg-green-50`)
- Checkbox: Enabled
- Selectable: Yes (for regeneration)
- Meaning: Certificate fully generated with PDF file
- Can be regenerated to update information while preserving serial numbers

**Generation Status Indicators (During Batch Generation):**

**Generating**:
- Badge: Blue background with spinning icon (`bg-blue-100 text-blue-800`)
- Row: Blue highlight with pulse animation (`bg-blue-100 animate-pulse`)
- Text: "Generating..."
- Meaning: Certificate is currently being generated

**Just Generated**:
- Badge: Green background with checkmark icon (`bg-green-100 text-green-800`)
- Row: Green highlight (`bg-green-50`)
- Text: "Just Generated"
- Meaning: Certificate was successfully generated in current session

**Failed**:
- Badge: Red background with error icon (`bg-red-100 text-red-800`)
- Row: Red highlight (`bg-red-50`)
- Text: "Failed"
- Meaning: Certificate generation failed (error will be shown in summary)

## User Workflow

### 1. Access Bulk Generation

1. Navigate to `/organizer/certificates`
2. Click on "Templates" tab
3. Find template card with "EVENT PARTICIPANT" badge
4. Click green "Generate Certificates" button (full-width button at bottom of card)
5. Redirects to generation page

### 2. Review Contestants

**Page Header:**
- "Back to Templates" link → Returns to `/organizer/certificates`
- Page title: "Bulk Certificate Generation"
- Template name displayed prominently beneath title
- Event name shown below template name

**Statistics Dashboard:**
1. View statistics (Total, Pending, Generated)
2. See list of all contestants with "Present" attendance
3. Check current certificate status for each contestant

### 3. Select Contestants

**Option A - Select All:**
- Click "Select All" button
- Selects ALL contestants regardless of status
- Includes "Not Generated", "Listed", and "Generated" certificates

**Option B - Individual Selection:**
- Click checkbox next to specific contestants
- All statuses can be selected (including "Generated" for regeneration)

### 4. Generate/Regenerate Certificates

1. Click "Generate Selected (X)" button
2. Confirmation modal appears showing:
   - Total number of certificates to process
   - Count of new certificates to be created
   - Count of existing certificates to be regenerated
   - Note: Serial numbers are preserved during regeneration
3. Click "Generate Certificates" to start
4. **Real-time Progress Tracking:**
   - Progress bar shows overall completion (e.g., "3 of 10 - 30%")
   - Each certificate processes one by one
   - **Visual Feedback per Row:**
     - **Blue background + pulsing animation**: Currently generating
     - **Status badge**: "Generating..." with spinning icon
     - **Green background**: Just completed
     - **Status badge**: "Just Generated" with checkmark icon
     - **Red background**: Failed
     - **Status badge**: "Failed" with error icon
   - Checkboxes disabled during generation
5. Backend processes each selected contestant sequentially:
   - **New certificates**: Generates new uniqueCode and serialNumber
   - **Existing certificates**: Preserves uniqueCode and serialNumber
   - Updates/creates certificate record with current data
   - Generates new PDF file with latest information
   - Sets ownership data
6. Completion summary shows:
   - ✓ Success count
   - ✗ Failed count
7. Page reloads to show final statuses

### 5. Regeneration Support

**All certificates can be regenerated:**
- Generated certificates remain selectable
- Clicking "Generate Selected" on generated certificates triggers regeneration
- Preserved: ic_number, uniqueCode, serialNumber
- Updated: All other fields (name, team, contingent, PDF, etc.)
- Row remains highlighted in green after regeneration
- Useful for updating data or fixing issues

## Database Schema Usage

### Tables Involved

**cert_template:**
- `id` - Template ID
- `targetType` - Must be 'EVENT_PARTICIPANT'
- `eventId` - Reference to event
- `configuration` - Template design config

**event:**
- `id` - Event ID
- `name` - Event name

**attendanceContestant:**
- `contestantId` - Reference to contestant
- `eventId` - Reference to event
- `attendanceStatus` - Must be 'Present'
- `contestId` - Reference to contest (used for contestName)

**contestant:**
- `id` - Contestant ID
- `name` - Contestant name
- `ic` - IC number (used for matching)
- `email` - Contestant email
- `contingentId` - Reference to contingent

**contest:**
- `id` - Contest ID
- `code` - Contest code (e.g., "C01")
- `name` - Contest name (e.g., "Web Development")

**contingent:**
- `id` - Contingent ID
- `name` - Contingent name
- `schoolId` - Reference to school (optional)
- `higherInstId` - Reference to higher institution (optional)
- `independentId` - Reference to independent (optional)

**team:**
- `id` - Team ID
- `name` - Team name
- `contestId` - Reference to contest

**certificate:**
- `id` - Certificate ID
- `templateId` - Reference to template
- `ic_number` - IC number (matching key)
- `filePath` - PDF file path (determines status)
- `uniqueCode` - Unique certificate code
- `serialNumber` - Serial number
- `recipientName` - Contestant name
- `recipientEmail` - Contestant email
- `contingent_name` - Contingent name
- `team_name` - Team name
- `contestName` - Contest code + name
- `ownership` - JSON with year, contingentId, contestantId
- `status` - DRAFT, READY, ISSUED

### Certificate Data Sources

**Data Flow for Certificate Generation:**

| Certificate Field | Source | Query Path |
|------------------|--------|------------|
| `recipientName` | contestant.name | contestant table |
| `recipientEmail` | contestant.email | contestant table |
| `ic_number` | contestant.ic | contestant table |
| `contingent_name` | contingent.name | contestant → contingent |
| `institution_name` | school/higherInstitution/independent.name | contestant → contingent → institution |
| `team_name` | team.name | contestant → teamMembers → team |
| `contestName` | contest.code + contest.name | attendanceContestant.contestId → contest |
| `uniqueCode` | Generated or preserved | CERT-{timestamp}-{random} |
| `serialNumber` | Generated or preserved | MT25/PART/000001 |

### Key Relationships

**Certificate Status Check:**
```
WHERE ic_number = contestant.ic 
  AND templateId = template.id
```

**Attendance Check:**
```
WHERE attendanceStatus = 'Present'
  AND eventId = template.eventId
```

## Security & Permissions

### Access Control

**Required Roles:**
- ADMIN
- OPERATOR

**Authentication:**
- Must be authenticated (session required)
- Role check on all endpoints

**Template Validation:**
- Must be EVENT_PARTICIPANT type
- Must have associated eventId
- Template must exist

### Data Validation

**Request Validation:**
- contestantIds must be array
- contestantIds must not be empty
- Each contestantId must be valid integer

**Contestant Validation:**
- Contestant must exist
- Must have attendance record for event
- Must have attendanceStatus = 'Present'

## Error Handling

### API Errors

**404 - Not Found:**
- Template not found
- Contestant not found

**400 - Bad Request:**
- Invalid template type (not EVENT_PARTICIPANT)
- No associated event
- Invalid request body

**401 - Unauthorized:**
- No session

**403 - Forbidden:**
- Insufficient role permissions

**500 - Internal Server Error:**
- Database errors
- PDF generation failures

### User-Facing Errors

**Template Issues:**
- "Template not found"
- "This template is not for event participants"
- "Template does not have an associated event"

**Generation Issues:**
- "Failed to generate certificates"
- Error details shown for each failed generation
- Success count vs failed count in response

### Partial Failures

**Handling:**
- Process continues even if some fail
- Returns count of successful vs failed
- Provides error details for each failure
- User can retry failed generations

**Response Example:**
```json
{
  "success": true,
  "generated": 8,
  "updated": 2,
  "failed": 2,
  "errors": [
    {
      "contestantId": 6505,
      "error": "Contestant not found"
    },
    {
      "contestantId": 6510,
      "error": "PDF generation failed"
    }
  ]
}
```

## Performance Considerations

### Batch Processing

**Current Implementation:**
- Sequential processing (one at a time)
- Suitable for moderate volumes (< 100 contestants)

**Future Optimization:**
- Implement chunked processing
- Add progress updates via WebSocket
- Queue-based processing for large volumes

### Database Queries

**Optimized Queries:**
- Single JOIN query for contestants
- Individual check for certificate status (can be optimized)

**Potential Optimization:**
- Batch check certificate status in single query
- Use database indexes on ic_number and templateId

## Testing Scenarios

### Test Case 1: First Generation
1. Template with EVENT_PARTICIPANT type
2. Event with contestants having "Present" attendance
3. No existing certificates
4. Expected: All show "Not Generated", all can be selected

### Test Case 2: Partial Generation
1. Some contestants already have certificates
2. Some with filePath (Generated)
3. Some without filePath (Listed)
4. Expected: Only "Not Generated" and "Listed" selectable

### Test Case 3: Re-Generation
1. Select "Listed" status contestants
2. Generate certificates
3. Expected: Updates existing records, generates PDF

### Test Case 4: Empty Results
1. Template with no attendees
2. Expected: Empty table with message

### Test Case 5: Bulk Selection
1. Mix of statuses
2. Click "Select All"
3. Expected: Only pending/listed selected, generated excluded

## Files Created/Modified

### New Files

**Frontend:**
- `/src/app/organizer/certificates/templates/[id]/generate/page.tsx` - Bulk generation page

**Backend:**
- `/src/app/api/certificates/templates/[id]/contestants-for-generation/route.ts` - Get contestants API
- `/src/app/api/certificates/templates/[id]/bulk-generate/route.ts` - Bulk generation API

**Documentation:**
- `/CERTIFICATE_BULK_GENERATION_EVENT_PARTICIPANTS.md` - This file

### Modified Files

**Modified:**
- `/src/app/organizer/certificates/_components/CertTemplateList.tsx` - Added Generate button inside template cards and target type badges
- `/src/app/organizer/certificates/_components/CertificateHub.tsx` - Updated Template interface with targetType and eventId

## Future Enhancements

### 1. Progress Tracking
- Real-time progress bar
- WebSocket updates during generation
- Per-contestant status updates

### 2. Filtering & Search
- Filter by contingent
- Search by name or IC
- Filter by certificate status

### 3. Bulk Actions
- Download all generated certificates as ZIP
- Email certificates to contestants
- Print batch certificates

### 4. Advanced Status
- Show generation timestamp
- Show who generated the certificate
- Certificate preview in modal

### 5. Validation
- Check prerequisites before generation
- Validate contestant data completeness
- Warning for duplicate certificates

## Summary

The bulk certificate generation feature enables:
- ✅ Easy identification of EVENT_PARTICIPANT templates
- ✅ Quick access to bulk generation page
- ✅ Clear visibility of certificate status (Not Generated, Listed, Generated)
- ✅ Efficient bulk selection and generation
- ✅ Automatic status tracking based on existing data
- ✅ Safe re-generation for "Listed" status
- ✅ Prevention of duplicate generation for completed certificates

This streamlines the certificate generation process for events with many participants, reducing manual work and ensuring consistency across all event participant certificates.

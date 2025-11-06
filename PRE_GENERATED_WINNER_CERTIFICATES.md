# Pre-Generated Winner Certificates System

## Overview

Pre-generate blank winner certificates before the competition results are finalized. This feature allows admins to:
- Generate certificates for specific ranks (1st, 2nd, 3rd place, etc.)
- **Generate multiple certificates per rank** based on `contest.maxMembersPerTeam` (team contests)
- Reserve serial numbers in advance
- Speed up certificate distribution after winners are announced
- Generate for all contests in bulk or individually

Two ranking modes are supported:
- **National Ranking**: Single ranking across all participants
- **State-Based Ranking**: Separate rankings for each state

**Team Support:**
- For team contests, the system generates N certificates per rank, where N = `contest.maxMembersPerTeam`
- Example: If maxMembersPerTeam = 3, generating Rank 1 will create 3 certificates (one for each team member)
- Each certificate is tracked with a `memberNumber` (1, 2, 3, etc.)

## Ranking Modes

### Event ScopeArea Based Ranking

**1. NATIONAL Events (scopeArea = 'NATIONAL')**
- **Always uses**: National ranking
- **Behavior**: Rank 1 is the top team across all states
- **Certificates**: Generated with national ranking (no state restriction)
- **UI**: No ranking mode option (automatic)

**2. ZONE Events (scopeArea = 'ZONE')**
- **Always uses**: State-based ranking
- **Behavior**: Each state gets separate Rank 1, 2, 3, etc.
- **Certificates**: Generated per state (multiple Rank 1 certificates)
- **UI**: No ranking mode option (automatic)
- **Example**: Selangor Rank 1, Johor Rank 1, etc.

**3. STATE/DISTRICT Events (scopeArea = 'STATE' or 'DISTRICT')**
- **User Choice**: Can choose national OR state-based ranking
- **National Mode**: Rank 1 across all participating states
- **State Mode**: Separate Rank 1 per state (like ZONE events)
- **UI**: Radio button selection in pre-generation modal

### Certificate Count Impact

**National Ranking (Team Contest with 3 members per team):**
- 3 ranks × 1 contest × 3 members = **9 certificates**
- Three certificates for Rank 1 (one per team member), same for Rank 2 and Rank 3

**State-Based Ranking (with 5 states, 3 members per team):**
- 3 ranks × 1 contest × 5 states × 3 members = **45 certificates**
- Each state gets 3 certificates for Rank 1, Rank 2, Rank 3

**Bulk Generation (14 contests, 3 members) - National:**
- 3 ranks × 14 contests × 3 members = **126 certificates**

**Bulk Generation (14 contests, 3 members) - State-Based (5 states):**
- 3 ranks × 14 contests × 5 states × 3 members = **630 certificates**
- **Example Summary**: "Will generate 9 blank certificates (3 members × 3 ranks) for each of the 14 contests × 5 states. Total: 630 certificates"

## Key Features

### 1. Pre-Generation Phase
- Generate blank certificates for specific ranks (1st, 2nd, 3rd, etc.)
- Certificates include:
  - ✅ award_title (e.g., "TEMPAT PERTAMA", "TEMPAT KE-2")
  - ✅ contest_name (format: "A1 - Robotik" - includes contest code)
  - ✅ serial_number (format: MT25/WIN/T13/000001 - includes template ID)
  - ✅ unique_code
  - ❌ recipientName = '' (blank - no placeholder text)
  - ❌ contingent_name = '' (blank - no placeholder text)
  - ❌ ic_number = '' (blank - database uses NULL for identifier)
  
**Serial Number Generation:**
- Uses transaction-safe `CertificateSerialService`
- Prevents duplicate serial numbers with database locking
- Format: `MT{YY}/{TYPE}/T{TemplateId}/{Sequence}`
- Example: `MT25/WIN/T13/000004`

### 2. View and Download Phase
- **View Certificates**: Click "View" to open PDF in modal viewer (embedded preview)
- **Download Individual**: Click "Download" to save specific certificate
- **Bulk Download**: "Download All" button to download all pre-generated certificates at once
- **Certificate Details**: Each certificate shows rank, state (if applicable), serial number, and award title
- **In-Modal Download**: Download button available in PDF viewer modal

### 3. Assignment Phase (Automatic & Manual Mapping)
When clicking "Generate Cert" for a winning team, a modal opens with two options:

#### **A. Auto-Map & Generate (Quick Option)**
- **Automatic Detection**: System fetches all available pre-generated certificates for that rank
- **One-to-One Mapping**: Each team member is automatically mapped in order
  - Member 1 → Certificate with memberNumber 1 (serial MT25/WIN/T13/000001)
  - Member 2 → Certificate with memberNumber 2 (serial MT25/WIN/T13/000002)
  - Member 3 → Certificate with memberNumber 3 (serial MT25/WIN/T13/000003)
- **Confirmation**: Shows mapping preview before generating
- **One-Click**: Fastest way to assign certificates

#### **B. Manual Mapping (Custom Selection)**
- **Team Member Table**: Shows all team members with dropdown selectors
- **Smart Filtering**: Certificates filtered by:
  - **Rank**: Only shows certificates for the team's rank
  - **Contest**: Only shows certificates for the selected contest
  - **State**: Only shows certificates for the team's state (if state-based ranking)
- **Certificate Selection**: Choose specific pre-generated certificate for each member
  - Each dropdown shows: Serial Number (Member #) - State Name
  - Example National: "MT25/WIN/T13/000001 (Member #1)"
  - Example State-based: "MT25/WIN/T13/000002 (Member #2 - Selangor)"
- **Flexible Assignment**: Can assign any certificate to any team member
  - Ahmad → Certificate Member #3
  - Siti → Certificate Member #1
  - Kumar → Certificate Member #2
- **Exclusive Selection**: Once a certificate is selected for one member, it becomes disabled for others
  - Dropdown shows: "MT25/WIN/T13/000001 - Already Assigned" (grayed out)
  - Prevents duplicate assignments
  - Real-time updates as selections change
- **Validation**: All members must be mapped before generating
- **Use Cases**:
  - Specific team order requirements
  - Swap certificates between members
  - Custom serial number assignment
- **Safety**: Cannot assign certificates from different ranks, contests, or states

#### **Certificate Update Process** (Both Methods)
- Pre-generated certificate record is **UPDATED**, never creates new record
- **Updates**: recipientName, contingentName, IC number, awardTitle, filePath, ownership
- **Preserves**: serialNumber (NOT updated, original serial maintained)
- **Ownership Merge**: Updates `certificate.ownership` to include:
  - Original pre-generation metadata (rank, memberNumber, etc.)
  - New assignment details (contestantId, contingentId, assignedAt)
  - Assignment source: `assignedFrom: 'preGenerated'`

#### **Regeneration Safe**
Clicking "Generate Cert" multiple times:
- Always **UPDATES** existing certificate record
- Never creates duplicate records
- Serial number **NEVER** changes
- PDF regenerated with latest data
- Ownership metadata updated

## Database Structure

### Certificate Table Fields

**National Ranking (NATIONAL event or STATE/DISTRICT with national mode):**
```sql
-- Blank Certificate (Pre-Generated) - Member 1 of 3
recipientName: ''     -- Empty string (NOT NULL constraint)
contingent_name: ''   -- Empty string (NOT NULL constraint)
ic_number: NULL       -- KEY field for identifying blank certificates
ownership: JSON {
  "preGenerated": true,
  "rank": 1,
  "memberNumber": 1,
  "awardTitle": "TEMPAT PERTAMA",
  "contestId": 123,
  "contestName": "A1 - Robotik",
  "eventId": 16,
  "rankingMode": "national",
  "maxMembersPerTeam": 3,
  "year": 2025,
  "generatedAt": "2025-11-06T10:00:00Z"
}
```

**State-Based Ranking (ZONE event or STATE/DISTRICT with state mode):**
```sql
-- Blank Certificate (Pre-Generated) - State Specific, Member 1 of 3
recipientName: ''     -- Empty string (NOT NULL constraint)
contingent_name: ''   -- Empty string (NOT NULL constraint)
ic_number: NULL       -- KEY field for identifying blank certificates
ownership: JSON {
  "preGenerated": true,
  "rank": 1,
  "memberNumber": 1,
  "awardTitle": "TEMPAT PERTAMA",
  "contestId": 123,
  "contestName": "A1 - Robotik",
  "eventId": 16,
  "rankingMode": "state",
  "stateId": 5,
  "stateName": "Selangor",
  "maxMembersPerTeam": 3,
  "year": 2025,
  "generatedAt": "2025-11-06T10:00:00Z"
}
```

**After Assignment:**
```sql
recipientName: "Ahmad bin Ali"
contingent_name: "SMK Seri Setia"
ic_number: "010203040506"
filePath: "/certificates/cert-123.pdf"
ownership: JSON {
  "preGenerated": true,
  "rank": 1,
  "originalMemberNumber": 1,
  "awardTitle": "TEMPAT PERTAMA",
  "contestId": 123,
  "contestName": "A1 - Robotik",
  "eventId": 16,
  "rankingMode": "national",
  "maxMembersPerTeam": 3,
  "preGeneratedAt": "2025-11-06T10:00:00Z",
  "year": 2025,
  "contingentId": 212,
  "contestantId": 6501,
  "assignedFrom": "preGenerated",
  "assignedAt": "2025-11-06T15:30:00Z"
}
```

## API Endpoints

### 1. Pre-Generate Blank Certificates
```
POST /api/events/[id]/judging/pre-generate-winner-certs
```

**Request Body:**
```json
{
  "contestId": 123,
  "ranks": [1, 2, 3],
  "rankingMode": "national"
}
```

**Parameters:**
- `contestId` (required): Contest ID
- `ranks` (required): Array of rank numbers [1, 2, 3, ...]
- `rankingMode` (optional): "national" (default) or "state"
- `allowRegenerate` (optional): boolean (default: false) - If true, deletes existing certificates and regenerates them

**Response:**
```json
{
  "success": true,
  "message": "Pre-generation completed",
  "results": {
    "total": 3,
    "success": [
      {
        "rank": 1,
        "awardTitle": "TEMPAT PERTAMA",
        "serialNumber": "MT25/WIN/000123",
        "certificateId": 456
      }
    ],
    "skipped": [],
    "failed": []
  }
}
```

### 2. Get Pre-Generated Certificates
```
GET /api/events/[id]/judging/pre-generated-certs?contestId=123
```

**Response:**
```json
{
  "success": true,
  "certificates": [
    {
      "id": 456,
      "templateId": 10,
      "serialNumber": "MT25/WIN/000123",
      "uniqueCode": "WIN-16-123-R1-1730900000000",
      "awardTitle": "TEMPAT PERTAMA",
      "filePath": "/path/to/blank/cert.pdf",
      "ownership": {
        "preGenerated": true,
        "rank": 1,
        "awardTitle": "TEMPAT PERTAMA",
        "contestId": 123,
        "contestName": "Robotik",
        "eventId": 16,
        "year": 2025
      }
    }
  ],
  "count": 1
}
```

### 3. Get States Count (for calculations)
```
GET /api/events/[id]/judging/states-count?contestId=123
```

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

**Purpose**: Returns the number of unique states participating in a contest. Used to calculate total certificates for state-based ranking mode.

### 4. Generate/Assign Winner Certificates (Enhanced)
```
POST /api/events/[id]/judging/generate-winner-certs
```

**Behavior:**
1. Checks if pre-generated blank certificate exists for the rank
2. If exists: Updates blank cert with winner details
3. If not exists: Generates new certificate

**Action Types:**
- `created` - New certificate generated
- `updated` - Existing certificate regenerated
- `assigned` - Pre-generated certificate assigned to winner

## User Interface

### Winners Page (`/organizer/events/[id]/certificates/winners`)

**New Features:**

1. **Pre-Generate Button**
   - Located next to contest selector
   - Opens modal to select ranks
   - Only visible when winner templates exist

2. **Pre-Generated Status Display**
   - Shows existing blank certificates
   - Displays rank and award title
   - Shows count of available blanks

3. **Pre-Generate Modal**
   - **Generation Scope Selection:**
     - **Current Contest Only** - Generate for selected contest
     - **All Contests** - Generate for all contests in event (BULK)
   - **Rank Selection:**
     - Checkbox selection for ranks 1-5
     - Default selection: Ranks 1, 2, 3
   - **Smart Summary:**
     - Shows total certificates to be generated
     - For "All Contests": displays total (ranks × contests)
     - Dynamic button text with count
   - Prevents duplicate generation
   - Shows progress indicator

**UI Flow (Current Contest):**
```
1. Select contest from dropdown
2. Click "Pre-Generate Blank Certificates"
3. Choose "Current Contest Only"
4. Select desired ranks (e.g., 1, 2, 3)
5. Click "Generate 3 Certificates"
6. View pre-generated certificates list with:
   - Rank badge (e.g., "Rank 1")
   - State badge (if state-based)
   - Serial number
   - Award title
   - "View" button (opens PDF in modal viewer)
   - "Download" button (downloads individual PDF)
7. Click "View" to see certificate in full-screen modal
8. Use "Download All" to bulk download all certificates
8. When winners determined:
   - Click "Generate Cert" for team
   - System automatically assigns pre-generated cert if available
```

**UI Flow (All Contests - Bulk National):**
```
1. Click "Pre-Generate Blank Certificates" (no contest selection required)
2. Choose "All Contests (14 contests)"
3. Select "National Ranking"
4. Select desired ranks (e.g., 1, 2, 3)
5. See summary: "Will generate 3 blank certificates for each of the 14 contests.
   Total: 42 certificates
   (National: One Rank 1 per contest overall)"
6. Click "Generate 42 Certificates"
7. System generates for all contests automatically
8. Modal shows: "Generated: 42, Skipped: 0, Failed: 0"
```

**UI Flow (All Contests - Bulk State-Based):**
```
1. Click "Pre-Generate Blank Certificates" (no contest selection required)
2. Choose "All Contests (14 contests)"
3. Select "State-Based Ranking"
4. Select desired ranks (e.g., 1, 2, 3)
5. See summary: "Will generate 3 blank certificates for each of the 14 contests × 5 states.
   Total: 210 certificates
   (State-based: Each state gets separate Rank 1, 2, 3...)"
6. Click "Generate 210 Certificates"
7. System generates for all contests and all states automatically
8. Modal shows: "Generated: 210, Skipped: 0, Failed: 0"
```

## UI Features

### Regenerate Option
**Allow Regenerate Checkbox:**
- Orange-themed checkbox option
- Located in pre-generation modal
- **When unchecked (default)**:
  - Existing certificates are skipped
  - No duplicates created
  - Shows "skipped" count in results
- **When checked**:
  - Existing certificates are deleted
  - New certificates generated with fresh data
  - PDF files deleted and regenerated
  - New serial numbers assigned (from sequence)
- **Use cases**:
  - Template design updated
  - Contest name changed
  - Award title corrections
  - Contest code added/changed

### Pre-Generated Certificates Display
**Enhanced List View:**
- **Card Layout**: Each certificate shown as a card with complete details
- **Visual Badges**: 
  - Purple badge for rank (e.g., "Rank 1")
  - Blue badge for state (state-based ranking)
  - Gray text for serial number
- **Action Buttons**:
  - **View** (Blue): Opens PDF in new window/tab
  - **Download** (Green): Downloads PDF with proper filename
- **Bulk Actions**:
  - **Download All** button: Downloads all certificates sequentially
  - Progress indication during bulk download
  - Confirmation prompt before bulk download
- **Scrollable Area**: Max height with scroll for many certificates
- **Hover Effects**: Visual feedback on hover

**Certificate Information Shown:**
- Rank number
- State name (for state-based)
- Serial number (e.g., MT25/WIN/T13/000001)
- Award title (e.g., TEMPAT PERTAMA)

**Download Behavior:**
- Individual downloads use original serial number as filename
- Replaces slashes with hyphens (e.g., `MT25-WIN-T13-000001.pdf`)
- Bulk download has 500ms delay between files to prevent browser blocking
- Uses serve-pdf API for immediate availability

**Modal Components:**

1. **PDF Viewer Modal**: 
   - Full-screen modal (max-w-6xl, 90vh height)
   - Header with certificate info:
     - Rank badge (purple)
     - State badge (blue, if applicable)
     - Serial number
   - Embedded PDF iframe (full size)
   - Action buttons:
     - Download (green) - Downloads from within viewer
     - Close (gray)
   - Dark overlay background (75% opacity)

2. **Download Confirmation Modal**: 
   - Purple-themed dialog
   - Shows certificate count
   - Cancel/Download buttons

3. **Download Progress Modal**:
   - Circular progress indicator (purple)
   - Download icon in center
   - Counter display (e.g., "15 / 48")
   - Progress bar
   - Status message

4. **Download Complete Modal**:
   - Green success checkmark
   - "Download Complete!" heading
   - Total count display
   - Close button

5. **Pre-Generation Results Modal**:
   - Purple file icon
   - "Pre-Generation Complete!" heading
   - Color-coded result boxes:
     - Green: Generated certificates
     - Yellow: Skipped certificates
     - Red: Failed certificates
   - Close button

## Benefits

### 1. Time Savings
- Certificates ready before results announced
- No waiting for PDF generation during award ceremony
- Serial numbers pre-allocated
- **BULK MODE:** Generate all contests in one operation!
- **INSTANT ACCESS:** View and download certificates immediately

### 2. Serial Number Management
- Serial numbers sequential and reserved
- No gaps in numbering even if winners change
- Audit trail via ownership data

### 3. Flexibility
- **Two Generation Modes:**
  - **Current Contest:** Precise control per contest
  - **All Contests:** Bulk generation for entire event
- Generate certificates in advance
- Assign to winners when ready
- Re-assign if needed (updates filePath)

### 4. Workflow Optimization
```
Traditional Flow:
Winners Determined → Generate Certificates → Print → Distribute
(15-30 minutes per batch)

New Flow with Pre-Generation:
Pre-Generate Blanks → Winners Determined → Assign & Print → Distribute
(2-5 minutes per batch)
```

## Example Scenarios

### Scenario 1: State Level Competition (Bulk Pre-Generation)
```
Before Event Starts:
- Click "Pre-Generate Blank Certificates"
- Select "All Contests" (10 contests)
- Select Ranks 1, 2, 3
- Total: 10 × 3 = 30 blank certificates
- Click "Generate 30 Certificates"
- All contests ready in one operation!

During Event:
- As results finalized, assign to winners
- Immediate printing without generation delay
```

### Scenario 2: Single Contest (Targeted Pre-Generation)
```
Before Contest Results:
- Select "Robotik" contest
- Click "Pre-Generate Blank Certificates"
- Select "Current Contest Only"
- Select Ranks 1-5 (expect 5 winners)
- Generate 5 blank certificates

Winners Announced:
- Assign existing blanks to teams
- Any additional ranks generate on-the-fly
```

### Scenario 3: Mixed Approach
```
Early Preparation (All Contests):
- Pre-generate Rank 1 for all contests (gold medals)
- 10 contests × 1 rank = 10 certificates

Just Before Awards (Per Contest):
- For specific high-profile contests
- Pre-generate Ranks 2-3 individually
- More control over specific contests
```

## Technical Implementation

### Key Files Created:
1. `/src/app/api/events/[id]/judging/pre-generate-winner-certs/route.ts`
   - Generates blank certificates
   - Uses raw SQL for NULL values
   - Checks for duplicates

2. `/src/app/api/events/[id]/judging/pre-generated-certs/route.ts`
   - Fetches existing blank certificates
   - Filters by event and contest

### Key Files Modified:
3. `/src/app/api/events/[id]/judging/generate-winner-certs/route.ts`
   - Enhanced to check for pre-generated certs
   - Assignment logic for blank certificates
   - Action tracking (created/updated/assigned)

4. `/src/app/organizer/events/[id]/certificates/winners/page.tsx`
   - Pre-generation UI
   - Modal for rank selection
   - Status display for blanks

## Usage Instructions

### For Organizers:

**Before Event:**
1. Navigate to `/organizer/events/[id]/certificates/winners`
2. Select the contest
3. Click "Pre-Generate Blank Certificates"
4. Select ranks you want to pre-generate (typically 1-3)
5. Click "Generate X Blank Certificates"
6. Verify pre-generated certificates appear in status display

**During/After Event:**
1. When winners are determined
2. Click "Generate Cert" button for winning team
3. System automatically:
   - Uses pre-generated certificate if available for that rank
   - Fills in winner details
   - Generates final PDF with actual names
   - Updates database record

**Result:**
- Same serial number maintained
- Certificate ready immediately
- Proper audit trail in `ownership` field

## Security Considerations

- ✅ Only ADMIN and OPERATOR roles can pre-generate
- ✅ Authentication required for all endpoints
- ✅ Validates event and contest existence
- ✅ Prevents duplicate blank certificates for same rank
- ✅ Maintains data integrity with NULL constraints

## Future Enhancements

### Potential Features:
1. **Bulk Pre-Generation**
   - Pre-generate for all contests at once
   - Template: "Rank 1-3 for all contests"

2. **Pre-Generated Certificate Management**
   - Delete unused blank certificates
   - Re-assign blank certs to different ranks
   - Export blank certificates list

3. **Analytics**
   - Track assignment rates
   - Serial number utilization report
   - Pre-generation usage statistics

4. **Batch Assignment**
   - Assign multiple blanks at once
   - CSV import for bulk assignment
   - Auto-match by team ranking

## Troubleshooting

### Issue: "Blank certificate already exists"
**Solution:** Check pre-generated certificates status. Delete or use existing blank.

### Issue: Serial numbers have gaps
**Solution:** This is expected. Pre-generated certificates reserve serial numbers.

### Issue: Wrong rank assigned
**Solution:** Re-generate certificate for correct team. System will update the pre-generated cert.

### Issue: Pre-generated cert not being used
**Solution:** Verify:
- Rank matches exactly
- Contest ID matches
- Event ID matches
- Certificate not already assigned (ic_number is NULL)

## Migration Notes

### Database Impact:
- Uses existing `certificate` table structure
- No schema changes required
- Leverages `ic_number = NULL` for identification
- Uses `ownership` JSON field for metadata

### Backward Compatibility:
- ✅ Existing certificate generation works unchanged
- ✅ Non-pre-generated certs function normally
- ✅ System falls back to traditional generation if no blank available

## Summary

The Pre-Generated Winner Certificates System provides a flexible, efficient way to manage winner certificates by:
- Allowing advance preparation
- Reducing ceremony delays
- Maintaining proper serial numbering
- Providing audit trails
- Supporting multiple workflows

This system is particularly valuable for:
- Large competitions with many categories
- Events with tight award ceremony schedules
- Situations requiring sequential serial numbers
- Organizations needing audit compliance

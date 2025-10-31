# Final Stage (National) Registration Section

## Overview
Added a new "Final Stage (National) Registration" section to the participant dashboard that displays teams registered for NATIONAL events. This section only appears when the contingent has at least one team in a NATIONAL event.

## Implementation

### 1. API Endpoint
**File:** `/src/app/api/participants/national-registration/route.ts`

- **Route:** `GET /api/participants/national-registration?participantId={id}`
- **Filter:** `e.scopeArea = 'NATIONAL'`
- **Authentication:** Requires valid session via NextAuth
- **Response:** Returns teams array with team details, members count, status, and manager information

**Key Query Logic:**
```sql
WHERE cm.participantId = ${parseInt(participantId)}
  AND e.scopeArea = 'NATIONAL'
  AND t.status = 'ACTIVE'
```

### 2. Frontend Component
**File:** `/src/app/participants/dashboard/_components/national-registration.tsx`

**Features:**
- **Conditional Rendering:** Only displays if teams.length > 0 (returns null otherwise)
- **Distinctive Design:** Purple/indigo gradient background to distinguish from other sections
- **Trophy Icon:** Added Trophy icon to emphasize national/final stage level
- **QR Code Button:** Access contingent QR code for attendance (same as Zone Registration)
- **Download List Button:** Download DOCX document with national registration details (purple-themed)
- **Table Display:** Shows team information in organized table format
- **Team Members Modal:** View detailed member information
- **Manager Information:** Displays trainer/manager details with click-to-edit functionality

**Design Elements:**
- Background: `bg-gradient-to-br from-purple-50 to-indigo-50`
- Border: `border border-purple-200`
- Icon: Trophy icon in purple (`text-purple-600`)
- Hover effects: Purple-themed (`hover:bg-purple-100`)

### 3. Download API Endpoint
**File:** `/src/app/api/participants/national-registration/download/route.ts`

- **Route:** `GET /api/participants/national-registration/download?participantId={id}`
- **Authentication:** Requires valid session via NextAuth
- **Response:** DOCX file with national registration details

**Document Contents:**
- Header with Malaysia Techlympics 2025 branding and dates
- Title: "SENARAI PENDAFTARAN PERINGKAT AKHIR (KEBANGSAAN)"
- Contingent information
- Summary statistics (teams, members, trainers)
- Teams grouped by contest with full member details:
  - Member name, IC number, age, grade, education level
  - Manager/trainer information with contact details
- Complete trainers list with assigned contests
- Footer with page numbers

**Design:**
- Calibri font throughout
- Professional table formatting
- Proper margins and spacing
- Malaysian language (Bahasa Melayu)

### 4. Dashboard Integration
**File:** `/src/app/participants/dashboard/_components/dashboard-client.tsx`

Added the component in the following order:
1. Zone Physical Event Registration (gray background)
2. Online Event Registration (gray background)
3. **Final Stage (National) Registration** (purple/indigo background) ← NEW
4. Video Gallery

## Table Columns

| Column | Description |
|--------|-------------|
| # | Record number |
| Team Name | Team name with contest code/name |
| Number of Members | Total team members count |
| Trainer | Manager/trainer information |
| Status | Registration status badge |
| Actions | View members button |

## Status Badges

- **ACCEPTED** - Green badge
- **APPROVED** - Blue badge
- **CONDITIONAL** - Orange badge
- **PENDING** - Gray badge
- **Other** - Red badge

## Warnings & Indicators

The table displays warnings for:
- ⚠️ **Multiple Teams:** Members in multiple teams
- ⚠️ **Age Mismatch:** Members outside age range (with count)

## User Experience

### When National Teams Exist:
1. Section appears with purple/indigo gradient background
2. Trophy icon indicates national level competition
3. Full table with team details displayed
4. Users can view team members and manager details

### When No National Teams:
- Section does not render at all (clean UI)
- No empty state message shown

## Comparison with Other Sections

| Section | Filter | Background | Icon |
|---------|--------|------------|------|
| Zone Registration | `contest.method = 'PHYSICAL'` | Gray (`bg-muted/50`) | None |
| Online Registration | `e.scopeArea LIKE 'ONLINE_%'` | Gray (`bg-muted/50`) | None |
| **National Registration** | `e.scopeArea = 'NATIONAL'` | **Purple/Indigo gradient** | **Trophy** |

## Files Created/Modified

### New Files:
1. `/src/app/api/participants/national-registration/route.ts` - API endpoint for fetching national teams
2. `/src/app/api/participants/national-registration/download/route.ts` - API endpoint for downloading DOCX list
3. `/src/app/participants/dashboard/_components/national-registration.tsx` - UI component with QR Code and Download buttons

### Modified Files:
1. `/src/app/participants/dashboard/_components/dashboard-client.tsx`
   - Added import for NationalRegistration component
   - Added component render after OnlineRegistration

## Testing

To test the implementation:

1. **Login as participant** with teams in NATIONAL events
2. **Navigate to:** `http://localhost:3000/participants/dashboard`
3. **Verify:**
   - Section appears with purple/indigo background
   - Trophy icon is visible
   - Teams are listed correctly
   - View Members button works
   - Manager links work

## Database Requirements

The implementation uses existing database tables:
- `team` - Team information
- `contest` - Contest details
- `event` - Event with scopeArea field
- `eventcontest` - Event-contest relationship
- `eventcontestteam` - Team registration status
- `contingent` - Contingent information
- `contingentManager` - Participant-contingent relationship
- `teamMember` - Team members
- `manager_team` - Manager-team relationship

## Benefits

1. **Clear Distinction:** Purple/indigo background makes national events stand out
2. **Conditional Display:** Only shows when relevant (has national teams)
3. **Consistent UX:** Follows same pattern as zone/online sections
4. **Visual Hierarchy:** Trophy icon emphasizes importance
5. **Clean Interface:** Doesn't clutter dashboard when not needed

## Future Enhancements

Potential improvements:
- Add download list button (like zone registration)
- Add accept/reject functionality if needed
- Add statistics card showing national team counts
- Add filtering/sorting options
- Add export to PDF functionality

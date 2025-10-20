# Winners & Certificate Management Feature

**Date:** October 21, 2025  
**Feature:** Manage team rankings and generate winner certificates

---

## Overview

This feature allows organizers to:
- View team rankings based on judging scores
- Generate certificates for winning teams
- Add teams to the final results list
- Access from the Event Dashboard's Scorecard section

---

## User Interface

### 1. Entry Point - Event Dashboard

**Location:** `/organizer/events/[id]/attendance`

**Scorecard Card Updates:**
- Added "Manage Winners & Certificates" button (outline variant)
- Button redirects to `/organizer/events/[id]/certificates/winners`
- Positioned below existing "View Scorecard" button

```tsx
<CardFooter className="flex flex-col gap-2">
  <Link href={`/organizer/events/${eventId}/judging/scoreboard`}>
    <Button>View Scorecard</Button>
  </Link>
  <Link href={`/organizer/events/${eventId}/certificates/winners`}>
    <Button variant="outline">Manage Winners & Certificates</Button>
  </Link>
</CardFooter>
```

### 2. Winners Management Page

**URL:** `/organizer/events/[id]/certificates/winners`

**Features:**
- Winner template availability notification
- Contest selector dropdown
- Team rankings table with scores
- Action buttons for each team
- Visual ranking indicators (trophy icons)
- Top 3 teams highlighted with different colors

**UI Components:**

| Component | Description |
|-----------|-------------|
| Header | Page title with trophy icon and back link |
| Contest Selector | Dropdown to filter teams by contest |
| Split by State Toggle | Button to group rankings by state |
| Rankings Table | Shows rank, team, contingent, state, score |
| Certificate Indicator | Green check icon next to teams with certificates |
| Action Buttons | "Generate Cert" and "Add to Final" |

**Ranking Highlights:**
- 🥇 **1st Place**: Yellow background (`bg-yellow-50`), gold trophy
- 🥈 **2nd Place**: Gray background (`bg-gray-50`), silver trophy  
- 🥉 **3rd Place**: Orange background (`bg-orange-50`), bronze trophy
- Other ranks: White background

**Certificate Status Indicator:**
- ✅ **Green Check Icon**: Appears next to team names that already have certificates generated
- **Tooltip**: Hover shows "Certificates generated"
- **Purpose**: Quickly identify which teams already have certificates without checking the certificate list
- **Logic**: Checks if certificates exist for team members with matching award title (rank)

**Winner Template Availability Notification:**

Displays a prominent notification banner indicating template status:

**✅ Templates Available (Green Banner):**
- Checkmark icon
- "Winner Certificate Templates Available"
- Confirmation message that templates are configured
- Ready to generate certificates

**⚠️ No Templates (Yellow Warning Banner):**
- Warning icon
- "No Winner Certificate Templates"
- Alert message to create templates first
- Link to certificate templates page
- Prevents confusion when trying to generate certificates

**Split by State Feature:**

Toggle between two viewing modes:

**1. Split by State View (Default)**
- Multiple tables grouped by state
- Each state has its own section with blue header
- Rankings recalculated within each state
- State-specific top 3 highlighted
- Useful for state-level competitions

**2. All Rankings View**
- Single table with all teams
- Overall ranking across all states
- Shows state column for each team
- Click "Show All Rankings" to enable

---

## Technical Implementation

### Frontend

**File:** `/src/app/organizer/events/[id]/certificates/winners/page.tsx`

**Key Interfaces:**

```typescript
interface TeamRanking {
  rank: number
  attendanceTeamId: number
  team: {
    id: number
    name: string
  } | null
  contingent: {
    id: number
    name: string
    logoUrl?: string | null
  } | null
  state: {
    id: number
    name: string
  } | null
  averageScore: number
  sessionCount: number
  contestId: number
  contestName: string
}
```

**State Management:**
- `contests`: List of available contests
- `selectedContest`: Currently selected contest ID
- `teamRankings`: Ranked teams for selected contest
- `isLoading`: Loading state for initial data
- `isLoadingRankings`: Loading state for rankings
- `splitByState`: Boolean toggle for state grouping view (default: `true`)

**Grouping Logic:**
```typescript
const groupedByState = () => {
  const groups: { [key: string]: TeamRanking[] } = {}
  
  // Group teams by state
  teamRankings.forEach(team => {
    const stateName = team.state?.name || 'No State'
    if (!groups[stateName]) groups[stateName] = []
    groups[stateName].push(team)
  })

  // Re-rank within each state
  Object.keys(groups).forEach(stateName => {
    let stateRank = 1
    groups[stateName] = groups[stateName].map(team => ({
      ...team,
      rank: team.averageScore > 0 ? stateRank++ : 0
    }))
  })

  return groups
}
```

**Data Flow:**
1. Fetch contests on page load
2. Auto-select first contest
3. Fetch rankings when contest selected
4. Display ranked teams with actions

### Backend API

**Template Check Endpoint:** `GET /api/certificates/templates/check-winner?eventId=[id]`

Checks if EVENT_WINNER templates exist for the event:

```json
{
  "hasTemplates": true,
  "count": 2,
  "templates": [
    { "id": 5, "templateName": "Winner Certificate - Gold" },
    { "id": 6, "templateName": "Winner Certificate - Silver" }
  ]
}
```

**Contests List Endpoint:** `GET /api/judging/contests?eventId=[id]`

Returns list of contests for the event in format:
```json
{
  "contests": [
    {
      "id": 123,
      "contestId": 12,
      "name": "C01 - Web Development",
      "description": "...",
      "stats": { "totalTeams": 15, "judgedTeams": 10 }
    }
  ]
}
```

**Team Rankings Endpoint:** `GET /api/events/[id]/judging/team-rankings`

**Parameters:**
- `contestId` (required): Filter teams by contest

**Query Logic:**

Uses same structure as scoreboard API - joins through `eventcontestteam` and uses `judgingSession.totalScore`:

```sql
SELECT
  at.Id as attendanceTeamId,
  t.name as teamName,
  c.name as contingentName,
  -- State lookup through contingent type (SCHOOL/INDEPENDENT)
  CASE WHEN c.contingentType = 'SCHOOL' THEN (
    SELECT s2.id FROM state s2
    JOIN school sch ON sch.stateId = s2.id
    WHERE c.schoolId = sch.id
  ) ELSE ... END as stateId,
  js.totalScore,
  js.status as judgingStatus
FROM attendanceTeam at
JOIN team t ON at.teamId = t.id
JOIN contingent c ON at.contingentId = c.id
JOIN eventcontestteam ect ON ect.eventcontestId = ? AND ect.teamId = at.teamId
LEFT JOIN judgingSession js ON at.Id = js.attendanceTeamId AND js.eventContestId = ?
WHERE at.eventId = ?
ORDER BY
  CASE WHEN js.totalScore IS NULL THEN 1 ELSE 0 END,
  js.totalScore DESC,
  t.name ASC
```

**Key Differences from Direct Join:**
- Uses `eventcontestteam` to ensure only valid teams
- Gets state through contingent type (SCHOOL → school.stateId, INDEPENDENT → independent.stateId)
- Uses `judgingSession.totalScore` (not aggregated scores)
- Ranks only teams with completed judging

**Response:**

```json
{
  "rankings": [
    {
      "rank": 1,
      "attendanceTeamId": 123,
      "team": {
        "id": 456,
        "name": "Team Alpha"
      },
      "contingent": {
        "id": 789,
        "name": "State Contingent"
      },
      "state": {
        "id": 1,
        "name": "Johor"
      },
      "averageScore": 95.5,
      "sessionCount": 1,
      "contestId": 12,
      "judgingStatus": "COMPLETED"
    }
  ],
  "total": 15
}
```

**Ranking Logic:**
- Teams with no judging sessions: rank = 0 (shown at bottom)
- Teams with scores: ranked 1, 2, 3, etc. based on totalScore DESC
- Tie-breaking: alphabetically by team name

---

## Action Buttons

### 1. Generate Cert Button

**Color:** Green (`bg-green-600`)  
**Icon:** FileText  
**Function:** `handleGenerateCert(team)`

**Implementation:**

Generates winner certificates for ALL team members automatically:

**Process:**
1. Validates team has a rank (rank > 0)
2. Checks if winner templates exist
3. Shows confirmation dialog with rank and award title
4. Fetches all team members from `teamMember` table
5. Determines award title based on rank:
   - Rank 1: `'TEMPAT PERTAMA'`
   - Other ranks: `'TEMPAT KE-{rank}'` (e.g., `'TEMPAT KE-2'`)
6. Generates certificate PDF for each member using template
7. Creates certificate record in database for each member
8. Stores award title in `certificate.awardTitle` field

**Certificate Fields:**
- `recipientName`: Team member's name
- `recipientType`: 'PARTICIPANT'
- `awardTitle`: Ranking text (stored in database)
- `contingentName`: Team's contingent name
- `contestName`: Contest code and name (e.g., "C01 - Web Development")
- `ic_number`: Member's IC
- `uniqueCode`: `WINNER-{eventId}-{contestId}-{contestantId}-{timestamp}`
- `serialNumber`: Auto-incremented (e.g., MT25/WIN/000001)
- `filePath`: Generated PDF path
- `ownership`: JSON with year, contingentId, contestantId

**Results Modal:**
Shows detailed results with:
- Total members processed
- Successfully generated (with serial numbers)
- Failed generations (with reasons)
- Team name and rank information

**Certificate Regeneration:**
- Checks for existing certificates (IC + templateId + awardTitle)
- If exists: **Updates** the certificate with new information (regeneration)
- If not exists: **Creates** a new certificate
- Serial numbers are preserved when regenerating
- All data (name, contingent, contest, PDF) is refreshed

**Action Types:**
- **New** (blue badge): Newly created certificate
- **Updated** (amber badge): Regenerated existing certificate

### 2. Add to Final Button

**Color:** Blue (`bg-blue-600`)  
**Icon:** Plus  
**Function:** `handleAddToFinal(team)`

**Purpose:** Register winning teams to the national-level competition

**Implementation Flow:**

1. **User clicks "Add to Final" button**
2. **Confirmation dialog** appears with team details
3. **API call** to `/api/events/[id]/judging/add-to-final`
4. **Backend process:**
   - Finds national event (where `event.scopeArea = 'NATIONAL'`)
   - Finds matching eventcontest for national event with same contestId
   - Checks for existing registration (prevents duplicates)
   - Creates entry in `eventcontestteam` table
5. **Success response:**
   - Updates UI state (`isAddedToFinal: true`)
   - Removes "Add to Final" button
   - Shows success alert
6. **Error handling:**
   - Shows error message
   - Button remains visible

**API Endpoint:** `/api/events/[id]/judging/add-to-final`

**Request Body:**
```json
{
  "teamId": 123,
  "contestId": 5
}
```

**Process:**
1. Find national event: `event.scopeArea = 'NATIONAL'`
2. Find eventcontest: `eventId = national_event.id AND contestId = contest_id`
3. Check existing: Query `eventcontestteam` for duplicate
4. Insert: Create new `eventcontestteam` record

**Response (Success):**
```json
{
  "success": true,
  "message": "Team successfully added to national finals",
  "registration": { ... },
  "nationalEvent": {
    "id": 2,
    "name": "MT25 National Finals"
  }
}
```

**Response (Error):**
- 404: No national event found
- 404: Contest not found in national event
- 409: Team already registered
- 500: Server error

**Button Visibility:**
- **Shown**: When `team.isAddedToFinal === false`
- **Hidden**: When `team.isAddedToFinal === true`
- **Check on Load**: API checks `eventcontestteam` table on page load

**Database Table:** `eventcontestteam`
- `eventcontestId`: Links to national event contest
- `teamId`: The winning team being registered

---

## User Workflow

### Step-by-Step Process

1. **Navigate to Event Dashboard**
   - Go to `/organizer/events/[id]/attendance`

2. **Access Winners Management**
   - Scroll to "Scorecard" card
   - Click "Manage Winners & Certificates" button

3. **Select Contest**
   - Use dropdown to select specific contest
   - View auto-loaded rankings

4. **Review Rankings (Split by State)**
   - Rankings are grouped by state by default
   - Each state shows its own rankings with state-specific top 3
   - See teams ordered by average judging score within each state
   - Top 3 teams per state highlighted with trophy icons

5. **Toggle View Mode (Optional)**
   - Default view shows rankings split by state
   - Click "Show All Rankings" to see overall contest rankings
   - Click "Split by State" to return to state-grouped view

6. **Take Actions**
   - Click "Generate Cert" to create winner certificate
   - Click "Add to Final" to include in final results

---

## Security

**Authentication:** Required  
**Roles:** ADMIN, OPERATOR  
**Session:** NextAuth session validation

**API Endpoint Protection:**
```typescript
const session = await getServerSession(authOptions)

if (!session?.user || !ALLOWED_ROLES.includes(session.user.role)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}
```

---

## Files Created/Modified

### Created

**Frontend:**
- `/src/app/organizer/events/[id]/certificates/winners/page.tsx` - Winners management page

**Backend:**
- `/src/app/api/events/[id]/judging/team-rankings/route.ts` - Team rankings endpoint
- `/src/app/api/events/[id]/judging/generate-winner-certs/route.ts` - Certificate generation for team members
- `/src/app/api/events/[id]/judging/add-to-final/route.ts` - Register teams to national finals
- `/src/app/api/certificates/templates/check-winner/route.ts` - Template availability check

### Modified

3. **Frontend:**
   - `/src/app/organizer/events/[id]/attendance/page.tsx`
     - Added "Manage Winners & Certificates" button

---

## Testing Checklist

- [ ] Button visible in Scorecard card
- [ ] Button redirects to correct URL
- [ ] Contest dropdown loads all contests
- [ ] First contest auto-selected
- [ ] Team rankings display correctly
- [ ] Scores show with 2 decimal places
- [ ] Top 3 teams have colored backgrounds
- [ ] Trophy icons show for ranks 1-3
- [ ] "Split by State" toggle works
- [ ] State grouping displays correctly
- [ ] State-specific rankings recalculated
- [ ] Each state shows correct team count
- [ ] Toggle button text changes correctly
- [ ] "Generate Cert" button clickable
- [ ] "Add to Final" button clickable
- [ ] Loading states show properly
- [ ] Error messages display on failure
- [ ] Only ADMIN/OPERATOR can access

---

## Future Enhancements

### 1. Certificate Generation Integration

Connect to existing certificate template system:
- Select winner certificate template
- Auto-populate team/contestant data
- Generate PDF certificates
- Store in certificate database

### 2. Final Results Management

Implement final results list:
- Create `finalResults` table
- Store selected winners
- Display on public results page
- Export functionality

### 3. Bulk Actions

Add bulk certificate generation:
- Select multiple teams
- Generate certificates in batch
- Progress tracking

### 4. Ranking Filters

Add additional filters:
- Filter by state
- Filter by contingent
- Search by team name
- Show/hide completed judging only

### 5. Certificate Status

Show certificate generation status:
- Not Generated (gray badge)
- Generated (green badge)
- Prevent duplicate generation

---

## Related Documentation

- Certificate Bulk Generation: `/CERTIFICATE_BULK_GENERATION_EVENT_PARTICIPANTS.md`
- Scoreboard Feature: `/src/app/organizer/events/[id]/judging/scoreboard/`
- Judging System: `/src/app/judge/` (judge interface)

---

## Support

For questions or issues:
- Check existing certificate generation documentation
- Review scoreboard implementation
- Contact development team

**Status:** ✅ Core Feature Complete (Actions TODO)

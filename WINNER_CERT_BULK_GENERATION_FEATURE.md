# Winner Certificate Bulk Generation Feature

## Overview

Added bulk certificate generation functionality to allow organizers to generate winner certificates for multiple ranks at once, with automatic pre-generated certificate mapping and intelligent fallback to direct generation.

## Feature Description

### What It Does

**Bulk Generate Certificates** allows users to:
1. Specify a rank range (e.g., Rank 1-10)
2. Generate certificates for ALL teams in that range with one click
3. Automatically use pre-generated certificates (auto-map) when available
4. Fall back to direct generation with fresh serial numbers when pre-generated certs don't exist
5. Track progress in real-time
6. See detailed results for each team

### Default Behavior

- **Default rank range:** 1-10
- **Auto-mapping:** If pre-generated certs exist for a rank, they're automatically mapped to team members
- **Direct generation:** If no pre-generated certs exist, new serial numbers are generated on the fly
- **Respects Split by State:** Only searches for relevant certs based on current split by state setting

## User Interface

### 1. Bulk Generate Button

Located next to the "Pre-Generate Blank Certificates" button:

```
[Pre-Generate Blank Certificates] [Bulk Generate Certificates]
```

- **Color:** Green (to distinguish from purple pre-generate button)
- **Icon:** Trophy icon
- **Visibility:** Only shows when a contest is selected and winner templates exist

### 2. Bulk Generate Modal

**Form Fields:**
- **Start Rank:** Number input (min: 1, default: 1)
- **End Rank:** Number input (min: start rank, default: 10)

**Preview Section:**
- Shows rank range that will be processed
- Displays count of teams in that range

**How It Works Info:**
- ✓ Checks for pre-generated certificates
- ✓ Auto-maps to team members if available
- ✓ Generates new serials if not available
- ✓ Processes each rank sequentially

**Buttons:**
- **Cancel:** Close modal without action
- **Start Generation:** Begin bulk generation process

### 3. Progress Modal

Appears during generation:
- Animated spinner
- Current rank being processed
- Progress bar
- "X of Y teams processed"

### 4. Results Modal

After completion, shows:

**Summary Cards:**
- ✅ Successful (green)
- ❌ Failed (red)
- 📊 Total (blue)

**Detailed Results:**
For each team:
- Rank badge
- Team name
- Success: "Generated X certificate(s)" with "(using pre-generated)" indicator
- Failed: Error message

## How It Works

### Processing Flow

```
1. User clicks "Bulk Generate Certificates"
2. Modal opens with rank range inputs (default 1-10)
3. User adjusts range if needed
4. User clicks "Start Generation"
5. System confirms the action
6. For each team in range (sequentially):
   a. Fetch available pre-generated certs for that rank
   b. Fetch team members
   c. If pre-generated certs exist:
      - Auto-map each member to a cert (member 1 → cert 1, etc.)
   d. Generate certificates via API with mapping
   e. Track success/failure
7. Show results modal with summary
8. Refresh team rankings to show updated status
```

### Auto-Mapping Logic

When pre-generated certificates are available:

```javascript
const certMapping: Record<number, number> = {}
members.forEach((member, idx) => {
  if (availableCerts[idx]) {
    certMapping[idx] = availableCerts[idx].id  // Member index → Cert ID
  }
})
```

**Example:**
- Team has 3 members
- 3 pre-generated certs exist for Rank 1
- Auto-mapping:
  - Member 0 (Alice) → Cert ID 101 (Serial: MT25-W-0001)
  - Member 1 (Bob) → Cert ID 102 (Serial: MT25-W-0002)
  - Member 2 (Carol) → Cert ID 103 (Serial: MT25-W-0003)

### State Filtering

The system respects the **Split by State** toggle:

**Split by State OFF (National Mode):**
```
GET /api/events/13/judging/available-certs?contestId=5&rank=1
// No stateId parameter - searches for national certs
```

**Split by State ON (State Mode):**
```
GET /api/events/13/judging/available-certs?contestId=5&rank=1&stateId=3
// Includes stateId - searches for state-specific certs
```

## Use Cases

### Use Case 1: All Pre-Generated

**Scenario:**
- Organizer pre-generated certificates for Ranks 1-5
- Want to generate for Ranks 1-5

**Process:**
1. Click "Bulk Generate Certificates"
2. Set range: 1 to 5
3. Click "Start Generation"

**Result:**
- All teams use pre-generated certificates (auto-mapped)
- Original serial numbers preserved
- ✅ All show "(using pre-generated)" indicator

### Use Case 2: No Pre-Generated

**Scenario:**
- No pre-generated certificates exist
- Want to generate for Ranks 1-10

**Process:**
1. Click "Bulk Generate Certificates"
2. Set range: 1 to 10
3. Click "Start Generation"

**Result:**
- All teams get fresh serial numbers (direct generation)
- System generates new serials on the fly
- ✅ All succeed with new serial numbers

### Use Case 3: Mixed (Partial Pre-Generated)

**Scenario:**
- Pre-generated certificates exist for Ranks 1-3
- Want to generate for Ranks 1-10

**Process:**
1. Click "Bulk Generate Certificates"
2. Set range: 1 to 10
3. Click "Start Generation"

**Result:**
- Ranks 1-3: Use pre-generated (auto-mapped)
- Ranks 4-10: Direct generation with new serials
- ✅ All succeed with appropriate method indicated

### Use Case 4: Top 10 Winners

**Scenario:**
- Contest complete, need certificates for top 10 teams
- Default range is perfect

**Process:**
1. Click "Bulk Generate Certificates"
2. Keep default range: 1 to 10
3. Click "Start Generation"

**Result:**
- Processes Ranks 1-10
- Uses pre-generated if available, generates if not
- ✅ All top 10 teams get certificates

## Error Handling

### Validation

**Before starting:**
- Rank start must be ≥ 1
- Rank end must be ≥ rank start
- Contest must be selected

**During generation:**
- Each team processed independently
- Failure in one team doesn't stop others
- All errors captured and reported

### Error Types

**Team-level errors:**
- Team not found
- No team members
- Certificate template issues
- PDF generation failure

**Displayed in results:**
- Failed teams shown in red
- Error message displayed
- Successful teams not affected

## Performance

### Throttling

```javascript
// Small delay between teams to prevent server overload
await new Promise(resolve => setTimeout(resolve, 100))  // 100ms delay
```

### Batch Processing

- Teams processed sequentially (not parallel)
- Progress updated after each team
- Total time: ~100-200ms per team

**Example:**
- 10 teams = ~1-2 seconds total
- 50 teams = ~5-10 seconds total

## State Management

### State Variables

```javascript
const [showBulkGenerateModal, setShowBulkGenerateModal] = useState(false)
const [bulkRankStart, setBulkRankStart] = useState<number>(1)
const [bulkRankEnd, setBulkRankEnd] = useState<number>(10)
const [isBulkGenerating, setIsBulkGenerating] = useState(false)
const [bulkGenProgress, setBulkGenProgress] = useState({ current: 0, total: 0, currentRank: 0 })
const [showBulkGenResults, setShowBulkGenResults] = useState(false)
const [bulkGenResults, setBulkGenResults] = useState<any>(null)
```

### Progress Tracking

```javascript
setBulkGenProgress({ 
  current: i + 1,           // Teams processed
  total: teamsToProcess.length,  // Total teams
  currentRank: team.rank    // Current rank being processed
})
```

### Results Structure

```javascript
{
  total: 10,
  success: 9,
  failed: 1,
  details: [
    {
      rank: 1,
      teamName: "Team Alpha",
      status: "success",
      usedPreGenerated: true,
      certsGenerated: 3
    },
    {
      rank: 2,
      teamName: "Team Beta",
      status: "failed",
      error: "Template not found"
    },
    // ...
  ]
}
```

## Benefits

### ✅ **Time Saving**
- Generate 10+ certificates with one click
- No need to click "Generate" for each team manually
- Ideal for contests with many winners

### ✅ **Automatic Optimization**
- Uses pre-generated certs when available
- Falls back to direct generation automatically
- No manual decision needed

### ✅ **Clear Feedback**
- Real-time progress tracking
- Detailed success/failure reporting
- Know exactly what happened

### ✅ **Flexible Range**
- Can generate for top 3, top 10, or any range
- Not limited to pre-defined ranges
- Adjustable for any scenario

### ✅ **Safe Execution**
- Confirmation before starting
- Each team processed independently
- Partial failure doesn't break entire batch

## Integration with Existing Features

### Works With Pre-Generation
1. **Pre-generate** blank certificates (Ranks 1-5)
2. **Bulk generate** assigned certificates (Ranks 1-10)
   - Ranks 1-5 use pre-generated (auto-map)
   - Ranks 6-10 get fresh serials

### Works With Split by State
- **State OFF:** Searches for national pre-generated certs
- **State ON:** Searches for state-specific pre-generated certs
- Filtering handled automatically

### Works With Manual Mapping
- Bulk generation uses auto-mapping only
- For precise control, still use manual mapping modal
- Complementary features, not conflicting

## Testing

### Test 1: Basic Bulk Generation

**Steps:**
1. Select a contest
2. Click "Bulk Generate Certificates"
3. Keep default range (1-10)
4. Click "Start Generation"
5. Confirm

**Expected:**
- ✅ Progress modal appears
- ✅ Shows current rank being processed
- ✅ Progress bar updates
- ✅ Results modal shows summary
- ✅ All teams in range processed

### Test 2: Custom Range

**Steps:**
1. Click "Bulk Generate Certificates"
2. Set Start: 1, End: 3
3. Click "Start Generation"

**Expected:**
- ✅ Only processes Ranks 1-3
- ✅ Other ranks untouched
- ✅ Correct team count shown in preview

### Test 3: With Pre-Generated Certs

**Steps:**
1. Pre-generate for Ranks 1-5
2. Bulk generate for Ranks 1-5
3. Check results

**Expected:**
- ✅ All show "(using pre-generated)"
- ✅ Original serial numbers used
- ✅ Pre-generated certs marked as assigned

### Test 4: Mixed Scenario

**Steps:**
1. Pre-generate for Ranks 1-2
2. Bulk generate for Ranks 1-5

**Expected:**
- ✅ Ranks 1-2 use pre-generated
- ✅ Ranks 3-5 get new serials
- ✅ Results clearly indicate which method used

### Test 5: Error Handling

**Steps:**
1. Delete a team's member records
2. Bulk generate including that team's rank

**Expected:**
- ✅ That team fails
- ✅ Other teams succeed
- ✅ Error message shown for failed team
- ✅ Process continues for remaining teams

## Deployment

### No Backend Changes Required

This feature uses **existing API endpoints**:
- `/api/events/[id]/judging/available-certs` - Fetch pre-generated certs
- `/api/events/[id]/judging/team-members` - Fetch team members
- `/api/events/[id]/judging/generate-winner-certs` - Generate certificates

### Frontend Only

**Files Changed:**
- `/src/app/organizer/events/[id]/certificates/winners/page.tsx`

**Changes:**
1. Added state variables for bulk generation
2. Added `handleBulkGenerate` function
3. Added bulk generate button in UI
4. Added 3 modals: input, progress, results

### Deployment Steps

```bash
# No build required for production (Next.js handles it)
# Just deploy the updated page
pm2 restart mt25
```

Or for development:
```bash
# Next.js hot reload will pick it up automatically
```

## Summary

**Before:**
- ❌ Generate certificates one team at a time
- ❌ Manual clicking for each rank
- ❌ No bulk operations
- ❌ Time-consuming for many winners

**After:**
- ✅ Generate for multiple ranks at once
- ✅ Specify custom rank range (default 1-10)
- ✅ Auto-maps pre-generated certs
- ✅ Falls back to direct generation
- ✅ Real-time progress tracking
- ✅ Detailed success/failure reporting
- ✅ Saves significant time
- ✅ Respects split by state setting
- ✅ Safe and reliable execution

Perfect for contests with multiple winners where certificates need to be generated efficiently! 🏆

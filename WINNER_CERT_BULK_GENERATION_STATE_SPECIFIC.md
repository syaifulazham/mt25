# Winner Certificate Bulk Generation - State-Specific Configuration

## Overview

Enhanced the bulk certificate generation feature to support **state-specific rank range configuration** when "Split by State" mode is enabled. Each state can now have its own independent rank range for certificate generation.

## The Problem

Previously, bulk generation used a single rank range (e.g., 1-10) for all teams, which didn't work well for state-based ranking where each state has its own independent ranking system.

**Example Scenario:**
- **Cabaran SkyTech - SELANGOR**: Want to generate for Ranks 1-5
- **Cabaran SkyTech - NEGERI SEMBILAN**: Want to generate for Ranks 1-10
- **Cabaran SkyTech - JOHOR**: Want to generate for Ranks 1-3

With the old system, you could only set ONE range (e.g., 1-10) for all states, which was inefficient.

## The Solution

### Dual Mode Configuration

The bulk generation modal now adapts based on the **Split by State** toggle:

#### Mode 1: National Ranking (Split by State OFF)
- Single rank range for all teams
- Simple configuration: Start Rank, End Rank
- Example: Ranks 1-10 for the entire contest

#### Mode 2: State-Based Ranking (Split by State ON)
- **Separate rank range for each state**
- Configure independently per state
- Example:
  - SELANGOR: Ranks 1-5 (8 teams)
  - NEGERI SEMBILAN: Ranks 1-10 (15 teams)
  - JOHOR: Ranks 1-3 (5 teams)

## User Interface

### Split by State OFF (National Mode)

```
┌─────────────────────────────────────┐
│ Bulk Generate Certificates          │
│ Generate certificates for multiple  │
│ ranks at once                       │
├─────────────────────────────────────┤
│                                     │
│ Start Rank: [1]   End Rank: [10]   │
│                                     │
│ 📋 Will process ranks 1 to 10      │
│ 15 team(s) in this range           │
│                                     │
│ ✓ Checks for pre-generated certs   │
│ ✓ Auto-maps to team members        │
│ ✓ Generates new serials if needed  │
│                                     │
│         [Cancel] [Start Generation] │
└─────────────────────────────────────┘
```

### Split by State ON (State Mode)

```
┌─────────────────────────────────────────────┐
│ Bulk Generate Certificates                  │
│ Configure rank ranges for each state        │
│ separately                                  │
├─────────────────────────────────────────────┤
│ 🗺️ Split by State Mode                     │
│ Configure different rank ranges for each   │
│ state                                      │
│                                            │
│ ┌─────────────────────────────────────┐  │
│ │ SELANGOR                            │  │
│ │ Start Rank: [1]  End Rank: [5]     │  │
│ │ Ranks 1-5 = 8 team(s)              │  │
│ └─────────────────────────────────────┘  │
│                                           │
│ ┌─────────────────────────────────────┐  │
│ │ NEGERI SEMBILAN                     │  │
│ │ Start Rank: [1]  End Rank: [10]    │  │
│ │ Ranks 1-10 = 15 team(s)            │  │
│ └─────────────────────────────────────┘  │
│                                           │
│ ┌─────────────────────────────────────┐  │
│ │ JOHOR                               │  │
│ │ Start Rank: [1]  End Rank: [3]     │  │
│ │ Ranks 1-3 = 5 team(s)              │  │
│ └─────────────────────────────────────┘  │
│                                           │
│ Total Teams: 28                          │
│                                           │
│           [Cancel] [Start Generation]    │
└─────────────────────────────────────────┘
```

## How It Works

### State-Specific Configuration

1. **Modal Opens:**
   - Detects current Split by State mode
   - If ON, shows separate configuration for each state
   - Each state has independent Start/End rank inputs

2. **User Configures:**
   - Sets rank range for each state individually
   - Real-time preview shows team count per state
   - Total summary at the bottom

3. **Validation:**
   - Each state validated independently
   - Start rank must be ≥ 1
   - End rank must be ≥ Start rank
   - At least one state must be configured

4. **Confirmation:**
   ```
   Generate certificates for the following:
   
   • SELANGOR: Ranks 1-5 (8 teams)
   • NEGERI SEMBILAN: Ranks 1-10 (15 teams)
   • JOHOR: Ranks 1-3 (5 teams)
   
   Total: 28 teams
   
   This will:
   • Use pre-generated certificates (auto-map) if available
   • Generate new certificates with fresh serial numbers if not
   • Process all teams in the selected rank range
   
   Continue?
   ```

5. **Processing:**
   - Teams filtered by state and rank range
   - Each team processed with its state context
   - Pre-generated cert search respects state filtering

6. **Progress:**
   - Shows current state being processed
   - Shows current rank
   - Progress bar for all teams across all states

7. **Results:**
   - Summary: Success, Failed, Total
   - Details show: Rank, State, Team Name, Status
   - Clear indication of which state each team belongs to

## Data Structure

### State Ranges Storage

```typescript
const [bulkStateRanges, setBulkStateRanges] = useState<
  Record<string, { start: number, end: number }>
>({})

// Example:
{
  "SELANGOR": { start: 1, end: 5 },
  "NEGERI SEMBILAN": { start: 1, end: 10 },
  "JOHOR": { start: 1, end: 3 }
}
```

### Progress Tracking

```typescript
const [bulkGenProgress, setBulkGenProgress] = useState({
  current: 0,        // Teams processed
  total: 0,          // Total teams to process
  currentRank: 0,    // Current rank being processed
  currentState: ''   // Current state being processed
})
```

### Results Structure

```typescript
{
  total: 28,
  success: 26,
  failed: 2,
  details: [
    {
      rank: 1,
      teamName: "Team Alpha",
      state: "SELANGOR",
      status: "success",
      usedPreGenerated: true,
      certsGenerated: 3
    },
    {
      rank: 2,
      teamName: "Team Beta",
      state: "SELANGOR",
      status: "success",
      usedPreGenerated: false,
      certsGenerated: 2
    },
    {
      rank: 1,
      teamName: "Team Gamma",
      state: "NEGERI SEMBILAN",
      status: "failed",
      error: "Template not found"
    },
    // ...
  ]
}
```

## Processing Logic

### Teams to Process (State Mode)

```javascript
let teamsToProcess: TeamRanking[] = []

Object.entries(bulkStateRanges).forEach(([stateName, range]) => {
  const stateTeams = teamRankings.filter(
    team => team.state?.name === stateName && 
            team.rank >= range.start && 
            team.rank <= range.end
  )
  teamsToProcess.push(...stateTeams)
})

// Result: All teams from all states that match their respective ranges
```

### Pre-Generated Cert Search

For each team:
```javascript
let certsUrl = `/api/events/13/judging/available-certs?contestId=5&rank=1`

// Add stateId filter if Split by State is ON
if (splitByState && team.state?.id) {
  certsUrl += `&stateId=${team.state.id}`
}

// Example URLs:
// - SELANGOR Rank 1: ...&stateId=3
// - NEGERI SEMBILAN Rank 1: ...&stateId=5
// - JOHOR Rank 1: ...&stateId=2
```

This ensures each state's Rank 1 gets its own pre-generated certificates.

## Use Cases

### Use Case 1: Different Winners Per State

**Scenario:**
- SELANGOR has strong competition, want top 10
- NEGERI SEMBILAN has fewer teams, want top 5
- JOHOR has many teams, want top 15

**Configuration:**
```
SELANGOR: Ranks 1-10
NEGERI SEMBILAN: Ranks 1-5
JOHOR: Ranks 1-15
```

**Result:**
- SELANGOR: 10 teams get certificates
- NEGERI SEMBILAN: 5 teams get certificates
- JOHOR: 15 teams get certificates
- ✅ Each state processes independently

### Use Case 2: Top 3 Winners Only (All States)

**Scenario:**
- Budget constraints, only certificate top 3 per state

**Configuration:**
```
SELANGOR: Ranks 1-3
NEGERI SEMBILAN: Ranks 1-3
JOHOR: Ranks 1-3
MELAKA: Ranks 1-3
... (all states)
```

**Quick Setup:**
1. Open modal
2. For each state, set: Start=1, End=3
3. Generate

**Result:**
- Top 3 from each state get certificates
- ✅ Consistent across all states

### Use Case 3: Mixed With Pre-Generated

**Scenario:**
- Pre-generated certificates exist for:
  - SELANGOR Ranks 1-5
  - NEGERI SEMBILAN Ranks 1-3
- Want to generate for:
  - SELANGOR Ranks 1-10
  - NEGERI SEMBILAN Ranks 1-10

**Result:**
- **SELANGOR:**
  - Ranks 1-5: Use pre-generated (auto-map)
  - Ranks 6-10: Direct generation (new serials)
- **NEGERI SEMBILAN:**
  - Ranks 1-3: Use pre-generated (auto-map)
  - Ranks 4-10: Direct generation (new serials)

## Benefits

### ✅ **State Autonomy**
- Each state controls its own rank range
- No conflicts between states
- Flexible per-state configuration

### ✅ **Accurate Counting**
- Real-time team count per state
- Total summary across all states
- Know exactly what will be processed

### ✅ **Clear Visibility**
- Progress shows current state and rank
- Results grouped by state
- Easy to track state-specific issues

### ✅ **Smart Pre-Generation**
- Searches for state-specific pre-generated certs
- Falls back to direct generation per state
- Each state independent

### ✅ **Flexible Deployment**
- Different requirements per state? No problem
- Can adjust mid-event if needed
- Not locked into one-size-fits-all

## Validation & Error Handling

### Input Validation

**Per State:**
- Start rank ≥ 1
- End rank ≥ Start rank
- Numbers only

**Global:**
- At least one state configured (state mode)
- Total teams > 0

### Error Messages

**State-Specific:**
```
Invalid rank range for SELANGOR. 
Start must be at least 1 and End must be greater than or equal to Start.
```

**Global:**
```
Please configure rank ranges for at least one state.
```

### Failure Handling

- Each team processed independently
- Failure in SELANGOR doesn't affect NEGERI SEMBILAN
- All errors captured with state context
- Detailed failure report per team

## Default Behavior

### Opening Modal

**Split by State OFF:**
- Default: Start=1, End=10

**Split by State ON:**
- Default for each state: Start=1, End=10
- User must adjust per state as needed
- Defaults applied on first input interaction

### Closing Modal

**State mode:**
- Resets all state ranges
- Clears configuration
- Fresh start on next open

**National mode:**
- Keeps last values
- Quick re-use for similar ranges

## Testing

### Test 1: State-Specific Ranges

**Setup:**
1. Turn ON "Split by State"
2. Open "Bulk Generate Certificates"
3. Configure:
   - SELANGOR: 1-5
   - JOHOR: 1-3

**Expected:**
- ✅ Modal shows both states
- ✅ Independent rank inputs
- ✅ Team counts update per state
- ✅ Confirmation shows both ranges
- ✅ Processing works for both states
- ✅ Results show state badges

### Test 2: Mixed Pre-Generated

**Setup:**
1. Pre-generate SELANGOR Ranks 1-3
2. Bulk generate SELANGOR Ranks 1-5

**Expected:**
- ✅ Ranks 1-3 use pre-generated
- ✅ Ranks 4-5 get new serials
- ✅ Results show mix

### Test 3: Mode Switch

**Setup:**
1. Configure state ranges
2. Toggle "Split by State" OFF
3. Re-open modal

**Expected:**
- ✅ Shows national mode (single range)
- ✅ State configs cleared
- ✅ Default values restored

### Test 4: Validation

**Setup:**
1. Set SELANGOR: Start=5, End=3 (invalid)
2. Click "Start Generation"

**Expected:**
- ✅ Error: "Invalid rank range for SELANGOR..."
- ✅ Modal stays open
- ✅ User can correct

## Technical Implementation

### State Management

```typescript
// State-specific ranges
const [bulkStateRanges, setBulkStateRanges] = useState<
  Record<string, { start: number, end: number }>
>({})

// Update range for a specific state
setBulkStateRanges(prev => ({
  ...prev,
  [stateName]: { start: newStart, end: currentEnd }
}))
```

### Team Filtering

```typescript
// State mode
Object.entries(bulkStateRanges).forEach(([stateName, range]) => {
  const stateTeams = teamRankings.filter(
    team => team.state?.name === stateName && 
            team.rank >= range.start && 
            team.rank <= range.end
  )
  teamsToProcess.push(...stateTeams)
})

// National mode
const teamsToProcess = teamRankings.filter(
  team => team.rank >= bulkRankStart && team.rank <= bulkRankEnd
)
```

### Progress Updates

```typescript
const stateName = splitByState ? (team.state?.name || 'Unknown') : 'All States'

setBulkGenProgress({ 
  current: i + 1, 
  total: teamsToProcess.length, 
  currentRank: team.rank,
  currentState: stateName
})
```

## Files Modified

### `/src/app/organizer/events/[id]/certificates/winners/page.tsx`

**Added State:**
- `bulkStateRanges` - State-specific rank configurations
- Updated `bulkGenProgress` to include `currentState`

**Updated Functions:**
- `handleBulkGenerate` - Dual mode logic (national vs state)
- Validation per mode
- Confirmation message per mode
- Team filtering per mode

**Updated UI:**
- Bulk Generate Modal - Adaptive based on split by state
- Progress Modal - Shows current state
- Results Modal - Shows state badges

## Summary

**Before:**
- ❌ Single rank range for all teams
- ❌ Inefficient for state-based ranking
- ❌ Can't configure per-state
- ❌ One-size-fits-all approach

**After:**
- ✅ State-specific rank range configuration
- ✅ Independent settings per state
- ✅ Each state: SELANGOR (1-10), JOHOR (1-5), etc.
- ✅ Real-time team count per state
- ✅ State-aware pre-generated cert matching
- ✅ Clear state visibility in progress and results
- ✅ Flexible and scalable for any state configuration
- ✅ Works seamlessly with pre-generation

Perfect for state-based competitions where each state has different winner counts! 🏆🗺️

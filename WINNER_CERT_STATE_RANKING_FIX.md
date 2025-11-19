# Winner Certificate State Ranking Fix

## The Problem

When "Split by State" was ON, the system was using **combined/national rankings** instead of **state-specific rankings**.

### Example of the Bug:

**Contest Results (National Ranking):**
```
Rank 1  - SABAH Team A      (95.5 points)
Rank 2  - LABUAN Team X     (94.2 points)
Rank 3  - SABAH Team B      (93.8 points)
Rank 4  - SABAH Team C      (93.0 points)
Rank 5  - LABUAN Team Y     (92.5 points)
Rank 6  - SABAH Team D      (92.0 points)
Rank 7  - SABAH Team E      (91.5 points)
Rank 8  - SABAH Team F      (91.0 points)
Rank 9  - SABAH Team G      (90.5 points)
Rank 10 - SABAH Team H      (89.0 points)
Rank 11 - LABUAN Team Z     (88.5 points)
```

**User Configuration (Split by State ON):**
- SABAH: Ranks 1-10
- LABUAN: Ranks 1-10

**What User Expected:**
- SABAH: Top 10 teams **within SABAH** (10 teams)
- LABUAN: Top 10 teams **within LABUAN** (10 teams)
- Total: 20 certificates

**What Actually Happened (BUG):**
- SABAH: Teams at national ranks 1, 3, 4, 6, 7, 8, 9, 10 = **8 teams** ⚠️
- LABUAN: Teams at national ranks 2, 5 = **2 teams** ⚠️
- Total: 10 certificates (not 20!)

**User's Confusion:**
```
SABAH ⚠️ Partial
Configured: Ranks 1-10
Only 8 teams available (not 10)

LABUAN ⚠️ Partial  
Configured: Ranks 1-10
Only 2 teams available (not 10)
```

Why? Because SABAH teams at ranks 1, 3, 4, 6, 7, 8, 9, 10 in the **national** ranking = 8 teams in the range 1-10.

## The Root Cause

The API endpoint `/api/events/[id]/judging/team-rankings` was **always** calculating national rankings regardless of the "Split by State" toggle.

### Old API Logic (Bug):

```typescript
// Always ranked all teams together
let currentRank = 1
const rankedTeams = results.map((team) => {
  const hasScore = team.totalScore !== null
  const rank = hasScore ? currentRank++ : 0
  // ...
})
```

This created a **single sequential ranking** across all states:
- Rank 1, 2, 3, 4... for ALL teams combined

## The Solution

Added a `rankByState` query parameter to the API that changes how ranks are calculated:

### New API Logic:

```typescript
const rankByState = searchParams.get('rankByState') === 'true'

if (rankByState) {
  // Group teams by state
  const teamsByState: Record<string, any[]> = {}
  
  results.forEach(team => {
    const stateKey = team.stateId ? team.stateId.toString() : 'NO_STATE'
    if (!teamsByState[stateKey]) {
      teamsByState[stateKey] = []
    }
    teamsByState[stateKey].push(team)
  })
  
  // Rank teams WITHIN each state
  Object.values(teamsByState).forEach(stateTeams => {
    let currentRank = 1  // Reset rank for each state!
    stateTeams.forEach(team => {
      const hasScore = team.totalScore !== null
      const rank = hasScore ? currentRank++ : 0
      // ...
    })
  })
} else {
  // National ranking - all teams together
  let currentRank = 1
  // ...
}
```

### Frontend Integration:

```typescript
// Pass rankByState parameter based on splitByState toggle
const response = await fetch(
  `/api/events/${eventId}/judging/team-rankings?contestId=${selectedContest}&rankByState=${splitByState}`
)
```

### Re-fetch on Toggle Change:

```typescript
useEffect(() => {
  // ...
  fetchRankings()
}, [eventId, selectedContest, splitByState])  // Added splitByState dependency
```

## How It Works Now

### When Split by State is OFF (Combined/National Rankings):

**API Called:** `rankByState=false`

**Ranking:**
```
Rank 1  - SABAH Team A      (95.5)
Rank 2  - LABUAN Team X     (94.2)
Rank 3  - SABAH Team B      (93.8)
Rank 4  - SABAH Team C      (93.0)
Rank 5  - LABUAN Team Y     (92.5)
...
```

**Configuration:** Ranks 1-10 (all states combined)

**Result:** Top 10 teams nationally, regardless of state

### When Split by State is ON (State-Specific Rankings):

**API Called:** `rankByState=true`

**Ranking:**
```
SABAH State Rankings:
  Rank 1 - SABAH Team A      (95.5)
  Rank 2 - SABAH Team B      (93.8)
  Rank 3 - SABAH Team C      (93.0)
  Rank 4 - SABAH Team D      (92.0)
  Rank 5 - SABAH Team E      (91.5)
  Rank 6 - SABAH Team F      (91.0)
  Rank 7 - SABAH Team G      (90.5)
  Rank 8 - SABAH Team H      (89.0)
  Rank 9 - SABAH Team I      (88.0)
  Rank 10 - SABAH Team J     (87.5)

LABUAN State Rankings:
  Rank 1 - LABUAN Team X     (94.2)
  Rank 2 - LABUAN Team Y     (92.5)
  Rank 3 - LABUAN Team Z     (88.5)
  Rank 4 - LABUAN Team W     (87.0)
  Rank 5 - LABUAN Team V     (86.5)
  Rank 6 - LABUAN Team U     (85.0)
  Rank 7 - LABUAN Team T     (84.0)
  Rank 8 - LABUAN Team S     (83.5)
  Rank 9 - LABUAN Team R     (82.0)
  Rank 10 - LABUAN Team Q    (81.0)
```

**Configuration:** 
- SABAH Ranks 1-10
- LABUAN Ranks 1-10

**Result:** 
- ✅ SABAH: 10 teams (top 10 within SABAH)
- ✅ LABUAN: 10 teams (top 10 within LABUAN)
- Total: 20 certificates

## Before vs After

### Before Fix:

```
User configures:
- SABAH Ranks 1-10
- LABUAN Ranks 1-10

System interprets as:
- SABAH: Teams at NATIONAL ranks 1-10 that belong to SABAH
- LABUAN: Teams at NATIONAL ranks 1-10 that belong to LABUAN

Result:
- SABAH: 8 teams (happened to be at national ranks 1,3,4,6,7,8,9,10)
- LABUAN: 2 teams (happened to be at national ranks 2,5)
- ❌ Confusing! User expected 10 teams per state
```

### After Fix:

```
User configures:
- SABAH Ranks 1-10
- LABUAN Ranks 1-10

System interprets as:
- SABAH: Top 10 teams WITHIN SABAH (state rank 1-10)
- LABUAN: Top 10 teams WITHIN LABUAN (state rank 1-10)

Result:
- SABAH: 10 teams (if SABAH has ≥10 teams)
- LABUAN: 10 teams (if LABUAN has ≥10 teams)
- ✅ Expected behavior!
```

## Edge Cases Handled

### Case 1: State Has Fewer Teams Than Configured

If LABUAN only has 5 teams total:

**Configuration:** Ranks 1-10

**Result:** 5 teams (ranks 1-5)

**UI Shows:**
```
LABUAN ⚠️ Partial
Configured: Ranks 1-10
Only 5 teams available (not 10)
5 teams

Note: LABUAN only has 5 teams participating.
```

### Case 2: Multiple States with Different Sizes

**Configuration:**
- SELANGOR Ranks 1-10
- SABAH Ranks 1-10  
- LABUAN Ranks 1-10

**Actual Participation:**
- SELANGOR: 20 teams
- SABAH: 10 teams
- LABUAN: 5 teams

**Result:**
- SELANGOR: 10 certificates ✅
- SABAH: 10 certificates ✅
- LABUAN: 5 certificates ⚠️ (only 5 teams exist)
- Total: 25 certificates

## Technical Changes

### Modified Files:

1. **`/src/app/api/events/[id]/judging/team-rankings/route.ts`**
   - Added `rankByState` query parameter
   - Added conditional ranking logic
   - Groups teams by state when `rankByState=true`
   - Ranks teams within each state independently

2. **`/src/app/organizer/events/[id]/certificates/winners/page.tsx`**
   - Updated API calls to include `&rankByState=${splitByState}`
   - Added `splitByState` to useEffect dependencies
   - Rankings now automatically refresh when toggle changes

### API Signature:

**Before:**
```
GET /api/events/[id]/judging/team-rankings?contestId=5
```

**After:**
```
GET /api/events/[id]/judging/team-rankings?contestId=5&rankByState=true
GET /api/events/[id]/judging/team-rankings?contestId=5&rankByState=false
```

### Response Structure (Unchanged):

```json
{
  "rankings": [
    {
      "rank": 1,
      "team": { "id": 123, "name": "Team A" },
      "state": { "id": 5, "name": "SABAH" },
      "averageScore": 95.5,
      ...
    }
  ],
  "total": 25
}
```

**Note:** The `rank` value now means:
- **When rankByState=false:** National rank (1, 2, 3... across all teams)
- **When rankByState=true:** State rank (1, 2, 3... within each state)

## Testing

### Test 1: Split by State OFF

1. Turn OFF "Split by State"
2. View rankings
3. ✅ Should see sequential ranks 1, 2, 3... for all teams combined
4. Configure bulk generation Ranks 1-10
5. ✅ Should generate for top 10 teams nationally

### Test 2: Split by State ON

1. Turn ON "Split by State"
2. View rankings
3. ✅ Should see ranks 1, 2, 3... restart for each state
4. Configure SABAH Ranks 1-10, LABUAN Ranks 1-10
5. ✅ Should generate 10 from SABAH + 10 from LABUAN (if available)

### Test 3: Toggle Between Modes

1. Start with Split by State OFF
2. Note the ranks
3. Toggle Split by State ON
4. ✅ Rankings should automatically refresh
5. ✅ Ranks should change to state-specific
6. Toggle back to OFF
7. ✅ Rankings refresh back to national

### Test 4: Partial Availability

1. Turn ON "Split by State"
2. Configure a state with only 5 teams to Ranks 1-10
3. ✅ Should show "Only 5 teams available"
4. ✅ Should still generate 5 certificates (not error)

## Benefits

### ✅ **Correct Behavior**
- "Split by State" now actually splits rankings by state
- Each state has independent ranking (1, 2, 3...)
- Matches user expectations

### ✅ **Automatic Refresh**
- Rankings update when toggling Split by State
- No need to manually refresh
- Seamless experience

### ✅ **Consistent**
- API behavior matches UI mode
- No confusion about what ranks mean
- Clear documentation

### ✅ **Flexible**
- Works for both national and state-based competitions
- Handles edge cases (fewer teams than configured)
- Backward compatible

## Summary

**The Fix:**
- Added `rankByState` parameter to team rankings API
- When ON: Ranks teams independently within each state
- When OFF: Ranks all teams together nationally
- Frontend automatically uses correct mode based on toggle

**The Result:**
- ✅ "SABAH Ranks 1-10" now means top 10 teams **in SABAH**
- ✅ "LABUAN Ranks 1-10" now means top 10 teams **in LABUAN**
- ✅ No more confusion about combined rankings
- ✅ Bulk generation works as expected for state-based competitions

**Before:** Rankings were always national, just displayed grouped by state.

**After:** Rankings are truly state-specific when Split by State is ON. 🎯

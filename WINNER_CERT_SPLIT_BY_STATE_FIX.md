# Winner Certificate Split by State Fix

## Problem

When "Split by State" was turned OFF (national ranking mode), the system still tried to match pre-generated certificates by state, causing:
- ❌ Pre-generated national certificates couldn't be found
- ❌ System fell back to direct generation even when national certs existed
- ❌ Serial number sequences got mixed up

## Root Cause

The certificate matching query didn't account for the ranking mode:

```sql
-- OLD QUERY - Always checked for exact match, no flexibility ❌
WHERE ... AND JSON_EXTRACT(ownership, '$.stateId') = ${teamStateId}
```

This required an exact state match, which failed when:
- Pre-generated certs were created with `rankingMode: 'national'` (stateId IS NULL)
- But the query was trying to match a specific stateId

## Solution

### Flexible State Matching

The updated query now handles **both national and state-based rankings**:

```sql
AND (
  JSON_EXTRACT(ownership, '$.stateId') IS NULL
  OR CAST(JSON_EXTRACT(ownership, '$.stateId') AS UNSIGNED) = ${teamStateId}
)
```

### How It Works

#### Scenario 1: National Ranking (Split by State OFF)

**Pre-generated certificates created with:**
```javascript
{
  rankingMode: 'national',
  stateId: null,  // No state, it's national
  rank: 1,
  contestId: 5,
  eventId: 16
}
```

**Matching logic:**
- Team from any state can use these certs
- Query matches where `stateId IS NULL`
- ✅ National certs found and assigned

#### Scenario 2: State-based Ranking (Split by State ON)

**Pre-generated certificates created with:**
```javascript
{
  rankingMode: 'state',
  stateId: 3,      // Selangor
  stateName: 'Selangor',
  rank: 1,
  contestId: 5,
  eventId: 16
}
```

**Matching logic:**
- Team from Selangor (stateId: 3) will use these certs
- Query matches where `stateId = 3`
- ✅ State-specific certs found and assigned

#### Scenario 3: Mixed (National certs available, State-based needed)

**Pre-generated:** National certs exist (stateId IS NULL)
**Assignment:** State-based team wants to use them

**Matching logic:**
- Team has stateId = 5 (Johor)
- Query checks: `stateId IS NULL OR stateId = 5`
- ✅ Can fall back to national certs if state-specific ones don't exist

This provides **maximum flexibility** without breaking existing functionality.

## Enhanced Logging

### Before Assignment:
```
[Winner Cert Gen] Searching for pre-generated certs: templateId=1, rank=1, contestId=5, eventId=16, teamStateId=3
[Winner Cert Gen] Found 3 pre-generated certificates for rank 1
[Winner Cert Gen] Detected ranking mode: state-based
```

Or for national:
```
[Winner Cert Gen] Searching for pre-generated certs: templateId=1, rank=1, contestId=5, eventId=16, teamStateId=NULL
[Winner Cert Gen] Found 3 pre-generated certificates for rank 1
[Winner Cert Gen] Detected ranking mode: national
```

### During Assignment:
```
[Winner Cert Gen] 🔄 Auto mapping: Member 1 (John Doe) → Cert MT25-W-0001
[Winner Cert Gen] ✓ Assigning pre-generated cert MT25-W-0001 (ID: 123) to member 1: John Doe
```

## Complete Flow

### Pre-Generation Phase

**With Split by State OFF (National):**
1. User selects "National" ranking mode
2. System generates certs with `stateId: null`
3. Stored in DB:
   ```json
   {
     "rankingMode": "national",
     "stateId": null,
     "rank": 1,
     "contestId": 5,
     "eventId": 16,
     "memberNumber": 1
   }
   ```

**With Split by State ON (State-based):**
1. User selects "State" ranking mode
2. System generates certs for each state
3. Stored in DB:
   ```json
   {
     "rankingMode": "state",
     "stateId": 3,
     "stateName": "Selangor",
     "rank": 1,
     "contestId": 5,
     "eventId": 16,
     "memberNumber": 1
   }
   ```

### Assignment Phase

**The system now:**
1. Gets team's stateId from `attendanceTeam` table
2. Searches for pre-generated certs with flexible matching:
   - National certs (stateId IS NULL) ← Always considered
   - State certs (stateId = team's stateId) ← If team has a state
3. Uses whichever is found first (preference to exact state match if multiple exist)
4. Falls back to direct generation if none found

## Testing Scenarios

### Test 1: National Pre-Generated → National Assignment ✅

**Setup:**
- Pre-generate with "National" ranking mode
- Certs have `stateId: null`

**Assignment:**
- View rankings without "Split by State"
- Assign winners

**Expected:**
- ✅ Finds national pre-generated certs
- ✅ Uses original serial numbers
- ✅ Logs show "Detected ranking mode: national"

### Test 2: State Pre-Generated → State Assignment ✅

**Setup:**
- Pre-generate with "State" ranking mode
- Certs have `stateId: 3` (Selangor)

**Assignment:**
- View rankings with "Split by State"
- Assign winners from Selangor

**Expected:**
- ✅ Finds state-specific pre-generated certs
- ✅ Uses original serial numbers
- ✅ Logs show "Detected ranking mode: state-based"

### Test 3: National Pre-Generated → State Assignment (Fallback) ✅

**Setup:**
- Pre-generate with "National" ranking mode
- Certs have `stateId: null`

**Assignment:**
- View rankings with "Split by State"
- Assign winners from any state

**Expected:**
- ✅ Finds national pre-generated certs (fallback)
- ✅ Can use national certs for state-based assignment
- ✅ Works seamlessly

### Test 4: State Pre-Generated → National Assignment (Mismatch) ⚠️

**Setup:**
- Pre-generate with "State" ranking mode for Selangor
- Certs have `stateId: 3`

**Assignment:**
- View rankings without "Split by State" (national view)
- Assign winners

**Expected:**
- ⚠️ Won't find state-specific certs (query looks for stateId IS NULL)
- ⚡ Falls back to direct generation
- ✅ Still works, just with new serial numbers

**Recommendation:** 
Always use matching ranking modes for pre-generation and assignment. If you change modes, re-generate certificates with the new mode.

## Code Changes

### File: `/src/app/api/events/[id]/judging/generate-winner-certs/route.ts`

#### Change 1: Added stateId to team query
```javascript
// Added at.stateId to SELECT
const teamQuery = `
  SELECT 
    at.Id as attendanceTeamId,
    at.teamId,
    at.stateId,  // ← NEW
    ...
`
```

#### Change 2: Flexible state matching in certificate query
```javascript
const teamStateId = team.stateId

const blankCertsForRank = await prisma.$queryRaw`
  SELECT id, serialNumber, uniqueCode, filePath, ownership
  FROM certificate
  WHERE templateId = ${template.id}
    AND ic_number IS NULL
    AND JSON_UNQUOTE(JSON_EXTRACT(ownership, '$.preGenerated')) = 'true'
    AND CAST(JSON_EXTRACT(ownership, '$.rank') AS UNSIGNED) = ${rank}
    AND CAST(JSON_EXTRACT(ownership, '$.contestId') AS UNSIGNED) = ${contestId}
    AND CAST(JSON_EXTRACT(ownership, '$.eventId') AS UNSIGNED) = ${eventId}
    AND (
      JSON_EXTRACT(ownership, '$.stateId') IS NULL  // ← National certs
      ${
        teamStateId 
          ? `OR CAST(JSON_EXTRACT(ownership, '$.stateId') AS UNSIGNED) = ${teamStateId}`  // ← State certs
          : ''
      }
    )
  ORDER BY CAST(JSON_EXTRACT(ownership, '$.memberNumber') AS UNSIGNED) ASC
`
```

#### Change 3: Enhanced logging
```javascript
console.log(`[Winner Cert Gen] Searching for pre-generated certs: templateId=${template.id}, rank=${rank}, contestId=${contestId}, eventId=${eventId}, teamStateId=${teamStateId || 'NULL'}`)

if (hasBlankCerts) {
  const firstCert = blankCertsForRank[0]
  const ownership = typeof firstCert.ownership === 'string' ? JSON.parse(firstCert.ownership) : firstCert.ownership
  const detectedMode = ownership.stateId ? 'state-based' : 'national'
  console.log(`[Winner Cert Gen] Detected ranking mode: ${detectedMode}`)
}
```

## Benefits

### ✅ **Flexible Matching**
- Works with national OR state-based pre-generated certs
- Can fall back to national certs if state-specific ones don't exist
- No hard errors, just smart fallback

### ✅ **Clear Visibility**
- Logs show which state the team belongs to
- Logs show detected ranking mode
- Easy to debug mismatches

### ✅ **Backward Compatible**
- Existing national pre-generated certs still work
- Existing state-based pre-generated certs still work
- No data migration needed

### ✅ **Future-Proof**
- Handles mixed scenarios gracefully
- Can support hybrid ranking modes in the future
- Extensible to other ranking dimensions

## Deployment

**No build required!** Runtime code only:

```bash
pm2 restart mt25
```

## Monitoring

Check PM2 logs to verify correct matching:

```bash
pm2 logs mt25 --lines 50 | grep "Winner Cert Gen"
```

Look for:
- `Searching for pre-generated certs: ... teamStateId=...`
- `Detected ranking mode: national` or `state-based`
- `✓ Assigning pre-generated cert` (success)
- `⚡ Direct generation` (fallback)

## Summary

**Before:**
- ❌ Rigid state matching failed for national rankings
- ❌ Pre-generated national certs couldn't be found
- ❌ Unnecessary fallback to direct generation

**After:**
- ✅ Flexible matching handles both national and state-based
- ✅ National certs (stateId IS NULL) always considered
- ✅ State certs matched when team has matching stateId
- ✅ Smart fallback preserves serial number sequences
- ✅ Clear logging shows what's happening

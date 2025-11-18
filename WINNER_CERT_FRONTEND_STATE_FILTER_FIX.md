# Winner Certificate Frontend State Filter Fix

## Problem

When viewing the winner certificate page with **"Split by State" turned OFF** (national ranking view), the system was still:
- ❌ Filtering pre-generated certificates by state
- ❌ Showing state name in error messages (e.g., "SELANGOR")
- ❌ Unable to find national pre-generated certificates

**Example Error Message (incorrect):**
```
No pre-generated certificates found for Rank 1, Contest "1.1R - Cabaran Mencipta Robot", SELANGOR.
```

When "Split by State" is OFF, the state should NOT be mentioned and the search should be for **national** certificates only.

## Root Cause

### Issue 1: Frontend Always Filtering by State

In the `openManualMapping` function at line 691-692:

```javascript
// OLD CODE - Always added stateId if team has a state ❌
if (team.state?.id) {
  certsUrl += `&stateId=${team.state.id}`
}
```

**Problem:** 
- Teams ALWAYS have state information (they belong to a state)
- This code added `stateId` filter regardless of whether "Split by State" was ON or OFF
- Result: Looking for state-specific pre-generated certs instead of national ones

### Issue 2: Error Message Always Showing State

At line 2301:

```javascript
// OLD CODE - Always showed state name ❌
{mappingTeam.state && `, ${mappingTeam.state.name}`}
```

**Problem:**
- Showed state name even when in national ranking mode
- Confused users about what type of certificates the system was looking for

## Solution

### Fix 1: Conditional State Filtering

Only filter by `stateId` when "Split by State" is ON:

```javascript
// NEW CODE - Only filter by state when splitByState is ON ✅
if (splitByState && team.state?.id) {
  certsUrl += `&stateId=${team.state.id}`
}
```

### Fix 2: Conditional State Display

Only show state name in messages when "Split by State" is ON:

```javascript
// NEW CODE - Only show state when splitByState is ON ✅
{splitByState && mappingTeam.state && `, ${mappingTeam.state.name}`}
```

## How It Works Now

### Scenario 1: Split by State OFF (National Ranking)

**API Request:**
```
GET /api/events/13/judging/available-certs?contestId=5&rank=1
```
- No `stateId` parameter
- Searches for national pre-generated certificates (where `stateId IS NULL`)

**Success Message:**
```
✓ 3 pre-generated certificates available
Filtered for: Rank 1, Contest "1.1R - Cabaran Mencipta Robot"
```
- No state mentioned

**Error Message:**
```
No pre-generated certificates found for Rank 1, Contest "1.1R - Cabaran Mencipta Robot".
```
- No state mentioned

### Scenario 2: Split by State ON (State-Based Ranking)

**API Request:**
```
GET /api/events/13/judging/available-certs?contestId=5&rank=1&stateId=3
```
- Includes `stateId` parameter
- Searches for state-specific pre-generated certificates

**Success Message:**
```
✓ 3 pre-generated certificates available
Filtered for: Rank 1, Contest "1.1R - Cabaran Mencipta Robot", SELANGOR
```
- State mentioned

**Error Message:**
```
No pre-generated certificates found for Rank 1, Contest "1.1R - Cabaran Mencipta Robot", SELANGOR.
```
- State mentioned

## Complete Flow

### Pre-Generation Phase

**National Mode (Split by State OFF):**
```javascript
// Pre-generate API request
{
  contestId: 5,
  ranks: [1, 2, 3],
  rankingMode: 'national',  // No state-based ranking
  allowRegenerate: false
}
```

**Certificates created:**
```json
{
  "rankingMode": "national",
  "stateId": null,  // No state
  "rank": 1,
  "contestId": 5
}
```

### Assignment Phase

**National Mode (Split by State OFF):**
```javascript
// Frontend fetches available certs
GET /api/events/13/judging/available-certs?contestId=5&rank=1
// NO stateId parameter ✅

// Backend searches for
WHERE stateId IS NULL  // National certs
```

**Result:**
- ✅ Finds national pre-generated certificates
- ✅ Uses original serial numbers
- ✅ No state mentioned in UI

## Code Changes

### File: `/src/app/organizer/events/[id]/certificates/winners/page.tsx`

#### Change 1: Conditional State Filter in API Request (Line ~691)

```javascript
// Before ❌
if (team.state?.id) {
  certsUrl += `&stateId=${team.state.id}`
}

// After ✅
if (splitByState && team.state?.id) {
  certsUrl += `&stateId=${team.state.id}`
}
```

#### Change 2: Conditional State in Success Message (Line ~2281)

```javascript
// After ✅
Filtered for: Rank {mappingTeam.rank}, Contest "{contestName}"{splitByState && mappingTeam.state && `, ${mappingTeam.state.name}`}
```

#### Change 3: Conditional State in Error Message (Line ~2301)

```javascript
// Before ❌
{mappingTeam.state && `, ${mappingTeam.state.name}`}

// After ✅
{splitByState && mappingTeam.state && `, ${mappingTeam.state.name}`}
```

## Testing

### Test 1: National Ranking Mode ✅

**Steps:**
1. Turn OFF "Split by State" toggle
2. Pre-generate certificates with "National" ranking mode
3. Click "Generate" on a team

**Expected:**
- ✅ Searches for national certificates (no state filter)
- ✅ Finds pre-generated national certs
- ✅ Error/success messages don't mention state
- ✅ Uses original serial numbers from national certs

### Test 2: State-Based Ranking Mode ✅

**Steps:**
1. Turn ON "Split by State" toggle
2. Pre-generate certificates with "State" ranking mode
3. Click "Generate" on a team from Selangor

**Expected:**
- ✅ Searches for Selangor-specific certificates
- ✅ Finds pre-generated Selangor certs
- ✅ Error/success messages show "SELANGOR"
- ✅ Uses original serial numbers from state certs

### Test 3: Mode Switch ✅

**Steps:**
1. Pre-generate with "National" mode
2. View with "Split by State" OFF
3. Toggle "Split by State" ON
4. Try to generate

**Expected:**
- ⚠️ Won't find state-specific certs (only national exist)
- ✅ Shows state name in error (because split is ON)
- ✅ Can still generate with direct generation (new serials)

**Recommendation:** Always use matching modes for pre-generation and assignment.

## Benefits

### ✅ **Correct Certificate Matching**
- Searches for national certs when in national mode
- Searches for state certs when in state mode
- No more false negatives

### ✅ **Clear User Messaging**
- Shows relevant information based on current mode
- No confusion about what type of certs being searched
- Accurate filtering description

### ✅ **Consistent Behavior**
- UI filter state (`splitByState`) controls everything
- Backend matching logic works correctly
- Frontend and backend in sync

### ✅ **Better UX**
- Users understand what's happening
- Clear indication of national vs state mode
- Appropriate error/success messages

## Deployment

**No build required!** Frontend runtime change:

```bash
# Just need to refresh the page in browser
# Or restart Next.js dev server if in development
pm2 restart mt25  # In production
```

## Related Fixes

This frontend fix works together with:

1. **Backend SQL Type Casting Fix** (`WINNER_CERT_PRE_GENERATION_FIX.md`)
   - Fixed JSON type comparison issues
   - Made pre-generated cert search more reliable

2. **Backend State Flexibility Fix** (`WINNER_CERT_SPLIT_BY_STATE_FIX.md`)
   - Made backend match both national AND state certs flexibly
   - Allows fallback to national if state certs don't exist

Together, these fixes ensure:
- ✅ Frontend sends correct filter parameters
- ✅ Backend searches correctly with type safety
- ✅ Backend provides flexible matching
- ✅ Complete flow works for both national and state modes

## Summary

**Before:**
- ❌ Always searched by state, even in national mode
- ❌ Couldn't find national pre-generated certs
- ❌ Confusing error messages mentioning state when not relevant
- ❌ Frontend and backend logic mismatch

**After:**
- ✅ Searches by state only when "Split by State" is ON
- ✅ Correctly finds national certs in national mode
- ✅ Clear, mode-appropriate messages
- ✅ Frontend and backend in perfect sync
- ✅ Users get expected behavior

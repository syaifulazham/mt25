# National Registration Status Display Fix

## Issue
Teams appearing in both "Online Event Registration" and "Final Stage (National) Registration" sections were showing the **same status** (e.g., APPROVED_SPECIAL) in both sections, even though they had different statuses in different events.

**Example:**
- Team 8233 "Pasukan Saya" in contest 4.3K
- Event 13 (NATIONAL): Status should be **PENDING**
- Event 16 (ONLINE_STATE): Status is **APPROVED_SPECIAL**
- Bug: National Registration section was showing **APPROVED_SPECIAL** instead of **PENDING**

## Root Cause

In `/src/app/api/participants/national-registration/route.ts`, the team status query (lines 139-145) was fetching status WITHOUT filtering by event scope:

```sql
-- BEFORE (WRONG)
SELECT ect.status
FROM eventcontestteam ect
JOIN eventcontest ec ON ect.eventcontestId = ec.id
WHERE ect.teamId = ${teamId}
LIMIT 1
```

This query would return the **first** status it found for the team, which could be from ANY event (zone, online, national, etc.). If a team was registered in multiple events, it would pick up the wrong status.

## Database Structure

Teams can be registered in multiple events:
```
team (id: 8233)
  ├─ eventcontestteam (id: 7173)
  │   └─ eventcontest (id: 116) → Event 13 (NATIONAL) → Status: PENDING
  └─ eventcontestteam (id: 6442)
      └─ eventcontest (id: 94) → Event 16 (ONLINE_STATE) → Status: APPROVED_SPECIAL
```

Without filtering by event scope, the query would pick either status randomly (whichever MySQL returns first).

## Solution

Added event scope filter to ensure we only get the status from NATIONAL events:

```sql
-- AFTER (CORRECT)
SELECT ect.status
FROM eventcontestteam ect
JOIN eventcontest ec ON ect.eventcontestId = ec.id
JOIN event e ON ec.eventId = e.id
WHERE ect.teamId = ${teamId}
  AND e.scopeArea = 'NATIONAL'  -- ✅ ADDED THIS LINE
LIMIT 1
```

## Files Modified

1. `/src/app/api/participants/national-registration/route.ts` (lines 138-147)
   - Added `JOIN event e ON ec.eventId = e.id`
   - Added `AND e.scopeArea = 'NATIONAL'` filter

## Impact

**Before Fix:**
- Teams in multiple events showed incorrect status in National Registration section
- Status from other events (zone, online) would "leak" into national section
- Confusing for participants who see APPROVED_SPECIAL when actual status is PENDING

**After Fix:**
- Each section shows the correct status for that specific event scope:
  - Zone Registration: Shows status from PHYSICAL events
  - Online Registration: Shows status from ONLINE_* events
  - National Registration: Shows status from NATIONAL events
- Accurate status display for teams registered in multiple events
- Participants see the correct approval status for each event type

## Testing

1. **Single Event Registration:**
   - Team in only NATIONAL event → Shows correct status ✅

2. **Multiple Event Registration:**
   - Team in NATIONAL (PENDING) + ONLINE_STATE (APPROVED) → National shows PENDING ✅
   - Same team appears in both sections with different statuses ✅

3. **Edge Cases:**
   - Team in multiple NATIONAL events → Shows first NATIONAL event's status
   - Team with no NATIONAL registration → Doesn't appear in National section ✅

## Similar Pattern

This fix follows the same pattern as other registration sections:
- Zone Registration API filters by `contest.method = 'PHYSICAL'`
- Online Registration API filters by `event.scopeArea LIKE 'ONLINE_%'`
- National Registration API filters by `event.scopeArea = 'NATIONAL'`

All status queries should filter by the appropriate event scope to avoid cross-contamination.

## Database Query Example

To verify status for a team across events:
```sql
SELECT 
  ect.teamId,
  t.name as teamName,
  e.id as eventId,
  e.name as eventName,
  e.scopeArea,
  ect.status
FROM eventcontestteam ect
JOIN eventcontest ec ON ect.eventcontestId = ec.id
JOIN event e ON ec.eventId = e.id
JOIN team t ON ect.teamId = t.id
WHERE ect.teamId = 8233
ORDER BY e.scopeArea, e.id;
```

This will show all events the team is registered in and their respective statuses.

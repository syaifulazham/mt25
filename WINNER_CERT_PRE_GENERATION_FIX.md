# Winner Certificate Pre-Generation Fix

## Problem

When generating winner certificates at `/organizer/events/[id]/certificates/winners`, the system could not find pre-generated certificates even though they existed in the database. This caused the system to either fail or generate new serial numbers instead of using the pre-generated ones.

## Root Cause

### 1. **JSON Type Mismatch in SQL Query**

The pre-generation process stores ownership data with **numeric types**:
```javascript
{
  preGenerated: true,      // boolean
  rank: 1,                 // number
  contestId: 123,          // number
  eventId: 456,            // number
  memberNumber: 1          // number
}
```

But the winner generation query was comparing **without proper type casting**:
```sql
-- OLD QUERY - Type mismatch causes false negatives
WHERE JSON_EXTRACT(ownership, '$.preGenerated') = true
  AND JSON_EXTRACT(ownership, '$.rank') = ${rank}
  AND JSON_EXTRACT(ownership, '$.contestId') = ${contestId}
```

**Issue:** `JSON_EXTRACT` returns values as strings or JSON literals, not native MySQL types. Comparing `JSON_EXTRACT(...) = 1` might compare string "1" with number 1, which fails.

### 2. **Boolean Comparison Issue**

MySQL's `JSON_EXTRACT` returns booleans as JSON literals (true/false) or integers (1/0), not as native SQL booleans. Direct comparison with `= true` can fail.

## Solution

### Fixed SQL Query with Type Casting

```sql
-- NEW QUERY - Explicit type casting ensures correct matching
SELECT id, serialNumber, uniqueCode, filePath, ownership
FROM certificate
WHERE templateId = ${template.id}
  AND ic_number IS NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(ownership, '$.preGenerated')) = 'true'
  AND CAST(JSON_EXTRACT(ownership, '$.rank') AS UNSIGNED) = ${rank}
  AND CAST(JSON_EXTRACT(ownership, '$.contestId') AS UNSIGNED) = ${contestId}
  AND CAST(JSON_EXTRACT(ownership, '$.eventId') AS UNSIGNED) = ${eventId}
ORDER BY CAST(JSON_EXTRACT(ownership, '$.memberNumber') AS UNSIGNED) ASC
```

### Key Changes:

1. **Boolean handling:**
   ```sql
   JSON_UNQUOTE(JSON_EXTRACT(ownership, '$.preGenerated')) = 'true'
   ```
   - `JSON_UNQUOTE` removes quotes and returns the raw value
   - Compare as string 'true' for reliability

2. **Numeric comparisons:**
   ```sql
   CAST(JSON_EXTRACT(ownership, '$.rank') AS UNSIGNED) = ${rank}
   ```
   - `CAST(...AS UNSIGNED)` converts JSON number to MySQL integer
   - Ensures numeric comparison, not string comparison

3. **Ordering:**
   ```sql
   ORDER BY CAST(JSON_EXTRACT(ownership, '$.memberNumber') AS UNSIGNED) ASC
   ```
   - Ensures members are mapped in the correct order (1, 2, 3... not "1", "10", "2")

## Enhanced Logging

Added comprehensive logging to track the certificate assignment process:

```javascript
// Search logging
console.log(`[Winner Cert Gen] Searching for pre-generated certs: templateId=${template.id}, rank=${rank}, contestId=${contestId}, eventId=${eventId}`)
console.log(`[Winner Cert Gen] Found ${blankCertsForRank.length} pre-generated certificates for rank ${rank}`)

// Mapping mode logging
console.log(`[Winner Cert Gen] 🎯 Manual mapping: Member 1 (John Doe) → Cert ID 123`)
console.log(`[Winner Cert Gen] 🔄 Auto mapping: Member 2 (Jane Smith) → Cert MT25-W-0001`)

// Generation mode logging
console.log(`[Winner Cert Gen] ✓ Assigning pre-generated cert MT25-W-0001 (ID: 123) to member 1: John Doe`)
console.log(`[Winner Cert Gen] ⚡ Direct generation - created new serial MT25-W-0005 for Jane Smith`)

// Warning logging
console.log(`[Winner Cert Gen] ⚠️ Not enough pre-generated certs. Team has 5 members, but only 3 certs available.`)
```

## Certificate Generation Flow

### Scenario 1: Pre-Generated Certificates Available ✅

1. System searches for pre-generated blank certificates
2. Finds matching certificates for the rank/contest/event
3. Maps team members to certificates (auto or manual mapping)
4. Updates blank certificate with winner details (name, IC, etc.)
5. **Preserves original serial number from pre-generated cert**

```
Pre-generated: MT25-W-0001 (blank)
         ↓ (assigned to John Doe)
Final cert:   MT25-W-0001 (John Doe)
```

### Scenario 2: No Pre-Generated Certificates 🆕

1. System searches for pre-generated certificates
2. Finds none (or not enough for all team members)
3. **Automatically falls back to direct generation**
4. Generates new serial numbers on-the-fly
5. Creates certificates with newly generated serials

```
No pre-generated cert available
         ↓ (direct generation)
New cert: MT25-W-0005 (John Doe) ← Fresh serial number
```

### Scenario 3: Mixed (Some Pre-Generated, Some Direct) 🔀

When a team has more members than available pre-generated certificates:

```
Team: 5 members
Pre-generated: 3 certs

Member 1 → Uses pre-generated MT25-W-0001
Member 2 → Uses pre-generated MT25-W-0002
Member 3 → Uses pre-generated MT25-W-0003
Member 4 → Direct generation MT25-W-0010 (new serial)
Member 5 → Direct generation MT25-W-0011 (new serial)
```

## Benefits

### ✅ **Flexible Certificate Generation**

- Works with or without pre-generated certificates
- Automatically falls back to direct generation
- No manual intervention needed

### ✅ **Serial Number Integrity**

- Pre-generated certificates keep their original serial numbers
- Direct generation creates sequential new serial numbers
- No duplicate serials, no conflicts

### ✅ **Clear Visibility**

- Detailed console logs show exactly what's happening
- Easy to debug if issues occur
- Can track which mode was used for each certificate

### ✅ **Manual Override Support**

- Organizers can manually map specific team members to specific certificates
- Useful when certificate order doesn't match team member order
- System validates manual mappings and falls back if needed

## Testing

### Test Case 1: With Pre-Generated Certs

1. Pre-generate 3 certificates for Rank 1, Contest 5
2. Assign winners to a 3-member team
3. **Expected:** All 3 use pre-generated certs with their original serial numbers
4. **Check logs:** Should see "✓ Assigning pre-generated cert" messages

### Test Case 2: Without Pre-Generated Certs

1. Assign winners to a team (no pre-generated certs exist)
2. **Expected:** System generates new serial numbers for all members
3. **Check logs:** Should see "⚡ Direct generation - created new serial" messages

### Test Case 3: Partial Pre-Generated

1. Pre-generate 2 certificates for a 4-member team
2. Assign winners
3. **Expected:** First 2 use pre-generated, last 2 get new serials
4. **Check logs:** Should see mix of "✓ Assigning" and "⚡ Direct generation"

### Test Case 4: Manual Mapping

1. Pre-generate 3 certs (serial A, B, C)
2. Manually map: Member 1→B, Member 2→C, Member 3→A
3. **Expected:** Members get their manually assigned certificates
4. **Check logs:** Should see "🎯 Manual mapping" messages

## Console Log Examples

### Successful Pre-Generated Assignment:
```
[Winner Cert Gen] Searching for pre-generated certs: templateId=1, rank=1, contestId=5, eventId=16
[Winner Cert Gen] Found 3 pre-generated certificates for rank 1
[Winner Cert Gen] 🔄 Auto mapping: Member 1 (John Doe) → Cert MT25-W-0001
[Winner Cert Gen] ✓ Assigning pre-generated cert MT25-W-0001 (ID: 123) to member 1: John Doe
```

### Direct Generation (No Pre-Generated):
```
[Winner Cert Gen] Searching for pre-generated certs: templateId=1, rank=2, contestId=5, eventId=16
[Winner Cert Gen] Found 0 pre-generated certificates for rank 2
[Winner Cert Gen] No pre-generated certificates found. Will generate new serial numbers.
[Winner Cert Gen] ⚡ Direct generation - created new serial MT25-W-0010 for Jane Smith
```

### Warning (Insufficient Pre-Generated):
```
[Winner Cert Gen] Found 2 pre-generated certificates for rank 1
[Winner Cert Gen] ⚠️ Not enough pre-generated certs. Team has 4 members, but only 2 certs available. Will generate new serial for member 3.
[Winner Cert Gen] ⚡ Direct generation - created new serial MT25-W-0015 for Bob Lee
```

## Deployment

### No Build Required! ✅

This is a **backend logic fix** that requires only:

```bash
pm2 restart mt25
```

Changes are in the API route handlers (server-side runtime code), not compiled/bundled code.

## Summary

**Before:**
- ❌ Pre-generated certificates couldn't be found due to JSON type mismatch
- ❌ System might fail or generate duplicate serial numbers
- ❌ No visibility into what was happening

**After:**
- ✅ Correctly finds pre-generated certificates using type-safe SQL
- ✅ Automatically falls back to direct generation if none available
- ✅ Mixed mode: uses pre-generated where available, generates new for the rest
- ✅ Clear logging shows exactly what's happening
- ✅ Manual mapping support for precise control
- ✅ Serial number integrity maintained in all scenarios

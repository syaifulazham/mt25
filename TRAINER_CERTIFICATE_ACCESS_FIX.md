# Trainer Certificate Access Fix - Primary & Co-Manager Support

## The Problem

Users who were assigned as **primary managers** or **co-managers** of contingents were getting the error:

```
"Participant not found or not associated with contingent"
```

when trying to access the trainers certificate page at:
```
https://techlympics.my/participants/contestants/certificates-trainers
```

### Background

When a user takes over as a primary manager from another manager, they are added to the contingent through the `contingentManager` table (not the direct `contingents` relationship). The API was only checking the direct relationship, missing all primary and co-managers.

## Root Cause

The API endpoint `/api/participants/trainers/certificates` was only checking for contingents through the **direct** `participant.contingents` relationship:

```typescript
const participant = await prisma.user_participant.findUnique({
  where: { email: session.user.email },
  select: {
    id: true,
    contingents: {  // ❌ Only checked direct relationship
      select: {
        id: true
      }
    }
  }
})
```

### Database Schema

The `user_participant` model has TWO ways to be associated with contingents:

1. **Direct relationship** (`contingents`):
   - For participants who created the contingent
   - Older legacy relationship

2. **Managed relationship** (`managedContingents`):
   - Through `contingentManager` table
   - For primary managers (`isOwner: true`)
   - For co-managers (`isOwner: false`)
   - **This is the correct relationship for managers**

**`contingentManager` table:**
```prisma
model contingentManager {
  id            Int              @id @default(autoincrement())
  participantId Int              // The manager/user
  contingentId  Int              // The contingent they manage
  isOwner       Boolean          @default(false)  // true = primary, false = co-manager
  contingent    contingent       @relation(...)
  participant   user_participant @relation(...)
}
```

## The Solution

Modified the API to check **BOTH** direct contingents AND managed contingents:

```typescript
const participant = await prisma.user_participant.findUnique({
  where: { email: session.user.email },
  select: {
    id: true,
    contingents: {
      select: {
        id: true
      }
    },
    managedContingents: {  // ✅ Added managed contingents
      select: {
        contingentId: true
      }
    }
  }
})

// Get contingent IDs from both sources
const directContingentIds = (participant.contingents || []).map(c => c.id)
const managedContingentIds = (participant.managedContingents || []).map(cm => cm.contingentId)

// Combine and deduplicate
const contingentIds = [...new Set([...directContingentIds, ...managedContingentIds])]
```

## How It Works Now

### Case 1: Primary Manager

**Scenario:** User A is assigned as primary manager of "SMK Tech School" contingent.

**Database:**
```
contingentManager:
  participantId: 123 (User A)
  contingentId: 45 (SMK Tech School)
  isOwner: true  (primary manager)
```

**Before Fix:**
- ❌ `participant.contingents` = empty (no direct relationship)
- ❌ Error: "Participant not found or not associated with contingent"

**After Fix:**
- ✅ `participant.managedContingents` = [45]
- ✅ `contingentIds` = [45]
- ✅ Access granted! Shows all trainers from SMK Tech School

### Case 2: Co-Manager

**Scenario:** User B is assigned as co-manager of "SMK Tech School" contingent.

**Database:**
```
contingentManager:
  participantId: 456 (User B)
  contingentId: 45 (SMK Tech School)
  isOwner: false  (co-manager)
```

**Before Fix:**
- ❌ `participant.contingents` = empty
- ❌ Error: "Participant not found or not associated with contingent"

**After Fix:**
- ✅ `participant.managedContingents` = [45]
- ✅ `contingentIds` = [45]
- ✅ Access granted! Shows all trainers from SMK Tech School

### Case 3: Manager of Multiple Contingents

**Scenario:** User C is:
- Primary manager of "SMK Tech School" (contingentId: 45)
- Co-manager of "SMK Science High" (contingentId: 78)

**Database:**
```
contingentManager:
  1. participantId: 789, contingentId: 45, isOwner: true
  2. participantId: 789, contingentId: 78, isOwner: false
```

**Before Fix:**
- ❌ `participant.contingents` = empty
- ❌ Error

**After Fix:**
- ✅ `participant.managedContingents` = [45, 78]
- ✅ `contingentIds` = [45, 78]
- ✅ Shows trainers from BOTH contingents

### Case 4: Direct + Managed (Edge Case)

**Scenario:** User D has:
- Direct contingent relationship (legacy): contingentId 45
- Managed contingent: contingentId 78

**Before Fix:**
- ⚠️ `participant.contingents` = [45]
- ⚠️ Only saw trainers from contingent 45
- ❌ Missing contingent 78

**After Fix:**
- ✅ `directContingentIds` = [45]
- ✅ `managedContingentIds` = [78]
- ✅ `contingentIds` = [45, 78] (deduplicated)
- ✅ Shows trainers from BOTH contingents

## What the Page Shows

Once access is granted, the page displays:

**For Primary Managers & Co-Managers:**
- All trainers/managers associated with their contingent(s)
- Trainer name, email, IC number
- Contingent name, event name, institution
- Certificate status (if generated)
- Ability to view/download trainer certificates

**Example Display:**
```
┌─────────────────────────────────────────────────────┐
│ Trainer Certificates                                │
├─────────────────────────────────────────────────────┤
│ ✓ John Doe                                         │
│   IC: 850101-01-1234                               │
│   SMK Tech School - Cabaran SkyTech 2025          │
│   [View] [Download]                                │
├─────────────────────────────────────────────────────┤
│ ✗ Jane Smith (No Certificate)                     │
│   IC: 870202-02-5678                               │
│   SMK Tech School - Cabaran SkyTech 2025          │
└─────────────────────────────────────────────────────┘
```

## Technical Details

### API Endpoint

**File:** `/src/app/api/participants/trainers/certificates/route.ts`

**Method:** GET

**Authorization:**
- Requires authenticated session
- Checks user's email against `user_participant` table

**Logic:**
1. Get user's participant record
2. **NEW:** Fetch both `contingents` and `managedContingents`
3. Combine contingent IDs from both sources
4. Deduplicate using `Set`
5. Query all trainers from those contingents
6. Return trainer list with certificate status

### Query Structure

The API then queries:
```sql
SELECT 
  m.id as managerId,
  m.name as managerName,
  m.ic as managerIc,
  c.name as contingentName,
  cert.id as certificateId,
  ...
FROM manager m
INNER JOIN attendanceManager am ON m.id = am.managerId
LEFT JOIN contingent c ON am.contingentId = c.id
LEFT JOIN certificate cert ON cert.ic_number = m.ic 
  AND cert.recipientType = 'TRAINER'
WHERE am.contingentId IN (45, 78)  -- User's contingents
ORDER BY m.name ASC
```

## Benefits

### ✅ **Correct Authorization**
- Primary managers have access
- Co-managers have access
- Respects the contingentManager table structure

### ✅ **Handles Manager Transitions**
- When a user takes over as primary manager → works
- When a user is added as co-manager → works
- When roles change → access updates automatically

### ✅ **Multiple Contingents**
- Managers of multiple contingents see all trainers
- No duplicate trainers if person manages same contingent through multiple paths

### ✅ **Backward Compatible**
- Still works for users with direct contingent relationships
- Combines both sources seamlessly

## Testing

### Test 1: Primary Manager

1. Log in as a user who is a **primary manager** of a contingent
2. Navigate to `/participants/contestants/certificates-trainers`
3. ✅ Should see trainer list (not error)
4. ✅ Should see all trainers from their contingent

### Test 2: Co-Manager

1. Log in as a user who is a **co-manager** of a contingent
2. Navigate to trainer certificates page
3. ✅ Should see trainer list (not error)
4. ✅ Should see same trainers as primary manager

### Test 3: Manager Takeover

1. User A was primary manager
2. User B takes over as new primary manager
3. Log in as User B
4. ✅ Should have access immediately
5. ✅ Should see all trainers

### Test 4: Multiple Contingents

1. Log in as user who manages 2+ contingents
2. Navigate to trainer certificates page
3. ✅ Should see trainers from ALL their contingents
4. ✅ No duplicates

### Test 5: No Contingents

1. Log in as user with no contingents
2. Navigate to trainer certificates page
3. ✅ Should show empty list (no error)

## Error Messages

**Before:**
```json
{
  "error": "Participant not found or not associated with contingent"
}
```

**After:**
- If user not found: `"Participant not found"`
- If no contingents: Shows empty trainer list (no error)
- Access granted for all primary and co-managers ✅

## Related Files

**Modified:**
- `/src/app/api/participants/trainers/certificates/route.ts`

**Frontend (Unchanged):**
- `/src/app/participants/contestants/certificates-trainers/page.tsx`

**Database Schema:**
- `user_participant.contingents` - Direct relationship
- `user_participant.managedContingents` - Through contingentManager
- `contingentManager` - Junction table for managers

## Summary

**Problem:** Primary managers and co-managers couldn't access trainer certificates.

**Root Cause:** API only checked direct `contingents` relationship, missing `managedContingents`.

**Solution:** Check BOTH relationships and combine contingent IDs.

**Result:** ✅ All primary managers and co-managers now have proper access! 🎉

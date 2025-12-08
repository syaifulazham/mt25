# Certificate Counting Conditions

## Overview
This document explains the conditions used to count different types of certificates on the participants' certificates page (`/participants/contestants/certificates`).

> **Recent Update**: As of the latest change, both `'READY'` and `'LISTED'` status certificates are now counted and displayed. Previously, only `'READY'` status was counted.

## Certificate Status Requirement

**CRITICAL**: Certificates **MUST** have `status = 'READY'` or `status = 'LISTED'` to be counted and displayed.

### API Filtering
```sql
-- School certificates
WHERE c.status IN ('READY', 'LISTED')
  AND ct.targetType = 'GENERAL'

-- State/Online/National certificates  
WHERE c.status IN ('READY', 'LISTED')
  AND e.scopeArea IN ('ZONE', 'ONLINE_STATE', 'NATIONAL')

-- Quiz certificates
WHERE c.status IN ('READY', 'LISTED')
  AND ct.targetType IN ('QUIZ_PARTICIPANT', 'QUIZ_WINNER')
```

**Location**: `/src/app/api/participants/contestants/certificates/route.ts`
- Line 97: School certificates filter (Prisma: `status: { in: ['READY', 'LISTED'] }`)
- Line 140: Zone/National certificates filter (SQL: `c.status IN ('READY', 'LISTED')`)
- Line 170: Quiz certificates filter (SQL: `c.status IN ('READY', 'LISTED')`)

---

## 1. Sijil Sekolah (School Certificate)

### Count Condition
```typescript
const schoolCount = contestants.filter(c => c.certificates.school).length
```

### Criteria
- **Template Target Type**: `'GENERAL'`
- **Certificate Status**: `'READY'` or `'LISTED'`
- **Matching**: By IC number (`ic_number`)
- **Count**: Number of contestants who have at least 1 school certificate

### SQL Query
```sql
SELECT * FROM certificate c
INNER JOIN cert_template ct ON c.templateId = ct.id
WHERE c.status IN ('READY', 'LISTED')
  AND c.ic_number = ${contestant.ic}
  AND ct.targetType = 'GENERAL'
```

### Breakdown
- Only the first school certificate is used: `schoolCertificates[0]`
- One contestant = maximum 1 school certificate counted
- Must have `status = 'READY'` or `'LISTED'`

---

## 2. Sijil Negeri (State Certificate)

### Count Condition
```typescript
const stateCount = contestants.filter(c => c.certificates.state?.length > 0).length
```

### Sub-Categories
**Penyertaan (Participation)**:
```typescript
const penyertaanCount = contestants.filter(c => 
  c.certificates.state?.some(cert => cert.targetType === 'EVENT_PARTICIPANT')
).length
```

**Pencapaian (Achievement)**:
```typescript
const pencapaianCount = contestants.filter(c => 
  c.certificates.state?.some(cert => cert.targetType === 'EVENT_WINNER')
).length
```

### Criteria
- **Event Scope Area**: `'ZONE'`
- **Certificate Status**: `'READY'` or `'LISTED'`
- **Matching**: By contingent ID (`ownership.contingentId`) AND IC number
- **Target Types**: 
  - `'EVENT_PARTICIPANT'` (Penyertaan)
  - `'EVENT_WINNER'` (Pencapaian)
- **Count**: Number of contestants who have at least 1 state certificate

### SQL Query
```sql
SELECT * FROM certificate c
INNER JOIN cert_template ct ON c.templateId = ct.id
LEFT JOIN event e ON ct.eventId = e.id
WHERE c.status IN ('READY', 'LISTED')
  AND JSON_EXTRACT(c.ownership, '$.contingentId') = ${contestant.contingent.id}
  AND c.ic_number = ${contestant.ic}
  AND e.scopeArea = 'ZONE'
```

### Breakdown
- Filters from `zoneNationalCertificates` where `scopeArea === 'ZONE'`
- A contestant can have multiple state certificates
- Must have `status = 'READY'` or `'LISTED'`

---

## 3. Sijil Online (Online Certificate)

### Count Condition
```typescript
const onlineCount = contestants.filter(c => c.certificates.online?.length > 0).length
```

### Sub-Categories
**Penyertaan (Participation)**:
```typescript
const penyertaanCount = contestants.filter(c => 
  c.certificates.online?.some(cert => cert.targetType === 'EVENT_PARTICIPANT')
).length
```

**Pencapaian (Achievement)**:
```typescript
const pencapaianCount = contestants.filter(c => 
  c.certificates.online?.some(cert => cert.targetType === 'EVENT_WINNER')
).length
```

### Criteria
- **Event Scope Area**: `'ONLINE_STATE'`
- **Certificate Status**: `'READY'` or `'LISTED'`
- **Matching**: By contingent ID (`ownership.contingentId`) AND IC number
- **Target Types**: 
  - `'EVENT_PARTICIPANT'` (Penyertaan)
  - `'EVENT_WINNER'` (Pencapaian)
- **Count**: Number of contestants who have at least 1 online certificate

### SQL Query
```sql
SELECT * FROM certificate c
INNER JOIN cert_template ct ON c.templateId = ct.id
LEFT JOIN event e ON ct.eventId = e.id
WHERE c.status IN ('READY', 'LISTED')
  AND JSON_EXTRACT(c.ownership, '$.contingentId') = ${contestant.contingent.id}
  AND c.ic_number = ${contestant.ic}
  AND e.scopeArea = 'ONLINE_STATE'
```

### Breakdown
- Filters from `zoneNationalCertificates` where `scopeArea === 'ONLINE_STATE'`
- A contestant can have multiple online certificates
- Must have `status = 'READY'` or `'LISTED'`

---

## 4. Sijil Kebangsaan (National Certificate)

### Count Condition
```typescript
const nationalCount = contestants.filter(c => c.certificates.national?.length > 0).length
```

### Sub-Categories
**Penyertaan (Participation)**:
```typescript
const penyertaanCount = contestants.filter(c => 
  c.certificates.national?.some(cert => cert.targetType === 'EVENT_PARTICIPANT')
).length
```

**Pencapaian (Achievement)**:
```typescript
const pencapaianCount = contestants.filter(c => 
  c.certificates.national?.some(cert => cert.targetType === 'EVENT_WINNER')
).length
```

### Criteria
- **Event Scope Area**: `'NATIONAL'`
- **Certificate Status**: `'READY'` or `'LISTED'`
- **Matching**: By contingent ID (`ownership.contingentId`) AND IC number
- **Target Types**: 
  - `'EVENT_PARTICIPANT'` (Penyertaan)
  - `'EVENT_WINNER'` (Pencapaian)
- **Count**: Number of contestants who have at least 1 national certificate

### SQL Query
```sql
SELECT * FROM certificate c
INNER JOIN cert_template ct ON c.templateId = ct.id
LEFT JOIN event e ON ct.eventId = e.id
WHERE c.status IN ('READY', 'LISTED')
  AND JSON_EXTRACT(c.ownership, '$.contingentId') = ${contestant.contingent.id}
  AND c.ic_number = ${contestant.ic}
  AND e.scopeArea = 'NATIONAL'
```

### Breakdown
- Filters from `zoneNationalCertificates` where `scopeArea === 'NATIONAL'`
- A contestant can have multiple national certificates
- Must have `status = 'READY'` or `'LISTED'`

---

## 5. Sijil Kuiz (Quiz Certificate)

### Count Condition
```typescript
const quizCount = contestants.filter(c => c.certificates.quiz?.length > 0).length
```

### Sub-Categories
**Penyertaan (Participation)**:
```typescript
const penyertaanCount = contestants.filter(c => 
  c.certificates.quiz?.some(cert => cert.targetType === 'QUIZ_PARTICIPANT')
).length
```

**Pencapaian (Achievement)**:
```typescript
const pencapaianCount = contestants.filter(c => 
  c.certificates.quiz?.some(cert => cert.targetType === 'QUIZ_WINNER')
).length
```

### Criteria
- **Template Target Type**: `'QUIZ_PARTICIPANT'` or `'QUIZ_WINNER'`
- **Certificate Status**: `'READY'` or `'LISTED'`
- **Matching**: By IC number (`ic_number`) only
- **Target Types**: 
  - `'QUIZ_PARTICIPANT'` (Penyertaan)
  - `'QUIZ_WINNER'` (Pencapaian)
- **Count**: Number of contestants who have at least 1 quiz certificate

### SQL Query
```sql
SELECT * FROM certificate c
INNER JOIN cert_template ct ON c.templateId = ct.id
WHERE c.status IN ('READY', 'LISTED')
  AND c.ic_number = ${contestant.ic}
  AND ct.targetType IN ('QUIZ_PARTICIPANT', 'QUIZ_WINNER')
```

### Breakdown
- Separate query from zone/national certificates
- A contestant can have multiple quiz certificates
- Must have `status = 'READY'` or `'LISTED'`

---

## Certificate Status Values

The `certificate.status` field can have these values:
- `'DRAFT'` - Certificate not ready (not counted)
- `'READY'` - Certificate ready for viewing/download ✅ **COUNTED**
- `'LISTED'` - Certificate listed/pre-generated ✅ **COUNTED**
- Other possible statuses (not counted)

### Impact of Status
- **`status = 'READY'`**: Certificate is counted and displayed ✅
- **`status = 'LISTED'`**: Certificate is counted and displayed ✅
- **`status = 'DRAFT'`**: Certificate is ignored (not counted, not displayed) ❌
- **Other statuses**: Certificate is ignored (not counted, not displayed) ❌

---

## Summary Table

| Certificate Type | Scope Area | Target Types | Matching Criteria | Status Required |
|-----------------|------------|--------------|-------------------|-----------------|
| **Sekolah** (School) | N/A | `GENERAL` | IC number | `READY` or `LISTED` |
| **Negeri** (State) | `ZONE` | `EVENT_PARTICIPANT`, `EVENT_WINNER` | Contingent ID + IC | `READY` or `LISTED` |
| **Online** | `ONLINE_STATE` | `EVENT_PARTICIPANT`, `EVENT_WINNER` | Contingent ID + IC | `READY` or `LISTED` |
| **Kebangsaan** (National) | `NATIONAL` | `EVENT_PARTICIPANT`, `EVENT_WINNER` | Contingent ID + IC | `READY` or `LISTED` |
| **Kuiz** (Quiz) | N/A | `QUIZ_PARTICIPANT`, `QUIZ_WINNER` | IC number | `READY` or `LISTED` |

---

## Key Takeaways

### 1. Status is Critical
- Certificates must have `status = 'READY'` **OR** `status = 'LISTED'` to be counted
- Certificates with `status = 'DRAFT'` or other statuses are completely ignored

### 2. Grouping Logic
- **School**: Based on `targetType = 'GENERAL'`
- **State/Online/National**: Based on `event.scopeArea` from linked event
- **Quiz**: Based on `targetType` starting with `'QUIZ_'`

### 3. Matching Rules
- **School & Quiz**: Match by IC number only
- **State/Online/National**: Match by both contingent ID (from ownership JSON) AND IC number

### 4. Multiple Certificates
- **School**: Only first certificate counted (max 1 per contestant)
- **State/Online/National/Quiz**: All certificates counted (can have multiple)

### 5. Sub-Category Counting
For State/Online/National/Quiz, the page shows:
- **Total count**: Contestants with at least 1 certificate of that type
- **Penyertaan**: Contestants with at least 1 `EVENT_PARTICIPANT`/`QUIZ_PARTICIPANT` certificate
- **Pencapaian**: Contestants with at least 1 `EVENT_WINNER`/`QUIZ_WINNER` certificate

---

## Code References

### Frontend
**File**: `/src/app/participants/contestants/certificates/page.tsx`
- Lines 718-724: School certificate count
- Lines 746-759: State certificate count with subcategories
- Lines 795-808: Online certificate count with subcategories
- Lines 844-857: National certificate count with subcategories
- Lines 893-906: Quiz certificate count with subcategories

### Backend API
**File**: `/src/app/api/participants/contestants/certificates/route.ts`
- Lines 94-111: School certificates query (`status IN ('READY', 'LISTED')`, `targetType = 'GENERAL'`)
- Lines 114-144: Zone/National certificates query (`status IN ('READY', 'LISTED')`, `scopeArea IN (...)`)
- Lines 147-173: Quiz certificates query (`status IN ('READY', 'LISTED')`, `targetType IN (...)`)
- Lines 200-210: Certificate grouping logic by scopeArea and targetType

**Key Changes Made**:
- Line 97: Changed `status: 'READY'` to `status: { in: ['READY', 'LISTED'] }`
- Line 140: Changed `WHERE c.status = 'READY'` to `WHERE c.status IN ('READY', 'LISTED')`
- Line 170: Changed `WHERE c.status = 'READY'` to `WHERE c.status IN ('READY', 'LISTED')`

---

## Example Scenarios

### Scenario 1: Contestant with Certificates
```
Contestant: Ahmad (IC: 123456)
Contingent ID: 50

Certificates in Database:
1. cert_id: 1, status: 'READY', targetType: 'GENERAL' ✅ Counted as School
2. cert_id: 2, status: 'LISTED', event.scopeArea: 'ZONE', targetType: 'EVENT_PARTICIPANT' ✅ Counted as State (Penyertaan)
3. cert_id: 3, status: 'DRAFT', event.scopeArea: 'ZONE', targetType: 'EVENT_WINNER' ❌ NOT counted (status DRAFT)
4. cert_id: 4, status: 'READY', targetType: 'QUIZ_PARTICIPANT' ✅ Counted as Quiz (Penyertaan)

Result:
- Sijil Sekolah: 1
- Sijil Negeri: 1 (1 Penyertaan, 0 Pencapaian)
- Sijil Online: 0
- Sijil Kebangsaan: 0
- Sijil Kuiz: 1 (1 Penyertaan, 0 Pencapaian)

Note: Certificate #2 with 'LISTED' status is counted just like 'READY' status.
```

### Scenario 2: Multiple State Certificates
```
Contestant: Fatimah (IC: 654321)
Contingent ID: 75

Certificates in Database:
1. cert_id: 10, status: 'READY', event.scopeArea: 'ZONE', targetType: 'EVENT_PARTICIPANT'
2. cert_id: 11, status: 'READY', event.scopeArea: 'ZONE', targetType: 'EVENT_WINNER'
3. cert_id: 12, status: 'READY', event.scopeArea: 'ZONE', targetType: 'EVENT_WINNER'

Result:
- Sijil Negeri: 1 contestant (has 3 certificates: 1 Penyertaan, 2 Pencapaian)
- The count shows "1" because it counts contestants, not individual certificates
- Breakdown: Penyertaan: 1, Pencapaian: 1 (contestant has at least one of each)
```

---

## Troubleshooting

### Certificate Not Showing Up?
Check these conditions in order:

1. **Status**: Is `certificate.status = 'READY'` or `'LISTED'`?
   - ✅ `'READY'` - Will show
   - ✅ `'LISTED'` - Will show
   - ❌ `'DRAFT'` - Will NOT show
   - ❌ Other values - Will NOT show
2. **IC Match**: Does `certificate.ic_number` match contestant IC?
3. **Template**: 
   - School: Is `cert_template.targetType = 'GENERAL'`?
   - Quiz: Is `cert_template.targetType` = `'QUIZ_PARTICIPANT'` or `'QUIZ_WINNER'`?
4. **For State/Online/National**:
   - Does `event.scopeArea` match (`'ZONE'`, `'ONLINE_STATE'`, or `'NATIONAL'`)?
   - Does `certificate.ownership.contingentId` match contestant's contingent?
5. **Template has Event**: For State/Online/National, template must be linked to an event

### Count Mismatch?
- Remember: The count is **number of contestants**, not number of certificates
- One contestant with 5 state certificates = counted as "1" in the state count
- Check if multiple contestants share the same IC number (edge case)

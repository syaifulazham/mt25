# CONTINGENT Certificate Type Implementation

## Overview
Added 'CONTINGENT' as a new certificate type to support team/group level certificates in the Malaysia Techlympics 2025 platform.

## Date
November 18, 2025

## Changes Made

### 1. Database Schema (Prisma)
**File:** `/prisma/schema.prisma`

Updated `CertTemplateTargetType` enum:
```prisma
enum CertTemplateTargetType {
  GENERAL
  EVENT_PARTICIPANT
  EVENT_WINNER
  NON_CONTEST_PARTICIPANT
  QUIZ_PARTICIPANT
  QUIZ_WINNER
  TRAINERS
  CONTINGENT  // ← NEW
}
```

### 2. Frontend UI
**File:** `/src/app/organizer/certificates/_components/TemplateEditorFixed.tsx`

#### Added Radio Button (Lines ~1533-1543):
```typescript
<label className="inline-flex items-center">
  <input 
    type="radio" 
    name="targetType"
    value="CONTINGENT" 
    checked={targetType === 'CONTINGENT'}
    onChange={() => setTargetType('CONTINGENT')}
    className="h-4 w-4 text-blue-600"
  />
  <span className="ml-2">Contingent</span>
</label>
```

#### Updated TypeScript Type (Line 238):
```typescript
const [targetType, setTargetType] = useState<
  'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 
  'NON_CONTEST_PARTICIPANT' | 'QUIZ_PARTICIPANT' | 
  'QUIZ_WINNER' | 'TRAINERS' | 'CONTINGENT'
>(template?.targetType || 'GENERAL')
```

#### Updated Target Audience Summary (Lines ~1642-1643):
```typescript
{targetType === 'TRAINERS' && 'Trainers and instructors'}
{targetType === 'CONTINGENT' && 'Contingents (team/group level certificates)'}
```

### 3. TypeScript Interfaces
**File:** `/src/lib/interfaces/certificate-interfaces.ts`

Updated both `TemplateCreateParams` and `TemplateUpdateParams`:
```typescript
export interface TemplateCreateParams {
  // ...
  targetType?: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 
               'NON_CONTEST_PARTICIPANT' | 'QUIZ_PARTICIPANT' | 
               'QUIZ_WINNER' | 'TRAINERS' | 'CONTINGENT';
  // ...
}
```

### 4. Validation Schemas
**File:** `/src/lib/validations/template-schemas.ts`

#### Updated Enum (Line 69):
```typescript
export const targetTypeEnum = z.enum([
  'GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER', 
  'NON_CONTEST_PARTICIPANT', 'QUIZ_PARTICIPANT', 
  'QUIZ_WINNER', 'TRAINERS', 'CONTINGENT'
])
```

#### Updated Query Schema (Line 63):
```typescript
targetType: z.string().nullable().optional().refine(
  (val) => !val || ['GENERAL', 'EVENT_PARTICIPANT', 'EVENT_WINNER', 
                     'NON_CONTEST_PARTICIPANT', 'QUIZ_PARTICIPANT', 
                     'QUIZ_WINNER', 'TRAINERS', 'CONTINGENT'].includes(val),
  { message: 'Invalid target type' }
)
```

### 5. Service Layer
**File:** `/src/lib/services/template-service.ts`

Updated type definitions (Lines 24, 40):
```typescript
export type TemplateCreateParams = {
  // ...
  targetType: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 
              'NON_CONTEST_PARTICIPANT' | 'QUIZ_PARTICIPANT' | 
              'QUIZ_WINNER' | 'TRAINERS' | 'CONTINGENT'
  // ...
}
```

### 6. Serial Number Service
**File:** `/src/lib/services/certificate-serial-service.ts`

#### Updated Type (Line 6):
```typescript
type CertTargetType = 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 
                      'NON_CONTEST_PARTICIPANT' | 'QUIZ_PARTICIPANT' | 
                      'QUIZ_WINNER' | 'TRAINERS' | 'CONTINGENT';
```

#### Added Type Code (Lines 15-24):
```typescript
private static readonly TYPE_CODE_MAP: Record<string, string> = {
  'GENERAL': 'GEN',
  'EVENT_PARTICIPANT': 'PART',
  'EVENT_WINNER': 'WIN',
  'NON_CONTEST_PARTICIPANT': 'NCP',
  'QUIZ_PARTICIPANT': 'QPART',
  'QUIZ_WINNER': 'QWIN',
  'TRAINERS': 'TRAIN',
  'CONTINGENT': 'CONT'  // ← NEW
};
```

### 7. Duplicate Template Modal
**File:** `/src/app/organizer/certificates/_components/DuplicateTemplateModal.tsx`

#### Updated Template Interface (Line 9):
```typescript
interface Template {
  id: number
  templateName: string
  targetType?: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 
                'NON_CONTEST_PARTICIPANT' | 'QUIZ_PARTICIPANT' | 
                'QUIZ_WINNER' | 'TRAINERS' | 'CONTINGENT'
  // ... other fields
}
```

#### Added Dropdown Option (Line 170):
```typescript
<select>
  <option value="GENERAL">General</option>
  <option value="EVENT_PARTICIPANT">Event Participant</option>
  <option value="EVENT_WINNER">Event Winner</option>
  <option value="NON_CONTEST_PARTICIPANT">Non-Contest Participant</option>
  <option value="QUIZ_PARTICIPANT">Quiz Participant</option>
  <option value="QUIZ_WINNER">Quiz Winner</option>
  <option value="TRAINERS">Trainers</option>
  <option value="CONTINGENT">Contingent</option>  // ← NEW
</select>
```

#### Updated Reset Logic (Line 154):
```typescript
// Reset related fields when changing target type
if (e.target.value === 'GENERAL' || 
    e.target.value === 'NON_CONTEST_PARTICIPANT' || 
    e.target.value === 'TRAINERS' || 
    e.target.value === 'CONTINGENT') {  // ← Added CONTINGENT
  setEventId(null)
  setQuizId(null)
  setWinnerRangeStart(null)
  setWinnerRangeEnd(null)
}
```

#### Added Description (Line 266):
```typescript
{targetType === 'TRAINERS' && 'Trainers and instructors'}
{targetType === 'CONTINGENT' && 'Contingents (team/group level certificates)'}
```

## Database Migration Required

### MySQL Migration Script
**File:** `/add-contingent-certificate-type.sql`

```sql
-- Add CONTINGENT to cert_template targetType enum
ALTER TABLE cert_template 
MODIFY COLUMN targetType ENUM(
  'GENERAL',
  'EVENT_PARTICIPANT',
  'EVENT_WINNER',
  'NON_CONTEST_PARTICIPANT',
  'QUIZ_PARTICIPANT',
  'QUIZ_WINNER',
  'TRAINERS',
  'CONTINGENT'
) NOT NULL DEFAULT 'GENERAL';

-- Update certificate_serial targetType enum
ALTER TABLE certificate_serial
MODIFY COLUMN targetType ENUM(
  'GENERAL',
  'EVENT_PARTICIPANT',
  'EVENT_WINNER',
  'NON_CONTEST_PARTICIPANT',
  'QUIZ_PARTICIPANT',
  'QUIZ_WINNER',
  'TRAINERS',
  'CONTINGENT'
) NOT NULL;
```

## Deployment Steps

### 1. Development Environment
```bash
# Regenerate Prisma Client (Already done)
npx prisma generate
```

### 2. Production Deployment
```bash
# 1. Apply database migration
mysql -u azham -p mtdb < add-contingent-certificate-type.sql

# 2. Deploy code to production

# 3. Restart application
pm2 restart mt25
```

## Serial Number Format

Contingent certificates will use the serial number format:
```
MT25/CONT/T{templateId}/{sequence}
```

Example: `MT25/CONT/T15/000001`

## Use Cases

### Contingent Certificate Features:
- **Team/Group Recognition**: Certificates issued at the contingent level rather than individual participants
- **Institutional Awards**: Recognition for schools, organizations, or institutions
- **Participation Certificates**: Group-level participation certificates for teams
- **Achievement Awards**: Team-based achievement recognition

### UI Display:
When creating a CONTINGENT certificate template:
- Radio button: "Contingent"
- Summary: "Contingents (team/group level certificates)"

## Testing Checklist

### Template Creation
- [ ] Navigate to `/organizer/certificates/templates/create`
- [ ] Verify 'Contingent' radio button appears under Certificate Type
- [ ] Select 'Contingent' radio button
- [ ] Verify summary shows "Contingents (team/group level certificates)"
- [ ] Save template and verify targetType is saved as 'CONTINGENT'

### Template Editing
- [ ] Edit existing template and verify CONTINGENT option works

### Template Duplication
- [ ] Go to template list and click "Duplicate" on any template
- [ ] Verify 'Contingent' appears as an option in Target Audience dropdown
- [ ] Select 'Contingent' from the dropdown
- [ ] Verify description shows "Contingents (team/group level certificates)"
- [ ] Complete duplication and verify CONTINGENT type is preserved

### Certificate Generation
- [ ] Test serial number generation for CONTINGENT certificates
- [ ] Verify serial format: MT25/CONT/T{id}/{sequence}

## Files Modified

1. ✅ `/prisma/schema.prisma` - Added CONTINGENT to enum
2. ✅ `/src/app/organizer/certificates/_components/TemplateEditorFixed.tsx` - UI and state
3. ✅ `/src/app/organizer/certificates/_components/DuplicateTemplateModal.tsx` - Duplicate template modal
4. ✅ `/src/lib/interfaces/certificate-interfaces.ts` - TypeScript interfaces
5. ✅ `/src/lib/validations/template-schemas.ts` - Validation schemas
6. ✅ `/src/lib/services/template-service.ts` - Service types
7. ✅ `/src/lib/services/certificate-serial-service.ts` - Serial number service
8. ✅ `add-contingent-certificate-type.sql` - Database migration script

## Prisma Client Status
✅ Generated successfully with new CONTINGENT enum value

## Notes

- The CONTINGENT certificate type is designed for group/team level recognition
- Serial number code: 'CONT' (4 characters)
- Backward compatible - existing certificates unaffected
- No event/quiz selection required for CONTINGENT type (similar to GENERAL)
- Can be extended in the future to link to specific contingent IDs if needed

## Related Documentation

- Certificate Serial Numbers: `/CERTIFICATE_SERIAL_NUMBERS.md`
- Certificate Bulk Generation: `/CERTIFICATE_BULK_GENERATION_EVENT_PARTICIPANTS.md`
- Certificate Template Prerequisites: `/CERTIFICATE_TEMPLATE_PREREQUISITES.md`

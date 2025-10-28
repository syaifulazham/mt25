# Quiz Certificate Feature

## Overview

Added support for quiz-based certificate templates, allowing organizers to create certificates for quiz participants and quiz winners.

## New Certificate Types

### 1. Quiz Participants
- **Target Type:** `QUIZ_PARTICIPANT`
- **Type Code:** `QPART`
- **Use Case:** Certificates for contestants who completed a quiz
- **Serial Number Format:** `MT25/QPART/T{templateId}/000001`

### 2. Quiz Winners
- **Target Type:** `QUIZ_WINNER`
- **Type Code:** `QWIN`
- **Use Case:** Certificates for top performers in a quiz
- **Serial Number Format:** `MT25/QWIN/T{templateId}/000001`
- **Additional Fields:** Winner range (e.g., ranks 1-3)

## Database Changes

### 1. Enum Update
```sql
ALTER TABLE cert_template 
MODIFY COLUMN targetType ENUM(
  'GENERAL',
  'EVENT_PARTICIPANT',
  'EVENT_WINNER',
  'NON_CONTEST_PARTICIPANT',
  'QUIZ_PARTICIPANT',    -- New
  'QUIZ_WINNER'          -- New
) DEFAULT 'GENERAL';
```

### 2. Add quizId Column
```sql
ALTER TABLE cert_template
ADD COLUMN quizId INT NULL AFTER eventId,
ADD INDEX idx_cert_template_quizId (quizId),
ADD CONSTRAINT fk_cert_template_quiz 
  FOREIGN KEY (quizId) REFERENCES quiz(id) 
  ON DELETE SET NULL;
```

### Migration Script

**File:** `add-quiz-certificate-support.sql`

```bash
mysql -u azham -p mtdb < add-quiz-certificate-support.sql
```

## Prisma Schema Changes

### CertTemplate Model
```prisma
model CertTemplate {
  // ... existing fields
  targetType  CertTemplateTargetType  @default(GENERAL)
  eventId     Int?
  quizId      Int?                    // New field
  // ... rest of fields
  
  event       event?                  @relation(...)
  quiz        quiz?                   @relation(...) // New relation
  
  @@index([quizId], map: "idx_cert_template_quizId") // New index
}
```

### CertTemplateTargetType Enum
```prisma
enum CertTemplateTargetType {
  GENERAL
  EVENT_PARTICIPANT
  EVENT_WINNER
  NON_CONTEST_PARTICIPANT
  QUIZ_PARTICIPANT  // New
  QUIZ_WINNER       // New
}
```

### Quiz Model
```prisma
model quiz {
  // ... existing fields
  certTemplates  CertTemplate[]  // New relation
}
```

## Code Changes

### 1. Serial Service (`certificate-serial-service.ts`)

**Type Codes Added:**
```typescript
private static readonly TYPE_CODE_MAP: Record<string, string> = {
  'GENERAL': 'GEN',
  'EVENT_PARTICIPANT': 'PART',
  'EVENT_WINNER': 'WIN',
  'NON_CONTEST_PARTICIPANT': 'NCP',
  'QUIZ_PARTICIPANT': 'QPART',  // New
  'QUIZ_WINNER': 'QWIN'          // New
};
```

**Type Definition:**
```typescript
type CertTargetType = 
  | 'GENERAL' 
  | 'EVENT_PARTICIPANT' 
  | 'EVENT_WINNER' 
  | 'NON_CONTEST_PARTICIPANT'
  | 'QUIZ_PARTICIPANT'   // New
  | 'QUIZ_WINNER';       // New
```

**Validation Pattern:**
```typescript
// Updated to include QPART and QWIN
const pattern = /^MT\d{2}\/(GEN|PART|WIN|NCP|QPART|QWIN)\/T\d+\/\d{6}$/;
```

### 2. Quizzes API (`/api/quizzes/route.ts`)

New endpoint to fetch published quizzes:

```typescript
GET /api/quizzes

Response:
[
  {
    id: 1,
    quiz_name: "Mathematics Quiz",
    description: "Basic math assessment",
    target_group: "SECONDARY",
    contestId: 5,
    contest: {
      name: "Math Competition",
      code: "MC2025"
    }
  },
  // ...
]
```

**Features:**
- Only returns published quizzes (`status: 'published'`)
- Includes contest information
- Ordered by quiz name
- Requires authentication

### 3. Template Editor (`TemplateEditorFixed.tsx`)

**State Additions:**
```typescript
const [quizId, setQuizId] = useState<number | null>(null)
const [quizzes, setQuizzes] = useState<{id: number, quiz_name: string}[]>([])
```

**Fetch Quizzes:**
```typescript
const fetchQuizzes = async () => {
  const response = await fetch('/api/quizzes')
  const data = await response.json()
  setQuizzes(data)
}
```

**Validation:**
```typescript
// Quiz certificates require quiz selection
if (targetType === 'QUIZ_PARTICIPANT' || targetType === 'QUIZ_WINNER') {
  if (!quizId) {
    setError('Please select a quiz for this certificate template')
    return
  }
}

// Quiz winners require range
if (targetType === 'QUIZ_WINNER') {
  if (!winnerRangeStart || winnerRangeStart < 1) {
    setError('Winner range start must be at least 1')
    return
  }
  // ...
}
```

**Save Logic:**
```typescript
{
  // ...
  targetType,
  eventId: (targetType === 'EVENT_PARTICIPANT' || targetType === 'EVENT_WINNER') 
    ? eventId : null,
  quizId: (targetType === 'QUIZ_PARTICIPANT' || targetType === 'QUIZ_WINNER') 
    ? quizId : null,
  winnerRangeStart: (targetType === 'EVENT_WINNER' || targetType === 'QUIZ_WINNER') 
    ? winnerRangeStart : null,
  winnerRangeEnd: (targetType === 'EVENT_WINNER' || targetType === 'QUIZ_WINNER') 
    ? winnerRangeEnd : null,
}
```

## UI Changes

### Template Creation Form

**New Radio Options:**
```tsx
<label className="inline-flex items-center">
  <input type="radio" name="targetType" value="QUIZ_PARTICIPANT" />
  <span>Quiz Participants</span>
</label>

<label className="inline-flex items-center">
  <input type="radio" name="targetType" value="QUIZ_WINNER" />
  <span>Quiz Winners</span>
</label>
```

**Quiz Selection Dropdown:**
```tsx
{(targetType === 'QUIZ_PARTICIPANT' || targetType === 'QUIZ_WINNER') && (
  <div>
    <label>Select Quiz</label>
    <select value={quizId || ''} onChange={(e) => setQuizId(...)}>
      <option value="">-- Select a Quiz --</option>
      {quizzes.map(quiz => (
        <option key={quiz.id} value={quiz.id}>
          {quiz.quiz_name}
        </option>
      ))}
    </select>
  </div>
)}
```

**Winner Range Fields:**
Shared between Event Winners and Quiz Winners:
```tsx
{(targetType === 'EVENT_WINNER' || targetType === 'QUIZ_WINNER') && (
  <div className="grid grid-cols-2 gap-4">
    <input type="number" placeholder="Winner Range Start" />
    <input type="number" placeholder="Winner Range End" />
  </div>
)}
```

**Help Text:**
```tsx
{targetType === 'QUIZ_PARTICIPANT' && quizId && 
  `Participants who completed ${quiz.quiz_name}`}
{targetType === 'QUIZ_WINNER' && quizId && winnerRangeStart && winnerRangeEnd && 
  `Top performers (ranks ${winnerRangeStart}-${winnerRangeEnd}) of ${quiz.quiz_name}`}
```

## Data Relationships

### Quiz Source
- **Table:** `quiz`
- **Key Fields:** `id`, `quiz_name`, `target_group`, `contestId`
- **Status Filter:** Only `status = 'published'` quizzes shown

### Quiz Participants
- **Table:** `quiz_attempt`
- **Fields:** `quizId`, `contestantId`, `score`, `submittedAt`
- **Use:** Determine who completed a quiz

### Certificate Generation Flow

```
1. Select "Quiz Participants" or "Quiz Winners"
   ↓
2. Choose a quiz from dropdown
   ↓
3. (For Winners) Set winner range (e.g., 1-3)
   ↓
4. Design certificate template
   ↓
5. Save template
   ↓
6. Generate certificates for:
   - Quiz Participants: All contestants in quiz_attempt
   - Quiz Winners: Top N performers by score
```

## Serial Number Examples

### Quiz Participant Certificates
```
Template ID: 15
Quiz: "Mathematics Quiz"

Serial Numbers:
MT25/QPART/T15/000001
MT25/QPART/T15/000002
MT25/QPART/T15/000003
```

### Quiz Winner Certificates
```
Template ID: 16
Quiz: "Science Challenge"
Winner Range: 1-3 (Top 3)

Serial Numbers:
MT25/QWIN/T16/000001  (1st place)
MT25/QWIN/T16/000002  (2nd place)
MT25/QWIN/T16/000003  (3rd place)
```

## Database Queries

### Find Quiz Templates
```sql
SELECT * FROM cert_template
WHERE targetType IN ('QUIZ_PARTICIPANT', 'QUIZ_WINNER')
  AND quizId IS NOT NULL;
```

### Get Templates for Specific Quiz
```sql
SELECT 
  ct.*,
  q.quiz_name,
  q.target_group
FROM cert_template ct
JOIN quiz q ON ct.quizId = q.id
WHERE ct.quizId = 5
  AND ct.status = 'ACTIVE';
```

### Count Certificates by Quiz
```sql
SELECT 
  q.quiz_name,
  COUNT(c.id) as cert_count
FROM certificate c
JOIN cert_template ct ON c.templateId = ct.id
JOIN quiz q ON ct.quizId = q.id
WHERE ct.targetType IN ('QUIZ_PARTICIPANT', 'QUIZ_WINNER')
GROUP BY q.id, q.quiz_name;
```

## Deployment Steps

### 1. Apply Database Migration
```bash
mysql -u azham -p mtdb < add-quiz-certificate-support.sql
```

### 2. Regenerate Prisma Client
```bash
npx prisma generate
```

### 3. Deploy Code
```bash
git add .
git commit -m "Add quiz certificate support"
git push
```

### 4. Restart Application
```bash
pm2 restart mt25
```

## Testing

### 1. Create Quiz Participant Certificate
1. Go to `/organizer/certificates/templates/create`
2. Select "Quiz Participants"
3. Choose a quiz from dropdown
4. Design certificate
5. Save template
6. Verify template appears in list with quiz name

### 2. Create Quiz Winner Certificate
1. Go to `/organizer/certificates/templates/create`
2. Select "Quiz Winners"
3. Choose a quiz from dropdown
4. Set winner range (e.g., 1-3)
5. Design certificate
6. Save template
7. Verify template stored with correct range

### 3. Verify Serial Numbers
```sql
-- Check newly generated certificates
SELECT serialNumber, recipientName
FROM certificate
WHERE serialNumber LIKE 'MT25/QPART%'
   OR serialNumber LIKE 'MT25/QWIN%'
ORDER BY serialNumber;
```

## Files Changed

### Database
- ✅ `add-quiz-certificate-support.sql` - Migration script

### Prisma
- ✅ `prisma/schema.prisma` - Added quizId, updated enum, added relations

### Backend Services
- ✅ `src/lib/services/certificate-serial-service.ts` - Added QPART/QWIN types

### APIs
- ✅ `src/app/api/quizzes/route.ts` - New endpoint for fetching quizzes

### Frontend Components
- ✅ `src/app/organizer/certificates/_components/TemplateEditorFixed.tsx` - Quiz UI and logic

### Documentation
- ✅ `QUIZ_CERTIFICATE_FEATURE.md` - This file

## Benefits

1. ✅ **Quiz Recognition**: Issue certificates for quiz participation
2. ✅ **Performance Awards**: Recognize top quiz performers
3. ✅ **Separate Tracking**: Quiz certificates have own serial sequences
4. ✅ **Flexible Ranges**: Define winner tiers (top 3, top 5, etc.)
5. ✅ **Reusable Templates**: Create templates for different quizzes
6. ✅ **Consistent API**: Uses same pattern as event certificates

## Future Enhancements

### Potential Features
1. **Auto-generate for Top Performers**: Automatically issue certificates to top N quiz takers
2. **Score Thresholds**: Issue certificates based on minimum scores
3. **Quiz Batches**: Generate certificates for multiple quizzes at once
4. **Performance Metrics**: Show quiz statistics on certificates
5. **Custom Placeholders**: Quiz-specific dynamic fields (score, rank, etc.)

## Summary

Quiz certificate support enables organizers to recognize quiz participants and winners with dedicated certificate templates. The feature integrates seamlessly with existing certificate infrastructure, using the same generation, serial numbering, and PDF rendering systems while adding quiz-specific selection and validation logic.

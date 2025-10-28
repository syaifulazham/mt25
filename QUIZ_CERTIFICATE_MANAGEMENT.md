# Quiz Certificate Management System

## Overview

Comprehensive system for managing quiz certificates with participant and winner certificate generation, plus quiz progression tracking.

## Database Schema Changes

### 1. Quiz Table - Add `nextQuizId`
```sql
ALTER TABLE quiz
ADD COLUMN nextQuizId INT NULL AFTER contestId,
ADD INDEX idx_quiz_nextQuizId (nextQuizId),
ADD CONSTRAINT fk_quiz_next_quiz 
  FOREIGN KEY (nextQuizId) REFERENCES quiz(id) 
  ON DELETE SET NULL;
```

**Purpose**: Define the next quiz level for contestant progression

### 2. New Table - `quiz_progression`
```sql
CREATE TABLE quiz_progression (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quizId INT NOT NULL,
  nextQuizId INT NOT NULL,
  contingentId INT NOT NULL,
  contestantId INT NOT NULL,
  progressedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (quizId) REFERENCES quiz(id) ON DELETE CASCADE,
  FOREIGN KEY (nextQuizId) REFERENCES quiz(id) ON DELETE CASCADE,
  FOREIGN KEY (contingentId) REFERENCES contingent(id) ON DELETE CASCADE,
  FOREIGN KEY (contestantId) REFERENCES contestant(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_contestant_quiz_progression (contestantId, quizId, nextQuizId)
);
```

**Purpose**: Track which contestants have progressed to next quiz level

## Features

### 1. Certificate Template Management

#### Template Types Added:
- `QUIZ_PARTICIPANT` - Certificates for quiz participants
- `QUIZ_WINNER` - Certificates for quiz winners

#### Template List Enhancements:
**For QUIZ_PARTICIPANT templates:**
- Button: "Manage Participants" (Purple)
- Links to: `/organizer/quizzes/[quizId]/result`

**For QUIZ_WINNER templates:**
- Button: "Manage Winners" (Indigo)
- Links to: `/organizer/quizzes/[quizId]/result/winners`

### 2. Quiz Results Page (`/organizer/quizzes/[id]/result`)

#### Enhanced Features:
**Headers:**
- Rank
- Contestant (with photo)
- Contingent
- Score
- Time Taken
- Actions

**Action Buttons (per contestant):**
1. **Generate Participation Cert**
   - Generates certificate based on QUIZ_PARTICIPANT template
   - Validates template exists for quiz
   - Creates certificate record with ownership

2. **Generate Achievement Cert**
   - Generates certificate based on QUIZ_WINNER template
   - Only available for winners within configured rank range
   - Uses winner-specific template

3. **Step to Next Level**
   - Progresses contestant to next quiz (if configured)
   - Creates `quiz_progression` record
   - Prevents duplicate progressions
   - Shows success/error feedback

### 3. Quiz Winners Page (`/organizer/quizzes/[id]/result/winners`)

**Purpose:** Focused view for managing winner certificates

**Features:**
- Filtered list showing only winners (configurable rank range)
- Bulk certificate generation options
- Winner-specific actions
- Progress tracking to next level

## Implementation Components

### Frontend Components

#### 1. Modified: `TemplateList.tsx`
```typescript
interface Template {
  // ... existing fields
  targetType: 'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER' | 
              'NON_CONTEST_PARTICIPANT' | 'QUIZ_PARTICIPANT' | 'QUIZ_WINNER'
  quizId: number | null
}
```

**New Buttons:**
- QUIZ_PARTICIPANT → Manage Participants
- QUIZ_WINNER → Manage Winners

#### 2. Enhanced: `/organizer/quizzes/[id]/result/page.tsx`
**New Actions Column:**
```tsx
<TableCell>
  <div className="flex gap-2">
    <Button onClick={() => generateParticipationCert(result)}>
      Participation Cert
    </Button>
    {isWinner(result.rank) && (
      <Button onClick={() => generateAchievementCert(result)}>
        Achievement Cert
      </Button>
    )}
    {hasNextQuiz && (
      <Button onClick={() => stepToNextLevel(result)}>
        Step to Next Level
      </Button>
    )}
  </div>
</TableCell>
```

#### 3. New: `/organizer/quizzes/[id]/result/winners/page.tsx`
Dedicated page for winner certificate management with:
- Filtered winner list
- Bulk actions
- Progression tracking

### Backend APIs

#### 1. Certificate Generation
**Endpoint:** `POST /api/organizer/quizzes/[quizId]/certificates/generate`

**Request Body:**
```json
{
  "contestantId": 123,
  "certificateType": "PARTICIPATION" | "ACHIEVEMENT",
  "templateId": 45
}
```

**Response:**
```json
{
  "success": true,
  "certificate": {
    "id": 789,
    "uniqueCode": "CERT-ABC123",
    "serialNumber": "MT25/QPART/T45/000001",
    "status": "READY"
  }
}
```

**Logic:**
1. Validate contestant attempted the quiz
2. Check template exists and matches quiz
3. Generate unique code and serial number
4. Create certificate with ownership
5. Return certificate details

#### 2. Progression API
**Endpoint:** `POST /api/organizer/quizzes/[quizId]/progress`

**Request Body:**
```json
{
  "contestantId": 123,
  "nextQuizId": 14
}
```

**Response:**
```json
{
  "success": true,
  "progression": {
    "id": 456,
    "quizId": 13,
    "nextQuizId": 14,
    "contestantId": 123,
    "progressedAt": "2025-10-29T00:00:00Z"
  }
}
```

**Logic:**
1. Validate quiz has nextQuizId configured
2. Check contestant hasn't already progressed
3. Create quiz_progression record
4. Return progression details

#### 3. Template Validation
**Endpoint:** `GET /api/organizer/quizzes/[quizId]/templates`

**Response:**
```json
{
  "participantTemplate": {
    "id": 45,
    "templateName": "Quiz Participation Certificate"
  },
  "winnerTemplate": {
    "id": 46,
    "templateName": "Quiz Achievement Certificate",
    "winnerRangeStart": 1,
    "winnerRangeEnd": 3
  },
  "nextQuiz": {
    "id": 14,
    "quiz_name": "Advanced Level Quiz"
  }
}
```

## User Workflows

### Workflow 1: Generate Participant Certificates
1. Go to `/organizer/certificates`
2. Find QUIZ_PARTICIPANT template
3. Click "Manage Participants"
4. View all quiz participants
5. Click "Generate Participation Cert" for contestant
6. System generates certificate
7. Certificate appears in contestant's profile

### Workflow 2: Generate Winner Certificates
1. Go to `/organizer/certificates`
2. Find QUIZ_WINNER template
3. Click "Manage Winners"
4. View top-ranked contestants
5. Click "Generate Achievement Cert" for winner
6. System generates winner certificate
7. Certificate includes rank/achievement details

### Workflow 3: Progress Contestant to Next Level
1. On quiz results page
2. Find contestant who passed
3. Click "Step to Next Level"
4. System creates progression record
5. Contestant is registered for next quiz
6. Visual feedback confirms progression

## Security & Validation

### Certificate Generation:
- ✅ Validate user has ADMIN/OPERATOR role
- ✅ Verify template exists and matches quiz
- ✅ Check contestant attempted quiz
- ✅ Prevent duplicate certificates
- ✅ Set proper ownership (year, contingent, contestant)

### Progression:
- ✅ Validate quiz has nextQuizId configured
- ✅ Check contestant completed current quiz
- ✅ Prevent duplicate progressions
- ✅ Validate contestant belongs to contingent

## Database Migration

### Apply Migration:
```bash
mysql -u azham -p mtdb < add-quiz-progression-support.sql
```

### Update Prisma:
```bash
npx prisma generate
```

### Verify:
```sql
-- Check nextQuizId column
DESCRIBE quiz;

-- Check quiz_progression table
DESCRIBE quiz_progression;

-- Verify indexes
SHOW INDEX FROM quiz WHERE Key_name = 'idx_quiz_nextQuizId';
```

## Prisma Schema Updates

### Quiz Model:
```prisma
model quiz {
  // ... existing fields
  nextQuizId        Int?
  nextQuiz          quiz?              @relation("QuizProgression", fields: [nextQuizId], references: [id])
  previousQuizzes   quiz[]             @relation("QuizProgression")
  progressionsFrom  quiz_progression[] @relation("ProgressionFromQuiz")
  progressionsTo    quiz_progression[] @relation("ProgressionToQuiz")
  
  @@index([nextQuizId], map: "idx_quiz_nextQuizId")
}
```

### New Model:
```prisma
model quiz_progression {
  id            Int        @id @default(autoincrement())
  quizId        Int
  nextQuizId    Int
  contingentId  Int
  contestantId  Int
  progressedAt  DateTime   @default(now())
  quiz          quiz       @relation("ProgressionFromQuiz", fields: [quizId], references: [id])
  nextQuiz      quiz       @relation("ProgressionToQuiz", fields: [nextQuizId], references: [id])
  contingent    contingent @relation(fields: [contingentId], references: [id])
  contestant    contestant @relation(fields: [contestantId], references: [id])
  
  @@unique([contestantId, quizId, nextQuizId])
  @@map("quiz_progression")
}
```

## Testing

### Test Certificate Generation:
1. Create QUIZ_PARTICIPANT template for quiz
2. Have contestant attempt quiz
3. Generate participation certificate
4. Verify certificate created with correct serial

### Test Winner Certificates:
1. Create QUIZ_WINNER template with rank range (1-3)
2. Have contestants complete quiz
3. Generate achievement certificates for top 3
4. Verify rank-based generation

### Test Progression:
1. Set nextQuizId on quiz A to quiz B
2. Complete quiz A
3. Click "Step to Next Level"
4. Verify progression record created
5. Verify contestant can access quiz B

## Benefits

1. ✅ **Automated Certificate Distribution**: Generate certificates directly from quiz results
2. ✅ **Winner Recognition**: Special certificates for top performers
3. ✅ **Progressive Quizzes**: Track contestant advancement through quiz levels
4. ✅ **Audit Trail**: Complete record of progressions and certificates
5. ✅ **Bulk Operations**: Generate certificates for multiple contestants
6. ✅ **Contingent Ownership**: Proper certificate ownership tracking

## Future Enhancements

1. **Bulk Certificate Generation**: Generate for all participants at once
2. **Automatic Progression**: Auto-progress contestants who meet criteria
3. **Email Notifications**: Notify contestants of new certificates
4. **Progression Requirements**: Set score/time thresholds for advancement
5. **Certificate Templates**: Quiz-specific placeholder fields (score, rank, time)
6. **Progress Dashboard**: Visual tracking of contestant quiz journeys

## Files Modified/Created

### Database:
- ✅ `add-quiz-progression-support.sql` - Migration script

### Schema:
- ✅ `prisma/schema.prisma` - Added nextQuizId, quiz_progression model

### Frontend:
- ✅ `src/app/organizer/certificates/_components/TemplateList.tsx` - Added quiz buttons
- ⏳ `src/app/organizer/quizzes/[id]/result/page.tsx` - Add actions column
- ⏳ `src/app/organizer/quizzes/[id]/result/winners/page.tsx` - New winners page

### Backend:
- ⏳ `src/app/api/organizer/quizzes/[quizId]/certificates/generate/route.ts` - Certificate generation
- ⏳ `src/app/api/organizer/quizzes/[quizId]/progress/route.ts` - Progression tracking
- ⏳ `src/app/api/organizer/quizzes/[quizId]/templates/route.ts` - Template validation

### Services:
- ⏳ Update certificate serial service for quiz certificates
- ⏳ Create quiz progression service

## Deployment Checklist

- [ ] Apply database migration
- [ ] Regenerate Prisma client
- [ ] Test certificate generation
- [ ] Test progression tracking
- [ ] Verify frontend buttons work
- [ ] Check API permissions
- [ ] Test bulk operations
- [ ] Validate serial number generation
- [ ] Review security checks
- [ ] Document for users

---

**Status:** Phase 1 Complete (Schema & Template List)
**Next:** Implement certificate generation APIs and result page actions

# Quiz Certificate Management - Implementation Summary

## ✅ Phase 1: Database & Schema (COMPLETE)

### Database Migration Applied
```bash
mysql -u azham -p mtdb < add-quiz-progression-support.sql
```

**Changes:**
- ✅ Added `nextQuizId` column to `quiz` table
- ✅ Created `quiz_progression` table
- ✅ Added indexes and foreign keys
- ✅ Prisma client regenerated

### Prisma Schema Updated
- ✅ `quiz` model: Added `nextQuizId`, self-relation, and progression relations
- ✅ `quiz_progression` model: New model created
- ✅ `contingent` model: Added `quizProgressions` relation
- ✅ `contestant` model: Added `quizProgressions` relation

## ✅ Phase 2: Backend APIs (COMPLETE)

### 1. Certificate Generation API
**File:** `/src/app/api/organizer/quizzes/[quizId]/certificates/generate/route.ts`

**Features:**
- POST endpoint for generating certificates
- Auto-detects template based on certificate type
- Supports both PARTICIPATION and ACHIEVEMENT types
- Generates unique codes and serial numbers
- Sets ownership (year, contingent, contestant, quiz, score)
- Prevents duplicate certificates
- Returns certificate details

**Request:**
```json
{
  "contestantId": 123,
  "certificateType": "PARTICIPATION" | "ACHIEVEMENT",
  "templateId": 45 // optional
}
```

### 2. Progression Tracking API
**File:** `/src/app/api/organizer/quizzes/[quizId]/progress/route.ts`

**Features:**
- POST: Create progression record
- GET: List all progressions for quiz
- Validates quiz completion
- Prevents duplicate progressions
- Supports manual nextQuizId override
- Returns detailed progression info

### 3. Template Validation API
**File:** `/src/app/api/organizer/quizzes/[quizId]/templates/route.ts`

**Features:**
- GET endpoint
- Returns participant template info
- Returns winner template info (with rank range)
- Returns next quiz info if configured
- Returns progression statistics

## ✅ Phase 3: Frontend Updates (COMPLETE)

### Certificate Template List
**File:** `/src/app/organizer/certificates/_components/TemplateList.tsx`

**Changes:**
- ✅ Added `QUIZ_PARTICIPANT` and `QUIZ_WINNER` to template types
- ✅ Added `quizId` field to Template interface
- ✅ Added "Manage Participants" button (Purple) for QUIZ_PARTICIPANT
  - Links to `/organizer/quizzes/[quizId]/result`
- ✅ Added "Manage Winners" button (Indigo) for QUIZ_WINNER
  - Links to `/organizer/quizzes/[quizId]/result/winners`

## ⏳ Phase 4: Quiz Results Page (TO DO)

### File to Update
`/src/app/organizer/quizzes/[id]/result/page.tsx`

### Required Changes

#### 1. Add State Variables
```typescript
const [templates, setTemplates] = useState<any>(null);
const [generatingCert, setGeneratingCert] = useState<number | null>(null);
const [progressing, setProgressing] = useState<number | null>(null);
```

#### 2. Fetch Templates on Mount
```typescript
useEffect(() => {
  fetchTemplates();
}, [quizId]);

const fetchTemplates = async () => {
  const response = await fetch(`/api/organizer/quizzes/${quizId}/templates`);
  const data = await response.json();
  setTemplates(data);
};
```

#### 3. Update Table Header
Change line 379 from:
```tsx
<TableHead></TableHead>
```
To:
```tsx
<TableHead className="text-right">Actions</TableHead>
```

#### 4. Replace Details Button Cell
Replace lines 445-456 with comprehensive actions:

```tsx
<TableCell className="text-right">
  <div className="flex items-center justify-end gap-2">
    {/* Participation Certificate */}
    {templates?.templates?.participant && (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleGenerateParticipationCert(result)}
        disabled={generatingCert === result.contestantId}
      >
        {generatingCert === result.contestantId ? 'Generating...' : 'Participation Cert'}
      </Button>
    )}

    {/* Achievement Certificate (for winners only) */}
    {templates?.templates?.winner && 
     result.rank >= (templates.templates.winner.winnerRangeStart || 1) &&
     result.rank <= (templates.templates.winner.winnerRangeEnd || 3) && (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleGenerateAchievementCert(result)}
        disabled={generatingCert === result.contestantId}
      >
        {generatingCert === result.contestantId ? 'Generating...' : 'Achievement Cert'}
      </Button>
    )}

    {/* Step to Next Level */}
    {templates?.nextQuiz && (
      <Button
        variant="default"
        size="sm"
        onClick={() => handleProgressToNext(result)}
        disabled={progressing === result.contestantId}
      >
        {progressing === result.contestantId ? 'Processing...' : 'Next Level'}
      </Button>
    )}

    {/* View Details */}
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => {
        setSelectedResult(result);
        setDetailsOpen(true);
      }}
    >
      Details
    </Button>
  </div>
</TableCell>
```

#### 5. Add Handler Functions

```typescript
const handleGenerateParticipationCert = async (result: QuizResult) => {
  try {
    setGeneratingCert(result.contestantId);
    
    const response = await fetch(
      `/api/organizer/quizzes/${quizId}/certificates/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contestantId: result.contestantId,
          certificateType: 'PARTICIPATION'
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate certificate');
    }

    alert(`Certificate generated successfully!\nSerial: ${data.certificate.serialNumber}`);
  } catch (error) {
    console.error('Error generating certificate:', error);
    alert(error instanceof Error ? error.message : 'Failed to generate certificate');
  } finally {
    setGeneratingCert(null);
  }
};

const handleGenerateAchievementCert = async (result: QuizResult) => {
  try {
    setGeneratingCert(result.contestantId);
    
    const response = await fetch(
      `/api/organizer/quizzes/${quizId}/certificates/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contestantId: result.contestantId,
          certificateType: 'ACHIEVEMENT'
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate certificate');
    }

    alert(`Achievement certificate generated!\nSerial: ${data.certificate.serialNumber}\nAward: ${data.certificate.awardTitle}`);
  } catch (error) {
    console.error('Error generating certificate:', error);
    alert(error instanceof Error ? error.message : 'Failed to generate certificate');
  } finally {
    setGeneratingCert(null);
  }
};

const handleProgressToNext = async (result: QuizResult) => {
  if (!templates?.nextQuiz) return;

  const confirmed = confirm(
    `Progress ${result.contestantName} to ${templates.nextQuiz.quiz_name}?`
  );

  if (!confirmed) return;

  try {
    setProgressing(result.contestantId);
    
    const response = await fetch(
      `/api/organizer/quizzes/${quizId}/progress`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contestantId: result.contestantId
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to progress contestant');
    }

    alert(`${result.contestantName} has been progressed to ${templates.nextQuiz.quiz_name}!`);
  } catch (error) {
    console.error('Error progressing contestant:', error);
    alert(error instanceof Error ? error.message : 'Failed to progress contestant');
  } finally {
    setProgressing(null);
  }
};
```

## ⏳ Phase 5: Winners Sub-Page (TO DO)

### File to Create
`/src/app/organizer/quizzes/[id]/result/winners/page.tsx`

### Features
- Filter results to show only winners (within configured rank range)
- Display winner-specific information
- Bulk certificate generation
- Bulk progression
- Winner statistics

### Basic Structure
```typescript
export default function QuizWinnersPage({ params }: { params: { id: string } }) {
  // Filter to show only winners based on template's winnerRangeStart/End
  // Show bulk actions
  // Display winner badges prominently
}
```

## 🔧 Known Issues & Notes

### TypeScript Errors (Expected)
The following TypeScript errors are expected until dev server restarts:
- `Property 'nextQuizId' does not exist on type 'quiz'`
- `Property 'quiz_progression' does not exist on type 'PrismaClient'`
- `Type '"QUIZ_PARTICIPANT"' is not assignable...`

**Resolution:** Restart dev server (`npm run dev`)

### Required After Implementation
1. Restart dev server
2. Test certificate generation
3. Test progression tracking
4. Verify serial number generation
5. Check ownership data

## 📝 Testing Checklist

### Certificate Generation
- [ ] Generate participation certificate for contestant
- [ ] Verify serial number format (MT25/QPART/T{id}/000001)
- [ ] Check ownership data includes quizId and score
- [ ] Verify prevents duplicate generation
- [ ] Test achievement certificate for winner
- [ ] Check rank/award title is set correctly

### Progression
- [ ] Progress contestant to next quiz
- [ ] Verify progression record created
- [ ] Check prevents duplicate progressions
- [ ] Test when no nextQuizId configured
- [ ] Verify contestant hasn't completed quiz shows error

### UI
- [ ] Buttons appear on quiz results page
- [ ] Purple "Manage Participants" on template list
- [ ] Indigo "Manage Winners" on template list
- [ ] Loading states work correctly
- [ ] Error messages display properly

## 🚀 Deployment Steps

1. ✅ Apply database migration
2. ✅ Regenerate Prisma client
3. ✅ Deploy backend APIs
4. ✅ Update frontend components
5. ⏳ Update quiz results page
6. ⏳ Create winners sub-page
7. ⏳ Restart dev server
8. ⏳ Test all features
9. ⏳ Deploy to production

## 📊 Progress Summary

**Complete:** 60%
- ✅ Database schema (100%)
- ✅ Backend APIs (100%)
- ✅ Template list updates (100%)
- ⏳ Quiz results page (0%)
- ⏳ Winners sub-page (0%)

**Remaining Work:**
- Update quiz results page with actions (2-3 hours)
- Create winners sub-page (1-2 hours)
- Testing and bug fixes (1 hour)
- Documentation updates (30 minutes)

**Total Time Invested:** ~3 hours
**Estimated Remaining:** ~5 hours

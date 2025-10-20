# Certificate Template Prerequisites

## Overview
The `cert_template` table now includes a `prerequisites` column to store prerequisite conditions that must be met before a certificate can be generated.

## Date Added
October 21, 2025

## Database Schema

### Column Details
- **Column Name**: `prerequisites`
- **Type**: `JSON`
- **Nullable**: `YES`
- **Default**: `NULL`

### Structure
```json
[
  {"prerequisite": "survey", "id": 1},
  {"prerequisite": "survey", "id": 2},
  {"prerequisite": "event_participation", "id": 5}
]
```

## Prerequisite Types

### Common Prerequisites
| Type | Description | Example |
|------|-------------|---------|
| `survey` | Survey completion required | `{"prerequisite": "survey", "id": 1}` |
| `event_participation` | Event participation required | `{"prerequisite": "event_participation", "id": 5}` |
| `contest_participation` | Contest entry required | `{"prerequisite": "contest_participation", "id": 3}` |
| `contest_completion` | Contest completion required | `{"prerequisite": "contest_completion", "id": 3}` |
| `payment` | Payment verification required | `{"prerequisite": "payment", "id": 2}` |
| `registration` | Registration required | `{"prerequisite": "registration", "id": 1}` |

## Usage Examples

### 1. Setting Prerequisites via SQL

```sql
-- Add prerequisites to a template
UPDATE cert_template 
SET prerequisites = '[{"prerequisite": "survey", "id": 1}, {"prerequisite": "survey", "id": 2}]'
WHERE id = 1;

-- Remove prerequisites
UPDATE cert_template 
SET prerequisites = NULL
WHERE id = 1;

-- Add single prerequisite
UPDATE cert_template 
SET prerequisites = '[{"prerequisite": "event_participation", "id": 5}]'
WHERE id = 2;
```

### 2. Creating Template with Prerequisites via Prisma

```typescript
// Create template with prerequisites
const template = await prisma.certTemplate.create({
  data: {
    templateName: "Survey Completion Certificate",
    basePdfPath: "/uploads/templates/survey-cert.pdf",
    configuration: templateConfig,
    status: "ACTIVE",
    targetType: "GENERAL",
    createdBy: userId,
    prerequisites: [
      { prerequisite: "survey", id: 1 },
      { prerequisite: "survey", id: 2 }
    ]
  }
});
```

### 3. Updating Prerequisites

```typescript
// Update template prerequisites
await prisma.certTemplate.update({
  where: { id: templateId },
  data: {
    prerequisites: [
      { prerequisite: "survey", id: 1 },
      { prerequisite: "event_participation", id: 5 }
    ]
  }
});
```

### 4. Querying Templates with Prerequisites

```typescript
// Get templates with prerequisites
const templatesWithPrereqs = await prisma.certTemplate.findMany({
  where: {
    prerequisites: {
      not: null
    }
  },
  select: {
    id: true,
    templateName: true,
    prerequisites: true
  }
});

console.log(templatesWithPrereqs);
// Output:
// [
//   {
//     id: 1,
//     templateName: "Survey Completion Certificate",
//     prerequisites: [
//       { prerequisite: "survey", id: 1 },
//       { prerequisite: "survey", id: 2 }
//     ]
//   }
// ]
```

## Checking Prerequisites Before Certificate Generation

### TypeScript Interface
```typescript
interface Prerequisite {
  prerequisite: string;
  id: number;
}

interface CertTemplate {
  id: number;
  templateName: string;
  prerequisites?: Prerequisite[] | null;
  // ... other fields
}
```

### Validation Function
```typescript
async function checkPrerequisites(
  contestantId: number,
  templateId: number
): Promise<{ met: boolean; missing: Prerequisite[] }> {
  // Get template with prerequisites
  const template = await prisma.certTemplate.findUnique({
    where: { id: templateId },
    select: { prerequisites: true }
  });

  if (!template?.prerequisites || template.prerequisites.length === 0) {
    return { met: true, missing: [] };
  }

  const prerequisites = template.prerequisites as Prerequisite[];
  const missing: Prerequisite[] = [];

  for (const prereq of prerequisites) {
    switch (prereq.prerequisite) {
      case 'survey':
        const surveyCompleted = await checkSurveyCompletion(contestantId, prereq.id);
        if (!surveyCompleted) missing.push(prereq);
        break;
        
      case 'event_participation':
        const eventParticipated = await checkEventParticipation(contestantId, prereq.id);
        if (!eventParticipated) missing.push(prereq);
        break;
        
      case 'contest_participation':
        const contestParticipated = await checkContestParticipation(contestantId, prereq.id);
        if (!contestParticipated) missing.push(prereq);
        break;
        
      // Add more prerequisite checks as needed
    }
  }

  return {
    met: missing.length === 0,
    missing
  };
}

// Helper functions
async function checkSurveyCompletion(contestantId: number, surveyId: number): Promise<boolean> {
  const response = await prisma.surveyResponse.findFirst({
    where: {
      contestantId,
      surveyId,
      completedAt: { not: null }
    }
  });
  return response !== null;
}

async function checkEventParticipation(contestantId: number, eventId: number): Promise<boolean> {
  const participation = await prisma.eventParticipation.findFirst({
    where: {
      contestantId,
      eventId
    }
  });
  return participation !== null;
}

async function checkContestParticipation(contestantId: number, contestId: number): Promise<boolean> {
  const participation = await prisma.contestParticipation.findFirst({
    where: {
      contestantId,
      contestId
    }
  });
  return participation !== null;
}
```

## Integration with Certificate Generation

### Updated Generation API
```typescript
// In /api/participants/contestants/[id]/generate-certificate/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contestantId = parseInt(params.id);
    const { templateId } = await request.json();

    // Check prerequisites before generating
    const prereqCheck = await checkPrerequisites(contestantId, templateId);
    
    if (!prereqCheck.met) {
      return NextResponse.json(
        {
          error: 'Prerequisites not met',
          missing: prereqCheck.missing,
          message: 'Please complete the required prerequisites before generating this certificate'
        },
        { status: 400 }
      );
    }

    // Proceed with certificate generation
    // ... existing generation code
  } catch (error) {
    // ... error handling
  }
}
```

### User Feedback
```typescript
// Frontend - display missing prerequisites
if (response.missing) {
  const messages = response.missing.map((p: Prerequisite) => {
    return `${p.prerequisite.replace('_', ' ')} (ID: ${p.id})`;
  });
  
  toast.error('Prerequisites not met', {
    description: `Missing: ${messages.join(', ')}`
  });
}
```

## UI Components

### Prerequisite Badge Display
```tsx
interface PrerequisiteBadgeProps {
  prerequisites: Prerequisite[] | null;
}

export function PrerequisiteBadge({ prerequisites }: PrerequisiteBadgeProps) {
  if (!prerequisites || prerequisites.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {prerequisites.map((prereq, index) => (
        <Badge key={index} variant="outline" className="text-xs">
          {prereq.prerequisite.replace('_', ' ')} #{prereq.id}
        </Badge>
      ))}
    </div>
  );
}
```

### Template Card with Prerequisites
```tsx
<Card>
  <CardHeader>
    <CardTitle>{template.templateName}</CardTitle>
    <PrerequisiteBadge prerequisites={template.prerequisites} />
  </CardHeader>
  <CardContent>
    {/* Template details */}
  </CardContent>
</Card>
```

## Database Queries

### Find Templates by Prerequisite Type
```sql
-- Find templates requiring surveys
SELECT id, templateName, prerequisites
FROM cert_template
WHERE JSON_CONTAINS(
  prerequisites,
  JSON_OBJECT('prerequisite', 'survey'),
  '$'
);

-- Find templates requiring specific survey
SELECT id, templateName, prerequisites
FROM cert_template
WHERE JSON_CONTAINS(
  prerequisites,
  JSON_OBJECT('prerequisite', 'survey', 'id', 1),
  '$'
);
```

### Count Prerequisites per Template
```sql
SELECT 
  id,
  templateName,
  JSON_LENGTH(prerequisites) as prerequisite_count
FROM cert_template
WHERE prerequisites IS NOT NULL;
```

## Migration

### File: `database-migration-cert-template-prerequisites.sql`
```sql
ALTER TABLE cert_template 
ADD COLUMN prerequisites JSON NULL 
COMMENT 'Array of prerequisite conditions in JSON format'
AFTER winnerRangeEnd;
```

### Prisma Schema
```prisma
model CertTemplate {
  // ... other fields
  prerequisites           Json?
  // ... relations
}
```

### Running Migration
```bash
# Run SQL migration
mysql -u azham -p mtdb < database-migration-cert-template-prerequisites.sql

# Update Prisma schema (already done)
# Regenerate Prisma client
npx prisma generate
```

## Use Cases

### 1. Survey Completion Certificate
Only issue certificate after completing specific surveys:
```json
[
  {"prerequisite": "survey", "id": 1},
  {"prerequisite": "survey", "id": 2}
]
```

### 2. Event Participation Certificate
Require event attendance:
```json
[
  {"prerequisite": "event_participation", "id": 5}
]
```

### 3. Contest Winner Certificate
Require contest participation and completion:
```json
[
  {"prerequisite": "contest_participation", "id": 3},
  {"prerequisite": "contest_completion", "id": 3}
]
```

### 4. Multi-Requirement Certificate
Combine multiple prerequisites:
```json
[
  {"prerequisite": "registration", "id": 1},
  {"prerequisite": "payment", "id": 1},
  {"prerequisite": "survey", "id": 1},
  {"prerequisite": "event_participation", "id": 5}
]
```

## API Response Examples

### Success Response
```json
{
  "success": true,
  "certificate": {
    "id": 123,
    "uniqueCode": "CERT-1729...",
    "serialNumber": "MT25/GEN/000001",
    "filePath": "/uploads/certificates/...",
    "status": "READY"
  },
  "message": "Certificate generated successfully"
}
```

### Prerequisites Not Met Response
```json
{
  "error": "Prerequisites not met",
  "missing": [
    {"prerequisite": "survey", "id": 1},
    {"prerequisite": "event_participation", "id": 5}
  ],
  "message": "Please complete the required prerequisites before generating this certificate"
}
```

## Testing

### Test Template Creation
```typescript
// Create test template with prerequisites
const template = await prisma.certTemplate.create({
  data: {
    templateName: "Test Certificate",
    configuration: {},
    status: "ACTIVE",
    targetType: "GENERAL",
    createdBy: 1,
    prerequisites: [
      { prerequisite: "survey", id: 1 }
    ]
  }
});

console.log('Template created:', template);
```

### Test Prerequisite Check
```typescript
const check = await checkPrerequisites(contestantId, templateId);
console.log('Prerequisites met:', check.met);
console.log('Missing prerequisites:', check.missing);
```

## Related Files

- `/prisma/schema.prisma` - Updated with prerequisites field
- `/database-migration-cert-template-prerequisites.sql` - Migration SQL
- `/src/app/api/participants/contestants/[id]/generate-certificate/route.ts` - Generation API

## Summary

The `prerequisites` JSON column enables flexible prerequisite tracking for certificate templates. It stores an array of prerequisite conditions that must be checked before certificate generation, ensuring certificates are only issued when requirements are met.

**Key Features:**
- ✅ Flexible JSON format supports any prerequisite type
- ✅ Multiple prerequisites per template
- ✅ Easy to add new prerequisite types
- ✅ Queryable using JSON functions
- ✅ Integrated with certificate generation flow

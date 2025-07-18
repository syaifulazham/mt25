
# Judging Template Evaluation System Design

## 1. Process Flow

```
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│   Tournament  │         │   Judging     │         │  Evaluation   │
│   Setup       │         │   Assignment  │         │  Process      │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ 1. Create     │         │ 3. Assign     │         │ 5. Judge opens│
│ judging       │         │ judges to     │         │ judging UI    │
│ template      │──┐      │ eventcontests │         │ for a team    │
└───────────────┘  │      └───────────────┘         └───────┬───────┘
                   │                                        │
┌───────────────┐  │      ┌───────────────┐         ┌───────▼───────┐
│ 2. Assign     │  │      │ 4. Teams      │         │ 6. System     │
│ template to   │◄─┘      │ register      │         │ creates       │
│ contest       │         │ attendance    │         │ judgingSession│
└───────────────┘         └───────────────┘         └───────┬───────┘
                                                            │
                                                    ┌───────▼───────┐
                                                    │ 7. Judge      │
                                                    │ evaluates each│
                                                    │ criterion     │
                                                    └───────┬───────┘
                                                            │
                          ┌───────────────┐         ┌───────▼───────┐
                          │ 9. Results    │         │ 8. System     │
                          │ tabulated     │◄────────│ calculates    │
                          │ across judges │         │ weighted score│
                          └───────────────┘         └───────────────┘
```

## 2. Database Models

### New Prisma Models

```prisma
model judgingSession {
  id                 Int                 @id @default(autoincrement())
  eventcontestId     Int
  attendanceTeamId   Int
  judgeId            Int
  status             String              @default("IN_PROGRESS") // IN_PROGRESS, COMPLETED, REJECTED
  totalScore         Float?
  feedback           String?
  startedAt          DateTime            @default(now())
  completedAt        DateTime?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  
  eventcontest       eventcontest        @relation(fields: [eventcontestId], references: [id])
  attendanceTeam     attendanceTeam      @relation(fields: [attendanceTeamId], references: [Id])
  judge              user                @relation(fields: [judgeId], references: [id])
  criteriaScores     judgingSessionScore[]
  
  @@index([eventcontestId])
  @@index([attendanceTeamId])
  @@index([judgeId])
  @@unique([eventcontestId, attendanceTeamId, judgeId])
}

model judgingSessionScore {
  id                 Int                 @id @default(autoincrement())
  sessionId          Int
  criteriaId         Int?                // Optional link to original template criteria
  criteriaName       String              // Store name to preserve even if template changes
  criteriaDescription String?
  evaluationType     String              // POINTS, TIME, DISCRETE_VALUE
  weight             Int
  score              Float?
  feedback           String?
  discreteValue      String?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  
  session            judgingSession      @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  
  @@index([sessionId])
}
```

## 3. API Endpoints

### 1. List Teams for Judging

**Endpoint:** `GET /api/judging/eventcontest/{eventcontestId}/teams`

**Purpose:** Retrieves attendanceTeams for a specific eventcontest with their judging status.

**Response:**
```json
{
  "teams": [
    {
      "id": 123,
      "hashcode": "team123",
      "teamName": "Team Alpha",
      "contingentName": "School XYZ",
      "attendanceStatus": "Present",
      "judging": {
        "status": "NOT_STARTED", // NOT_STARTED, IN_PROGRESS, COMPLETED
        "completedJudgeCount": 0,
        "totalJudgeCount": 3
      }
    },
    // More teams...
  ]
}
```

### 2. Create Judging Session

**Endpoint:** `POST /api/judging/sessions`

**Purpose:** Initiates a new judging session for a team.

**Request:**
```json
{
  "eventcontestId": 456,
  "attendanceTeamId": 123
}
```

**Response:**
```json
{
  "sessionId": 789,
  "teamName": "Team Alpha",
  "criteria": [
    {
      "id": 1,
      "name": "Technical Merit",
      "description": "Evaluation of technical complexity and implementation",
      "evaluationType": "POINTS",
      "weight": 30,
      "maxScore": 10
    },
    // More criteria...
  ]
}
```

### 3. Get Judging Session

**Endpoint:** `GET /api/judging/sessions/{sessionId}`

**Purpose:** Retrieves session details with all criteria and current scores.

**Response:**
```json
{
  "id": 789,
  "team": {
    "id": 123,
    "name": "Team Alpha",
    "contingentName": "School XYZ"
  },
  "status": "IN_PROGRESS",
  "criteriaScores": [
    {
      "id": 1,
      "criteriaName": "Technical Merit",
      "criteriaDescription": "Evaluation of technical complexity and implementation",
      "evaluationType": "POINTS",
      "weight": 30,
      "maxScore": 10,
      "score": 8.5,
      "feedback": "Good implementation with some room for improvement"
    },
    // More criteria scores...
  ],
  "totalScore": null,
  "feedback": null
}
```

### 4. Submit Criteria Score

**Endpoint:** `PUT /api/judging/sessions/{sessionId}/criteria/{criteriaId}`

**Purpose:** Updates score for a specific criterion.

**Request:**
```json
{
  "score": 8.5,
  "feedback": "Good implementation with some room for improvement",
  "discreteValue": null
}
```

**Response:**
```json
{
  "success": true,
  "criteriaScore": {
    "id": 1,
    "criteriaName": "Technical Merit",
    "score": 8.5,
    "weight": 30,
    "weightedScore": 2.55
  }
}
```

### 5. Complete Judging Session

**Endpoint:** `POST /api/judging/sessions/{sessionId}/complete`

**Purpose:** Finalizes a judging session and calculates the total score.

**Request:**
```json
{
  "feedback": "Overall excellent project with good technical implementation"
}
```

**Response:**
```json
{
  "success": true,
  "totalScore": 85.7,
  "completedAt": "2023-08-15T14:32:45Z"
}
```

### 6. Get Team Results

**Endpoint:** `GET /api/judging/eventcontest/{eventcontestId}/results`

**Purpose:** Returns aggregated results for all teams.

**Response:**
```json
{
  "teams": [
    {
      "id": 123,
      "name": "Team Alpha",
      "contingentName": "School XYZ",
      "judgeCount": 3,
      "averageScore": 85.7,
      "rank": 1
    },
    // More team results...
  ]
}
```

## 4. Frontend Components

### Team List View

```tsx
// pages/organizer/events/[eventId]/judging/index.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function JudgingTeamsPage() {
  const router = useRouter();
  const { eventId, contestId } = router.query;
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchTeams = async () => {
      if (!eventId || !contestId) return;
      
      try {
        const response = await fetch(`/api/judging/eventcontest/${contestId}/teams`);
        const data = await response.json();
        setTeams(data.teams);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, [eventId, contestId]);
  
  const columns = [
    {
      header: 'Team',
      accessorKey: 'teamName',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.teamName}</div>
          <div className="text-sm text-muted-foreground">{row.original.contingentName}</div>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'judging.status',
      cell: ({ row }) => {
        const status = row.original.judging.status;
        return (
          <Badge
            variant={
              status === 'COMPLETED' ? 'success' :
              status === 'IN_PROGRESS' ? 'warning' :
              'default'
            }
          >
            {status === 'COMPLETED' ? 'Completed' :
             status === 'IN_PROGRESS' ? 'In Progress' :
             'Not Started'}
          </Badge>
        );
      }
    },
    {
      header: 'Judges',
      accessorKey: 'judging.completedJudgeCount',
      cell: ({ row }) => (
        <div>{`${row.original.judging.completedJudgeCount}/${row.original.judging.totalJudgeCount}`}</div>
      )
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => (
        <Button
          onClick={() => router.push(`/judge/sessions/new?teamId=${row.original.id}`)}
          disabled={row.original.judging.status === 'COMPLETED'}
        >
          {row.original.judging.status === 'IN_PROGRESS' ? 'Continue' : 'Start Judging'}
        </Button>
      )
    }
  ];
  
  if (loading) return <div>Loading teams...</div>;
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Judge Teams</h1>
      <DataTable
        columns={columns}
        data={teams}
        searchField="teamName"
        emptyMessage="No teams found to judge"
      />
    </div>
  );
}
```

### Judging Form

```tsx
// pages/judge/sessions/[id].tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

export default function JudgingSessionPage() {
  const router = useRouter();
  const { id: sessionId } = router.query;
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  
  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) return;
      
      try {
        const response = await fetch(`/api/judging/sessions/${sessionId}`);
        const data = await response.json();
        setSession(data);
        setFeedback(data.feedback || '');
      } catch (error) {
        console.error('Error fetching session:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSession();
  }, [sessionId]);
  
  const handleScoreChange = async (criteriaId, value, type = 'score') => {
    try {
      const updatedSession = { ...session };
      const criteriaIndex = updatedSession.criteriaScores.findIndex(c => c.id === criteriaId);
      
      if (criteriaIndex === -1) return;
      
      if (type === 'score') {
        updatedSession.criteriaScores[criteriaIndex].score = value;
      } else if (type === 'feedback') {
        updatedSession.criteriaScores[criteriaIndex].feedback = value;
      } else if (type === 'discreteValue') {
        updatedSession.criteriaScores[criteriaIndex].discreteValue = value;
      }
      
      setSession(updatedSession);
      
      // Save to server
      await fetch(`/api/judging/sessions/${sessionId}/criteria/${criteriaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: type === 'score' ? value : updatedSession.criteriaScores[criteriaIndex].score,
          feedback: type === 'feedback' ? value : updatedSession.criteriaScores[criteriaIndex].feedback,
          discreteValue: type === 'discreteValue' ? value : updatedSession.criteriaScores[criteriaIndex].discreteValue
        })
      });
    } catch (error) {
      console.error('Error updating score:', error);
    }
  };
  
  const handleCompleteSession = async () => {
    try {
      setSaving(true);
      
      // Validate all criteria have scores
      const incomplete = session.criteriaScores.some(c => c.score === null);
      if (incomplete) {
        alert('Please provide scores for all criteria before completing.');
        return;
      }
      
      // Complete session
      const response = await fetch(`/api/judging/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback })
      });
      
      const result = await response.json();
      if (result.success) {
        router.push('/judge/sessions/completed');
      }
    } catch (error) {
      console.error('Error completing session:', error);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <div>Loading judging session...</div>;
  if (!session) return <div>Session not found</div>;
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">
        Judging: {session.team.name}
      </h1>
      <p className="text-muted-foreground mb-6">
        {session.team.contingentName}
      </p>
      
      {session.criteriaScores.map((criteria) => (
        <Card key={criteria.id} className="mb-6 p-4">
          <div className="mb-2">
            <div className="flex justify-between">
              <h3 className="font-medium">{criteria.criteriaName}</h3>
              <span className="text-sm bg-secondary px-2 py-1 rounded-md">
                Weight: {criteria.weight}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {criteria.criteriaDescription}
            </p>
          </div>
          
          {/* Different input types based on evaluationType */}
          {criteria.evaluationType === 'POINTS' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Slider
                  min={0}
                  max={criteria.maxScore || 10}
                  step={0.5}
                  value={[criteria.score || 0]}
                  onValueChange={([value]) => handleScoreChange(criteria.id, value)}
                />
                <div className="w-16">
                  <Input
                    type="number"
                    value={criteria.score || ''}
                    onChange={(e) => handleScoreChange(criteria.id, parseFloat(e.target.value))}
                    min={0}
                    max={criteria.maxScore || 10}
                    step={0.5}
                  />
                </div>
              </div>
              <Textarea
                placeholder="Optional feedback for this criterion"
                value={criteria.feedback || ''}
                onChange={(e) => handleScoreChange(criteria.id, e.target.value, 'feedback')}
              />
            </div>
          )}
          
          {criteria.evaluationType === 'DISCRETE_VALUE' && (
            <div className="space-y-4">
              <Select
                value={criteria.discreteValue || ''}
                onValueChange={(value) => handleScoreChange(criteria.id, value, 'discreteValue')}
              >
                {criteria.discreteValues && JSON.parse(criteria.discreteValues).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
              <Textarea
                placeholder="Optional feedback for this criterion"
                value={criteria.feedback || ''}
                onChange={(e) => handleScoreChange(criteria.id, e.target.value, 'feedback')}
              />
            </div>
          )}
        </Card>
      ))}
      
      <Card className="mt-8 p-4">
        <h3 className="font-medium mb-2">Overall Feedback</h3>
        <Textarea
          placeholder="Provide overall feedback for this team"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
        />
      </Card>
      
      <div className="mt-8 flex justify-end space-x-4">
        <Button variant="outline" onClick={() => router.back()}>
          Save and Exit
        </Button>
        <Button 
          onClick={handleCompleteSession} 
          disabled={saving || session.status === 'COMPLETED'}
        >
          {saving ? 'Submitting...' : 'Complete Judging'}
        </Button>
      </div>
    </div>
  );
}
```

### Results Dashboard

```tsx
// pages/organizer/events/[eventId]/judging/results.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DataTable } from '@/components/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function JudgingResultsPage() {
  const router = useRouter();
  const { eventId, contestId } = router.query;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchResults = async () => {
      if (!eventId || !contestId) return;
      
      try {
        const response = await fetch(`/api/judging/eventcontest/${contestId}/results`);
        const data = await response.json();
        setResults(data.teams);
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [eventId, contestId]);
  
  const exportResults = () => {
    // Implementation for exporting results
    const csv = [
      ['Rank', 'Team', 'Contingent', 'Score'],
      ...results.map(team => [
        team.rank,
        team.name,
        team.contingentName,
        team.averageScore.toFixed(1)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `judging-results-${contestId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  const columns = [
    {
      header: 'Rank',
      accessorKey: 'rank',
    },
    {
      header: 'Team',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.contingentName}</div>
        </div>
      )
    },
    {
      header: 'Judges',
      accessorKey: 'judgeCount',
    },
    {
      header: 'Score',
      accessorKey: 'averageScore',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.averageScore.toFixed(1)}</div>
      )
    },
  ];
  
  if (loading) return <div>Loading results...</div>;
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Judging Results</h1>
        <Button onClick={exportResults}>
          Export Results
        </Button>
      </div>
      
      <Tabs defaultValue="summary">
        <TabsList className="mb-6">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={columns}
                data={results}
                searchField="name"
                emptyMessage="No judging results available"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="detailed">
          {/* Detailed results component would go here */}
          <Card>
            <CardContent className="pt-6">
              <p>Detailed results view with individual criteria scores</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

## 5. Implementation Plan

### Phase 1: Database Setup
1. Add new database models to Prisma schema
2. Run migration to create tables
3. Create seed data for testing

### Phase 2: API Development
1. Create core endpoints for judging session management
2. Implement scoring algorithms
3. Set up validation and permissions

### Phase 3: Frontend Integration
1. Develop judging interface components
2. Create results dashboard
3. Integrate with existing tournament/event system

### Phase 4: Testing & Deployment
1. Test with sample judging templates and teams
2. Validate calculations and aggregations
3. Deploy to staging for user testing

## 6. Scoring Algorithm

### Individual Criterion Score
```
criterionScore = (rawScore / maxScore) * weight
```

### Total Session Score
```
sessionScore = sum(criterionScores)
```

### Final Team Score
```
teamScore = average(sessionScores from all judges)
```

## 7. Security Considerations

1. **Role-Based Access Control**
   - Only assigned judges can access judging sessions
   - Only organizers can view all results
   
2. **Data Integrity**
   - Validation on all score inputs
   - Audit logs for score changes
   - Prevention of duplicate judging sessions

3. **Concurrent Editing Protection**
   - Optimistic concurrency control for judging sessions
   - Real-time updates when multiple judges are working
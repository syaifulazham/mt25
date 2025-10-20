# Certificate Template - Survey Prerequisites UI

## Overview
Added UI configuration for managing survey prerequisites in the certificate template editor at `/organizer/certificates/templates/[id]/edit`.

## Date Implemented
October 21, 2025

## Features

### 1. Survey Prerequisites Section
Located in the Template Configuration panel, under a collapsible section titled "Survey Prerequisites".

### 2. Prerequisites Table Display
When prerequisites exist:
- **Table with columns:**
  - Survey Name
  - Description
  - Action (Remove button)
- Shows all configured survey prerequisites
- Each row displays survey details fetched from the survey table
- Red "Remove" button to delete prerequisites

When no prerequisites:
- Gray placeholder message: "No survey prerequisites configured"

### 3. Add Survey Prerequisite Modal
Triggered by "+ Add Survey Prerequisite" button:
- **Modal Features:**
  - Title: "Add Survey Prerequisite"
  - Description: "Select a survey that participants must complete"
  - List of all available surveys from database
  - Each survey card shows:
    - Survey name (bold)
    - Survey description
    - "Added" badge if already prerequisite
  - Click to add survey
  - "Close" button at bottom

### 4. Survey Selection
- Surveys are clickable cards
- Hover effect: blue border and background
- Already-added surveys are grayed out and non-clickable
- Shows green "Added" badge on already-selected surveys
- Prevents duplicate prerequisites

## UI Components

### Prerequisites Table
```tsx
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th>Survey Name</th>
      <th>Description</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    {prerequisites.map((prereq, index) => {
      const survey = surveys.find(s => s.id === prereq.id)
      return (
        <tr>
          <td>{survey?.name || `Survey ID: ${prereq.id}`}</td>
          <td>{survey?.description || '-'}</td>
          <td>
            <button onClick={() => handleRemovePrerequisite(index)}>
              Remove
            </button>
          </td>
        </tr>
      )
    })}
  </tbody>
</table>
```

### Add Button
```tsx
<button
  onClick={() => setShowSurveyModal(true)}
  className="w-full px-4 py-2 border border-blue-300 text-blue-700 rounded-md"
>
  + Add Survey Prerequisite
</button>
```

### Survey Selection Modal
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-lg max-w-2xl w-full">
    <div className="px-6 py-4 border-b">
      <h3>Add Survey Prerequisite</h3>
      <p>Select a survey that participants must complete</p>
    </div>
    
    <div className="p-6 overflow-y-auto">
      {surveys.map((survey) => (
        <div
          onClick={() => handleAddSurveyPrerequisite(survey.id)}
          className="p-4 border rounded-lg cursor-pointer hover:border-blue-400"
        >
          <h4>{survey.name}</h4>
          <p>{survey.description}</p>
          {isAdded && <span className="bg-green-100">Added</span>}
        </div>
      ))}
    </div>
    
    <div className="px-6 py-4 border-t">
      <button onClick={() => setShowSurveyModal(false)}>Close</button>
    </div>
  </div>
</div>
```

## State Management

### State Variables
```typescript
// Prerequisites array
const [prerequisites, setPrerequisites] = useState<Array<{prerequisite: string; id: number}>>(
  template?.prerequisites || []
)

// Available surveys list
const [surveys, setSurveys] = useState<Array<{id: number; name: string; description: string | null}>>([])

// Modal visibility
const [showSurveyModal, setShowSurveyModal] = useState(false)
```

### Functions

#### Fetch Surveys
```typescript
const fetchSurveys = async () => {
  const response = await fetch('/api/surveys')
  const data = await response.json()
  setSurveys(data.surveys || [])
}
```

#### Add Prerequisite
```typescript
const handleAddSurveyPrerequisite = (surveyId: number) => {
  // Check if already exists
  const exists = prerequisites.some(p => p.prerequisite === 'survey' && p.id === surveyId)
  if (exists) {
    setError('This survey is already added as a prerequisite')
    return
  }
  
  // Add to array
  setPrerequisites([...prerequisites, { prerequisite: 'survey', id: surveyId }])
  setShowSurveyModal(false)
  setSuccess('Survey prerequisite added')
}
```

#### Remove Prerequisite
```typescript
const handleRemovePrerequisite = (index: number) => {
  const updated = prerequisites.filter((_, i) => i !== index)
  setPrerequisites(updated)
  setSuccess('Prerequisite removed')
}
```

#### Save Template
Prerequisites are included in template data:
```typescript
const templateData = {
  templateName,
  basePdfPath: pdfUrl,
  targetType,
  eventId,
  winnerRangeStart,
  winnerRangeEnd,
  prerequisites: prerequisites.length > 0 ? prerequisites : null, // ✅ Saved
  configuration: { ... }
}
```

## API Integration

### Surveys API
**Endpoint:** `GET /api/surveys`

**Response:**
```json
{
  "surveys": [
    {
      "id": 1,
      "name": "Post-Event Survey",
      "description": "Feedback survey after event completion"
    },
    {
      "id": 2,
      "name": "Pre-Registration Survey",
      "description": "Survey to collect participant preferences"
    }
  ],
  "count": 2
}
```

### Template Save/Update
**Endpoints:** 
- `POST /api/certificates/templates` (create)
- `PUT /api/certificates/templates/[id]` (update)

**Request Body:**
```json
{
  "templateName": "Survey Completion Certificate",
  "basePdfPath": "/uploads/templates/cert.pdf",
  "targetType": "GENERAL",
  "prerequisites": [
    {"prerequisite": "survey", "id": 1},
    {"prerequisite": "survey", "id": 2}
  ],
  "configuration": { ... }
}
```

## User Flow

### Adding Prerequisites
1. User opens template editor
2. Scrolls to "Survey Prerequisites" section
3. Sees table (empty if no prerequisites)
4. Clicks "+ Add Survey Prerequisite" button
5. Modal opens with list of surveys
6. User clicks on desired survey
7. Survey is added to prerequisites table
8. Modal closes automatically
9. Success message appears
10. User can add more surveys or save template

### Removing Prerequisites
1. User sees prerequisites table
2. Clicks "Remove" button on specific prerequisite row
3. Prerequisite is removed from table
4. Success message appears
5. User saves template to persist changes

### Saving Template
1. User configures prerequisites
2. Clicks "Create Template" or "Update Template" button
3. Prerequisites are saved as JSON array in database
4. Template is saved/updated
5. Redirect to templates list or success message

## Validation

### Duplicate Prevention
- Cannot add same survey twice
- Modal shows "Added" badge on already-selected surveys
- Click on added survey shows error toast

### Data Format
Prerequisites stored as JSON array:
```json
[
  {"prerequisite": "survey", "id": 1},
  {"prerequisite": "survey", "id": 2}
]
```

### Empty State
- If no prerequisites: saves `null` to database
- If prerequisites exist: saves array

## Styling

### Colors & States
- **Table Header:** Gray background (`bg-gray-50`)
- **Add Button:** Blue border, blue text (`border-blue-300 text-blue-700`)
- **Remove Button:** Red text (`text-red-600 hover:text-red-800`)
- **Modal Overlay:** Black semi-transparent (`bg-black bg-opacity-50`)
- **Survey Card Hover:** Blue border (`hover:border-blue-400 hover:bg-blue-50`)
- **Added Badge:** Green background (`bg-green-100 text-green-800`)
- **Empty State:** Gray background (`bg-gray-50`)

### Responsive Design
- Modal: `max-w-2xl w-full` with padding
- Table: Full width with responsive columns
- Modal scrollable on small screens: `max-h-[80vh] overflow-y-auto`

## Files Modified

### Frontend
- `/src/app/organizer/certificates/_components/TemplateEditorFixed.tsx`
  - Added prerequisites state
  - Added surveys state
  - Added showSurveyModal state
  - Added fetchSurveys function
  - Added handleAddSurveyPrerequisite function
  - Added handleRemovePrerequisite function
  - Added Survey Prerequisites section UI
  - Added Survey Selection Modal
  - Updated handleSaveTemplate to include prerequisites

### Backend APIs
- `/src/app/api/surveys/route.ts` (Created)
  - GET endpoint to fetch all surveys
  - Returns id, name, description
  
- `/src/lib/validations/template-schemas.ts`
  - Added prerequisiteSchema
  - Added prerequisites field to templateCreateSchema
  - Added prerequisites field to templateUpdateSchema

- `/src/lib/services/template-service.ts`
  - Added prerequisites to TemplateCreateParams type
  - Added prerequisites to TemplateUpdateParams type
  - Updated createTemplate to save prerequisites
  - Updated updateTemplate to save prerequisites

### Database
- Database already has `prerequisites` JSON column (added earlier)
- Prisma schema already updated (added earlier)
- Prisma client regenerated ✅

## Testing

### Test Scenarios

#### 1. Add Single Survey
- Open template editor
- Click "+ Add Survey Prerequisite"
- Select a survey
- Verify it appears in table
- Save template
- Reload page
- Verify prerequisite persists

#### 2. Add Multiple Surveys
- Add survey #1
- Add survey #2
- Add survey #3
- Verify all appear in table
- Save template
- Verify all saved

#### 3. Remove Survey
- Add 2 surveys
- Click "Remove" on one
- Verify it's removed from table
- Save template
- Verify only remaining survey saved

#### 4. Duplicate Prevention
- Add survey #1
- Try to add survey #1 again
- Verify error message appears
- Verify survey not duplicated

#### 5. Empty State
- Remove all prerequisites
- Save template
- Verify saves successfully
- Reload page
- Verify shows empty state

#### 6. Survey Not Found
- Add a survey
- Delete that survey from database
- Reload template editor
- Verify shows "Survey ID: X" instead of name
- Verify can still remove prerequisite

## Integration with Certificate Generation

When participants try to generate certificates:
1. API checks template prerequisites
2. If prerequisites exist, validate completion
3. If not met, return error with missing prerequisites
4. If met, proceed with generation

See `/CERTIFICATE_TEMPLATE_PREREQUISITES.md` for prerequisite validation logic.

## Screenshots Locations

### Template Configuration Panel
- Survey Prerequisites section (collapsed/expanded)
- Prerequisites table (empty/populated)
- Add button

### Survey Selection Modal
- Modal open with survey list
- Survey card hover state
- Survey card "Added" badge
- No surveys available state

### Prerequisites Table
- Multiple surveys listed
- Remove button
- Survey details display

## Future Enhancements

### Possible Additions
1. **Other Prerequisite Types:**
   - Event participation
   - Contest participation
   - Payment verification
   - Registration completion

2. **Prerequisite Groups:**
   - AND logic (all must be met)
   - OR logic (any one must be met)

3. **Conditional Prerequisites:**
   - If target type is X, require survey Y

4. **Bulk Operations:**
   - Add multiple surveys at once
   - Remove all prerequisites
   - Copy prerequisites from another template

5. **Preview:**
   - Show what participants will see
   - Test prerequisite checking

## Summary

The Survey Prerequisites UI provides:
- ✅ Visual configuration of survey requirements
- ✅ Easy survey selection from modal
- ✅ Clear table display of prerequisites
- ✅ Simple add/remove operations
- ✅ Duplicate prevention
- ✅ Saves to database as JSON
- ✅ Integrates with certificate generation flow
- ✅ Responsive and user-friendly design

Organizers can now easily configure which surveys participants must complete before generating certificates, with a clean and intuitive UI.

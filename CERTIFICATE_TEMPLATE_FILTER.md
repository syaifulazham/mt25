# Certificate Template Filter Feature

## Overview
Added template filtering capability to the organizer certificates page, allowing certificates to be filtered by specific templates through a professional modal selector.

## Location
**Page**: `http://localhost:3000/organizer/certificates` (Certificates tab)

## Features

### 1. Template Filter Button
- **Location**: Filters section, next to "Filter by type" dropdown
- **Default State**: Shows "All Templates" text with Filter icon
- **Active State**: Blue background when a template is selected
- **Behavior**: Opens template selection modal on click

### 2. Template Filter Modal

**Modal Features:**
- **Full-Width Layout**: Professional, spacious design
- **Template Grouping**: Grouped by target type (GENERAL, EVENT_PARTICIPANT, etc.)
- **Color-Coded Cards**: Each template type has distinct color scheme
- **Selection Indicator**: Blue dot shows currently selected template
- **Search Not Required**: All templates shown upfront

**Template Groups:**
1. **Show All Option**
   - Always at top
   - Gray background
   - Clears template filter

2. **General** (Blue theme)
3. **Event Participant** (Green theme)
4. **Event Winner** (Yellow theme)
5. **Non-Contest Participant** (Purple theme)
6. **Quiz Participant** (Indigo theme)
7. **Quiz Winner** (Pink theme)

### 3. API Integration

**Query Parameter**: `templateId`
```typescript
const queryParams = new URLSearchParams({
  page: currentPage.toString(),
  limit: pagination.limit.toString(),
  search: searchTerm,
  targetType: targetTypeFilter,
  templateId: selectedTemplateId?.toString(), // ← New parameter
})
```

**Backend Support**: 
- API endpoint already supports `templateId` parameter
- Filters certificates by `certificate.templateId`

### 4. Filter Management

**State Management:**
```typescript
const [templateFilterModalOpen, setTemplateFilterModalOpen] = useState(false)
const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
const [selectedTemplateName, setSelectedTemplateName] = useState<string>('All Templates')
```

**Clear Filters:**
- Resets template selection to "All Templates"
- Clears `selectedTemplateId` to `null`
- Clears `selectedTemplateName` to `'All Templates'`

**Active Filters Detection:**
```typescript
const hasActiveFilters = 
  targetTypeFilter !== 'all' || 
  localSearchTerm !== '' || 
  selectedTemplateId !== null  // ← Template filter included
```

## User Flow

### Filtering by Template

1. **Open Filter Modal**
   - Click "All Templates" button in filters section
   - Modal opens showing all active templates

2. **Select Template**
   - Click "Show All Templates" for no filter
   - OR click any template card
   - Modal closes automatically
   - Button text updates to show selected template name
   - Button background turns blue

3. **View Results**
   - Certificate list automatically refreshes
   - Only certificates from selected template shown
   - Certificate count updates
   - Pagination resets to page 1

4. **Clear Filter**
   - Click "Clear Filters" button
   - Template selection resets to "All Templates"
   - All certificates shown again

### Combined Filtering

Filters work together:
- **Search**: Filter by name, code, etc.
- **Type Filter**: Filter by target type
- **Template Filter**: Filter by specific template ✨ NEW
- **Clear All**: Resets all three filters

## UI Components

### Template Filter Button
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setTemplateFilterModalOpen(true)}
  className={`h-9 gap-1 ${
    selectedTemplateId 
      ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' 
      : ''
  }`}
>
  <Filter className="h-4 w-4" />
  <span>{selectedTemplateName}</span>
</Button>
```

### Template Card (in Modal)
```tsx
<button
  onClick={() => handleSelect(template.id, template.templateName)}
  className={`p-4 border-2 rounded-lg text-left transition-colors ${
    selectedTemplateId === template.id
      ? `${getTypeColor(type)} ring-2 ring-offset-1`
      : `${getTypeColor(type)}`
  }`}
>
  <div className="flex items-center justify-between">
    <div className="flex-1 min-w-0">
      <p className="font-medium text-gray-900 truncate">
        {template.templateName}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Template ID: {template.id}
      </p>
    </div>
    {selectedTemplateId === template.id && (
      <div className="ml-2 flex-shrink-0">
        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
      </div>
    )}
  </div>
</button>
```

## Color Scheme

**Template Type Colors:**
- **General**: `bg-blue-50 border-blue-200`
- **Event Participant**: `bg-green-50 border-green-200`
- **Event Winner**: `bg-yellow-50 border-yellow-200`
- **Non-Contest Participant**: `bg-purple-50 border-purple-200`
- **Quiz Participant**: `bg-indigo-50 border-indigo-200`
- **Quiz Winner**: `bg-pink-50 border-pink-200`

**Selected State**: Adds `ring-2 ring-offset-1` to the card

**Button Active State**: `bg-blue-50 border-blue-300 text-blue-700`

## Technical Implementation

### Files Created
1. **`TemplateFilterModal.tsx`**
   - Standalone modal component
   - Fetches templates from API
   - Groups by target type
   - Handles selection logic

### Files Modified
2. **`CertificateList.tsx`**
   - Added state management for template filter
   - Added button to open modal
   - Integrated template filter with API queries
   - Updated useEffect dependencies
   - Added modal component

### API Integration
```typescript
// Fetch all templates (pageSize=1000 to get all without pagination)
GET /api/certificates/templates?status=ACTIVE&pageSize=1000

// Filter certificates
GET /api/certificates?templateId={id}&page={page}&limit={limit}
```

**Note**: The modal fetches all ACTIVE templates in a single request using `pageSize=1000` to avoid pagination issues and ensure all templates are displayed.

**Fix Applied**: The API route now correctly maps `pageSize` parameter to `limit` for the service layer (line 40-46 in route.ts).

### State Flow
```
User clicks button
  ↓
Modal opens
  ↓
Fetches all templates from API (pageSize=1000)
  ↓
Groups by targetType
  ↓
User selects template
  ↓
Updates state (selectedTemplateId, selectedTemplateName)
  ↓
Modal closes
  ↓
useEffect triggers
  ↓
Fetches certificates with templateId filter
  ↓
Updates certificate list
```

## Examples

### Example 1: Filter by Specific Template
```
Initial State:
- Button shows: "All Templates"
- Showing: 150 certificates from all templates

After Selection:
- Button shows: "Zone Participation Certificate"
- Button style: Blue background
- Showing: 45 certificates from Template ID 5
- Certificate count: "45 certificates"
```

### Example 2: Combined Filters
```
Filters Applied:
- Search: "Ahmad"
- Type: EVENT_PARTICIPANT
- Template: "Zone Participation Certificate"

Result:
- Only certificates matching ALL criteria
- E.g., 5 certificates for people named Ahmad from Zone Participation template
```

### Example 3: Clear All Filters
```
Before Clear:
- Search: "John"
- Type: EVENT_WINNER
- Template: "National Winner Certificate"
- Showing: 2 certificates

After Clear:
- Search: (empty)
- Type: All Types
- Template: All Templates
- Showing: 150 certificates
```

## Benefits

### 1. Precise Filtering
- Find certificates from specific templates
- Useful when multiple templates exist
- Reduces clutter in certificate list

### 2. Professional UI
- Beautiful modal with grouped templates
- Color-coded for easy identification
- Clear selection indicators

### 3. Better Workflow
- Quick template switching
- Visual feedback on selection
- One-click clear all filters

### 4. Scalability
- Works with any number of templates
- Grouped display stays organized
- Responsive design

## Use Cases

### Certificate Management
- **Scenario**: Organizer has 10 different templates
- **Need**: View certificates from only "Event Winner" template
- **Solution**: Select template from filter modal

### Template Verification
- **Scenario**: Check if certificates were generated from correct template
- **Need**: Filter by specific template ID
- **Solution**: Select template and verify certificate count

### Bulk Operations
- **Scenario**: Need to re-generate certificates from specific template
- **Need**: View all certificates from that template
- **Solution**: Filter by template, then perform bulk operations

### Quality Control
- **Scenario**: New template design deployed
- **Need**: Check certificates generated with new template
- **Solution**: Filter by new template ID

## Accessibility

- **Keyboard Navigation**: Modal can be closed with Escape key
- **Click Outside**: Clicking backdrop closes modal
- **Visual Feedback**: Clear hover states and selection indicators
- **Screen Readers**: Proper ARIA labels (can be improved)

## Performance

- **Lazy Loading**: Templates fetched only when modal opens
- **Caching**: Templates cached during session
- **Efficient Queries**: Backend filters at database level
- **Pagination**: Results paginated for large datasets

## Future Enhancements

1. **Template Search**: Add search within modal
2. **Recent Templates**: Show recently used templates at top
3. **Favorites**: Star frequently used templates
4. **Template Stats**: Show certificate count per template
5. **Multi-Select**: Filter by multiple templates (if needed)
6. **Template Preview**: Show PDF preview in modal
7. **Quick Filters**: Preset filters for common scenarios

## Testing Checklist

- [x] Button opens modal correctly
- [x] Modal displays all active templates
- [x] Templates grouped by type
- [x] Selection updates button text
- [x] Selection applies blue styling to button
- [x] Certificates filter by selected template
- [x] "Show All" option clears filter
- [x] "Clear Filters" resets template selection
- [x] Modal closes after selection
- [x] Cancel button closes modal
- [x] API integration works correctly
- [x] Pagination resets on filter change
- [x] Loading states display properly
- [x] Error handling works

## Integration Points

### Works With:
- Search filter
- Type filter
- Pagination
- Certificate list display
- Clear filters functionality

### Compatible With:
- Existing certificate management features
- Bulk operations (when implemented)
- Export features (when implemented)
- Certificate generation workflows

## Documentation

**User Guide**: Filter certificates by selecting a specific template from the organized modal. Click the filter button, choose a template, and view results instantly.

**Admin Notes**: Only ACTIVE templates appear in the filter. Ensure templates have proper `targetType` for correct grouping.

**Developer Notes**: Template filtering uses the existing `templateId` query parameter. The modal component is self-contained and reusable.

---

**Feature Status**: ✅ Completed and Ready

**Files**:
- `/src/app/organizer/certificates/_components/TemplateFilterModal.tsx` - Modal component
- `/src/app/organizer/certificates/_components/CertificateList.tsx` - Integration
- `/CERTIFICATE_TEMPLATE_FILTER.md` - This documentation

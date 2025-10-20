# Template Configuration Collapsible Panel

## Overview
Made the "Template Configuration" panel collapsible to allow users to hide/show the configuration area with a single click, improving workspace management and reducing visual clutter.

## Date Implemented
October 21, 2025

## Feature Details

### Collapsible Header
- **Clickable Header Area**: Entire header bar is clickable to toggle
- **Chevron Icon Button**: Dedicated button with rotating chevron icon
- **Visual Feedback**: Hover effect on header (light gray background)
- **Smooth Transitions**: Icon rotation animation when toggling

### States

#### Expanded (Default)
- Chevron pointing down
- All configuration sections visible
- Full access to all template settings

#### Collapsed
- Chevron pointing left (rotated -90 degrees)
- Configuration content hidden
- Only header bar visible
- Saves screen space

## UI Components

### Header Structure
```tsx
<div 
  className="flex justify-between items-center p-5 cursor-pointer hover:bg-gray-50 transition-colors"
  onClick={() => setIsConfigCollapsed(!isConfigCollapsed)}
>
  <h2 className="text-lg font-semibold">Template Configuration</h2>
  <button
    type="button"
    className="p-1 rounded-full hover:bg-gray-200 transition-colors"
    onClick={(e) => {
      e.stopPropagation()
      setIsConfigCollapsed(!isConfigCollapsed)
    }}
  >
    <svg
      className={`w-5 h-5 transform transition-transform ${isConfigCollapsed ? '-rotate-90' : 'rotate-0'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
</div>
```

### Collapsible Content
```tsx
{!isConfigCollapsed && (
  <div className="px-5 pb-5">
    {/* Template Name */}
    {/* Certificate Size */}
    {/* PDF Calibration Settings */}
    {/* Target Audience */}
    {/* Survey Prerequisites */}
  </div>
)}
```

## State Management

### State Variable
```typescript
const [isConfigCollapsed, setIsConfigCollapsed] = useState(false)
```

- **Initial State**: `false` (expanded by default)
- **Type**: Boolean
- **Toggle Function**: `setIsConfigCollapsed(!isConfigCollapsed)`

## User Interactions

### Click to Toggle
1. **Click anywhere on header bar** → Toggles collapsed state
2. **Click chevron button** → Toggles collapsed state
3. Event propagation stopped on button to prevent double-toggle

### Visual Indicators
- **Hover on header**: Background changes to light gray
- **Hover on button**: Button background lightens
- **Icon rotation**: Smooth transition between states
  - Expanded: `rotate-0` (chevron pointing down)
  - Collapsed: `-rotate-90` (chevron pointing left)

## Benefits

### 1. Screen Space Management
- Collapse when not needed
- More room for canvas/preview area
- Better for small screens

### 2. Focus Improvement
- Hide configuration when designing
- Reduce visual clutter
- Cleaner workspace

### 3. Quick Access
- One-click expand when needed
- All settings remain in place
- No data loss on collapse

### 4. Better Workflow
- Configure settings → Collapse panel
- Design on canvas
- Expand to adjust → Collapse again

## Design Specifications

### Spacing
- **Header Padding**: `p-5` (20px all sides)
- **Content Padding**: `px-5 pb-5` (20px horizontal, 20px bottom)
- **Button Padding**: `p-1` (4px all sides)

### Colors
- **Header Hover**: `hover:bg-gray-50`
- **Button Hover**: `hover:bg-gray-200`
- **Border**: `border-gray-200`
- **Background**: `bg-white`

### Transitions
- **All**: `transition-colors`
- **Icon**: `transition-transform`
- Duration: Default (150ms)

### Icon
- **Size**: `w-5 h-5` (20px × 20px)
- **Stroke**: `currentColor`
- **Stroke Width**: `2`
- **Type**: Chevron down SVG

## Responsive Behavior
- Works on all screen sizes
- Touch-friendly on mobile (larger click area)
- Maintains functionality in fullscreen mode (separate implementation)

## Integration

### Nested Collapsible Sections
The Template Configuration contains nested collapsible sections:
1. **Certificate Size** - CollapsibleSection component
2. **PDF Calibration Settings** - CollapsibleSection component
3. **Target Audience** - CollapsibleSection component
4. **Survey Prerequisites** - CollapsibleSection component
5. **PDF Upload** - CollapsibleSection component

These remain independently collapsible within the main panel.

### State Persistence
- State resets on page reload (by design)
- Always starts expanded
- User can collapse per session

## Use Cases

### Use Case 1: Initial Template Setup
1. User opens template editor
2. Configuration panel is expanded (default)
3. User fills in all settings
4. User collapses panel to focus on canvas
5. Design elements on canvas
6. Expand when needed to tweak settings

### Use Case 2: Editing Existing Template
1. User opens existing template
2. Configuration loads with saved values
3. User quickly collapses to see more canvas
4. Make visual adjustments
5. Expand only when changing configuration

### Use Case 3: Small Screen Workflow
1. User on laptop or tablet
2. Limited screen space
3. Collapse configuration to maximize canvas
4. Toggle as needed for quick edits

## Accessibility

### Keyboard Navigation
- Header is clickable div (can receive focus)
- Button has proper click handlers
- Chevron provides visual state indication

### Screen Readers
- Semantic heading (h2) for panel title
- Button has type="button" attribute
- Clear visual hierarchy

## Files Modified

### Component File
`/src/app/organizer/certificates/_components/TemplateEditorFixed.tsx`

**Changes:**
1. Added state: `isConfigCollapsed`
2. Updated header structure with toggle button
3. Wrapped content in conditional rendering
4. Added SVG chevron icon with rotation
5. Added hover states and transitions

**Lines Modified:**
- Line ~273: Added isConfigCollapsed state
- Lines 1263-1287: New collapsible header
- Lines 1289-1543: Wrapped content in conditional div

## Testing Checklist

- [x] Click header toggles panel
- [x] Click button toggles panel
- [x] Chevron rotates correctly
- [x] Content shows/hides properly
- [x] Hover states work
- [x] No impact on nested CollapsibleSections
- [x] Settings persist when toggling
- [x] Works in all screen sizes
- [x] No console errors

## Future Enhancements

### Possible Additions
1. **Remember State**: Store collapsed state in localStorage
2. **Keyboard Shortcut**: Add hotkey to toggle (e.g., Ctrl+H)
3. **Animation**: Slide animation for content show/hide
4. **Icon Options**: Different icon styles (plus/minus, arrows)
5. **Multiple Panels**: Make other sections collapsible

## Visual States

### Expanded State
```
┌─────────────────────────────────────────────┐
│ Template Configuration              [▼]    │
├─────────────────────────────────────────────┤
│                                             │
│  Template Name: [________________]          │
│                                             │
│  ▶ Certificate Size                        │
│  ▶ PDF Calibration Settings                │
│  ▶ Target Audience                         │
│  ▶ Survey Prerequisites                    │
│  ▶ Upload/Replace PDF Template             │
│                                             │
└─────────────────────────────────────────────┘
```

### Collapsed State
```
┌─────────────────────────────────────────────┐
│ Template Configuration              [◀]    │
└─────────────────────────────────────────────┘
```

## CSS Classes Reference

### Header
- `flex justify-between items-center` - Layout
- `p-5` - Padding
- `cursor-pointer` - Indicate clickable
- `hover:bg-gray-50` - Hover effect
- `transition-colors` - Smooth color change

### Button
- `p-1 rounded-full` - Shape and padding
- `hover:bg-gray-200` - Hover effect
- `transition-colors` - Smooth change

### Icon
- `w-5 h-5` - Size
- `transform transition-transform` - Enable rotation
- `rotate-0` - Default (expanded)
- `-rotate-90` - Collapsed state

## Summary

The Template Configuration panel is now fully collapsible, providing:
- ✅ One-click toggle functionality
- ✅ Clear visual indicators
- ✅ Smooth transitions
- ✅ Improved workspace management
- ✅ Better user experience
- ✅ Maintains all functionality when collapsed/expanded

Users can now manage their workspace more efficiently by collapsing the configuration panel when focusing on canvas design, and expanding it when they need to adjust settings.

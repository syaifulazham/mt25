# PDF Upload Moved to Template Configuration

## Overview
Moved the "Replace PDF Template (Optional)" section inside the Template Configuration panel as a collapsible section, consolidating all template settings in one place.

## Date Updated
October 21, 2025

## Changes Made

### Before
PDF Upload was a **separate section** outside the Template Configuration panel:

```
┌─ Template Configuration ──────────┐
│ [All configuration settings]      │
└───────────────────────────────────┘

┌─ Replace PDF Template (Optional) ─┐
│ [PDF upload area]                 │
└───────────────────────────────────┘

┌─ Template Designer ───────────────┐
│ [Canvas and preview]              │
└───────────────────────────────────┘
```

### After
PDF Upload is **inside** Template Configuration as a collapsible section:

```
┌─ Template Configuration ──────────┐
│ • Template Name                   │
│ ▶ Certificate Size                │
│ ▶ PDF Calibration Settings        │
│ ▶ Target Audience                 │
│ ▶ Survey Prerequisites            │
│ ▶ Upload/Replace PDF Template  ← New position
└───────────────────────────────────┘

┌─ Template Designer ───────────────┐
│ [Canvas and preview]              │
└───────────────────────────────────┘
```

## Implementation

### New Structure
```tsx
<div className="mb-4">
  <CollapsibleSection title={isNew ? 'Upload PDF Template' : 'Replace PDF Template (Optional)'}>
    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
      <div className="space-y-1 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400">
          {/* Upload icon */}
        </svg>
        <div className="flex text-sm text-gray-600">
          <label htmlFor="file-upload">
            <span>{isNew ? 'Upload a PDF file' : 'Replace PDF'}</span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept=".pdf,application/pdf"
              onChange={handlePdfUpload}
              disabled={isLoading}
            />
          </label>
          <p className="pl-1">or drag and drop</p>
        </div>
        <p className="text-xs text-gray-500">PDF up to 10MB</p>
      </div>
    </div>
    
    {/* Current PDF Display */}
    {pdfUrl && (
      <div className="mt-3 text-sm text-gray-600">
        <p className="font-medium">
          Current PDF: <span className="text-blue-600">{pdfUrl.split('/').pop()}</span>
        </p>
      </div>
    )}
  </CollapsibleSection>
</div>
```

### Key Features

#### 1. Collapsible Section
- Uses the same `CollapsibleSection` component as other config sections
- Consistent expand/collapse behavior
- Integrates seamlessly with existing sections

#### 2. Dynamic Title
- **New Template**: "Upload PDF Template"
- **Edit Template**: "Replace PDF Template (Optional)"

#### 3. Current PDF Display
- Shows filename of currently uploaded PDF
- Appears below upload area
- Blue text for filename (clickable appearance)
- Only shows when PDF is uploaded

#### 4. Same Upload Functionality
- Drag and drop support
- Click to browse
- PDF validation
- File size limit (10MB)
- Loading state support

## Benefits

### 1. Better Organization
- All template configuration in one place
- Logical grouping of related settings
- Easier to find and manage

### 2. Cleaner Layout
- Reduces visual clutter
- Template Designer gets more prominence
- Configuration is now a single collapsible panel

### 3. Consistent UX
- All config sections behave the same way
- Unified collapsible interface
- Predictable user interaction

### 4. Improved Workflow
- Configure everything → Collapse panel → Design
- No need to scroll past PDF upload to reach designer
- More efficient use of screen space

### 5. Mobile Friendly
- Collapsing entire config saves screen space
- Better for tablets and small laptops
- Touch-friendly interface

## Section Order

Configuration sections now appear in this order:
1. **Template Name** (always visible when expanded)
2. **Certificate Size** (collapsible)
3. **PDF Calibration Settings** (collapsible)
4. **Target Audience** (collapsible)
5. **Survey Prerequisites** (collapsible)
6. **Upload/Replace PDF Template** (collapsible) ← **New**

## Current PDF Display

### When PDF Uploaded
Shows the current PDF filename below the upload area:

```
┌─ Upload/Replace PDF Template (Optional) ──┐
│                                            │
│  [Upload Icon]                            │
│  Upload a PDF file or drag and drop       │
│  PDF up to 10MB                           │
│                                            │
│  Current PDF: certificate-template.pdf    │
│                                            │
└────────────────────────────────────────────┘
```

### When No PDF
Only shows the upload area:

```
┌─ Upload PDF Template ─────────────────────┐
│                                            │
│  [Upload Icon]                            │
│  Upload a PDF file or drag and drop       │
│  PDF up to 10MB                           │
│                                            │
└────────────────────────────────────────────┘
```

## User Experience

### First Time (New Template)
1. Open template editor
2. See "Upload PDF Template" section
3. Upload PDF file
4. Filename appears below upload area
5. Continue configuring other settings
6. Collapse entire panel to focus on design

### Editing Existing Template
1. Open template editor
2. See "Replace PDF Template (Optional)" section
3. Section shows current PDF filename
4. Can replace PDF if needed
5. Or leave as-is and configure other settings

### Replacing PDF
1. Expand "Replace PDF Template (Optional)"
2. See current PDF: "certificate-template.pdf"
3. Click or drag new PDF
4. New filename replaces old one
5. Template Designer updates with new PDF

## Technical Details

### File Structure
**Location in code**: Inside Template Configuration's collapsible content div

**Before line number**: ~1541 (after Survey Prerequisites)  
**After line number**: ~1589 (before closing div)

### Props Used
- `isNew` - Determines section title
- `pdfUrl` - Current PDF path/URL
- `handlePdfUpload` - Upload handler function
- `isLoading` - Disable during upload

### Styling
- Same border style as original (dashed border)
- Same icon and spacing
- Consistent with CollapsibleSection styling
- Added current PDF display with blue text

## Impact on Other Components

### No Impact On
- ✅ Template Designer canvas
- ✅ Preview functionality
- ✅ Save/Update functionality
- ✅ PDF rendering logic
- ✅ Other configuration sections

### Works With
- ✅ Collapsible Template Configuration panel
- ✅ Nested CollapsibleSection components
- ✅ File upload handler
- ✅ Loading states
- ✅ Validation

## Files Modified

### Main Component
`/src/app/organizer/certificates/_components/TemplateEditorFixed.tsx`

**Changes:**
1. Moved PDF upload section from standalone to inside config
2. Wrapped in CollapsibleSection component
3. Added current PDF filename display
4. Maintained all upload functionality

**Lines affected**: ~1543-1589

### Documentation Updated
- `/TEMPLATE_CONFIGURATION_COLLAPSIBLE.md` - Updated nested sections list
- `/PDF_UPLOAD_MOVED_TO_CONFIG.md` - This file (new)

## Testing Checklist

- [x] PDF upload works in new location
- [x] Current PDF displays when present
- [x] Filename updates after upload
- [x] Drag and drop still works
- [x] File validation still works
- [x] Loading state disables input
- [x] Section collapsible independently
- [x] Template Designer updates correctly
- [x] Save includes PDF path
- [x] Edit loads existing PDF
- [x] Replace PDF works
- [x] No console errors

## Visual Comparison

### Before (Separate Section)
```
Template Configuration [▼]
├─ Template Name
├─ ▶ Certificate Size
├─ ▶ PDF Calibration
├─ ▶ Target Audience
└─ ▶ Survey Prerequisites

Replace PDF Template (Optional)    ← Separate
├─ [Upload area]

Template Designer
└─ [Canvas]
```

### After (Integrated Section)
```
Template Configuration [▼]
├─ Template Name
├─ ▶ Certificate Size
├─ ▶ PDF Calibration
├─ ▶ Target Audience
├─ ▶ Survey Prerequisites
└─ ▶ Upload/Replace PDF Template    ← Inside config
    ├─ [Upload area]
    └─ Current PDF: filename.pdf

Template Designer
└─ [Canvas]
```

## Future Enhancements

### Possible Additions
1. **PDF Preview Thumbnail**: Show small preview in collapsed state
2. **PDF Details**: Show file size, upload date
3. **PDF History**: List of previously uploaded PDFs
4. **Quick Replace**: Button to quickly swap PDFs
5. **PDF Library**: Choose from uploaded templates

## Summary

The PDF upload section has been successfully moved inside the Template Configuration panel:

- ✅ Now a collapsible section like others
- ✅ Shows current PDF filename
- ✅ Better organization and UX
- ✅ Maintains all functionality
- ✅ Consistent with design patterns
- ✅ More efficient use of space

All template configuration settings are now consolidated in one collapsible panel, improving organization and user workflow.

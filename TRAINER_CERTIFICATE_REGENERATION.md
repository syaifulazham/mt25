# Trainer Certificate Regeneration Feature

## Overview
Added certificate regeneration functionality to the Trainers Certificates page to allow corrections for names and IC numbers without creating duplicates.

## Location
`http://localhost:3000/participants/contestants/certificates-trainers`

## Features

### 1. Smart Update on Regeneration
When regenerating a certificate, the API now updates the existing certificate record with the latest data from the manager table:

**Updated Fields:**
- `recipientName` - Current manager name
- `recipientEmail` - Current manager email
- `contingent_name` - Current contingent name
- `filePath` - Reset to NULL for on-demand generation
- `status` - Set to 'READY'
- `updatedAt` - Current timestamp

**Preserved Fields:**
- `uniqueCode` - Original certificate code
- `serialNumber` - Original serial number (e.g., MT25/TRAINER/000001)
- `ic_number` - IC remains the lookup key
- `templateId` - Same template

### 2. Regenerate Button
A new green refresh button appears next to existing certificates:

**Button Appearance:**
- Icon: `RefreshCw` (circular arrow)
- Color: Green (`text-green-600`)
- Location: Next to View and Download buttons
- Tooltip: "Jana Semula Sijil (untuk pembetulan nama/IC)"

**User Flow:**
1. User clicks Regenerate button (🔄)
2. Professional confirmation modal appears with:
   - Trainer name displayed prominently
   - Blue info box explaining what will be updated
   - Green info box confirming serial number preservation
3. User clicks "Jana Semula" to confirm or "Batal" to cancel
4. API updates certificate with latest data
5. Success modal: "Sijil berjaya dijana semula untuk [Name] dengan data terkini!"
6. Table refreshes with updated data

### 3. Button States

**Certificate Available:**
```
[Tersedia ✓] [Eye 👁️] [Download ⬇️] [Regenerate 🔄]
```

**Certificate Not Generated:**
```
[Jana Sijil 📄]
```

**During Generation/Regeneration:**
```
[Tersedia ✓] [Eye 👁️] [Download ⬇️] [Loading spinner 🔄]
```

## Use Cases

### Name Correction
1. Manager's name was misspelled in database
2. Admin corrects the name in manager table
3. User clicks Regenerate on certificate page
4. Certificate updates with corrected name

### IC Number Update
While IC is the lookup key, if you need to change IC:
1. Update manager's IC in database
2. Old certificate remains with old IC
3. Generate new certificate with new IC
4. Old certificate can be deleted if needed

### Contingent Name Change
1. Contingent name changed in database
2. Click Regenerate
3. Certificate updates with new contingent name

## Technical Implementation

### Backend API
**File:** `/src/app/api/participants/trainers/generate-certificate/route.ts`

**Logic:**
```typescript
// Check if certificate exists
const existingCert = await prisma.certificate.findFirst({
  where: {
    ic_number: managerIc,
    templateId: template.id
  }
})

if (existingCert) {
  // Update with latest data
  certificate = await prisma.certificate.update({
    where: { id: existingCert.id },
    data: {
      recipientName: manager.name, // ← Updated
      recipientEmail: manager.email || null, // ← Updated
      contingent_name: contingent?.name || null, // ← Updated
      filePath: null, // Reset for regeneration
      status: 'READY',
      updatedAt: new Date()
    }
  })
} else {
  // Create new certificate
  // Generate new uniqueCode and serialNumber
}
```

### Frontend Component
**File:** `/src/app/participants/contestants/certificates-trainers/page.tsx`

**State Management:**
```typescript
const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
const [regenerateTarget, setRegenerateTarget] = useState<{
  managerId: number
  managerIc: string
  managerName: string
} | null>(null)
```

**Functions:**
```typescript
// Open confirmation modal
const handleRegenerateCertificate = (managerId: number, managerIc: string, managerName: string) => {
  setRegenerateTarget({ managerId, managerIc, managerName })
  setShowRegenerateConfirm(true)
}

// Execute regeneration after confirmation
const confirmRegenerate = async () => {
  if (!regenerateTarget) return
  
  const { managerId, managerIc, managerName } = regenerateTarget
  setShowRegenerateConfirm(false)
  setGeneratingIds(prev => [...prev, managerId])
  
  try {
    const response = await fetch('/api/participants/trainers/generate-certificate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId, managerIc })
    })
    
    // Show success/error message
    // Refresh trainers list
  } finally {
    setGeneratingIds(prev => prev.filter(id => id !== managerId))
    setRegenerateTarget(null)
  }
}

// Cancel regeneration
const cancelRegenerate = () => {
  setShowRegenerateConfirm(false)
  setRegenerateTarget(null)
}
```

**Modal Component:**
```tsx
{showRegenerateConfirm && regenerateTarget && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
      {/* Amber warning header */}
      <div className="p-6 bg-amber-50">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-900">
            Jana Semula Sijil
          </h3>
        </div>
      </div>
      
      {/* Body with trainer name and info boxes */}
      <div className="p-6">
        <p className="text-gray-700 mb-2">
          Adakah anda pasti untuk menjana semula sijil untuk:
        </p>
        <p className="text-lg font-semibold text-gray-900 mb-4">
          {regenerateTarget.managerName}
        </p>
        
        {/* Blue info box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-2">
          <p className="text-sm text-blue-900">
            <strong>Nota:</strong> Sijil akan dikemas kini dengan data terkini...
          </p>
        </div>
        
        {/* Green info box */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <p className="text-sm text-green-900">
            <strong>Nombor Siri dijamin tidak berubah</strong>...
          </p>
        </div>
      </div>
      
      {/* Footer with action buttons */}
      <div className="flex items-center justify-end gap-2 p-4 border-t">
        <button onClick={cancelRegenerate} className="...">Batal</button>
        <button onClick={confirmRegenerate} className="...">Jana Semula</button>
      </div>
    </div>
  </div>
)}
```

## Benefits

### 1. No Duplicates
- Same IC + Template = Update existing certificate
- Maintains serial number consistency
- Clean certificate records

### 2. Easy Corrections
- Click regenerate instead of manual deletion + recreation
- Automatic data sync from database
- User-friendly confirmation dialog

### 3. Audit Trail
- Original `uniqueCode` preserved
- `updatedAt` timestamp shows last regeneration
- Serial number never changes

### 4. Data Accuracy
- Always uses latest data from manager table
- Automatic contingent name updates
- Email updates reflected immediately

## Security

- **Authentication Required**: Session-based authentication
- **Ownership Validation**: User must have access to the contingent
- **Professional Confirmation Modal**: Two-step process prevents accidental regeneration
- **API Validation**: All inputs validated on backend
- **No Browser Alerts**: Uses proper modal UI instead of alert/confirm

## Error Handling

**Possible Errors:**
1. Manager not found → "Manager not found"
2. No template → "No active trainer certificate template found"
3. Database error → "Failed to generate certificate" with details
4. Network error → "Gagal menjana semula sijil: [error]"

**User Feedback:**
- Success: Green modal with checkmark
- Error: Red modal with X icon
- Loading: Spinner on button (disabled during operation)

## Example Workflow

### Before Correction:
```
Manager Name: "Ahmad bin Ali" (typo)
Certificate shows: "Ahmad bin Ali"
```

### Correction Process:
1. Admin updates manager.name to "Ahmad bin Alli" in database
2. User visits certificates-trainers page
3. Sees certificate with "Tersedia" badge
4. Clicks green Regenerate button (🔄)
5. Professional modal opens showing:
   - "Adakah anda pasti untuk menjana semula sijil untuk: Ahmad bin Ali?"
   - Blue info box about data updates
   - Green info box about serial number preservation
6. User clicks "Jana Semula" button
7. API updates certificate.recipientName to "Ahmad bin Alli"
8. Success modal appears: "Sijil berjaya dijana semula..."
9. Certificate now shows corrected name

### Result:
```
Certificate ID: 123 (same)
Serial Number: MT25/TRAINER/000001 (same)
Unique Code: CERT-1234567890-ABC123 (same)
Recipient Name: "Ahmad bin Alli" (updated)
Updated At: 2025-12-08 14:30:00 (new)
```

## UI Elements

### Regenerate Button
```tsx
<button
  onClick={() => handleRegenerateCertificate(
    trainer.managerId,
    trainer.managerIc,
    trainer.managerName
  )}
  disabled={generatingIds.includes(trainer.managerId)}
  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
  title="Jana Semula Sijil (untuk pembetulan nama/IC)"
>
  {generatingIds.includes(trainer.managerId) ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <RefreshCw className="h-4 w-4" />
  )}
</button>
```

### Confirmation Modal
Professional modal dialog with amber/warning theme:
- **Title**: "Jana Semula Sijil" with RefreshCw icon
- **Body**: Shows trainer name and informational notes
- **Blue Info Box**: "Sijil akan dikemas kini dengan data terkini dari pangkalan data"
- **Green Info Box**: "Nombor Siri dijamin tidak berubah - Sijil yang sama akan dikemas kini tanpa mencipta pendua"
- **Actions**: Cancel (gray) or Confirm "Jana Semula" (green)

### Success Message
```javascript
{
  type: 'success',
  title: 'Berjaya',
  message: `Sijil berjaya dijana semula untuk ${managerName} dengan data terkini!`
}
```

## Files Modified

1. **Backend API**
   - `/src/app/api/participants/trainers/generate-certificate/route.ts`
   - Updated certificate update logic to include latest data

2. **Frontend Page**
   - `/src/app/participants/contestants/certificates-trainers/page.tsx`
   - Added `RefreshCw` icon import
   - Added `handleRegenerateCertificate` function
   - Added Regenerate button in certificate actions

## Testing Checklist

- [x] Regenerate button appears for existing certificates
- [x] Professional confirmation modal opens (no browser alerts)
- [x] Modal displays trainer name prominently
- [x] Blue info box shows in modal
- [x] Green info box about serial numbers shows in modal
- [x] "Batal" button closes modal without action
- [x] "Jana Semula" button proceeds with regeneration
- [x] Certificate updates with latest manager name
- [x] Certificate updates with latest email
- [x] Certificate updates with latest contingent name
- [x] Serial number remains unchanged
- [x] Unique code remains unchanged
- [x] Loading state shows during regeneration
- [x] Success modal displays after regeneration
- [x] Error modal displays on failure
- [x] Table refreshes after successful regeneration

## Notes

- **Serial Numbers**: Never change on regeneration (maintains consistency)
- **Unique Codes**: Never change on regeneration (audit trail)
- **IC Numbers**: Used as lookup key (cannot change via regeneration)
- **File Generation**: PDF regenerated on-demand when viewed/downloaded
- **Confirmation**: Always required via professional modal (no browser alerts)
- **UI/UX**: Amber theme for warning/confirmation, green for success, red for errors

## Implementation Highlights

### Professional Modal Dialog
Instead of browser's `alert()` or `confirm()` dialogs, the feature uses a custom React modal with:
- **Proper Styling**: Matches application design system
- **Better UX**: Clear information hierarchy with colored info boxes
- **Responsive**: Works on all screen sizes
- **Accessible**: Proper z-index, backdrop, and focus management
- **Informative**: Shows what will be updated and what will be preserved

### Modal Themes
1. **Confirmation Modal**: Amber/warning theme (bg-amber-50)
2. **Success Modal**: Green theme (bg-green-50)
3. **Error Modal**: Red theme (bg-red-50)

This feature provides a clean, professional solution for correcting certificate data without creating duplicates or losing serial number consistency.

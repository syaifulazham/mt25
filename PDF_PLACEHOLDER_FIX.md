# PDF Placeholder Rendering Fix

## Issue
Generated certificates showed empty fields instead of contestant data (name, contingent, serial number).

## Root Cause
Template configuration uses placeholders with curly braces (`{{placeholder_name}}`), but the PDF generation code was looking for placeholders without braces (`placeholder_name`).

**Template Format:**
```json
{
  "placeholder": "{{recipient_name}}",
  "placeholder": "{{contingent_name}}",
  "placeholder": "{{unique_code}}"
}
```

**Code was looking for:**
```typescript
const dataMap = {
  'recipient_name': contestant.name,  // ❌ Won't match "{{recipient_name}}"
  'contingent_name': contestant.contingent.name
};
```

## Solution
Strip curly braces from placeholder keys before lookup and convert all values to uppercase:

```typescript
const replacePlaceholder = (key: string): string => {
  // Remove {{ and }} from placeholder if present
  const cleanKey = key.replace(/^\{\{|\}\}$/g, '').trim();
  
  const dataMap: Record<string, string> = {
    'recipient_name': contestant.name,
    'ic_number': contestant.ic || '',
    'contingent_name': contestant.contingent.name,
    'institution_name': institutionName,
    'issue_date': new Date().toLocaleDateString(),
    'unique_code': uniqueCode,
    'serial_number': serialNumber || '',
    'contest_name': '' // Empty for GENERAL certs
  };
  
  // Convert to uppercase for formal certificate appearance
  const value = dataMap[cleanKey] || '';
  return value.toUpperCase();
};
```

## Template Placeholders Used

**Note:** All values are automatically converted to UPPERCASE on the certificate.

| Placeholder | Maps To | Example Value (Rendered) |
|-------------|---------|--------------------------|
| `{{recipient_name}}` | `contestant.name` | "AZHAM" |
| `{{contingent_name}}` | `contestant.contingent.name` | "HAJI ABU FAMILY" |
| `{{unique_code}}` | Generated uniqueCode | "CERT-1729..." |
| `{{serial_number}}` | Generated serialNumber | "MT25/GEN/000001" |
| `{{ic_number}}` | `contestant.ic` | "990813105535" |
| `{{contest_name}}` | N/A (empty for GENERAL) | "" |

## Debug Logging Added

The code now logs the placeholder replacement process:

```
Processing 4 template elements...
  Placeholder: {{recipient_name}} → Value: "AZHAM" → Text: "AZHAM"
  Placeholder: {{contest_name}} → Value: "" → Text: ""
  Placeholder: {{unique_code}} → Value: "CERT-..." → Text: "Siri: CERT-..."
  Placeholder: {{contingent_name}} → Value: "HAJI ABU FAMILY" → Text: "HAJI ABU FAMILY"
```

## Testing

1. **Generate a new certificate:**
   - Go to `/participants/contestants`
   - Click actions menu on a contestant
   - Click "Generate Certificate"

2. **Check server logs** for placeholder mapping:
   ```
   Certificate created: { recipientName: 'Azham', ... }
   Starting PDF generation...
   Processing 4 template elements...
   Placeholder: {{recipient_name}} → Value: "AZHAM"
   PDF saved to: /path/to/cert-...pdf
   ```

3. **Verify PDF** shows (all in UPPERCASE):
   - ✅ Recipient name: **AZHAM** (uppercase)
   - ✅ Contingent name: **HAJI ABU FAMILY** (uppercase)
   - ✅ Serial number: **Siri: MT25/GEN/000001**
   - ✅ All dynamic fields in uppercase format

## Common Template Issues

### Issue 1: Placeholder Not Rendering
**Symptom:** Field shows blank in PDF
**Cause:** Placeholder key not in dataMap
**Fix:** Add mapping to dataMap

```typescript
const dataMap: Record<string, string> = {
  'your_new_placeholder': yourValue,
  // ... other mappings
};
```

### Issue 2: Wrong Data Shown
**Symptom:** Field shows incorrect value
**Cause:** Wrong mapping in dataMap
**Fix:** Update the mapping

```typescript
// Before
'contingent_name': contestant.name,  // ❌ Wrong!

// After
'contingent_name': contestant.contingent.name,  // ✅ Correct
```

### Issue 3: Prefix Not Showing
**Symptom:** Prefix like "Siri: " missing
**Cause:** Prefix defined in template but text is empty
**Fix:** Ensure value is not empty

```typescript
text = (element.prefix || '') + value;
// If value is empty, only prefix will show
```

## Related Files

- `/src/app/api/participants/contestants/[id]/generate-certificate/route.ts` - Fixed API
- Template ID 2: "Sijil Penyertaan MT25 - Sekolah" (GENERAL template)

## Date Fixed
October 15, 2025

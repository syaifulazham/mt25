# Certificate Generation Feature Flag

## Overview
The "Generate Certificate" feature on the contestants page is controlled by a URL parameter to prevent accidental or unauthorized certificate generation.

## Usage

### Enable Certificate Generation
To show the "Generate Certificate" option in the actions menu:
```
http://localhost:3000/participants/contestants?cert=enabled
```

### Default Behavior (Hidden)
Without the parameter, the feature is hidden:
```
http://localhost:3000/participants/contestants
```

## Implementation

### URL Parameter Check
```typescript
const searchParams = useSearchParams();
const isCertificateEnabled = searchParams.get('cert') === 'enabled';
```

### Conditional Rendering
```tsx
{isCertificateEnabled && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      className="text-green-600"
      onClick={() => handleGenerateCertificate(contestant.id)}
      disabled={generatingCertificateId === contestant.id}
    >
      <Award className="h-4 w-4 mr-2" />
      {generatingCertificateId === contestant.id ? 'Generating...' : 'Generate Certificate'}
    </DropdownMenuItem>
  </>
)}
```

## User Flow

### Without Feature Flag
1. Go to `/participants/contestants`
2. Click actions menu (⋮) on any contestant
3. Menu shows:
   - 👁️ View Contingent
   - ✏️ Edit Contestant
   - 🎯 Assign Contests
   - ───────────────
   - 🗑️ Delete
   - ❌ **No "Generate Certificate" option**

### With Feature Flag
1. Go to `/participants/contestants?cert=enabled`
2. Click actions menu (⋮) on any contestant
3. Menu shows:
   - 👁️ View Contingent
   - ✏️ Edit Contestant
   - 🎯 Assign Contests
   - ───────────────
   - 🏆 **Generate Certificate** ← Available!
   - ───────────────
   - 🗑️ Delete

## Security & Access Control

### Why Use a Feature Flag?

1. **Prevent Accidental Generation**: Users won't accidentally generate certificates during normal operations
2. **Controlled Access**: Only users with the special URL can access certificate generation
3. **Easy Toggle**: Enable/disable feature without code changes
4. **Testing**: Easy to test with feature on/off

### Access Control Layers

| Layer | Control | Purpose |
|-------|---------|---------|
| 1. URL Parameter | `?cert=enabled` | Feature visibility |
| 2. Authentication | NextAuth session | User must be logged in |
| 3. API Authorization | Backend validation | Verify user owns contingent |
| 4. Database | FK constraints | Data integrity |

### Not a Security Feature
**Important:** This is a **UX/workflow feature**, not a security feature. The actual security is enforced at:
- API level (authentication required)
- Database level (contingent ownership validation)
- File system level (proper permissions)

Anyone who knows the URL parameter can see the button, but:
- They must be authenticated
- They can only generate for their own contingent's contestants
- API validates all permissions

## Sharing the Feature

### For Administrators
Share this URL with participants who need to generate certificates:
```
http://localhost:3000/participants/contestants?cert=enabled
```

### Production URL
```
https://your-domain.com/participants/contestants?cert=enabled
```

## Alternative Implementations

### Option 1: Role-Based (More Restrictive)
```typescript
const canGenerateCertificates = 
  session?.user?.role === 'PARTICIPANT' && 
  searchParams.get('cert') === 'enabled';
```

### Option 2: Always Show for Certain Roles
```typescript
const canGenerateCertificates = 
  ['ADMIN', 'OPERATOR'].includes(session?.user?.role) || 
  searchParams.get('cert') === 'enabled';
```

### Option 3: Database Configuration
Store feature flags in database:
```sql
CREATE TABLE feature_flags (
  name VARCHAR(50) PRIMARY KEY,
  enabled BOOLEAN DEFAULT FALSE
);
```

## Benefits

### 1. Clean Default UI
Normal participant operations don't show certificate generation, keeping the interface clean and focused.

### 2. On-Demand Access
When certificates need to be generated, participants can use the special URL.

### 3. No Code Deployment
Enable/disable by changing URL, no code changes needed.

### 4. Easy Documentation
Simple to explain: "Add `?cert=enabled` to the URL"

### 5. Gradual Rollout
Can share the URL with specific participants for testing before wider release.

## Troubleshooting

### Issue: Generate Certificate Not Showing
**Cause:** URL parameter missing
**Solution:** Add `?cert=enabled` to URL

### Issue: Already Have Other Parameters
**Cause:** URL has existing parameters
**Solution:** Use `&cert=enabled` to append:
```
/participants/contestants?page=2&cert=enabled
```

### Issue: Button Visible But Gets Error
**Cause:** Backend validation failed
**Solution:** 
- Check authentication
- Verify you own the contestant's contingent
- Check server logs for details

## Related Files

- `/src/app/participants/contestants/page.tsx` - Main page with conditional rendering
- `/src/app/api/participants/contestants/[id]/generate-certificate/route.ts` - API endpoint
- `/CONTESTANT_CERTIFICATE_GENERATION.md` - Certificate generation docs

## Future Enhancements

### 1. Admin Toggle
Add admin panel to enable/disable globally:
```typescript
const globalFeatureFlag = await getFeatureFlag('certificate_generation');
const isCertificateEnabled = 
  globalFeatureFlag || 
  searchParams.get('cert') === 'enabled';
```

### 2. Scheduled Availability
Enable only during specific periods:
```typescript
const isAvailablePeriod = () => {
  const now = new Date();
  const startDate = new Date('2025-10-01');
  const endDate = new Date('2025-10-31');
  return now >= startDate && now <= endDate;
};
```

### 3. Per-Contingent Control
Enable for specific contingents only:
```typescript
const contingentHasCertAccess = 
  allowedContingents.includes(session.user.contingentId);
```

## Summary

The certificate generation feature is controlled by a simple URL parameter (`?cert=enabled`) to:
- Keep the default UI clean
- Prevent accidental certificate generation
- Provide on-demand access when needed
- Allow easy testing and rollout

This is a **workflow control**, not a security measure. Actual security is enforced at the API and database levels.

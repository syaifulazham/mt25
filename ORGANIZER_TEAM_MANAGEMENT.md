# Organizer Team Management for Contingents

Successfully implemented team creation and member management functionality for organizers on the contingent detail page.

## Overview

Organizers (ADMIN and OPERATOR roles) can now create teams and assign members on behalf of contingent managers directly from the contingent detail page at `/organizer/contingents/[id]`.

## Features Implemented

### 1. Backend APIs

#### Team Creation API
**Endpoint:** `POST /api/organizer/contingents/[id]/teams`

**Request Body:**
```json
{
  "name": "Team Alpha",
  "description": "Optional team description",
  "contestId": 1,
  "maxMembers": 4
}
```

**Features:**
- Creates teams for a specific contingent
- Validates contest existence
- Generates unique team hashcode
- Only accessible by ADMIN and OPERATOR roles
- No manager assignment needed (organizer-created teams)

#### Team Members API
**Endpoint:** `POST /api/organizer/teams/[id]/members`

**Request Body:**
```json
{
  "contestantId": 123,
  "role": "optional"
}
```

**Features:**
- Adds contestants to teams
- Validates contestant belongs to same contingent
- Checks team capacity
- Prevents duplicate memberships

**Endpoint:** `DELETE /api/organizer/teams/[id]/members`

**Request Body:**
```json
{
  "teamMemberId": 456
}
```

**Features:**
- Removes members from teams
- Validates team member exists
- Updates member counts

### 2. Frontend Component

**Component:** `PaginatedTeamsList` (Enhanced)
**Location:** `/src/app/organizer/contingents/_components/paginated-teams-list.tsx`

#### Features:

**Team Creation:**
- Modal dialog for creating new teams
- Select contest from dropdown
- Set team name, description, and max members
- Real-time validation
- Success/error toast notifications

**Team List Display:**
- Shows all teams for the contingent
- Displays team name, hashcode, status badge
- Shows contest name and member count
- "Manage" button for each team (admin only)
- Integrated into existing Teams tab

**Member Management:**
- Full-width modal for managing team members
- Add members from available contestants
- View current team members in a table
- Remove members with confirmation
- Real-time member count updates
- Prevents adding members beyond capacity
- Shows only contestants from same contingent

#### UI Elements:
- **Create Team Dialog:**
  - Team name input (required)
  - Contest selector (required)
  - Max members input (1-10, default 4)
  - Description textarea (optional)
  
- **Manage Members Dialog:**
  - Add member section with contestant dropdown
  - Current members table with name, education level, gender
  - Remove button for each member
  - Shows member count vs. capacity

### 3. Integration

**Page:** `/organizer/contingents/[id]/page.tsx`
**Component:** `ContingentDetailTabs`

The team management functionality is integrated into the existing **Teams tab**:
- Unified with the existing team display
- "Create Team" and "Manage Members" functionality only visible to ADMIN users
- No separate panel - all functionality is in the Teams tab
- Seamlessly integrated with the existing UI

## User Workflow

### Creating a Team

1. Navigate to `/organizer/contingents/[id]`
2. Click on the **Teams** tab
3. If no teams exist:
   - Click "Create Team" button in empty state
4. If teams exist (ADMIN only):
   - Existing teams are displayed
   - Create functionality is in the dialogs
5. Fill in team details:
   - Enter team name
   - Select contest (with code prefix)
   - Set max members (optional)
   - Add description (optional)
6. Click "Create Team"
7. Page refreshes showing the new team

### Managing Team Members

1. Click on the **Teams** tab
2. Find the team you want to manage
3. Click the **"Manage"** button next to the team (ADMIN only)
4. **Add Members:**
   - Select contestant from dropdown (shows only available contestants)
   - Click add button (+ icon)
   - Member added to table
5. **Remove Members:**
   - Click trash icon next to member
   - Confirm removal
   - Member removed from team
6. Click "Close" to return to teams list

## Validation & Security

### Backend Validation:
- ✅ Role-based access (ADMIN/OPERATOR only)
- ✅ Contestant must belong to same contingent
- ✅ Team capacity validation
- ✅ Duplicate membership prevention
- ✅ Contest and contingent existence checks
- ✅ Unique hashcode generation

### Frontend Validation:
- ✅ Required fields validation
- ✅ Available contestants filtering
- ✅ Capacity indicators
- ✅ Real-time member count updates
- ✅ Confirmation dialogs for destructive actions

## API Authentication

All APIs use **NextAuth** with `getServerSession(authOptions)` for consistent authentication:
- Session-based authentication
- Role validation (ADMIN/OPERATOR)
- Same pattern as other organizer pages

## Files Modified/Created

### Backend APIs:
- ✅ `/src/app/api/organizer/contingents/[id]/teams/route.ts` - Modified (added POST)
- ✅ `/src/app/api/organizer/teams/[id]/members/route.ts` - Modified (updated POST, added DELETE)

### Frontend:
- ✅ `/src/app/organizer/contingents/_components/paginated-teams-list.tsx` - Enhanced (added team creation and member management)
- ✅ `/src/app/organizer/contingents/_components/contingent-detail-tabs.tsx` - Modified (added isAdmin prop)
- ✅ `/src/app/organizer/contingents/[id]/page.tsx` - Modified (passes isAdmin to tabs)

### Documentation:
- ✅ `/ORGANIZER_TEAM_MANAGEMENT.md` - This file

## Key Differences from Participant Team Management

| Feature | Participant (`/participants/teams`) | Organizer (`/organizer/contingents/[id]`) |
|---------|-----------------------------------|------------------------------------------|
| **Who Creates** | Contingent managers | Organizers (ADMIN/OPERATOR) |
| **Team Manager** | Creator becomes manager | No manager assignment |
| **Location** | Dedicated teams page | Contingent detail page |
| **Token Required** | Yes (for cutoff periods) | No (organizer bypass) |
| **Contestant Filter** | Same contingent only | Same contingent only |
| **Event Registration** | Yes (can register for events) | No (focus on roster) |

## Technical Notes

### Existing APIs Reused:
- `GET /api/organizer/contingents/[id]/contestants` - Fetch contingent contestants
- `GET /api/contests?isActive=true` - Fetch active contests
- `GET /api/organizer/contingents/[id]/teams` - List contingent teams
- `GET /api/organizer/teams/[id]/members` - Fetch team members

### Component State Management:
- React hooks for state management
- Real-time data fetching with cache control
- Optimistic UI updates after mutations
- Toast notifications for feedback

### Styling:
- Shadcn/UI components
- Tailwind CSS
- Responsive design
- Loading states with spinners
- Empty states with icons

## Benefits

1. **Efficiency:** Organizers can quickly create and manage teams without waiting for contingent managers
2. **Flexibility:** Support contingents that may not have active managers
3. **Control:** Organizers maintain oversight of team composition
4. **Consistency:** Same validation rules as participant-created teams
5. **User-Friendly:** Intuitive modal-based workflow with clear feedback

## Future Enhancements

Potential improvements:
- Bulk team creation from CSV
- Team templates for common configurations
- Transfer teams between contingents
- Team activity logs
- Export team rosters

## Testing Checklist

- ✅ Create team with valid data
- ✅ Create team with missing required fields (validation)
- ✅ Add member to team
- ✅ Add member when team at capacity (validation)
- ✅ Add contestant from different contingent (validation)
- ✅ Remove member from team
- ✅ View teams list
- ✅ View team members
- ✅ Non-admin users cannot see panel
- ✅ All toast notifications work
- ✅ Real-time updates after mutations

## Conclusion

Organizers can now fully manage teams and their members on behalf of contingent managers through an intuitive interface integrated into the existing **Teams tab** on the contingent detail page. This unified approach:

✅ **Eliminates duplicate UI** - No separate panel needed
✅ **Maintains consistency** - Uses existing Teams tab structure
✅ **Admin-only actions** - Create/Manage buttons only visible to ADMIN users
✅ **Seamless integration** - Works alongside existing team display
✅ **Better UX** - All team operations in one place

This complements the existing participant team management system at `/participants/teams` and provides organizers with the tools they need for administrative oversight.

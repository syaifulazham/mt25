# Attendance Detailed Download Feature

## Overview
Added a new download button to export comprehensive attendee information including all related data from contestant, school, and independent tables.

## Files Created/Modified

### 1. New API Endpoint
**File:** `/src/app/api/organizer/events/[eventId]/attendance/download-detailed-excel/route.ts`

**Purpose:** Generate detailed Excel file with comprehensive attendee information

**Features:**
- Fetches all contestant data with related information
- Includes school/independent institution data based on contingentType
- Includes manager/trainer data
- Supports contest group filtering (Kids, Teens, Youth)
- Generates multi-sheet Excel workbook

### 2. Updated Dashboard Page
**File:** `/src/app/organizer/events/[id]/attendance/dashboard/page.tsx`

**Changes:**
- Added new state: `downloadingDetailed`
- Added new handler: `handleDownloadDetailedExcel()`
- Added new button: "Download Detailed Info"
- Updated existing button label to "Download Summary" for clarity

## Excel File Structure

### Sheet 1: Contestants Details
Includes the following columns:
- **Basic Info:** No., Contestant ID, Name, IC Number, Email, Phone
- **Personal:** Gender, Date of Birth, Grade, Class
- **Affiliation:** Contingent, Contingent Type, State, State Code
- **Competition:** Team, Contest, Contest Group
- **Institution (School/Independent):**
  - Institution Name
  - Institution Address
  - Institution Contact
  - School Code (if SCHOOL contingent)
  - School PPD (if SCHOOL contingent)
  - School Jenis (if SCHOOL contingent)
- **Attendance:** Status, Date, Time

### Sheet 2: Managers Details
Includes the following columns:
- **Basic Info:** No., Manager ID, Name, IC Number, Email, Phone
- **Affiliation:** Contingent, Contingent Type, State, State Code
- **Event Info:** Event, Contest Group
- **Institution (School/Independent):**
  - Institution Name
  - Institution Address
  - Institution Contact
  - School Code (if SCHOOL contingent)
  - School PPD (if SCHOOL contingent)
  - School Jenis (if SCHOOL contingent)
- **Attendance:** Status, Date, Time

### Sheet 3: Summary
- Event Name
- Total Attended Contestants
- Total Attended Managers
- Total Attended Participants
- Export Date
- Export Type
- Filters Applied (if any)

## Features

### 1. **Comprehensive Data Export**
- All contestant information from `contestant` table
- School information from `school` table (when contingentType = SCHOOL)
- Independent information from `independent` table (when contingentType = INDEPENDENT)
- Manager/trainer information
- Attendance records with timestamps

### 2. **Smart Data Handling**
- Automatically determines whether to pull from `school` or `independent` table based on `contingentType`
- Uses `COALESCE` to merge school/independent data into common fields
- Handles NULL values gracefully with 'N/A' defaults

### 3. **Filter Support**
- Respects contest group filters (Kids, Teens, Youth)
- Includes filter information in summary sheet
- Appends filter suffix to filename

### 4. **User-Friendly**
- Clear button labels ("Download Summary" vs "Download Detailed Info")
- Loading states during download
- Success/error toast notifications
- Descriptive filename with timestamp

## SQL Queries

### Contestants Query
```sql
SELECT 
  ac.id as attendanceId,
  ac.contestantId,
  contestant.name as contestantName,
  contestant.ic, contestant.email, contestant.phoneNumber,
  contestant.gender, contestant.dateOfBirth,
  contestant.grade, contestant.class,
  cg.name as contingentName,
  cg.contingentType,
  st.name as stateName,
  tm.name as teamName,
  co.name as contestName,
  co.contestGroup,
  COALESCE(school.name, independent.name) as institutionName,
  COALESCE(school.address, independent.address) as institutionAddress,
  school.code, school.ppd, school.jenis
FROM attendanceContestant ac
INNER JOIN contestant ON ac.contestantId = contestant.id
LEFT JOIN school ON cg.schoolId = school.id
LEFT JOIN independent ON cg.independentId = independent.id
WHERE ac.eventId = ?
```

### Managers Query
```sql
SELECT 
  am.id as attendanceId,
  am.managerId,
  manager.name as managerName,
  manager.ic, manager.email, manager.phoneNumber,
  cg.name as contingentName,
  cg.contingentType,
  COALESCE(school.name, independent.name) as institutionName,
  COALESCE(school.address, independent.address) as institutionAddress,
  school.code, school.ppd, school.jenis
FROM attendanceManager am
INNER JOIN manager ON am.managerId = manager.id
LEFT JOIN school ON cg.schoolId = school.id
LEFT JOIN independent ON cg.independentId = independent.id
WHERE am.eventId = ?
```

## Usage

1. **Navigate to:** `/organizer/events/[id]/attendance/dashboard`
2. **Apply filters** (optional): Select Kids, Teens, or Youth
3. **Click "Download Detailed Info"** button
4. **Excel file downloads** with name: `Attendance_Detailed_Event[ID]_[Filters]_[Date].xlsx`

## File Naming Convention

- **Basic:** `Attendance_Detailed_Event13_2025-11-16.xlsx`
- **With Filters:** `Attendance_Detailed_Event13_Kids-Teens_2025-11-16.xlsx`

## Security

- ✅ **Authentication Required:** Only ADMIN and OPERATOR roles can download
- ✅ **Session Validation:** Uses NextAuth server session
- ✅ **Event Validation:** Checks if event exists before processing
- ✅ **SQL Injection Protection:** Uses parameterized queries

## Error Handling

- Invalid event ID → 400 Bad Request
- Unauthorized access → 401 Unauthorized
- Event not found → 404 Not Found
- Database/processing errors → 500 Internal Server Error
- All errors logged to console with stack trace

## Differences Between Summary vs Detailed Download

| Feature | Summary Download | Detailed Download |
|---------|-----------------|-------------------|
| **File Size** | Smaller | Larger |
| **Contestant Info** | Basic | Comprehensive + School/Independent |
| **Manager Info** | Basic | Comprehensive + School/Independent |
| **Institution Data** | ❌ No | ✅ Yes (Name, Address, Contact, Code, PPD, Jenis) |
| **Personal Details** | Basic | Full (Gender, DOB, Grade, Class) |
| **Use Case** | Quick attendance check | Full database export for analysis |

## Testing Checklist

- [ ] Download works for SCHOOL contingent type
- [ ] Download works for INDEPENDENT contingent type
- [ ] School-specific fields (code, ppd, jenis) appear correctly
- [ ] Independent data appears when contingentType is not SCHOOL
- [ ] Filter by Kids works
- [ ] Filter by Teens works
- [ ] Filter by Youth works
- [ ] Combined filters work
- [ ] Button states update correctly during download
- [ ] Toast notifications appear
- [ ] Excel file has all 3 sheets
- [ ] Column widths are appropriate
- [ ] Data formatting is correct (dates, N/A for nulls)
- [ ] Filename includes filters when applied
- [ ] Works with large datasets (2000+ attendees)

## Future Enhancements

- [ ] Add export to CSV option
- [ ] Add column selection UI (choose which fields to export)
- [ ] Add date range filter
- [ ] Add state/contingent filter
- [ ] Add data validation in Excel
- [ ] Add conditional formatting (highlight absent attendees)
- [ ] Add charts in Excel summary sheet
- [ ] Add email distribution feature

## Support

For issues or questions:
1. Check server logs for error details
2. Verify database schema matches expected structure
3. Ensure all required tables have data
4. Test with smaller datasets first

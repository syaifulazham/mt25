# Techlympics 2025 Attendance Blueprint

## Overview
this is a blue print to handle a team/contingent attendance check-in

## UI Components
shadcn ui components (already installed):
- card
- button
- toast
- modal
- input
- select
- date picker
- time picker
- table
- chart
- and many more

## Datasets
-- create dataset if still not exist in current version. use the following independent prisma models:
model attendanceContingent {
    id Int @id @default(autoincrement())
    hashcode String @unique
    contingentId Int
    eventId Int
    attendanceDate DateTime 
    attendanceTime DateTime 
    attendanceStatus String @default("Not Present")
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([contingentId])
    @@index([eventId])
    
}

model attendanceTeam {
    id Int @id @default(autoincrement())
    hashcode String @unique
    contingentId Int
    teamId Int
    eventId Int
    attendanceDate DateTime 
    attendanceTime DateTime 
    attendanceStatus String @default("Not Present")
    attendanceNote String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([contingentId])
    @@index([eventId])
    @@index([teamId])
}

model attendanceContestant {
    id Int @id @default(autoincrement())
    hashcode String @unique
    participantId Int
    contingentId Int
    eventId Int
    teamId Int
    contestantId Int
    attendanceDate DateTime 
    attendanceTime DateTime 
    attendanceStatus String @default("Not Present")
    attendanceNote String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([contingentId])
    @@index([eventId])
    @@index([teamId])
    @@index([contestantId])
}

model eventsection {
    id Int @id @default(autoincrement())
    eventId Int
    contestId Int
    sectionName String
    sectionCode String
    sectionDescription String?
    sectionStatus String @default("Active")
    sectionType String @default("Manual")
    sectionNote String?
    sectionPIC String?
    sectionPICPhone String? 
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
}

model attendance_endpoint {
    id Int @id @default(autoincrement())
    eventId Int
    endpointhash String @unique
    passcode String
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
}

## Access Control

- Only organizers with ADMIN and OPERATOR roles can access this endpoint

## page endpoint structure
/organizer/events/[eventId]/attendance
/organizer/events/[eventId]/attendance/log/byqrcode
/organizer/events/[eventId]/attendance/log/bymanual
/organizer/events/[eventId]/attendance/dashboard
/organizer/events/[eventId]/attendance/sections

## api endpoint structure
/api/organizer/events/[eventId]/attendance/*


## page flow
sidebar menu: the main menu for this feature shall be placed under 'Events' menu as a sub menu name 'Attendance' that will be redirected to /organizer/events/[eventId]/attendance

1. /organizer/events/[eventId]/attendance
-- buttons to sync approved/ accepted teams with the attendanceContingent,attendanceTeam and attendanceContestant datasets,navigate to log by qrcode, log by manual, and dashboard
-- each button is placed inside a card with icon and title along with a description

2. Sync Approved/ Accepted Teams
-- this button will check onload weather the data approved/ accepted teams rooted in eventcontestteam (by statusare in ['APPROVED', 'ACCEPTED', 'APPROVED_SPECIAL']) dataset is already synced to attendanceContingent,attendanceTeam and attendanceContestant datasets. If not, it will ask for confirmation to sync the data
-- syncing process will will: 
- create new records if not available in attendanceContingent,attendanceTeam and attendanceContestant datasets
- remove if no longer available in eventcontestteam dataset
- update existing records if any changes in eventcontestteam dataset
-- show syncing progress within the button's card

3. /organizer/events/[eventId]/attendance/log/byqrcode
this page will be used to create and manage attendance_endpoint dataset. add a button to create a new attendance_endpoint dataset and a table to list all attendance_endpoint datasets. 6 character alphanumeric passcode will be generated for each attendance_endpoint dataset.
3.1. QR Code Scanner  /attendance/events/[eventId]/[endpointhash]
-- in order to be authorized to open this page, the user must have a valid passcode. a popup modal will be shown to enter the passcode. if the passcode is correct, the user will be authorized to open this page.
-- 2 options for qrcode input: a) video camera, b) qrcode reader input device
-- the qrcode is merely derived from the hashcode of the contingent while syncing from eventcontestteam dataset
-- qr code scanner to scan the qr code of the contingent (this will mark all participants of the contingent as present)
-- once scanned, the qrcode will be matched with the attendanceContingent dataset
-- once matched, the attendanceContingent will be updated with the attendanceStatus as 'Present' and attendanceDate and attendanceTime as current date and time. the other records from attendanceTeam and attendanceContestant that share the same contingentId will be updated with the attendanceStatus as 'Present' and attendanceDate and attendanceTime as current date and time
-- once scanned, the contingent will be welcomed with a message

4. /organizer/events/[eventId]/attendance/log/bymanual
-- manual entry to mark the attendance of the participants
-- the page in a form of a table with column record number, state, contingent, button to mark attendance. User shall be able to retract the attendance mark

5. /organizer/events/[eventId]/attendance/dashboard
-- dashboard to view the attendance of the participants
-- show number of attendance against expected attendancy eg. 50/ 200 participants (25%). might use horizontal bar chart
-- show number of attendance group by day and hour

6. /organizer/events/[eventId]/attendance/sections
-- this page will show and register the sections of the event that associate with the competitions (example Competition:CABARAN BIOEKONOMI, section: 'Theatre Room 1', PIC: 'John Doe', PIC Contact: '0123456789')
-- this page will also show the attendance of the participants in a chart

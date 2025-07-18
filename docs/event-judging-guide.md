# Event Judging Integration Guide

This document provides an overview of the event-specific judging system implemented within the Techlympics platform.

## Overview

The judging system allows organizers to evaluate teams participating in contests within events. The system has been integrated into the event context, making it easier for organizers to manage judging workflows directly from the event administration pages.

## Key Features

1. **Event-based Judging Management**
   - Access judging for an event at `/organizer/events/[eventId]/judging`
   - View all contests within an event with judging statistics
   - Manage judging sessions per contest

2. **Team Evaluation**
   - List teams for a specific contest at `/organizer/events/[eventId]/judging/[contestId]/teams`
   - Create judging sessions for teams
   - Track judging progress with status indicators (Not Started, In Progress, Completed)

3. **Results & Scoreboard**
   - View contest results at `/organizer/events/[eventId]/judging/[contestId]/results`
   - Access consolidated event scoreboard at `/organizer/events/[eventId]/judging/scoreboard`
   - Filter results by state for ZONE-level events
   - Export results to CSV

## User Roles & Permissions

- **Administrators**: Full access to all judging features
- **Operators**: Can manage judging sessions and view results
- **Judges**: Can create and complete judging sessions for assigned contests
- **Viewers**: Can view results but cannot create or modify judging sessions

## Workflow

1. **Setup**
   - Assign judging templates to contests when creating event contests
   - Ensure teams are registered and marked as present via attendance system

2. **Judging Process**
   - Navigate to the event judging page
   - Select a contest to view its teams
   - Start judging sessions for teams
   - Complete evaluation based on judging template criteria
   - Submit scores and comments

3. **Results Review**
   - View contest-specific results showing rankings and scores
   - Analyze judge participation and scoring patterns
   - Filter results by state for zone-level events
   - Export results to CSV for offline analysis or reporting

## API Endpoints

### Judging Contests
- **GET /api/judging/contests**
  - Query params: `eventId` (required)
  - Returns contests for an event with judging templates and statistics

### Teams for Judging
- **GET /api/judging/teams**
  - Query params: `eventId` (required), `contestId` (required)
  - Returns teams available for judging with their current judging status

### Judging Sessions
- **POST /api/judging/sessions**
  - Body: `attendanceTeamId`, `eventContestId`
  - Creates a new judging session for a team

### Scoreboard
- **GET /api/judging/scoreboard**
  - Query params: `eventId` (required), `contestId` (optional), `stateId` (optional)
  - Returns aggregated results based on the event's scope area

### Scoreboard Export
- **GET /api/judging/scoreboard/export**
  - Query params: `eventId` (required), `contestId` (required), `stateId` (optional)
  - Returns a CSV file with detailed judging results

## Scope Area Logic

The system handles different event scope areas:

- **NATIONAL**: Results are aggregated by event and contest only
- **ZONE**: Results can be filtered by state
- **STATE**: Results are specific to the state associated with the event

## Integration with Other Systems

- **Attendance**: Uses the attendance system to identify present teams
- **Events**: Leverages event context for navigation and data filtering
- **Contingents**: Shows contingent details for each team
- **Judging Templates**: Uses templates to define evaluation criteria

## Best Practices

1. **Before the event**:
   - Ensure judging templates are created with appropriate criteria
   - Assign judging templates to contests
   - Assign judges to contests if needed

2. **During the event**:
   - Mark teams as present using the attendance system
   - Create judging sessions for teams
   - Monitor judging progress from the event judging page

3. **After judging**:
   - Review results on the scoreboard
   - Export results for record-keeping
   - Announce rankings based on average scores

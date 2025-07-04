import { NextRequest, NextResponse } from 'next/server';
import { authenticateOrganizerApi } from '@/lib/auth';
import { prismaExecute } from '@/lib/prisma';

/**
 * GET /api/organizer/events/teams-raw-data
 * Returns raw team-level data with filtering options
 */
export async function GET(request: NextRequest) {
  console.log('[teams-raw-data] API request received:', request.nextUrl.toString());
  
  // Check authorization
  const auth = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
  if (!auth.success) {
    console.log('[teams-raw-data] Auth failed:', auth);
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }

  try {
    // Parse query parameters for optional filtering
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId') ? parseInt(searchParams.get('eventId')!) : undefined;
    const zoneId = searchParams.get('zoneId') ? parseInt(searchParams.get('zoneId')!) : undefined;
    const stateId = searchParams.get('stateId') ? parseInt(searchParams.get('stateId')!) : undefined;
    const contestId = searchParams.get('contestId') ? parseInt(searchParams.get('contestId')!) : undefined;
    const contingentId = searchParams.get('contingentId') ? parseInt(searchParams.get('contingentId')!) : undefined;
    const includeEmptyTeams = searchParams.get('includeEmptyTeams') === 'true';
    
    console.log('[teams-raw-data] Query parameters:', { 
      eventId, 
      zoneId, 
      stateId, 
      contestId, 
      contingentId, 
      includeEmptyTeams 
    });

    console.log('[teams-raw-data] Executing Prisma query with filters');
    
    // Build the team data query
    const teamData = await prismaExecute((prisma) => prisma.eventcontestteam.findMany({
      where: {
        // Apply filters if provided
        eventcontest: {
          event: {
            scopeArea: 'ZONE', // Only include events with scopeArea = ZONE
            ...(eventId ? { id: eventId } : {}),
          },
          ...(contestId ? { contestId } : {}),
        },
        ...(contingentId ? { team: { contingentId } } : {}),
      },
      include: {
        eventcontest: {
          include: {
            event: {
              include: {
                zone: true,
              }
            },
            contest: {
              include: {
                targetgroup: true
              }
            },
          }
        },
        team: {
          include: {
            members: true,
            contingent: {
              include: {
                school: {
                  include: {
                    state: {
                      include: {
                        zone: true,
                      }
                    }
                  }
                },
                independent: {
                  include: {
                    state: {
                      include: {
                        zone: true,
                      }
                    }
                  }
                },
                higherInstitution: {
                  include: {
                    state: {
                      include: {
                        zone: true,
                      }
                    }
                  }
                },
              }
            }
          }
        }
      }
    }));
    
    console.log(`[teams-raw-data] Raw query returned ${teamData.length} records`);
    
    // For debugging - output the first record if available
    if (teamData.length > 0) {
      const sampleRecord = teamData[0];
      console.log('[teams-raw-data] Sample record structure:', 
        JSON.stringify({
          id: sampleRecord.id,
          teamId: sampleRecord.teamId,
          eventcontestId: sampleRecord.eventcontestId,
          hasTeam: !!sampleRecord.team,
          hasMembers: sampleRecord.team ? (sampleRecord.team.members?.length ?? 0) > 0 : false
        })
      );
    }

    // Transform the data into the requested flat structure
    const flattenedTeamData = teamData.map(entry => {
      // Get state information based on contingent type
      let teamStateId, stateName, teamZoneId, zoneName, schoolLevel, independentType;
      const contingent = entry.team.contingent;
      
      if (contingent.school) {
        teamStateId = contingent.school.stateId;
        stateName = contingent.school.state?.name;
        teamZoneId = contingent.school.state?.zoneId;
        zoneName = contingent.school.state?.zone?.name;
        schoolLevel = contingent.school.level; // Add school level
      } else if (contingent.independent) {
        teamStateId = contingent.independent.stateId;
        stateName = contingent.independent.state?.name;
        teamZoneId = contingent.independent.state?.zoneId;
        zoneName = contingent.independent.state?.zone?.name;
        independentType = contingent.independent.type; // Add independent type
      } else if (contingent.higherInstitution) {
        teamStateId = contingent.higherInstitution.stateId;
        stateName = contingent.higherInstitution.state?.name;
        teamZoneId = contingent.higherInstitution.state?.zoneId;
        zoneName = contingent.higherInstitution.state?.zone?.name;
      }

      // Filter by zone or state if requested
      if ((zoneId !== undefined && teamZoneId !== zoneId) || 
          (stateId !== undefined && teamStateId !== stateId)) {
        return null; // Skip this record
      }

      // Get the member count
      const numberOfMembers = entry.team.members?.length || 0;

      // Skip teams with no members if includeEmptyTeams is false
      if (!includeEmptyTeams && numberOfMembers === 0) {
        return null;
      }

      // Get contingent display name
      const contingentName = contingent.contingentType === 'SCHOOL' && contingent.school
        ? contingent.school.name
        : contingent.name;
        
      // Map contestLevel from targetgroup.schoolLevel
      // Default to 'Kids' since we know all contests should be Kids
      let contestLevel = 'Kids';
      
      // Log contest and targetgroup for debugging
      console.log(`[teams-raw-data] Processing team ${entry.teamId} contest ${entry.eventcontest.contestId}:`, {
        contest: entry.eventcontest.contest.name,
        contestId: entry.eventcontest.contestId,
        hasTargetGroup: !!entry.eventcontest.contest.targetgroup,
        targetGroupLength: entry.eventcontest.contest.targetgroup?.length || 0,
        contestLevel: contestLevel
      });
      
      // Just for logging purposes, check if the target group exists
      if (entry.eventcontest.contest.targetgroup && entry.eventcontest.contest.targetgroup.length > 0) {
        const targetGroup = entry.eventcontest.contest.targetgroup[0];
        console.log(`[teams-raw-data] Found targetGroup for team ${entry.teamId}, schoolLevel:`, targetGroup.schoolLevel);
        // We'll override our default if we actually find a specific target group
        if (targetGroup.schoolLevel === 'Primary') {
          contestLevel = 'Kids';
        } else if (targetGroup.schoolLevel === 'Secondary') {
          contestLevel = 'Teens';
        } else if (targetGroup.schoolLevel === 'Higher Education') {
          contestLevel = 'Youth';
        }
      } else {
        console.log(`[teams-raw-data] No targetgroup for team ${entry.teamId}, using default 'Kids'`);
      }

      return {
        eventId: entry.eventcontest.eventId,
        eventName: entry.eventcontest.event.name,
        zoneId: teamZoneId,
        zoneName,
        stateId: teamStateId,
        stateName,
        contestId: entry.eventcontest.contestId,
        contestName: entry.eventcontest.contest.name,
        contestCode: entry.eventcontest.contest.code,
        contingentId: entry.team.contingentId,
        contingentName,
        contingentType: contingent.contingentType,
        teamId: entry.teamId,
        teamName: entry.team.name,
        numberOfMembers,
        // Add new fields
        schoolLevel: schoolLevel || null,
        independentType: independentType || null,
        contestLevel: contestLevel
      };
    }).filter(Boolean); // Remove null entries
    
    console.log(`[teams-raw-data] After transformation: ${flattenedTeamData.length} team records`);
    
    // Check if we're filtering out teams without members
    if (!includeEmptyTeams) {
      const teamsWithMembers = flattenedTeamData.filter(team => {
        // Safely check if numberOfMembers exists and is greater than 0
        return team && typeof team.numberOfMembers === 'number' && team.numberOfMembers > 0;
      });
      console.log(`[teams-raw-data] After filtering empty teams: ${teamsWithMembers.length} out of ${flattenedTeamData.length}`);
      return NextResponse.json(teamsWithMembers);
    }

    return NextResponse.json(flattenedTeamData);
  } catch (error) {
    console.error('Error fetching raw team data:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
}

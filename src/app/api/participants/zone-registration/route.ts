import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient, team, contestant, contest } from "@prisma/client";
const db = new PrismaClient();
import { authOptions } from "@/lib/auth";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

interface TeamMember {
  id: number;
  teamId: number;
  contestantId: number;
  role: string;
  contestant: {
    id: number;
    name: string;
    class_grade?: string;
    age?: number;
  };
}

interface TeamWithRelations extends team {
  contest: (contest & {
    targetgroup?: {
      minAge: number;
      maxAge: number;
    }[];
  }) | null;
  members: TeamMember[];
  eventcontestteam: {
    id: number;
    status: string;
  }[];
  managerTeams?: {
    id: number;
    manager: {
      id: number;
      name: string;
      email?: string;
      phoneNumber?: string;
    };
  }[];
  independentManagers?: {
    id: number;
    name: string;
    email?: string;
    phoneNumber?: string;
  }[];
}


// Helper function to process teams data
function processTeams(teams: TeamWithRelations[]) {
  // Check for members in multiple teams
  const contestantIds = teams.flatMap(team => 
    team.members.map((member: any) => member.contestant.id)
  );

  // Count occurrences of each contestant ID across all teams
  const contestantOccurrences: { [key: number]: number } = {};
  teams.forEach(team => {
    team.members.forEach(member => {
      const contestantId = member.contestant.id;
      contestantOccurrences[contestantId] = (contestantOccurrences[contestantId] || 0) + 1;
    });
  });

  return teams.map((team, index) => {
    // Check if any team member is in multiple teams
    const hasMultipleTeamMembers = team.members.some(
      (member: any) => contestantOccurrences[member.contestant.id] > 1
    );

    // Check if any team member is outside the contest's target age range
    
    // Get contest min and max age from target groups
    const teamContest = team.contest;
    
    // Initialize min and max age with default values
    let minAge = 100;
    let maxAge = 0;
    
    // If the contest has target groups, use their age ranges
    if (teamContest?.targetgroup && teamContest.targetgroup.length > 0) {
      teamContest.targetgroup.forEach((tg: any) => {
        if (tg.minAge < minAge) minAge = tg.minAge;
        if (tg.maxAge > maxAge) maxAge = tg.maxAge;
      });
    } else {
      // Fallback to contest min/max age if no target groups
      minAge = teamContest?.minAge || 0;
      maxAge = teamContest?.maxAge || 100;
    }

    // Flag for team members outside age range
    const membersOutsideAgeRange = team.members.filter((member: any) => {
      const memberAge = parseInt(member.contestant.age || '10');
      return memberAge < minAge || memberAge > maxAge;
    });
    const hasMembersOutsideAgeRange = membersOutsideAgeRange.length > 0;
    const ineligibleMembersCount = membersOutsideAgeRange.length;

    // Get the team's status from eventcontestteam
    let status = 'PENDING';
    if (team.eventcontestteam && team.eventcontestteam.length > 0) {
      status = team.eventcontestteam[0].status;
    }

    // Override status to INELIGIBLE if there are ineligible members
    // BUT preserve APPROVED_SPECIAL status even with target group mismatch
    if (hasMembersOutsideAgeRange && status !== 'APPROVED_SPECIAL') {
      status = 'INELIGIBLE';
    }

    // Format member data to include only what we need
    const formattedMembers = team.members.map(member => {
      return {
        id: member.contestant.id,
        name: member.contestant.name,
        class_grade: member.contestant.class_grade || '',
        age: member.contestant.age || '10',
        inMultipleTeams: contestantOccurrences[member.contestant.id] > 1
      };
    });

    return {
      id: team.id,
      recordNumber: index + 1,
      teamName: team.name,
      contestName: team.contest?.name || 'Unknown Contest',
      contestCode: team.contest?.code || '',
      numberOfMembers: team.members.length,
      status,
      hasMultipleTeamMembers,
      hasMembersOutsideAgeRange,
      ineligibleMembersCount,
      managerTeams: team.managerTeams || [],
      members: formattedMembers
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.log("API call received for zone registration");

    // Get participant ID from query params
    const url = new URL(req.url);
    const participantId = url.searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    // Log the participant ID
    console.log("Fetching teams for participant ID:", participantId);
    
    // First, find all contingents that this participant belongs to (either as manager or owner)
    console.log("Finding participant's contingents...");
    const participantContingents = await db.contingentManager.findMany({
      where: {
        participantId: parseInt(participantId)
      },
      select: {
        contingentId: true
      }
    });

    const contingentIds = participantContingents.map(cm => cm.contingentId);
    console.log(`Participant belongs to ${contingentIds.length} contingent(s):`, contingentIds);

    if (contingentIds.length === 0) {
      console.log("No contingents found for this participant, falling back to directly managed teams");
      // Fallback to only showing directly managed teams if no contingent relationship found
      const directlyManagedTeams = await db.team.findMany({
        where: {
          managers: {
            some: {
              participantId: parseInt(participantId)
            }
          },
          // Only include teams that exist in eventcontestteam
          eventcontestteam: {
            some: {}
          }
        },
        include: {
          contest: {
            include: {
              targetgroup: true  // Include target groups relation
            }
          },
          eventcontestteam: true,
          members: {
            include: {
              contestant: {
                select: {
                  id: true,
                  name: true,
                  age: true,
                  class_grade: true
                }
              }
            }
          },
          managerTeams: {
            include: {
              manager: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phoneNumber: true
                }
              }
            }
          },
          independentManagers: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true
            }
          }
        }
      }) as unknown as TeamWithRelations[];
      
      if (directlyManagedTeams.length === 0) {
        return NextResponse.json({ teams: [] });
      }
      
      // Process these teams and return them
      const formattedTeams = processTeams(directlyManagedTeams);
      return NextResponse.json({ teams: formattedTeams });
    }
    
    // Now try the full query to get all teams in the participant's contingents
    console.log("Attempting full query for all teams in participant's contingents...");
    const teamsFromContingents = await db.team.findMany({
      where: {
        contingentId: {
          in: contingentIds
        },
        // Only include teams that exist in eventcontestteam
        eventcontestteam: {
          some: {}
        }
      },
      include: {
        contest: {
          include: {
            targetgroup: true  // Include target groups relation
          }
        },
        eventcontestteam: true,
        members: {
          include: {
            contestant: {
              select: {
                id: true,
                name: true,
                age: true,
                class_grade: true
              }
            }
          }
        },
        // Include the many-to-many relationship with managers through teamManager table
        managers: {
          include: {
            participant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        // Include the manager-team many-to-many relation
        managerTeams: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true
              }
            }
          }
        },
        // Include independent managers (one-to-many)
        independentManagers: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true
          }
        }
      }
    }) as unknown as TeamWithRelations[];
    
    console.log(`Found ${teamsFromContingents.length} teams`);

    // If no teams found, return empty array
    if (teamsFromContingents.length === 0) {
      return NextResponse.json({ teams: [] });
    }

    // Process teams using the helper function
    const formattedTeams = processTeams(teamsFromContingents);

    // Function to calculate age based on date of birth
    const calculateAge = (dateOfBirth: Date): number => {
      const today = new Date();
      let age = today.getFullYear() - dateOfBirth.getFullYear();
      const monthDiff = today.getMonth() - dateOfBirth.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
        age--;
      }
      
      return age;
    };

    // Format the response data
    console.log("Formatting teams data...");
    
    // Debug: Log the structure of the first team to check if managers are included
    if (teamsFromContingents.length > 0) {
      console.log("First team data structure:", JSON.stringify({
        id: teamsFromContingents[0].id,
        name: teamsFromContingents[0].name,
        managerTeamsCount: teamsFromContingents[0].managerTeams?.length || 0,
        managerTeams: teamsFromContingents[0].managerTeams,
        independentManagersCount: teamsFromContingents[0].independentManagers?.length || 0,
        independentManagers: teamsFromContingents[0].independentManagers
      }, null, 2));
    }
    
    // Count occurrences of each contestant ID across all teams
    const contestantOccurrences: { [key: number]: number } = {};
    teamsFromContingents.forEach(team => {
      team.members.forEach(member => {
        const contestantId = member.contestant.id;
        contestantOccurrences[contestantId] = (contestantOccurrences[contestantId] || 0) + 1;
      });
    });

    // Format the response data
    console.log("Formatting teams data...");
    
    const formattedTeamsData = teamsFromContingents.map((team, index) => {
      // Check if any team member is in multiple teams
      const hasMultipleTeamMembers = team.members.some(
        (member: any) => contestantOccurrences[member.contestant.id] > 1
      );

      // Check if any team member is outside the contest's target age range
      
      // Get contest min and max age from target groups
      const teamContest = team.contest;
      
      // Initialize min and max age with default values
      let minAge = 100;
      let maxAge = 0;
      
      // If the contest has target groups, use their age ranges
      if (teamContest?.targetgroup && teamContest.targetgroup.length > 0) {
        teamContest.targetgroup.forEach((tg: any) => {
          if (tg.minAge < minAge) minAge = tg.minAge;
          if (tg.maxAge > maxAge) maxAge = tg.maxAge;
        });
      } else {
        // Fallback to direct contest fields or defaults
        minAge = teamContest?.minAge || 0;
        maxAge = teamContest?.maxAge || 100;
      }
      
      // Count members outside age range
      let ineligibleMembersCount = 0;
      let hasMembersOutsideAgeRange = false;
      
      // Use forEach to count ALL ineligible members (not just the first one)
      team.members.forEach((member) => {
        const age = Number(member.contestant.age);
        const isOutsideRange = age < minAge || age > maxAge;
        if (isOutsideRange) {
          ineligibleMembersCount++;
          hasMembersOutsideAgeRange = true;
          console.log(`Team ${team.name}: Member ${member.contestant.name} (age: ${age}) is outside age range ${minAge}-${maxAge}`);
        }
      });
      
      // Debug log eligibility information
      console.log(`Team ${team.name}: minAge=${minAge}, maxAge=${maxAge}, ineligibleMembers=${ineligibleMembersCount}, hasMembersOutsideAgeRange=${hasMembersOutsideAgeRange}`);
      
      // Get the original status from eventcontestteam
      const originalStatus = team.eventcontestteam[0]?.status || "PENDING";
      
      // Override status to INELIGIBLE if any member is outside age range
      // BUT preserve APPROVED_SPECIAL status even with target group mismatch
      const status = (hasMembersOutsideAgeRange && originalStatus !== 'APPROVED_SPECIAL') 
        ? "INELIGIBLE" 
        : originalStatus;
        
      return {
        id: team.id,
        recordNumber: index + 1,
        teamName: team.name,
        contestName: team.contest?.name || "Unknown Contest",
        contestCode: team.contest?.code || "UNK",
        numberOfMembers: team.members.length,
        status: status,
        hasMultipleTeamMembers,
        hasMembersOutsideAgeRange,
        ineligibleMembersCount, // Add count of ineligible members
        // Include the managerTeams data in the response
        managerTeams: team.managerTeams || [],
        members: team.members.map((member) => {
          // Use age directly from contestant model

          return {
            id: member.contestant.id,
            name: member.contestant.name,
            class_grade: member.contestant.class_grade || '-',
            age: String(member.contestant.age),
            inMultipleTeams: contestantOccurrences[member.contestant.id] > 1
          };
        })
      };
    });

    return NextResponse.json({ teams: formattedTeamsData });

  } catch (error) {
    console.error("Error in zone registration API:", error);
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      errorMessage = `Error: ${error.message}`;
      console.error("Stack trace:", error.stack);
    }
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

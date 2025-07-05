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
    
    // Fetch teams managed by this participant with simple query first
    try {
      // First, just check if the participant has any teams at all
      const simpleCheck = await db.team.findMany({
        where: {
          managers: {
            some: {
              participantId: parseInt(participantId)
            }
          }
        },
        select: {
          id: true,
          name: true
        },
        take: 1
      });
      
      console.log("Simple team check result:", simpleCheck);
    } catch (e) {
      console.error("Error checking for teams:", e);
    }
    
    // Now try the full query
    console.log("Attempting full query...");
    const teams = await db.team.findMany({
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
        }
      }
    }) as unknown as TeamWithRelations[];
    
    console.log(`Found ${teams.length} teams`);
    
    // All contestant data has age values
    
    if (!teams || teams.length === 0) {
      return NextResponse.json([]);
    }

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
    const formattedTeams = teams.map((team, index) => {
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
      
      // Override status to INELIGIBLE if any member is outside age range
      const status = hasMembersOutsideAgeRange 
        ? "INELIGIBLE" 
        : team.eventcontestteam[0]?.status || "PENDING";
        
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

    return NextResponse.json(formattedTeams);
    
  } catch (error) {
    console.error("Error fetching zone registration data:", error);
    // Add more detailed error information
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

import { notFound } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { prismaExecute } from '@/lib/prisma';
import { Baby, Rocket, Gamepad2 } from 'lucide-react';

// Define types
type ZoneData = {
  id: number;
  name: string;
};

type StateData = {
  id: number;
  name: string;
};

type ContingentData = {
  id: number;
  name: string;
  contingentType: string;
  school: {
    name: string;
  } | null;
};

type ContestantData = {
  id: number;
  name: string;
  ic: string | null;
};

type TeamData = {
  id: number;
  name: string;
  members: {
    contestant: ContestantData;
  }[];
  eventcontestteam: {
    id: number;
    eventcontest: {
      id: number;
      contest: {
        id: number;
        name: string;
        code: string;
        targetgroup: {
          schoolLevel: string;
        }[];
      };
    };
  }[];
};

type TeamWithContestants = {
  id: number;
  name: string;
  members: ContestantData[];
};

type ContestGroup = {
  id: number;
  code: string;
  name: string;
  schoolLevel: string; // Added schoolLevel property
  teams: TeamWithContestants[];
};

type SchoolLevelGroup = {
  schoolLevel: string;
  contests: ContestGroup[];
};

type ContingentStatsResult = {
  zone: ZoneData | null;
  state: StateData | null;
  contingent: ContingentData | null;
  teamsBySchoolLevel: SchoolLevelGroup[];
};

/**
 * Get statistics for a specific contingent within a state and zone
 */
async function getContingentStatistics(
  zoneId: number, 
  stateId: number, 
  contingentId: number
): Promise<ContingentStatsResult> {
  // Get the zone info
  const zone = await prismaExecute<ZoneData | null>((prisma) => prisma.zone.findUnique({
    where: { id: zoneId },
    select: { id: true, name: true }
  }));

  // Get the state info
  const state = await prismaExecute<StateData | null>((prisma) => prisma.state.findUnique({
    where: { id: stateId },
    select: { id: true, name: true }
  }));

  // Get the contingent info
  const contingent = await prismaExecute<ContingentData | null>((prisma) => prisma.contingent.findUnique({
    where: { id: contingentId },
    select: {
      id: true,
      name: true,
      contingentType: true,
      school: {
        select: {
          name: true
        }
      }
    }
  }));

  // If zone, state, or contingent isn't found, return early
  if (!zone || !state || !contingent) {
    return {
      zone,
      state,
      contingent,
      teamsBySchoolLevel: []
    };
  }

  // Get all teams from this contingent with registered event contest teams
  const teams = await prismaExecute<TeamData[]>((prisma) => prisma.team.findMany({
    where: {
      contingentId,
      eventcontestteam: {
        some: {}
      }
    },
    select: {
      id: true,
      name: true,
      members: {
        select: {
          contestant: {
            select: {
              id: true,
              name: true,
              ic: true
            }
          }
        }
      },
      eventcontestteam: {
        select: {
          id: true,
          eventcontest: {
            select: {
              id: true,
              contest: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  targetgroup: {
                    select: {
                      schoolLevel: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }));

  // Group teams by schoolLevel and then by contest
  const schoolLevelGroups = new Map<string, Map<number, ContestGroup>>();

  // Process each team
  for (const team of teams) {
    // Process each event contest team
    for (const ect of team.eventcontestteam) {
      const contestId = ect.eventcontest.contest.id;
      const contestName = ect.eventcontest.contest.name;
      const contestCode = ect.eventcontest.contest.code;
      
      // If a contest has multiple target groups, use the first one
      // Note: We're taking the first targetgroup's schoolLevel or defaulting to 'Uncategorized'
      const schoolLevel = ect.eventcontest.contest.targetgroup?.[0]?.schoolLevel || 'Uncategorized';
      
      // Get or create school level group
      if (!schoolLevelGroups.has(schoolLevel)) {
        schoolLevelGroups.set(schoolLevel, new Map());
      }
      
      const contestsBySchoolLevel = schoolLevelGroups.get(schoolLevel)!;
      
      // Get or create contest group within this school level
      if (!contestsBySchoolLevel.has(contestId)) {
        contestsBySchoolLevel.set(contestId, {
          id: contestId,
          name: contestName,
          code: contestCode,
          schoolLevel: schoolLevel,
          teams: []
        });
      }
      
      const contestGroup = contestsBySchoolLevel.get(contestId)!;

      // Format team members
      const members = team.members.map(m => m.contestant);

      // Add team to contest group
      contestGroup.teams.push({
        id: team.id,
        name: team.name,
        members
      });
    }
  }

  // Convert schoolLevelGroups to array format for return
  const teamsBySchoolLevel: SchoolLevelGroup[] = [];
  
  // Process each school level
  for (const [schoolLevel, contestsMap] of schoolLevelGroups.entries()) {
    // Convert contests map to array
    const contests = Array.from(contestsMap.values());
    
    // Sort contests by name
    contests.sort((a, b) => a.name.localeCompare(b.name));
    
    // Sort teams by name within each contest
    for (const contestGroup of contests) {
      contestGroup.teams.sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '');
      });

      // Sort members by name
      for (const team of contestGroup.teams) {
        team.members.sort((a, b) => a.name.localeCompare(b.name));
      }
    }
    
    // Add this school level group to the result
    teamsBySchoolLevel.push({
      schoolLevel,
      contests
    });
  }
  
  // Sort school level groups
  teamsBySchoolLevel.sort((a, b) => a.schoolLevel.localeCompare(b.schoolLevel));

  return {
    zone,
    state,
    contingent,
    teamsBySchoolLevel
  };
}

// Define the mapping type with display name and icon component
type SchoolLevelMapping = {
  displayName: string;
  icon: React.ElementType;
};

// Function to map school level to display info
function getSchoolLevelInfo(schoolLevel: string): SchoolLevelMapping {
  const schoolLevelMap: Record<string, SchoolLevelMapping> = {
    'Primary': { displayName: 'Kids', icon: Baby },
    'Secondary': { displayName: 'Teens', icon: Gamepad2 },
    'Higher Education': { displayName: 'Youth', icon: Rocket },
    // Add more mappings if needed
  };
  
  return schoolLevelMap[schoolLevel] || { displayName: schoolLevel, icon: Gamepad2 };
}

export default async function ContingentStatsPage({ 
  params 
}: { 
  params: { 
    zoneId: string, 
    stateId: string,
    contingentId: string 
  } 
}) {
  // Get stats for this contingent
  const stats = await getContingentStatistics(
    parseInt(params.zoneId, 10), 
    parseInt(params.stateId, 10),
    parseInt(params.contingentId, 10)
  );
  
  const { zone, state, contingent, teamsBySchoolLevel } = stats;
  
  if (!zone || !state || !contingent) {
    notFound();
  }
  
  // Determine the display name based on contingent type
  const displayName = contingent.contingentType === 'SCHOOL' && contingent.school
    ? contingent.school.name
    : contingent.name;
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link 
              href={`/organizer/events/stats/${zone.id}/${state.id}`} 
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              ← Back to {state.name} State Statistics
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{displayName}</h1>
          <p className="text-gray-500">
            {contingent.contingentType === 'SCHOOL' ? 'School' : 'Independent'} Contingent
          </p>
        </div>
      </div>
      
      {teamsBySchoolLevel.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              There are no registered teams for this contingent.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-12">
          {teamsBySchoolLevel.map((schoolLevelGroup) => (
            <div key={schoolLevelGroup.schoolLevel} className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                {(() => {
                  const { displayName, icon: Icon } = getSchoolLevelInfo(schoolLevelGroup.schoolLevel);
                  return (
                    <>
                      <Icon className="h-6 w-6" />
                      <span>{displayName}</span>
                    </>
                  );
                })()}
              </h2>
              <div className="space-y-8">
                {schoolLevelGroup.contests.map((contestGroup: ContestGroup) => (
                  <Card key={contestGroup.id}>
                    <CardHeader>
                      <CardTitle>{contestGroup.code} {contestGroup.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {contestGroup.teams.length === 0 ? (
                        <p>No teams for this contest.</p>
                      ) : (
                        <div className="space-y-6">
                          {contestGroup.teams.map((team: TeamWithContestants) => (
                            <div key={team.id} className="border rounded-md p-4">
                              <div className="font-medium text-lg mb-2">
                                {team.name || `Team ${team.id}`}
                              </div>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>ID</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {team.members.map((member: ContestantData) => (
                                    <TableRow key={member.id}>
                                      <TableCell>{member.name}</TableCell>
                                      <TableCell>{member.ic || 'Not available'}</TableCell>
                                    </TableRow>
                                  ))}
                                  {team.members.length === 0 && (
                                    <TableRow>
                                      <TableCell colSpan={2} className="text-center text-gray-500">
                                        No team members found
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

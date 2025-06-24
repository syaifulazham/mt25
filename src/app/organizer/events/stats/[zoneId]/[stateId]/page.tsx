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

type StatsSummary = {
  schoolCount: number;
  teamCount: number;
  contestantCount: number;
};

type ContestGroup = {
  contestId: number;
  contestName: string;
  contestCode: string;
  contingents: ProcessedContingent[];
};

type SchoolLevelGroup = {
  schoolLevel: string;
  contests: ContestGroup[];
};

type ProcessedContingent = {
  id: number;
  displayName: string;
  contingentType: string;
  teamsCount: number;
  contestantsCount: number;
};

type TeamData = {
  id: number;
  contingentId: number;
  members: { contestantId: number }[];
  eventcontestteam: {
    eventcontestId: number;
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
      event: { name: string };
    };
  }[];
};

type ContingentData = {
  id: number;
  name: string;
  contingentType: string;
  school: { name: string } | null;
};

type StateStatsResult = {
  zone: ZoneData | null;
  state: StateData | null;
  groupedData: SchoolLevelGroup[];
  summary: StatsSummary;
};

/**
 * Get statistics for a specific state within a zone
 */
async function getStateStatistics(zoneId: number, stateId: number): Promise<StateStatsResult> {
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

  // If zone or state isn't found, return early
  if (!zone || !state) {
    return {
      zone,
      state,
      groupedData: [],
      summary: { schoolCount: 0, teamCount: 0, contestantCount: 0 }
    };
  }

  // Get all contingents from this state
  const contingents = await prismaExecute<ContingentData[]>((prisma) => prisma.contingent.findMany({
    where: {
      OR: [
        { school: { stateId } },
        { independent: { stateId } },
        { higherInstitution: { stateId } }
      ]
    },
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

  const contingentIds = contingents.map(c => c.id);

  // Get all teams from these contingents with registered event contest teams
  const teams = await prismaExecute<TeamData[]>((prisma) => prisma.team.findMany({
    where: {
      contingentId: { in: contingentIds },
      eventcontestteam: {
        some: {}
      }
    },
    select: {
      id: true,
      contingentId: true,
      members: {
        select: {
          contestantId: true
        }
      },
      eventcontestteam: {
        select: {
          eventcontestId: true,
          eventcontest: {
            select: {
              id: true,
              eventId: true,
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
              },
              event: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    }
  })) as TeamData[];

  // Maps to store processed data
  const schoolLevelMap = new Map<string, SchoolLevelGroup>();
  const contestGroupMap = new Map<number, ContestGroup>();
  const contingentMap = new Map<number, ProcessedContingent>();

  // Process each team
  for (const team of teams) {
    const contingent = contingents.find(c => c.id === team.contingentId);
    
    if (!contingent) continue;

    // Process each event contest team
    for (const ect of team.eventcontestteam) {
      const contest = ect.eventcontest.contest;
      const contestId = contest.id;
      const contestName = contest.name;
      const contestCode = contest.code;
      
      // Determine school level: use first targetgroup or default
      const schoolLevel = contest.targetgroup && contest.targetgroup.length > 0
        ? contest.targetgroup[0].schoolLevel
        : 'Uncategorized';

      // Get or create school level group
      if (!schoolLevelMap.has(schoolLevel)) {
        schoolLevelMap.set(schoolLevel, {
          schoolLevel,
          contests: []
        });
      }
      
      // Get or create contest group
      if (!contestGroupMap.has(contestId)) {
        const contestGroup = {
          contestId,
          contestName,
          contestCode,
          contingents: []
        };
        contestGroupMap.set(contestId, contestGroup);
        
        // Add to appropriate school level group
        schoolLevelMap.get(schoolLevel)!.contests.push(contestGroup);
      }
      
      const contestGroup = contestGroupMap.get(contestId)!;

      // Get or create contingent entry
      const contingentKey = contingent.id;
      if (!contingentMap.has(contingentKey)) {
        // Determine display name based on contingent type
        const displayName = contingent.contingentType === 'SCHOOL' && contingent.school
          ? contingent.school.name
          : contingent.name;

        const contingentEntry: ProcessedContingent = {
          id: contingent.id,
          displayName,
          contingentType: contingent.contingentType,
          teamsCount: 0,
          contestantsCount: 0
        };

        contingentMap.set(contingentKey, contingentEntry);
        contestGroup.contingents.push(contingentEntry);
      }

      // Update team and contestant counts
      const contingentEntry = contingentMap.get(contingentKey)!;
      contingentEntry.teamsCount += 1;
      contingentEntry.contestantsCount += team.members.length;
    }
  }

  // Convert to array and sort
  const schoolLevelGroups = Array.from(schoolLevelMap.values());
  
  // Sort school level groups (Primary first, then Secondary, then Higher Education)
  schoolLevelGroups.sort((a, b) => {
    // Custom order: Primary, Secondary, Higher Education, then others alphabetically
    const order: { [key: string]: number } = {
      'Primary': 1,
      'Secondary': 2,
      'Higher Education': 3,
    };
    
    const orderA = order[a.schoolLevel] || 99;
    const orderB = order[b.schoolLevel] || 99;
    
    if (orderA === orderB) {
      return a.schoolLevel.localeCompare(b.schoolLevel);
    }
    
    return orderA - orderB;
  });
  
  // Sort contests within school levels alphabetically
  for (const schoolLevelGroup of schoolLevelGroups) {
    schoolLevelGroup.contests.sort((a, b) => a.contestName.localeCompare(b.contestName));
    
    // Sort contingents by name within each contest
    for (const contestGroup of schoolLevelGroup.contests) {
      contestGroup.contingents.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }
  }

  // Calculate summary data
  const uniqueContingentIds = new Set<number>();
  const uniqueSchoolContingentIds = new Set<number>();
  let totalTeams = 0;
  let totalContestants = 0;

  for (const schoolLevelGroup of schoolLevelGroups) {
    for (const contestGroup of schoolLevelGroup.contests) {
      for (const contingent of contestGroup.contingents) {
        uniqueContingentIds.add(contingent.id);
        if (contingent.contingentType === 'SCHOOL') {
          uniqueSchoolContingentIds.add(contingent.id);
        }
        totalTeams += contingent.teamsCount;
        totalContestants += contingent.contestantsCount;
      }
    }
  }

  const summary = {
    schoolCount: uniqueSchoolContingentIds.size,
    teamCount: totalTeams,
    contestantCount: totalContestants
  };

  return {
    zone,
    state,
    groupedData: schoolLevelGroups,
    summary
  };
}

// Helper function to get custom display name and icon for school levels
function getSchoolLevelInfo(schoolLevel: string) {
  switch (schoolLevel) {
    case 'Primary':
      return { displayName: 'Kids', icon: <Baby size={20} /> };
    case 'Secondary':
      return { displayName: 'Teens', icon: <Gamepad2 size={20} /> };
    case 'Higher Education':
      return { displayName: 'Youth', icon: <Rocket size={20} /> };
    default:
      return { displayName: schoolLevel, icon: null };
  }
}

export default async function StateStatsPage({ params }: { params: { zoneId: string, stateId: string } }) {
  // Get stats for this state
  const stats = await getStateStatistics(parseInt(params.zoneId, 10), parseInt(params.stateId, 10));
  const { zone, state, summary, groupedData } = stats;
  
  if (!zone || !state) {
    notFound();
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/organizer/events/stats/${zone.id}`} className="text-sm text-blue-500 hover:text-blue-700">
              ← Back to {zone.name} Zone Statistics
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{state.name} State Statistics</h1>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{summary?.schoolCount || 0}</CardTitle>
            <CardDescription>Schools</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{summary?.teamCount || 0}</CardTitle>
            <CardDescription>Teams</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{summary?.contestantCount || 0}</CardTitle>
            <CardDescription>Contestants</CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      {groupedData.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              There are no registered teams in {state.name}.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedData.map((schoolLevelGroup: SchoolLevelGroup) => {
            const { displayName, icon } = getSchoolLevelInfo(schoolLevelGroup.schoolLevel);
            return (
              <Card key={schoolLevelGroup.schoolLevel} className="mb-6">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center gap-2">
                    {icon}
                    <CardTitle>{displayName}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-6">
                    {schoolLevelGroup.contests.map((contestGroup: ContestGroup) => (
                      <div key={contestGroup.contestId} className="border rounded-lg shadow-sm">
                        <div className="p-4 border-b bg-gray-50">
                          <h3 className="text-lg font-semibold">
                            {contestGroup.contestCode} {contestGroup.contestName}
                          </h3>
                        </div>
                        <div className="p-4">
                          {contestGroup.contingents.length === 0 ? (
                            <p>No data available for this contest.</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Contingent</TableHead>
                                  <TableHead className="text-right">Teams</TableHead>
                                  <TableHead className="text-right">Contestants</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {contestGroup.contingents.map((contingent: ProcessedContingent) => (
                                  <TableRow key={contingent.id}>
                                    <TableCell className="font-medium">
                                      <Link 
                                        href={`/organizer/events/stats/${zone.id}/${state.id}/${contingent.id}`}
                                        className="text-blue-500 hover:text-blue-700 hover:underline"
                                      >
                                        {contingent.displayName}
                                      </Link>
                                    </TableCell>
                                    <TableCell className="text-right">{contingent.teamsCount}</TableCell>
                                    <TableCell className="text-right">{contingent.contestantsCount}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

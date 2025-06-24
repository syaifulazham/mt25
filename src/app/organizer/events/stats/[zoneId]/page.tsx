import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prismaExecute } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


// Dynamic metadata
export async function generateMetadata({ params }: { params: { zoneId: string } }): Promise<Metadata> {
  const zone = await prismaExecute((prisma) => prisma.zone.findUnique({
    where: {
      id: parseInt(params.zoneId)
    }
  }));
  
  if (!zone) {
    return {
      title: "Zone Not Found | Organizer Portal",
      description: "The requested zone could not be found."
    };
  }
  
  return {
    title: `${zone.name} Zone Statistics | Organizer Portal`,
    description: `View detailed statistics for ${zone.name} Zone`
  };
}

// Define the shapes of objects returned by Prisma
type ZoneData = {
  id: number;
  name: string;
};

type StatsSummary = {
  schoolCount: number;
  teamCount: number;
  contestantCount: number;
};

type ZoneStatsResult = {
  zone: ZoneData | null;
  groupedData: ContestGroup[];
  summary: StatsSummary;
};

type SchoolData = {
  id: number;
  name: string;
  stateId: number;
};

type IndependentData = {
  id: number;
  name: string;
  stateId: number;
};

type StateData = {
  id: number;
  name: string;
};

// Union type to handle different contingent structures from Prisma queries
type ContingentData = {
  id: number;
  name: string;
  contingentType: string; // Using string instead of enum to accommodate Prisma's return type
  independentId?: number | null;
  schoolId?: number | null;
  school?: {
    id: number;
    name: string;
    stateId?: number;
  } | null;
  independent?: {
    id: number;
    name: string;
    stateId: number;
  } | null;
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
      };
      event: { name: string };
    };
  }[];
};

type ProcessedContingent = {
  id: number;
  displayName: string;
  contingentType: string;
  teamsCount: number;
  contestantsCount: number;
};

type StateGroup = {
  stateId: number;
  stateName: string;
  contingents: ProcessedContingent[];
};

type ContestGroup = {
  contestId: number;
  contestName: string;
  contestCode: string;
  stateGroups: StateGroup[];
};

async function getZoneStatistics(zoneId: number) {
  // First, get the zone to ensure it exists
  const zone = await prismaExecute<ZoneData | null>((prisma) => prisma.zone.findUnique({
    where: {
      id: zoneId
    },
    select: {
      id: true,
      name: true
    }
  }));
  
  if (!zone) {
    return { zone: null, groupedData: [] };
  }
  
  // Get all states in this zone
  const states = await prismaExecute<StateData[]>((prisma) => prisma.state.findMany({
    where: { zoneId },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  }));

  // Create a map of state IDs to state names for quick lookup
  const stateNameMap = new Map<number, string>();
  states.forEach(state => {
    stateNameMap.set(state.id, state.name.replace('WILAYAH PERSEKUTUAN', 'WP'));
  });
  
  // Get school contingents with their school, state, and teams
  const schoolContingents = await prismaExecute<ContingentData[]>((prisma) => prisma.contingent.findMany({
    where: {
      contingentType: "SCHOOL",
      school: {
        state: {
          zoneId
        }
      },
      teams: {
        some: {
          eventcontestteam: {
            some: {}
          }
        }
      }
    },
    select: {
      id: true,
      name: true,
      contingentType: true,
      schoolId: true,
      school: {
        select: {
          id: true,
          name: true,
          stateId: true
        }
      }
    }
  }));
  
  // Get independent contingents with their independent entity, state, and teams
  const independentContingents = await prismaExecute<ContingentData[]>((prisma) => prisma.contingent.findMany({
    where: {
      contingentType: "INDEPENDENT",
      independent: {
        state: {
          zoneId
        }
      },
      teams: {
        some: {
          eventcontestteam: {
            some: {}
          }
        }
      }
    },
    select: {
      id: true,
      name: true,
      contingentType: true,
      independentId: true,
      independent: {
        select: {
          id: true,
          name: true,
          stateId: true
        }
      }
    }
  }));
  
  // Get all contingent IDs
  const contingentIds = [
    ...schoolContingents.map(c => c.id),
    ...independentContingents.map(c => c.id)
  ];
  
  if (contingentIds.length === 0) {
    return { zone, groupedData: [] };
  }

  // Create a state ID map for independent contingents without additional queries
  const independentStateMap = new Map<number, number>();
  for (const contingent of independentContingents) {
    if (contingent.independent && contingent.independent.stateId) {
      independentStateMap.set(contingent.id, contingent.independent.stateId);
    }
  }
  
  // Get teams from these contingents with their event registrations and members
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
                  code: true
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

  // Process data to extract contest information
  const contestGroups = new Map<number, ContestGroup>();

  // Process each team to collect contest and contingent data
  for (const team of teams) {
    for (const ect of team.eventcontestteam) {
      // Group by contest ID
      const contestId = ect.eventcontest.contest.id;
      const contestName = ect.eventcontest.contest.name;
      const contestCode = ect.eventcontest.contest.code;
      
      // Find or create contest group
      let contestGroup = contestGroups.get(contestId);
      if (!contestGroup) {
        contestGroup = {
          contestId,
          contestName,
          contestCode,
          stateGroups: []
        };
        contestGroups.set(contestId, contestGroup);
      }

      // Get state ID for this contingent
      let stateId: number | undefined;
      
      // Check if this is a school contingent
      const schoolContingent = schoolContingents.find(c => c.id === team.contingentId);
      if (schoolContingent && schoolContingent.school && schoolContingent.school.stateId) {
        stateId = schoolContingent.school.stateId;
      } else {
        // Assume this is an independent contingent
        stateId = independentStateMap.get(team.contingentId);
      }

      // Skip if we couldn't determine the state
      if (!stateId) continue;

      // Get state name for this state ID
      const stateName = stateNameMap.get(stateId) || `State ID: ${stateId}`;

      // Find or create state group in this contest
      let stateGroup = contestGroup.stateGroups.find(sg => sg.stateId === stateId);
      if (!stateGroup) {
        stateGroup = {
          stateId,
          stateName,
          contingents: []
        };
        contestGroup.stateGroups.push(stateGroup);
      }

      // Find contingent in this state group
      const contingent = schoolContingent || independentContingents.find(c => c.id === team.contingentId);
      if (!contingent) continue;
      
      let contingentEntry = stateGroup.contingents.find(c => c.id === contingent.id);
      if (!contingentEntry) {
        // Determine display name based on contingent type
        let displayName = contingent.name;
        if (contingent.contingentType === "SCHOOL" && contingent.school) {
          displayName = contingent.school.name;
        }

        contingentEntry = {
          id: contingent.id,
          displayName,
          contingentType: contingent.contingentType,
          teamsCount: 0,
          contestantsCount: 0
        };
        stateGroup.contingents.push(contingentEntry);
      }

      // Update team and contestant counts
      contingentEntry.teamsCount += 1;
      contingentEntry.contestantsCount += team.members.length;
    }
  }

  // Convert to array and sort
  const groupedData = Array.from(contestGroups.values());

  // Sort contest groups by name
  groupedData.sort((a: ContestGroup, b: ContestGroup) => a.contestName.localeCompare(b.contestName));

  // Sort state groups by name within each contest
  for (const contestGroup of groupedData) {
    contestGroup.stateGroups.sort((a: StateGroup, b: StateGroup) => a.stateName.localeCompare(b.stateName));
    
    // Sort contingents by name within each state group
    for (const stateGroup of contestGroup.stateGroups) {
      stateGroup.contingents.sort((a: ProcessedContingent, b: ProcessedContingent) => {
        return a.displayName.localeCompare(b.displayName);
      });
    }
  }

  // Calculate summary data
  const uniqueContingentIds = new Set<number>();
  const uniqueSchoolContingentIds = new Set<number>();
  let totalTeams = 0;
  let totalContestants = 0;

  for (const contestGroup of groupedData) {
    for (const stateGroup of contestGroup.stateGroups) {
      for (const contingent of stateGroup.contingents) {
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
    zone: zone,
    groupedData: groupedData,
    summary: summary
  };
}

export default async function ZoneStatsPage({ params }: { params: { zoneId: string } }) {
  const { zone, groupedData, summary } = await getZoneStatistics(parseInt(params.zoneId));
  
  if (!zone) {
    notFound();
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/organizer/events/stats" className="text-sm text-blue-500 hover:text-blue-700">
              ← Back to Statistics Overview
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{zone.name} Zone Statistics</h1>
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
              There are no registered teams in this zone.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedData.map((contestGroup: ContestGroup) => (
            <Card key={contestGroup.contestId}>
              <CardHeader>
                <CardTitle>{contestGroup.contestCode} {contestGroup.contestName}</CardTitle>
              </CardHeader>
              <CardContent>
                {contestGroup.stateGroups.length === 0 ? (
                  <p>No data available for this contest.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">State</TableHead>
                        <TableHead>Contingent</TableHead>
                        <TableHead className="text-right">Teams</TableHead>
                        <TableHead className="text-right">Contestants</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contestGroup.stateGroups.map((stateGroup: StateGroup) => (
                        <React.Fragment key={stateGroup.stateId}>
                          {stateGroup.contingents.map((contingent: ProcessedContingent, i: number) => (
                            <TableRow key={contingent.id}>
                              {i === 0 ? (
                                <TableCell rowSpan={stateGroup.contingents.length} className="font-medium align-top">
                                  {stateGroup.stateName}
                                </TableCell>
                              ) : null}
                              <TableCell>
                                <div>{contingent.displayName}</div>
                                <div className="text-xs text-gray-500">
                                  {contingent.contingentType === 'SCHOOL' ? 'School' : 'Independent'}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{contingent.teamsCount}</TableCell>
                              <TableCell className="text-right">{contingent.contestantsCount}</TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

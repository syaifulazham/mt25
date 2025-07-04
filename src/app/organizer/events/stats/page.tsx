import { Metadata } from "next";
import { prismaExecute } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StateStatsTable } from "./state-stats-table";
import { ContestStatsTable } from "./_components/contest-stats-table";
import { ContestStatsClient } from "./_components/contest-stats-client";
import { getContestStatistics } from "./_utils/contest-statistics";
import { getStateStatistics } from "./_utils/state-statistics";
import { StatsDebugView } from "./_components/stats-debug-view";

// Common type definitions
type Zone = {
  id: number;
  name: string;
};

type State = {
  id: number;
  name: string;
  zoneId: number;
  zone?: {
    id: number;
    name: string;
  };
};

type School = {
  id: number;
  name: string;
  level: string;
};

type Contestant = {
  id: number;
  name: string;
  age?: number;
};

type TeamMember = {
  id: number;
  contestant: Contestant;
};

type Contingent = {
  id: number;
  school?: { level: string; } | undefined;
  independent?: any;
  contingentType: string;
};

type Team = {
  id: number;
  contingent?: Contingent;
  members?: TeamMember[];
};

type Independent = {
  id: number;
  contingents: {
    id: number;
    teams: {
      id: number;
      members: {
        contestant: {
          age?: number;
        };
      }[];
    }[];
  }[];
};

type StateStats = {
  contingentsCount: number;
  teamCount: number;
  schoolsCount: number;
  primarySchools: number;
  secondarySchools: number;
  schoolTeams: number;
  primarySchoolTeams: number;
  secondarySchoolTeams: number;
  youthTeams: number;
  independentContingents: number;
  youthGroupContingents: number;
  parentContingents: number;
  independentContingentsWithU18: number;
  independentTeamsWithU18: number;
};

type StateWithStats = {
  state: State;
  stats: StateStats;
};

export const metadata: Metadata = {
  title: "Event Statistics | Organizer Portal",
  description: "View event statistics and analytics by state",
};

async function getStatsForState(stateId: number): Promise<StateStats> {
  // Get all teams with their contingents and schools that match the state
  // Only include teams that have eventcontestteam records
  const teams = await prismaExecute((prisma) => prisma.team.findMany({
    where: {
      OR: [
        { contingent: { school: { stateId } } },
        { contingent: { higherInstitution: { stateId } } },
        { contingent: { independent: { stateId } } }
      ],
      // Filter to only include teams with eventcontestteam records
      eventcontestteam: {
        some: {}
      }
    },
    select: {
      id: true,
      contingent: {
        select: {
          id: true,
          contingentType: true,
          school: {
            select: {
              level: true
            }
          },
          independent: {
            select: {
              type: true
            }
          }
        }
      },
      // Include eventcontestteam in the selection for debugging
      eventcontestteam: {
        select: {
          id: true
        }
      }
    }
  }));

  // Extract unique contingent IDs from teams and count them
  const uniqueContingentIds = new Set<number>();
  teams.forEach((team: any) => {
    if (team.contingent && team.contingent.id) {
      uniqueContingentIds.add(team.contingent.id);
    }
  });
  const contingentsCount = uniqueContingentIds.size;

  // Extract unique school contingents from the teams that have registered for events
  const schoolContingentIds = new Set<number>();
  const independentContingentIds = new Set<number>();
  const youthGroupContingentIds = new Set<number>();
  const parentContingentIds = new Set<number>();
  
  teams.forEach((team: any) => {
    if (team.contingent?.id) {
      if (team.contingent.contingentType === 'SCHOOL') {
        schoolContingentIds.add(team.contingent.id);
      } else if (team.contingent.contingentType === 'INDEPENDENT') {
        independentContingentIds.add(team.contingent.id);
        
        // Track independent contingent types
        if (team.contingent.independent?.type === 'YOUTH_GROUP') {
          youthGroupContingentIds.add(team.contingent.id);
        } else if (team.contingent.independent?.type === 'PARENT') {
          parentContingentIds.add(team.contingent.id);
        }
      }
    }
  });
  
  // Get unique school contingents with their level information
  const schoolContingents = Array.from(schoolContingentIds).map(id => {
    const team = teams.find((team: any) => team.contingent?.id === id);
    return team?.contingent;
  }).filter(Boolean);
  
  // Primary and secondary schools counts based on contingent type SCHOOL
  const primarySchools = schoolContingents.filter((contingent: any) => {
    const level = contingent.school?.level?.toLowerCase();
    return level === "rendah" || level === "primary" || level === "sekolah rendah";
  }).length;
  
  const secondarySchools = schoolContingents.filter((contingent: any) => {
    const level = contingent.school?.level?.toLowerCase();
    return level === "menengah" || level === "secondary" || level === "sekolah menengah";
  }).length;

  // Teams counts (all teams registered for events from this state - only with eventcontestteam)
  const teamCount = teams.length;
  
  // School teams counts - only teams with eventcontestteam records
  const primarySchoolTeams = teams.filter((team: any) => {
    const level = team.contingent?.school?.level?.toLowerCase();
    return (level === "rendah" || level === "primary" || level === "sekolah rendah") && 
           team.eventcontestteam && team.eventcontestteam.length > 0;
  }).length;
  
  const secondarySchoolTeams = teams.filter((team: any) => {
    const level = team.contingent?.school?.level?.toLowerCase();
    return (level === "menengah" || level === "secondary" || level === "sekolah menengah") && 
           team.eventcontestteam && team.eventcontestteam.length > 0;
  }).length;

  // Total school teams (contingentType !== INDEPENDENT) with eventcontestteam records
  const schoolTeams = teams.filter((team: any) => 
    team.contingent?.contingentType !== 'INDEPENDENT' && team.eventcontestteam && team.eventcontestteam.length > 0
  ).length;
  
  // Count unique independent contingents based on contingentType 'INDEPENDENT'
  const independentContingentsCount = independentContingentIds.size;
  
  // Count unique independent contingents with U18 members
  const independentContingentIdsWithU18: number[] = [];

  teams.forEach((team: any) => {
    if (team.contingent?.contingentType === 'INDEPENDENT' && team.members) {
      const hasU18 = team.members.some((member: any) => {
        return member.contestant?.age < 18;
      });
      
      if (hasU18 && team.contingent.id && !independentContingentIdsWithU18.includes(team.contingent.id)) {
        independentContingentIdsWithU18.push(team.contingent.id);
      }
    }
  });
  // Count the unique independent contingents with U18
  const independentContingentsWithU18 = independentContingentIdsWithU18.length;
  
  // Youth teams (from independent contingents - all members are under 18)
  const youthTeams = teams.filter((team: any) => 
    team.contingent?.contingentType === 'INDEPENDENT' && 
    team.eventcontestteam && team.eventcontestteam.length > 0 &&
    team.members?.every((member: any) => member.contestant?.age < 18)
  ).length;
  
  // Independent teams with U18 (at least one member under 18)
  const independentTeamsWithU18 = teams.filter((team: any) => 
    team.contingent?.contingentType === "INDEPENDENT" && 
    team.eventcontestteam && team.eventcontestteam.length > 0 &&
    team.members?.some((member: any) => {
      const age = member.contestant?.age;
      return age !== null && age !== undefined && age < 18;
    })
  ).length;

  // Count youth group and parent contingents
  const youthGroupContingentsCount = youthGroupContingentIds.size;
  const parentContingentsCount = parentContingentIds.size;
  
  return {
    contingentsCount,
    teamCount,
    schoolsCount: schoolContingents.length,
    primarySchools,
    secondarySchools,
    schoolTeams,
    primarySchoolTeams,
    secondarySchoolTeams,
    youthTeams,
    independentContingents: independentContingentsCount,
    youthGroupContingents: youthGroupContingentsCount,
    parentContingents: parentContingentsCount,
    independentContingentsWithU18,
    independentTeamsWithU18
  };
}

// Server Component for Contest Statistics with zone and state filters
async function ContestStatsServer({ states, zones, searchParams }: { 
  states: State[], 
  zones: Zone[],
  searchParams?: { zoneId?: string, stateId?: string }
}) {
  // Convert query params to numbers if they exist
  const zoneId = searchParams?.zoneId ? parseInt(searchParams.zoneId, 10) : undefined;
  const stateId = searchParams?.stateId ? parseInt(searchParams.stateId, 10) : undefined;
  
  // Debug log to check if zoneId is converted to a proper number
  if (zoneId) {
    console.log(`[ContestStatsServer] zoneId type: ${typeof zoneId}, value: ${zoneId}`);
  }
  
  // Get contest stats with optional filters
  // 1 is a placeholder eventId, but we're now fetching from all zone events anyway
  const contestStats = await getContestStatistics(1, zoneId, stateId);
  
  console.log('[ContestStatsServer] Stats fetched with filters:', { 
    zoneId, 
    stateId,
    groupCount: contestStats.groupedContests.length,
    hasData: contestStats.groupedContests.some(g => g.contests.length > 0)
  });
  
  // Process states to ensure zoneId is available for filtering
  const statesWithZoneId = states.map(state => ({
    id: state.id,
    name: state.name,
    zoneId: state.zoneId
  }));
  
  return (
    <ContestStatsClient 
      groupedContests={contestStats.groupedContests}
      summary={contestStats.summary}
      zoneFilters={zones}
      stateFilters={statesWithZoneId}
    />
  );
}

export default async function EventStatsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  // Get zones
  const zones: Zone[] = await prismaExecute((prisma) => prisma.zone.findMany({
    orderBy: {
      name: 'asc'
    },
    select: {
      id: true,
      name: true
    }
  }));

  // Get states with zone info
  const states: State[] = await prismaExecute((prisma) => prisma.state.findMany({
    orderBy: {
      name: 'asc'
    },
    select: {
      id: true,
      name: true,
      zoneId: true,
      zone: {
        select: {
          id: true,
          name: true
        }
      }
    }
  }));

  // Get active event
  const activeEvent = await prismaExecute((prisma) => prisma.event.findFirst({
    where: { isActive: true },
    select: { id: true }
  }));

  if (!activeEvent) {
    throw new Error("No active event found");
  }

  // State stats with total and with zones
  const stateStats = await Promise.all(
    states.map(async (state) => {
      // Use the refactored getStateStatistics utility that uses teams-raw-data API
      // Pass the activeEvent object, not just the ID
      const stateStatsResult = await getStateStatistics(activeEvent, state.id);
      
      // Map to the format expected by the StateStatsTable component
      const stats = {
        // Use the new contingent count fields from the backend
        contingentsCount: stateStatsResult.summary.contingentCount || 0, // Total contingents
        teamCount: stateStatsResult.summary.teamCount || 0,
        schoolsCount: stateStatsResult.summary.schoolCount || 0,
        // Map schoolLevel based on Rendah (Primary) and Menengah (Secondary)
        primarySchools: stateStatsResult.summary.primarySchoolCount || 0,
        secondarySchools: stateStatsResult.summary.secondarySchoolCount || 0,
        // Map school teams from the backend API
        schoolTeams: stateStatsResult.summary.schoolTeamsCount || 0,
        primarySchoolTeams: stateStatsResult.summary.primarySchoolTeamsCount || 0,
        secondarySchoolTeams: stateStatsResult.summary.secondarySchoolTeamsCount || 0,
        youthTeams: 0,
        // Use independentCount from the backend
        independentContingents: stateStatsResult.summary.independentCount || 0,
        // Use the new Youth Group and Parent counts from the backend
        youthGroupContingents: stateStatsResult.summary.youthGroupCount || 0,
        parentContingents: stateStatsResult.summary.parentCount || 0,
        independentContingentsWithU18: 0,
        independentTeamsWithU18: 0
      };
      
      return { 
        state: {
          ...state,
          zone: state.zone || { id: 0, name: 'Unknown' } // Ensure zone is always defined
        },
        stats 
      };
    })
  );
  
  // Sort states by zone name first, then by state name
  stateStats.sort((a, b) => {
    // First compare zone names
    const zoneComparison = a.state.zone.name.localeCompare(b.state.zone.name);
    if (zoneComparison !== 0) {
      return zoneComparison;
    }
    // If same zone, compare state names
    return a.state.name.localeCompare(b.state.name);
  });

  // Calculate total stats across all states
  const totalStats = stateStats.reduce((acc: StateStats, { stats }: { state: State; stats: StateStats }) => {
    return {
      contingentsCount: acc.contingentsCount + stats.contingentsCount,
      teamCount: acc.teamCount + stats.teamCount,
      schoolsCount: acc.schoolsCount + stats.schoolsCount,
      primarySchools: acc.primarySchools + stats.primarySchools,
      secondarySchools: acc.secondarySchools + stats.secondarySchools,
      schoolTeams: acc.schoolTeams + stats.schoolTeams,
      primarySchoolTeams: acc.primarySchoolTeams + stats.primarySchoolTeams,
      secondarySchoolTeams: acc.secondarySchoolTeams + stats.secondarySchoolTeams,
      youthTeams: acc.youthTeams + stats.youthTeams,
      independentContingents: acc.independentContingents + stats.independentContingents,
      youthGroupContingents: acc.youthGroupContingents + stats.youthGroupContingents,
      parentContingents: acc.parentContingents + stats.parentContingents,
      independentContingentsWithU18: acc.independentContingentsWithU18 + stats.independentContingentsWithU18,
      independentTeamsWithU18: acc.independentTeamsWithU18 + stats.independentTeamsWithU18
    };
  }, {
    contingentsCount: 0,
    teamCount: 0,
    schoolsCount: 0,
    primarySchools: 0,
    secondarySchools: 0,
    schoolTeams: 0,
    primarySchoolTeams: 0,
    secondarySchoolTeams: 0,
    youthTeams: 0,
    independentContingents: 0,
    youthGroupContingents: 0,
    parentContingents: 0,
    independentContingentsWithU18: 0,
    independentTeamsWithU18: 0
  } as StateStats);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Event Statistics</h1>
      
      <Tabs defaultValue={searchParams.tab?.toString() || "by-state"} className="mt-8">
        <TabsList className="mb-4">
          <TabsTrigger value="by-state">By State</TabsTrigger>
          <TabsTrigger value="by-contest">By Contest</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>National Summary</CardTitle>
              <CardDescription>Combined statistics across all states</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gray-50 dark:bg-gray-900">
                  <CardHeader>
                    <CardTitle className="text-lg">Contingents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt>Total Contingents:</dt>
                        <dd className="font-semibold">{totalStats.contingentsCount}</dd>
                      </div>
                      <div className="flex justify-between pl-4">
                        <dt>School Contingents:</dt>
                        <dd className="font-semibold">{totalStats.schoolsCount}</dd>
                      </div>
                      <div className="flex justify-between pl-4">
                        <dt>Independent Contingents:</dt>
                        <dd className="font-semibold">{totalStats.independentContingents}</dd>
                      </div>
                      <div className="flex justify-between pl-8">
                        <dt>Youth Group:</dt>
                        <dd className="font-semibold">{totalStats.youthGroupContingents}</dd>
                      </div>
                      <div className="flex justify-between pl-8">
                        <dt>Parent:</dt>
                        <dd className="font-semibold">{totalStats.parentContingents}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Total Teams:</dt>
                        <dd className="font-semibold">{totalStats.teamCount}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50 dark:bg-gray-900">
                  <CardHeader>
                    <CardTitle className="text-lg">Schools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt>Total Schools:</dt>
                        <dd className="font-semibold">{totalStats.schoolsCount}</dd>
                      </div>
                      <div className="flex justify-between pl-4">
                        <dt>Primary Schools:</dt>
                        <dd className="font-semibold">{totalStats.primarySchools}</dd>
                      </div>
                      <div className="flex justify-between pl-4">
                        <dt>Secondary Schools:</dt>
                        <dd className="font-semibold">{totalStats.secondarySchools}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50 dark:bg-gray-900">
                  <CardHeader>
                    <CardTitle className="text-lg">School Teams</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt>Total School Teams:</dt>
                        <dd className="font-semibold">{totalStats.schoolTeams}</dd>
                      </div>
                      <div className="flex justify-between pl-4">
                        <dt>Primary School Teams:</dt>
                        <dd className="font-semibold">{totalStats.primarySchoolTeams}</dd>
                      </div>
                      <div className="flex justify-between pl-4">
                        <dt>Secondary School Teams:</dt>
                        <dd className="font-semibold">{totalStats.secondarySchoolTeams}</dd>
                      </div>
                      <div className="flex justify-between pl-4">
                        <dt>Youth Teams:</dt>
                        <dd className="font-semibold">{totalStats.youthTeams}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50 dark:bg-gray-900">
                  <CardHeader>
                    <CardTitle className="text-lg">Independent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt>Total Independent:</dt>
                        <dd className="font-semibold">{totalStats.independentContingents}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Youth Groups:</dt>
                        <dd className="font-semibold">{totalStats.youthGroupContingents}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Parents:</dt>
                        <dd className="font-semibold">{totalStats.parentContingents}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50 dark:bg-gray-900">
                  <CardHeader>
                    <CardTitle className="text-lg">Independent Teams</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt>Youth Group Teams:</dt>
                        <dd className="font-semibold">{totalStats.youthTeams}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="by-state">
          <div className="space-y-6">
            <StateStatsTable stateStats={stateStats} totalStats={totalStats} />
          </div>
        </TabsContent>
        
        <TabsContent value="by-contest" className="pt-4">
          <ContestStatsServer 
            states={states} 
            zones={zones} 
            searchParams={{
              zoneId: typeof searchParams.zoneId === 'string' ? searchParams.zoneId : undefined,
              stateId: typeof searchParams.stateId === 'string' ? searchParams.stateId : undefined
            }} />
        </TabsContent>
      </Tabs>
      
      {/* Debug view for national summary data */}
      <StatsDebugView 
        stateStats={stateStats} 
        totalStats={totalStats} 
        zones={zones} 
        states={states} 
      />
    </div>
  );
}

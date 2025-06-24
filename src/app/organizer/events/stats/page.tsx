import { Metadata } from "next";
import { prismaExecute } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StateStatsTable } from "./state-stats-table";
import { PrismaClient } from "@prisma/client";

type School = {
  id: number;
  name: string;
  level: string;
  contingent: any[];
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

type Team = {
  id: number;
  contingent: {
    school?: {
      level: string;
    };
    independent?: any;
    contingentType: string;
  };
  members: TeamMember[];
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

type State = {
  id: number;
  name: string;
  zone: {
    id: number;
    name: string;
  };
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
  independentContingentsWithU18: number;
  independentTeamsWithU18: number;
};

export const metadata: Metadata = {
  title: "Event Statistics | Organizer Portal",
  description: "View event statistics and analytics by state",
};

async function getStatsForState(stateId: number) {
  // Get only teams registered for events via EventContestTeam
  const teams = await prismaExecute((prisma) => prisma.team.findMany({
    where: {
      contingent: {
        OR: [
          { school: { stateId } },
          { higherInstitution: { stateId } },
          { independent: { stateId } }
        ]
      },
      // Only include teams that are registered for an event
      eventcontestteam: {
        some: {}
      }
    },
    include: {
      contingent: {
        include: {
          school: true,
          independent: true
        }
      },
      members: {
        include: {
          contestant: true
        }
      }
    }
  })) as any[];

  // Extract unique contingent IDs from teams and count them
  const uniqueContingentIds = new Set<number>();
  teams.forEach((team: any) => {
    if (team.contingent?.id) {
      uniqueContingentIds.add(team.contingent.id);
    }
  });
  const contingentsCount = uniqueContingentIds.size;

  // Extract unique schools from the teams that have registered for events
  const uniqueSchoolIds = new Set<number>();
  teams.forEach((team: any) => {
    if (team.contingent?.school?.id) {
      uniqueSchoolIds.add(team.contingent.school.id);
    }
  });
  
  // Create an array of unique schools
  const schools = Array.from(uniqueSchoolIds).map(id => {
    return teams.find((team: any) => team.contingent?.school?.id === id)?.contingent.school;
  }).filter(Boolean) as any[];

  // Primary and secondary schools counts (from the unique schools list)
  const primarySchools = schools.filter((school: { level: string }) => 
    school.level?.toLowerCase() === "rendah" || 
    school.level?.toLowerCase() === "primary" ||
    school.level?.toLowerCase() === "sekolah rendah"
  ).length;
  
  const secondarySchools = schools.filter((school: { level: string }) => 
    school.level?.toLowerCase() === "menengah" || 
    school.level?.toLowerCase() === "secondary" ||
    school.level?.toLowerCase() === "sekolah menengah"
  ).length;

  // Teams counts (all teams registered for events from this state)
  const teamCount = teams.length;
  
  // School teams counts
  const primarySchoolTeams = teams.filter((team: any) => {
    const level = team.contingent?.school?.level?.toLowerCase();
    return level === "rendah" || level === "primary" || level === "sekolah rendah";
  }).length;
  
  const secondarySchoolTeams = teams.filter((team: any) => {
    const level = team.contingent?.school?.level?.toLowerCase();
    return level === "menengah" || level === "secondary" || level === "sekolah menengah";
  }).length;

  // Total school teams (contingentType !== INDEPENDENT)
  const schoolTeams = teams.filter((team: any) => 
    team.contingent?.contingentType !== 'INDEPENDENT'
  ).length;
  
  // Count unique independent contingents with U18 members
  // Use an array to track contingent IDs instead of a Set to avoid TypeScript errors
  const independentContingentIdsWithU18: number[] = [];

  teams.forEach((team: any) => {
    if (team.contingent?.contingentType === 'INDEPENDENT' && team.members) {
      const hasU18 = team.members.some((member: any) => {
        return member.contestant.age < 18;
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
    team.members?.every((member: any) => member.contestant.age < 18)
  ).length;
  
  // Independent teams with U18 (at least one member under 18)
  const independentTeamsWithU18 = teams.filter((team: any) => 
    team.contingent?.contingentType === "INDEPENDENT" && 
    team.members?.some((member: any) => {
      const age = member.contestant.age;
      return age !== null && age !== undefined && age < 18;
    })
  ).length;

  return {
    contingentsCount,
    teamCount,
    schoolsCount: schools.length,
    primarySchools,
    secondarySchools,
    schoolTeams,
    primarySchoolTeams,
    secondarySchoolTeams,
    youthTeams,
    independentContingentsWithU18: independentContingentsWithU18,
    independentTeamsWithU18
  };
}

export default async function EventStatsPage() {
  // Get all states with their zones, ordered by zone name then state name
  const states = await prismaExecute<State[]>((prisma) => prisma.state.findMany({
    include: {
      zone: true
    },
    orderBy: [
      {
        zone: {
          name: 'asc'
        }
      },
      {
        name: 'asc'
      }
    ]
  }));

  // Get stats for each state
  const statsPromises = states.map(async (state: State) => {
    const stats = await getStatsForState(state.id);
    return { state, stats };
  });

  const stateStats = await Promise.all(statsPromises);

  // Calculate total stats across all states
  const totalStats = stateStats.reduce(
    (acc: StateStats, { stats }: { state: State; stats: StateStats }) => {
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
        independentContingentsWithU18: acc.independentContingentsWithU18 + stats.independentContingentsWithU18,
        independentTeamsWithU18: acc.independentTeamsWithU18 + stats.independentTeamsWithU18
      };
    },
    {
      contingentsCount: 0,
      teamCount: 0,
      schoolsCount: 0,
      primarySchools: 0,
      secondarySchools: 0,
      schoolTeams: 0,
      primarySchoolTeams: 0,
      secondarySchoolTeams: 0,
      youthTeams: 0,
      independentContingentsWithU18: 0,
      independentTeamsWithU18: 0
    }
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Event Statistics</h1>
      
      <Tabs defaultValue="by-state" className="mt-8">
        <TabsList className="mb-4">
          <TabsTrigger value="by-state">By State</TabsTrigger>
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
                      <div className="flex justify-between">
                        <dt>Primary Schools:</dt>
                        <dd className="font-semibold">{totalStats.primarySchools}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Secondary Schools:</dt>
                        <dd className="font-semibold">{totalStats.secondarySchools}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Independent with U18:</dt>
                        <dd className="font-semibold">{totalStats.independentContingentsWithU18}</dd>
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
                      <div className="flex justify-between">
                        <dt>Primary School Teams:</dt>
                        <dd className="font-semibold">{totalStats.primarySchoolTeams}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Secondary School Teams:</dt>
                        <dd className="font-semibold">{totalStats.secondarySchoolTeams}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Youth Teams:</dt>
                        <dd className="font-semibold">{totalStats.youthTeams}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Independent Teams with U18:</dt>
                        <dd className="font-semibold">{totalStats.independentTeamsWithU18}</dd>
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
      </Tabs>
    </div>
  );
}

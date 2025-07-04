import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prismaExecute } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Baby, Rocket, Gamepad2 } from 'lucide-react';
import { DownloadModal } from "../_components/download-modal";
import { getZoneStatistics } from "../_utils/zone-statistics";


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
  groupedData: SchoolLevelGroup[];
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
        targetgroup: {
          schoolLevel: string;
        }[];
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

type SchoolLevelGroup = {
  schoolLevel: string;
  contests: ContestGroup[];
};

type ContestGroup = {
  contestId: number;
  contestName: string;
  contestCode: string;
  stateGroups: StateGroup[];
};

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

export default async function ZoneStatsPage({ params, searchParams }: { params: { zoneId: string }, searchParams: { [key: string]: string | string[] | undefined } }) {
  const zoneId = Number(params.zoneId);
  const showDebug = searchParams.debug === 'true';
  const { zone, groupedData, summary, contingentSummary, rawTeamData } = await getZoneStatistics(zoneId);
  
  if (!zone) {
    notFound();
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Debug data section */}
      {showDebug && rawTeamData && (
        <div className="border border-red-500 p-4 bg-red-50 rounded-md">
          <h2 className="text-xl font-bold text-red-700 mb-2">🛠️ Debug: Raw Team Data</h2>
          <div className="mb-4">
            <p className="font-semibold">Total teams in raw data: {rawTeamData.length}</p>
            <p className="font-semibold">Teams counted in stats (with members {`>`} 0): {rawTeamData.filter(t => t.numberOfMembers > 0).length}</p>
            <p className="text-amber-600">Note: Statistics only count teams with at least one member. Empty teams are excluded from statistics but shown in this debug view.</p>
            
            <h3 className="font-semibold mt-2">Teams by member count:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Array.from(new Set(rawTeamData.map(t => t.numberOfMembers)))
                .sort((a, b) => a - b)
                .map(count => {
                  const teamsWithThisCount = rawTeamData.filter(t => t.numberOfMembers === count);
                  return (
                    <div key={count} className="border p-2 rounded">
                      <span className="font-medium">{count} members:</span> {teamsWithThisCount.length} teams
                      {count === 0 && <span className="text-red-500 ml-1">(empty)</span>}
                    </div>
                  );
                })}
            </div>
            
            <h3 className="font-semibold mt-2">Teams by contest:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Array.from(new Set(rawTeamData.map(t => t.contestName)))
                .sort()
                .map(contestName => {
                  const teamsInContest = rawTeamData.filter(t => t.contestName === contestName);
                  return (
                    <div key={contestName} className="border p-2 rounded">
                      <span className="font-medium">{contestName}:</span> {teamsInContest.length} teams
                    </div>
                  );
                })}
            </div>
          </div>
          
          <details className="mb-4">
            <summary className="cursor-pointer font-semibold text-red-700">Show teams with 0 members</summary>
            <div className="mt-2 overflow-auto max-h-60">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-red-100">
                    <th className="border p-1">Team ID</th>
                    <th className="border p-1">Team Name</th>
                    <th className="border p-1">Contingent</th>
                    <th className="border p-1">Contest</th>
                  </tr>
                </thead>
                <tbody>
                  {rawTeamData
                    .filter(team => team.numberOfMembers === 0)
                    .map(team => (
                      <tr key={team.teamId}>
                        <td className="border p-1">{team.teamId}</td>
                        <td className="border p-1">{team.teamName}</td>
                        <td className="border p-1">{team.contingentName}</td>
                        <td className="border p-1">{team.contestName}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </details>
          
          <details>
            <summary className="cursor-pointer font-semibold text-red-700">Show all raw team data</summary>
            <div className="mt-2 overflow-auto max-h-96">
              <table className="w-full border-collapse border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-1">Team ID</th>
                    <th className="border p-1">Team Name</th>
                    <th className="border p-1">Members</th>
                    <th className="border p-1">Contest</th>
                    <th className="border p-1">Contest Level</th>
                    <th className="border p-1">Contingent</th>
                    <th className="border p-1">Type</th>
                    <th className="border p-1">State</th>
                  </tr>
                </thead>
                <tbody>
                  {rawTeamData.map(team => (
                    <tr key={team.teamId} className={team.numberOfMembers === 0 ? "bg-red-50" : ""}>
                      <td className="border p-1">{team.teamId}</td>
                      <td className="border p-1">{team.teamName}</td>
                      <td className="border p-1">{team.numberOfMembers}</td>
                      <td className="border p-1">{team.contestName}</td>
                      <td className="border p-1">{team.contestLevel}</td>
                      <td className="border p-1">{team.contingentName}</td>
                      <td className="border p-1">{team.contingentType}</td>
                      <td className="border p-1">{team.stateName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/organizer/events/stats" className="text-sm text-blue-500 hover:text-blue-700">
              ← Back to Statistics Overview
            </Link>
          </div>
          <h1 className="text-3xl font-bold">{zone.name} Zone Statistics</h1>
        </div>
        <div>
          <DownloadModal 
            zoneId={zone.id} 
            zoneName={zone.name} 
            hasContingentData={contingentSummary.length > 0} 
          />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">
              {contingentSummary.reduce((total, state) => total + state.contingents.length, 0)}
            </CardTitle>
            <CardDescription>Contingents</CardDescription>
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

      {/* Summary by Contingent Table Section */}
      <Card className="mt-6 bg-green-50 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Summary by Contingent</CardTitle>
            <CardDescription>
              Total participation statistics grouped by state and contingent
            </CardDescription>
          </div>
          {/* Download button moved to centralized modal */}
        </CardHeader>
        <CardContent>
          {contingentSummary.length === 0 ? (
            <p>No data available.</p>
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
                {contingentSummary.map((stateSummary) => (
                  <React.Fragment key={stateSummary.stateId}>
                    {stateSummary.contingents.map((contingent, i) => (
                      <TableRow key={contingent.id}>
                        {i === 0 ? (
                          <TableCell rowSpan={stateSummary.contingents.length} className="font-medium align-top">
                            <Link 
                              href={`/organizer/events/stats/${zone.id}/${stateSummary.stateId}`}
                              className="text-blue-500 hover:text-blue-700 hover:underline"
                            >
                              {stateSummary.stateName}
                            </Link>
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <Link 
                            href={`/organizer/events/stats/${zone.id}/${stateSummary.stateId}/${contingent.id}`}
                            className="text-blue-500 hover:text-blue-700 hover:underline"
                          >
                            {contingent.displayName}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {contingent.contingentType === 'SCHOOL' ? 'School' : 'Independent'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{contingent.totalTeams}</TableCell>
                        <TableCell className="text-right">{contingent.totalContestants}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
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
          {groupedData.map((schoolLevelGroup: SchoolLevelGroup) => {
            const { displayName, icon: Icon } = getSchoolLevelInfo(schoolLevelGroup.schoolLevel);
            return (
              <div key={schoolLevelGroup.schoolLevel} className="space-y-4 mb-10 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <div className="bg-primary p-4 rounded-md">
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-primary-foreground">
                    {Icon && <Icon size={24} className="text-primary-foreground" />}
                    {displayName}
                  </h2>
                </div>
                {schoolLevelGroup.contests.map((contestGroup: ContestGroup) => (
                  <div key={contestGroup.contestId} className="space-y-4 mb-8 ml-4">
                    <div className="bg-secondary p-4 rounded-md">
                      <h3 className="text-xl font-bold">
                        {contestGroup.contestName}{" "}
                        <span className="text-sm font-normal bg-primary/10 px-2 py-1 rounded">
                          {contestGroup.contestCode}
                        </span>
                      </h3>
                    </div>
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
                                      <Link 
                                        href={`/organizer/events/stats/${zone.id}/${stateGroup.stateId}`}
                                        className="text-blue-500 hover:text-blue-700 hover:underline"
                                      >
                                        {stateGroup.stateName}
                                      </Link>
                                    </TableCell>
                                  ) : null}
                                  <TableCell>
                                    <Link 
                                      href={`/organizer/events/stats/${zone.id}/${stateGroup.stateId}/${contingent.id}`}
                                      className="text-blue-500 hover:text-blue-700 hover:underline"
                                    >
                                      {contingent.displayName}
                                    </Link>
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
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

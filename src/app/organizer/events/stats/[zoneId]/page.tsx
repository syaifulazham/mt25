import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prismaExecute } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadContingentSummaryButton } from "../_components/download-contingent-summary-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Baby, Rocket, Gamepad2 } from 'lucide-react';
import { DownloadStatsDocxButton } from "../_components/download-stats-docx-button";
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

export default async function ZoneStatsPage({ params }: { params: { zoneId: string } }) {
  const { zone, groupedData, summary, contingentSummary } = await getZoneStatistics(parseInt(params.zoneId));
  
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
        <div>
          <DownloadStatsDocxButton zoneId={zone.id} zoneName={zone.name} />
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

      {/* Summary by Contingent Table Section */}
      <Card className="mt-6 bg-green-50 border-green-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Summary by Contingent</CardTitle>
            <CardDescription>
              Total participation statistics grouped by state and contingent
            </CardDescription>
          </div>
          <div>
            {contingentSummary.length > 0 && (
              <DownloadContingentSummaryButton zoneId={zone.id} zoneName={zone.name} />
            )}
          </div>
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
              <div key={schoolLevelGroup.schoolLevel} className="space-y-4 mb-10">
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

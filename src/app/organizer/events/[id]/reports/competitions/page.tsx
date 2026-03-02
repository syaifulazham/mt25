"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Trophy,
  Users,
  Building,
  MapPin,
  Download,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { toast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContestData {
  contestName: string;
  contestId: number;
  contestGroup: string;
  stateName?: string;
  stateId?: number;
  contingentCount: number;
  teamCount: number;
  contestantCount: number;
}

interface ContestGroupData {
  contestGroup: string;
  contestGroupSummary: {
    totalContingents: number;
    totalTeams: number;
    totalContestants: number;
    totalContests: number;
  };
  contests: ContestData[];
}

interface StateData {
  stateName: string | null;
  stateId: number | null;
  stateSummary: {
    totalContingents: number;
    totalTeams: number;
    totalContestants: number;
    totalContests: number;
  };
  contestGroups: ContestGroupData[];
}

interface HierarchicalData {
  generalSummary: {
    totalContingents: number;
    totalTeams: number;
    totalContestants: number;
    totalContests: number;
  };
  states: StateData[];
}

interface CompetitionsOverview {
  scopeArea: string;
  data: HierarchicalData;
}

export default function CompetitionsOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  
  const [data, setData] = useState<CompetitionsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchCompetitionsData();
  }, [eventId]);

  const fetchCompetitionsData = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/reports/competitions-overview`);
      if (!response.ok) {
        throw new Error("Failed to fetch competitions data");
      }
      const competitionsData = await response.json();
      setData(competitionsData);
    } catch (error) {
      console.error("Error fetching competitions data:", error);
      toast({
        title: "Error",
        description: "Failed to load competitions data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'docx' | 'xlsx') => {
    setDownloading(format);
    
    try {
      const endpoint = format === 'docx' 
        ? `/api/organizer/events/${eventId}/reports/competitions-overview-docx`
        : `/api/organizer/events/${eventId}/reports/competitions-overview-xlsx`;
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `competitions-overview-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Competitions overview ${format.toUpperCase()} downloaded successfully`,
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Error",
        description: "Failed to download report",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleBackToReports = () => {
    router.push(`/organizer/events/${eventId}/reports`);
  };

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardShell>
    );
  }

  if (!data) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <p>No competitions data available</p>
        </div>
      </DashboardShell>
    );
  }

  // Data is already hierarchically structured from the API
  const hierarchicalData = data.data;

  const contestGroupSummaryOverall = (() => {
    const summaryMap = new Map<
      string,
      {
        totalContingents: number;
        totalTeams: number;
        totalContestants: number;
        totalContests: number;
      }
    >();

    hierarchicalData.states.forEach((state) => {
      state.contestGroups.forEach((group) => {
        const key = group.contestGroup || "Unknown Group";
        const existing =
          summaryMap.get(key) || {
            totalContingents: 0,
            totalTeams: 0,
            totalContestants: 0,
            totalContests: 0,
          };

        existing.totalContingents += group.contestGroupSummary.totalContingents;
        existing.totalTeams += group.contestGroupSummary.totalTeams;
        existing.totalContestants +=
          group.contestGroupSummary.totalContestants;
        existing.totalContests += group.contestGroupSummary.totalContests;

        summaryMap.set(key, existing);
      });
    });

    return Array.from(summaryMap.entries()).map(([contestGroup, summary]) => ({
      contestGroup,
      ...summary,
    }));
  })();

  const stateContestGroupMatrix = (() => {
    const rows: {
      stateName: string;
      kidsContingents: number;
      kidsContestants: number;
      teensContingents: number;
      teensContestants: number;
      youthContingents: number;
      youthContestants: number;
    }[] = [];

    const totals = {
      kidsContingents: 0,
      kidsContestants: 0,
      teensContingents: 0,
      teensContestants: 0,
      youthContingents: 0,
      youthContestants: 0,
    };

    hierarchicalData.states.forEach((state) => {
      const row = {
        stateName: state.stateName || "All States",
        kidsContingents: 0,
        kidsContestants: 0,
        teensContingents: 0,
        teensContestants: 0,
        youthContingents: 0,
        youthContestants: 0,
      };

      state.contestGroups.forEach((group) => {
        const key = (group.contestGroup || "").toUpperCase();
        if (key === "KIDS") {
          row.kidsContingents += group.contestGroupSummary.totalContingents;
          row.kidsContestants += group.contestGroupSummary.totalContestants;
        } else if (key === "TEENS") {
          row.teensContingents += group.contestGroupSummary.totalContingents;
          row.teensContestants += group.contestGroupSummary.totalContestants;
        } else if (key === "YOUTH") {
          row.youthContingents += group.contestGroupSummary.totalContingents;
          row.youthContestants += group.contestGroupSummary.totalContestants;
        }
      });

      totals.kidsContingents += row.kidsContingents;
      totals.kidsContestants += row.kidsContestants;
      totals.teensContingents += row.teensContingents;
      totals.teensContestants += row.teensContestants;
      totals.youthContingents += row.youthContingents;
      totals.youthContestants += row.youthContestants;

      rows.push(row);
    });

    return { rows, totals };
  })();

  return (
    <DashboardShell>
      <div className="space-y-6 mx-4 md:mx-6 lg:mx-8">
        <PageHeader
          title="Competitions Overview"
          description="Detailed view of all competitions with participation statistics"
        />

        {/* Back Button */}
        <Button
          variant="outline"
          onClick={handleBackToReports}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Reports
        </Button>

        {/* General Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              General Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Total Competitions</TableCell>
                  <TableCell className="text-right font-bold">{hierarchicalData.generalSummary.totalContests}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Contingents</TableCell>
                  <TableCell className="text-right font-bold">{hierarchicalData.generalSummary.totalContingents}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Teams</TableCell>
                  <TableCell className="text-right font-bold">{hierarchicalData.generalSummary.totalTeams}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Contestants</TableCell>
                  <TableCell className="text-right font-bold">{hierarchicalData.generalSummary.totalContestants}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contest Group Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contestGroupSummaryOverall.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contest group data available for this event.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contest Group</TableHead>
                    <TableHead className="text-right">Contests</TableHead>
                    <TableHead className="text-right">Contingents</TableHead>
                    <TableHead className="text-right">Teams</TableHead>
                    <TableHead className="text-right">Contestants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contestGroupSummaryOverall.map((row) => (
                    <TableRow key={row.contestGroup}>
                      <TableCell className="font-medium">
                        {row.contestGroup}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {row.totalContests}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalContingents}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalTeams}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalContestants}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5" />
              Zone Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stateContestGroupMatrix.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No state-level contest group data available for this event.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead rowSpan={2}>State</TableHead>
                      <TableHead colSpan={2} className="text-center bg-green-100">
                        SEKOLAH RENDAH (Kids)
                      </TableHead>
                      <TableHead colSpan={2} className="text-center bg-blue-100">
                        SEKOLAH MENENGAH (Teens)
                      </TableHead>
                      <TableHead colSpan={2} className="text-center bg-orange-100">
                        BELIA (Youth)
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="text-right text-xs">Contingents</TableHead>
                      <TableHead className="text-right text-xs">Participants</TableHead>
                      <TableHead className="text-right text-xs">Contingents</TableHead>
                      <TableHead className="text-right text-xs">Participants</TableHead>
                      <TableHead className="text-right text-xs">Contingents</TableHead>
                      <TableHead className="text-right text-xs">Participants</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stateContestGroupMatrix.rows.map((row) => (
                      <TableRow key={row.stateName}>
                        <TableCell className="font-medium">{row.stateName}</TableCell>
                        <TableCell className="text-right">{row.kidsContingents}</TableCell>
                        <TableCell className="text-right">{row.kidsContestants}</TableCell>
                        <TableCell className="text-right">{row.teensContingents}</TableCell>
                        <TableCell className="text-right">{row.teensContestants}</TableCell>
                        <TableCell className="text-right">{row.youthContingents}</TableCell>
                        <TableCell className="text-right">{row.youthContestants}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold">TOTAL</TableCell>
                      <TableCell className="text-right font-semibold">
                        {stateContestGroupMatrix.totals.kidsContingents}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {stateContestGroupMatrix.totals.kidsContestants}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {stateContestGroupMatrix.totals.teensContingents}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {stateContestGroupMatrix.totals.teensContestants}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {stateContestGroupMatrix.totals.youthContingents}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {stateContestGroupMatrix.totals.youthContestants}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleDownload('docx')}
            disabled={downloading === 'docx'}
            className="flex items-center gap-2"
          >
            {downloading === 'docx' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download DOCX
          </Button>
          
          <Button
            onClick={() => handleDownload('xlsx')}
            disabled={downloading === 'xlsx'}
            variant="outline"
            className="flex items-center gap-2"
          >
            {downloading === 'xlsx' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download XLSX
          </Button>
        </div>

        {/* Hierarchical Competitions Display */}
        <Card>
          <CardHeader>
            <CardTitle>Competitions Details</CardTitle>
            <CardDescription>
              Hierarchical view: General totals → {data.scopeArea === 'ZONE' ? 'State totals → Contest group totals → ' : 'Contest group totals → '}Contest details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {hierarchicalData.states.map((state, stateIndex) => (
                <div key={`state-${stateIndex}`} className="space-y-6">
                  {/* State Section (for ZONE events) */}
                  {data.scopeArea === 'ZONE' && state.stateName && (
                    <div className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-6 w-6 text-blue-600" />
                        <h2 className="text-xl font-bold text-blue-900">{state.stateName}</h2>
                      </div>
                      
                      {/* State Summary Table */}
                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-blue-800">Metric</TableHead>
                              <TableHead className="text-right text-blue-800">Count</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium text-blue-700">Total Contests</TableCell>
                              <TableCell className="text-right font-bold text-blue-800">{state.stateSummary.totalContests}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-blue-700">Total Contingents</TableCell>
                              <TableCell className="text-right font-bold text-blue-800">{state.stateSummary.totalContingents}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-blue-700">Total Teams</TableCell>
                              <TableCell className="text-right font-bold text-blue-800">{state.stateSummary.totalTeams}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-blue-700">Total Contestants</TableCell>
                              <TableCell className="text-right font-bold text-blue-800">{state.stateSummary.totalContestants}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                  
                  {/* Contest Groups */}
                  {state.contestGroups.map((contestGroup, groupIndex) => (
                    <div key={`group-${groupIndex}`} className={`space-y-4 ${data.scopeArea === 'ZONE' ? 'ml-6 border-l-2 border-green-300 pl-4' : ''}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold text-green-800">{contestGroup.contestGroup}</h3>
                      </div>
                      
                      {/* Contest Group Summary Table */}
                      <div className="bg-green-50 p-3 rounded-lg mb-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-green-800">Metric</TableHead>
                              <TableHead className="text-right text-green-800">Count</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium text-green-700">Total Contests</TableCell>
                              <TableCell className="text-right font-bold text-green-800">{contestGroup.contestGroupSummary.totalContests}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-green-700">Total Contingents</TableCell>
                              <TableCell className="text-right font-bold text-green-800">{contestGroup.contestGroupSummary.totalContingents}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-green-700">Total Teams</TableCell>
                              <TableCell className="text-right font-bold text-green-800">{contestGroup.contestGroupSummary.totalTeams}</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium text-green-700">Total Contestants</TableCell>
                              <TableCell className="text-right font-bold text-green-800">{contestGroup.contestGroupSummary.totalContestants}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Contests Table */}
                      <div className={`${data.scopeArea === 'ZONE' ? 'ml-4' : ''}`}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Contest</TableHead>
                              <TableHead className="text-right">Contingents</TableHead>
                              <TableHead className="text-right">Teams</TableHead>
                              <TableHead className="text-right">Contestants</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {contestGroup.contests.map((contest, contestIndex) => (
                              <TableRow key={`contest-${contest.contestId}-${contestIndex}`}>
                                <TableCell className="font-medium">
                                  {contest.contestName}
                                </TableCell>
                                <TableCell className="text-right">
                                  {contest.contingentCount}
                                </TableCell>
                                <TableCell className="text-right">
                                  {contest.teamCount}
                                </TableCell>
                                <TableCell className="text-right">
                                  {contest.contestantCount}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

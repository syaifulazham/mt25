"use client";

import React, { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContestItem, ContestLevelGroup, ContestStatsResult } from "../_utils/contest-statistics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type FilterOption = { id: number; name: string };

type ZoneFilter = FilterOption;
type StateFilter = FilterOption & { zoneId?: number };

type ContestStatsTableProps = {
  groupedContests: ContestLevelGroup[];
  summary: {
    totalContests: number;
    totalTeams: number;
    totalContingents: number;
  };
  zoneFilters: FilterOption[];
  onFilterChange?: (filters: { zoneId?: number; stateId?: number }) => void;
  currentFilters?: { zoneId?: number; stateId?: number };
};

export function ContestStatsTable({ 
  groupedContests: rawGroupedContests, 
  summary: rawSummary, 
  zoneFilters,
  onFilterChange,
  currentFilters 
}: ContestStatsTableProps) {
  // Enhanced debugging for grouped contests
  console.log('[ContestStatsTable] Raw grouped contests received:', 
    rawGroupedContests?.map(g => ({
      contestLevel: g.contestLevel,
      contestsCount: g.contests.length
    })));
  
  console.log('[ContestStatsTable] Full raw data structure:', JSON.stringify({
    groupedContests: rawGroupedContests,
    summary: rawSummary,
    currentFilters
  }, null, 2));
  
  // Check if we actually have data with contests
  const hasRealData = rawGroupedContests && rawGroupedContests.some(group => 
    group.contests && group.contests.length > 0
  );
  
  console.log(`[ContestStatsTable] Has real data with contests: ${hasRealData}`);
  
  if (!rawGroupedContests) {
    console.warn('[ContestStatsTable] Warning: groupedContests is undefined');
  }

  // Keep all contests regardless of team count to show complete data
  console.log('[ContestStatsTable] Raw data before processing:', rawGroupedContests);
  
  // Avoid operations on undefined/null data
  const groupedContests = (rawGroupedContests || []).map(group => {
    if (!group || !group.contests) {
      console.log('[ContestStatsTable] Missing group or contests in:', group);
      return { contestLevel: group?.contestLevel || 'Unknown', contests: [], totals: { contingentCount: 0, teamCount: 0, contestantCount: 0 } };
    }
    
    console.log(`[ContestStatsTable] Processing group ${group.contestLevel} with ${group.contests.length} contests`);
    return {
      ...group,
      contests: group.contests // No filter applied - show all contests
    };
  }).filter(group => group.contests && group.contests.length > 0); // Still filter out empty groups
  
  console.log('[ContestStatsTable] Processed groupedContests:', groupedContests);

  // Recalculate summary based on filtered contests
  const summary = {
    totalContests: groupedContests.reduce((sum, group) => sum + group.contests.length, 0),
    totalTeams: groupedContests.reduce(
      (sum, group) => sum + group.contests.reduce((subSum, contest) => subSum + contest.teamCount, 0), 
      0
    ),
    totalContingents: rawSummary.totalContingents // Keep the original contingent count
  };
  
  // Check if group has data
  const groupHasData = (group: ContestLevelGroup) => {
    return group.contests.some(c => c.teamCount > 0);
  };
  
  // In the new structure, we don't use education levels anymore

  // Local state for filters and loading state
  const [selectedZone, setSelectedZone] = useState<string>(currentFilters?.zoneId ? currentFilters.zoneId.toString() : "all");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Helper function to render the contest table with provided grouped contests
  const renderContestTable = (contestGroups: ContestLevelGroup[]) => {
    return (
      <div className="space-y-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Contest Level</TableHead>
                <TableHead className="min-w-[140px]">Contest</TableHead>
                <TableHead className="text-right">Contingents</TableHead>
                <TableHead className="text-right">Teams</TableHead>
                <TableHead className="text-right">Contestants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contestGroups.map((group) => (
                <React.Fragment key={group.contestLevel}>
                  {/* Level header row */}
                  <TableRow className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-default">
                    <TableCell colSpan={2} className="font-semibold">
                      {group.contestLevel} Level
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {group.totals.contingentCount}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {group.totals.teamCount}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {group.totals.contestantCount}
                    </TableCell>
                  </TableRow>

                  {/* Contest rows */}
                  {group.contests.map((contest) => (
                    <TableRow key={contest.contestId} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <TableCell></TableCell>
                      <TableCell>{contest.contestName} ({contest.contestCode})</TableCell>
                      <TableCell className="text-right">{contest.contingentCount}</TableCell>
                      <TableCell className="text-right">{contest.teamCount}</TableCell>
                      <TableCell className="text-right">{contest.contestantCount}</TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}

              {/* Total row removed as per user request */}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Handle zone filter change
  const handleZoneChange = (value: string) => {
    console.log(`[ContestStatsTable] Zone tab changed to: ${value}`);
    setSelectedZone(value);
    setIsLoading(true); // Show loading state when changing tabs
    
    // If the onFilterChange callback exists, call it with the new filter
    if (onFilterChange) {
      const zoneIdFilter = value !== 'all' ? parseInt(value, 10) : undefined;
      onFilterChange({ zoneId: zoneIdFilter, stateId: currentFilters?.stateId });
      
      // Simulate end of loading after a brief delay
      setTimeout(() => setIsLoading(false), 500);
    } else {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Contest Statistics by Zone</CardTitle>
          <CardDescription>View contest statistics grouped by zone</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedZone || 'all'} className="w-full" onValueChange={handleZoneChange}>
            <TabsList className="mb-4 flex flex-wrap max-w-full overflow-x-auto gap-1">
              <TabsTrigger value="all">All Zones</TabsTrigger>
              {zoneFilters.map((zone) => (
                <TabsTrigger key={zone.id} value={zone.id.toString()}>
                  {zone.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Empty TabsContent to preserve the tab functionality but not render anything inside them */}
            <TabsContent value="all" />
            {zoneFilters.map((zone) => (
              <TabsContent key={zone.id} value={zone.id.toString()} />
            ))}
          </Tabs>
          
          {/* Contest table is now displayed outside the tabs */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center space-x-2">
                <Skeleton className="h-8 w-8 rounded-full animate-pulse" />
              </div>
              <p className="mt-2 text-gray-500">Loading contest statistics...</p>
            </div>
          ) : groupedContests.length > 0 ? (
            <div className="mt-6">
              {renderContestTable(groupedContests)}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No contest data available for the selected filter.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Summary card */}
      <Card className="mb-6">
        <CardHeader className="py-3">
          <CardTitle>Statistics Summary</CardTitle>
          <CardDescription>
            {currentFilters?.zoneId ? (
              <>Filtered by zone: <span className="font-medium">{zoneFilters.find(z => z.id === currentFilters.zoneId)?.name}</span></>
            ) : (
              "All zones"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
              <span>Total Contests:</span>
              <span className="font-bold">{summary.totalContests}</span>
            </div>
            <div className="flex justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
              <span>Total Contingents:</span>
              <span className="font-bold">{summary.totalContingents}</span>
            </div>
            <div className="flex justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
              <span>Total Teams:</span>
              <span className="font-bold">{summary.totalTeams}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Contest tables - grouped by level */}
      {groupedContests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No contest data available
          </CardContent>
        </Card>
      ) : (
        groupedContests.map((group) => 
          groupHasData(group) && (
            <Card key={group.contestLevel} className={cn(
              "mb-6",
              // Apply conditional styling based on level
              group.contestLevel.toLowerCase().includes('kids') ? "bg-green-50 dark:bg-green-900/20" :
              group.contestLevel.toLowerCase().includes('teens') ? "bg-blue-50 dark:bg-blue-900/20" :
              group.contestLevel.toLowerCase().includes('youth') ? "bg-purple-50 dark:bg-purple-900/20" :
              "bg-slate-50 dark:bg-slate-900/20"
            )}>
              <CardHeader className="py-4">
                <CardTitle className="text-xl">
                  {group.contestLevel}
                </CardTitle>
                <CardDescription>
                  {group.contests.length} contest{group.contests.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    {group.contests.map((contestItem) => (
                      <TableRow key={contestItem.contestCode}>
                        <TableCell className="font-medium">
                          <span className="font-bold text-muted-foreground mr-2">{contestItem.contestCode}</span>
                          {contestItem.contestName}
                        </TableCell>
                        <TableCell className="text-right">{contestItem.contingentCount}</TableCell>
                        <TableCell className="text-right">{contestItem.teamCount}</TableCell>
                        <TableCell className="text-right">{contestItem.contestantCount}</TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Group summary row */}
                    {group.contests.length > 0 && (
                      <TableRow className="bg-slate-100 dark:bg-slate-800 font-medium">
                        <TableCell>GROUP TOTAL</TableCell>
                        <TableCell className="text-right">{group.totals.contingentCount}</TableCell>
                        <TableCell className="text-right">{group.totals.teamCount}</TableCell>
                        <TableCell className="text-right">{group.totals.contestantCount}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        )
      )}
      
      {/* Overall Summary row */}
      {groupedContests.length > 0 && (
        <Card className="bg-slate-50 dark:bg-slate-900">
          <CardHeader className="py-3">
            <CardTitle>OVERALL TOTALS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex justify-between p-3 rounded-md bg-white dark:bg-slate-800">
                <span>Total Contests:</span>
                <span className="font-bold">{summary.totalContests}</span>
              </div>
              <div className="flex justify-between p-3 rounded-md bg-white dark:bg-slate-800">
                <span>Total Contingents:</span>
                <span className="font-bold">{summary.totalContingents}</span>
              </div>
              <div className="flex justify-between p-3 rounded-md bg-white dark:bg-slate-800">
                <span>Total Teams:</span>
                <span className="font-bold">{summary.totalTeams}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

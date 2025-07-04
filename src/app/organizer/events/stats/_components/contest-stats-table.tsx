"use client";

import { useState } from "react";
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
    totalContestants: number;
  };
  zoneFilters: ZoneFilter[];
  stateFilters: StateFilter[];
  onFilterChange?: (filters: { zoneId?: number, stateId?: number }) => void;
  currentFilters?: { zoneId?: number, stateId?: number };
};

export function ContestStatsTable({ 
  groupedContests: rawGroupedContests, 
  summary: rawSummary, 
  zoneFilters,
  stateFilters,
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

  // Local state for filters
  const [selectedZone, setSelectedZone] = useState<string | undefined>(
    currentFilters?.zoneId ? currentFilters.zoneId.toString() : undefined
  );
  
  const [selectedState, setSelectedState] = useState<string | undefined>(
    currentFilters?.stateId ? currentFilters.stateId.toString() : undefined
  );
  
  // Filter states based on selected zone
  const filteredStates = selectedZone === 'all' || !selectedZone
    ? stateFilters
    : stateFilters.filter(state => state.zoneId === parseInt(selectedZone, 10));

  // Handle zone filter change
  const handleZoneChange = (value: string) => {
    setSelectedZone(value);
    setSelectedState(undefined); // Reset state selection when zone changes
    
    if (onFilterChange) {
      onFilterChange({
        zoneId: value === "all" ? undefined : parseInt(value, 10),
        stateId: undefined
      });
    }
  };

  // Handle state filter change
  const handleStateChange = (value: string) => {
    setSelectedState(value);
    
    if (onFilterChange) {
      onFilterChange({
        zoneId: selectedZone === "all" ? undefined : 
               selectedZone ? parseInt(selectedZone, 10) : undefined,
        stateId: value === "all" ? undefined : parseInt(value, 10)
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filter Options</CardTitle>
          <CardDescription>Filter contest statistics by state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="w-full max-w-xs">
              <label className="text-sm font-medium mb-2 block">Zone</label>
              <Select
                value={selectedZone}
                onValueChange={handleZoneChange}
                disabled={!onFilterChange}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All Zones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Zones</SelectItem>
                  {zoneFilters && zoneFilters.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full max-w-xs">
              <label className="text-sm font-medium mb-2 block">State</label>
              <Select
                value={selectedState}
                onValueChange={handleStateChange}
                disabled={!onFilterChange || (selectedZone !== 'all' && !selectedZone)}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="All States" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {filteredStates.map((state) => (
                    <SelectItem key={state.id} value={state.id.toString()}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary card */}
      <Card className="mb-6">
        <CardHeader className="py-3">
          <CardTitle>Statistics Summary</CardTitle>
          <CardDescription>
            {currentFilters?.stateId ? (
              <>Filtered by state: <span className="font-medium">{stateFilters.find(s => s.id === currentFilters.stateId)?.name}</span></>
            ) : currentFilters?.zoneId ? (
              <>Filtered by zone: <span className="font-medium">{zoneFilters.find(z => z.id === currentFilters.zoneId)?.name}</span></>
            ) : (
              "All zones and states"
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

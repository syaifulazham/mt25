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
import { ContestStat, SchoolLevelGroup } from "../_utils/contest-statistics";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type FilterOption = { id: number; name: string };

type ZoneFilter = FilterOption;
type StateFilter = FilterOption & { zoneId?: number };

type ContestStatsTableProps = {
  groupedContests: SchoolLevelGroup[];
  summary: {
    totalContests: number;
    totalTeams: number;
    totalContingents: number;
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
  // Debug the grouped contests to see what we're actually receiving
  console.log('[ContestStatsTable] Raw grouped contests received:', 
    rawGroupedContests.map(g => ({
      schoolLevel: g.schoolLevel,
      displayName: g.displayName,
      contestsCount: g.contests.length
    })));

  // Filter contests to exclude teams with no members (zero team count)
  const groupedContests = rawGroupedContests.map(group => {
    return {
      ...group,
      contests: group.contests.filter(contest => contest.teamCount > 0)
    };
  }).filter(group => group.contests.length > 0);

  // Recalculate summary based on filtered contests
  const summary = {
    totalContests: groupedContests.reduce((sum, group) => sum + group.contests.length, 0),
    totalTeams: groupedContests.reduce(
      (sum, group) => sum + group.contests.reduce((subSum, contest) => subSum + contest.teamCount, 0), 
      0
    ),
    totalContingents: rawSummary.totalContingents // Keep the original contingent count
  };
  
  // All unique education levels present in the data
  const allEduLevels = new Set<string>();
  groupedContests.forEach(group => {
    group.contests.forEach(stat => {
      Object.keys(stat.teamsByEduLevel).forEach(eduLevel => {
        allEduLevels.add(eduLevel);
      });
    });
  });
  
  // Filter out specific education levels that should not be displayed
  const excludedLevels = ['Menengah', 'Other', 'Rendah'];
  const filteredEduLevels = [...allEduLevels].filter(level => 
    !excludedLevels.some(excluded => level.includes(excluded))
  );
  
  const eduLevelArray = filteredEduLevels.sort();

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
      
      {/* Contest tables - grouped by school level */}
      {groupedContests.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No contest data available
          </CardContent>
        </Card>
      ) : (
        groupedContests.map((group) => (
          <Card key={group.schoolLevel} className="mb-6 bg-blue-50 dark:bg-blue-900/20">
            <CardHeader className="py-4">
              <CardTitle className="text-xl">
                {group.displayName}
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
                    <TableHead className="text-right">Total Teams</TableHead>
                    {eduLevelArray.map((eduLevel) => (
                      <TableHead key={eduLevel} className="text-right">
                        {eduLevel} Teams
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.contests.map((stat) => (
                    <TableRow key={stat.contest.id}>
                      <TableCell className="font-medium">
                        <span className="font-bold text-muted-foreground mr-2">{stat.contest.code}</span>
                        {stat.contest.name}
                      </TableCell>
                      <TableCell className="text-right">{stat.contingentsCount}</TableCell>
                      <TableCell className="text-right">{stat.teamCount}</TableCell>
                      {eduLevelArray.map((eduLevel) => (
                        <TableCell key={eduLevel} className="text-right">
                          {stat.teamsByEduLevel[eduLevel] || 0}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  
                  {/* Group summary row */}
                  {group.contests.length > 0 && (
                    <TableRow className="bg-slate-100 dark:bg-slate-800 font-medium">
                      <TableCell>GROUP TOTAL</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell className="text-right">
                        {group.contests.reduce((sum, stat) => sum + (stat.teamCount || 0), 0)}
                      </TableCell>
                      {eduLevelArray.map((eduLevel) => {
                        const total = group.contests.reduce(
                          (sum, stat) => {
                            // Handle potentially undefined teams or education levels
                            if (!stat.teamsByEduLevel) return sum;
                            return sum + (stat.teamsByEduLevel[eduLevel] || 0);
                          },
                          0
                        );
                        return (
                          <TableCell key={eduLevel} className="text-right">
                            {total}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
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

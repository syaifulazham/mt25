"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ContingentDataDebugger } from "./_components/contingent-data-debugger";

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

type StateStatsTableProps = {
  stateStats: { state: State; stats: StateStats }[];
  totalStats: StateStats;
};

// Function to get a color class based on zone name
const getZoneColorClass = (zoneName: string): string => {
  switch (zoneName.toUpperCase()) {
    case 'UTARA':
      return 'bg-blue-100 dark:bg-blue-900';
    case 'TENGAH':
      return 'bg-green-100 dark:bg-green-900';
    case 'SELATAN':
      return 'bg-amber-100 dark:bg-amber-900';
    case 'TIMUR':
      return 'bg-rose-100 dark:bg-rose-900';
    case 'SABAH':
      return 'bg-purple-100 dark:bg-purple-900';
    case 'SARAWAK':
      return 'bg-cyan-100 dark:bg-cyan-900';
    default:
      return 'bg-gray-100 dark:bg-gray-800';
  }
};

export function StateStatsTable({ stateStats, totalStats }: StateStatsTableProps) {
  const [activeView, setActiveView] = useState<"contingents" | "schools" | "school-teams">("contingents");
  
  // Process stats to group by zone for merged cells
  const getGroupedZones = () => {
    const groupedStats = [];
    let currentZone = null;
    let currentZoneStats = [];
    let rowSpan = 1;
    
    // Group states by zone
    for (let i = 0; i < stateStats.length; i++) {
      const item = stateStats[i];
      
      if (currentZone !== item.state.zone.name) {
        // If we have stats for the previous zone, add them
        if (currentZoneStats.length > 0) {
          groupedStats.push({
            zoneName: currentZone,
            rowSpan,
            firstIndex: i - rowSpan
          });
        }
        
        // Start new zone group
        currentZone = item.state.zone.name;
        rowSpan = 1;
        currentZoneStats = [item];
      } else {
        // Continue current zone group
        rowSpan++;
        currentZoneStats.push(item);
      }
    }
    
    // Add the last group
    if (currentZoneStats.length > 0) {
      groupedStats.push({
        zoneName: currentZone,
        rowSpan,
        firstIndex: stateStats.length - rowSpan
      });
    }
    
    return groupedStats;
  };
  
  const zoneGroups = getGroupedZones();

  // Find the first zoneId from stats (if available)
  const firstZoneId = stateStats.length > 0 ? stateStats[0]?.state.zone.id : 0;

  return (
    <>
      <div className="flex justify-center gap-2 mb-4">
        <Button 
          variant={activeView === "contingents" ? "default" : "outline"}
          onClick={() => setActiveView("contingents")}
          className="px-4"
        >
          Contingents
        </Button>
        <Button 
          variant={activeView === "schools" ? "default" : "outline"}
          onClick={() => setActiveView("schools")}
          className="px-4"
        >
          Schools
        </Button>
        <Button 
          variant={activeView === "school-teams" ? "default" : "outline"}
          onClick={() => setActiveView("school-teams")}
          className="px-4"
        >
          School Teams
        </Button>
      </div>

      {activeView === "contingents" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Zone</TableHead>
              <TableHead className="min-w-[120px]">State</TableHead>
              <TableHead className="text-center">Contingents</TableHead>
              <TableHead className="text-center">Teams</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stateStats.map(({ state, stats }, index) => {
              // Find if this is the first row of a zone group
              const zoneGroup = zoneGroups.find(group => group.firstIndex === index);
              
              return (
                <TableRow 
                  key={state.id} 
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  {zoneGroup ? (
                    <TableCell 
                      className={`font-medium pl-3 ${getZoneColorClass(state.zone.name)} hover:opacity-80 cursor-pointer`}
                      rowSpan={zoneGroup.rowSpan}
                    >
                      <Link href={`/organizer/events/stats/${state.zone.id}`} className="block w-full h-full">
                        {state.zone.name}
                      </Link>
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">
                    <Link 
                      href={`/organizer/events/stats/${state.zone.id}/${state.id}`}
                      className="text-blue-500 hover:text-blue-700 hover:underline"
                    >
                      {state.name.replace('WILAYAH PERSEKUTUAN', 'WP')}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{stats.contingentsCount > 0 ? stats.contingentsCount : ''}</TableCell>
                  <TableCell className="text-center">{stats.teamCount > 0 ? stats.teamCount : ''}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-semibold bg-gray-50 dark:bg-gray-900">
              <TableCell className="font-medium pl-3 bg-gray-200 dark:bg-gray-800">ALL</TableCell>
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-center">{totalStats.contingentsCount > 0 ? totalStats.contingentsCount : ''}</TableCell>
              <TableCell className="text-center">{totalStats.teamCount > 0 ? totalStats.teamCount : ''}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {activeView === "schools" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Zone</TableHead>
              <TableHead className="min-w-[120px]">State</TableHead>
              <TableHead className="text-center">Total Schools</TableHead>
              <TableHead className="text-center">Primary Schools</TableHead>
              <TableHead className="text-center">Secondary Schools</TableHead>
              <TableHead className="text-center">Independent w/ U18</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stateStats.map(({ state, stats }, index) => {
              // Find if this is the first row of a zone group
              const zoneGroup = zoneGroups.find(group => group.firstIndex === index);
              
              return (
                <TableRow 
                  key={state.id} 
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  {zoneGroup ? (
                    <TableCell 
                      className={`font-medium pl-3 ${getZoneColorClass(state.zone.name)} hover:opacity-80 cursor-pointer`}
                      rowSpan={zoneGroup.rowSpan}
                    >
                      <Link href={`/organizer/events/stats/${state.zone.id}`} className="block w-full h-full">
                        {state.zone.name}
                      </Link>
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">
                    <Link 
                      href={`/organizer/events/stats/${state.zone.id}/${state.id}`}
                      className="text-blue-500 hover:text-blue-700 hover:underline"
                    >
                      {state.name.replace('WILAYAH PERSEKUTUAN', 'WP')}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{stats.schoolsCount > 0 ? stats.schoolsCount : ''}</TableCell>
                  <TableCell className="text-center">{stats.primarySchools > 0 ? stats.primarySchools : ''}</TableCell>
                  <TableCell className="text-center">{stats.secondarySchools > 0 ? stats.secondarySchools : ''}</TableCell>
                  <TableCell className="text-center">{stats.independentContingentsWithU18 > 0 ? stats.independentContingentsWithU18 : ''}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-semibold bg-gray-50 dark:bg-gray-900">
              <TableCell className="font-medium pl-3 bg-gray-200 dark:bg-gray-800">ALL</TableCell>
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-center">{totalStats.schoolsCount > 0 ? totalStats.schoolsCount : ''}</TableCell>
              <TableCell className="text-center">{totalStats.primarySchools > 0 ? totalStats.primarySchools : ''}</TableCell>
              <TableCell className="text-center">{totalStats.secondarySchools > 0 ? totalStats.secondarySchools : ''}</TableCell>
              <TableCell className="text-center">{totalStats.independentContingentsWithU18 > 0 ? totalStats.independentContingentsWithU18 : ''}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}

      {activeView === "school-teams" && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Zone</TableHead>
              <TableHead className="min-w-[120px]">State</TableHead>
              <TableHead className="text-center">School Teams</TableHead>
              <TableHead className="text-center">Primary Teams</TableHead>
              <TableHead className="text-center">Secondary Teams</TableHead>
              <TableHead className="text-center">Youth Teams</TableHead>
              <TableHead className="text-center">Independent Teams w/ U18</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stateStats.map(({ state, stats }, index) => {
              // Find if this is the first row of a zone group
              const zoneGroup = zoneGroups.find(group => group.firstIndex === index);
              
              return (
                <TableRow 
                  key={state.id} 
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
                >
                  {zoneGroup ? (
                    <TableCell 
                      className={`font-medium pl-3 ${getZoneColorClass(state.zone.name)} hover:opacity-80 cursor-pointer`}
                      rowSpan={zoneGroup.rowSpan}
                    >
                      <Link href={`/organizer/events/stats/${state.zone.id}`} className="block w-full h-full">
                        {state.zone.name}
                      </Link>
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">
                    <Link 
                      href={`/organizer/events/stats/${state.zone.id}/${state.id}`}
                      className="text-blue-500 hover:text-blue-700 hover:underline"
                    >
                      {state.name.replace('WILAYAH PERSEKUTUAN', 'WP')}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{stats.schoolTeams > 0 ? stats.schoolTeams : ''}</TableCell>
                  <TableCell className="text-center">{stats.primarySchoolTeams > 0 ? stats.primarySchoolTeams : ''}</TableCell>
                  <TableCell className="text-center">{stats.secondarySchoolTeams > 0 ? stats.secondarySchoolTeams : ''}</TableCell>
                  <TableCell className="text-center">{stats.youthTeams > 0 ? stats.youthTeams : ''}</TableCell>
                  <TableCell className="text-center">{stats.independentTeamsWithU18 > 0 ? stats.independentTeamsWithU18 : ''}</TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-semibold bg-gray-50 dark:bg-gray-900">
              <TableCell className="font-medium pl-3 bg-gray-200 dark:bg-gray-800">ALL</TableCell>
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-center">{totalStats.schoolTeams > 0 ? totalStats.schoolTeams : ''}</TableCell>
              <TableCell className="text-center">{totalStats.primarySchoolTeams > 0 ? totalStats.primarySchoolTeams : ''}</TableCell>
              <TableCell className="text-center">{totalStats.secondarySchoolTeams > 0 ? totalStats.secondarySchoolTeams : ''}</TableCell>
              <TableCell className="text-center">{totalStats.youthTeams > 0 ? totalStats.youthTeams : ''}</TableCell>
              <TableCell className="text-center">{totalStats.independentTeamsWithU18 > 0 ? totalStats.independentTeamsWithU18 : ''}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
      
      {/* Add the debugging component */}
      {firstZoneId > 0 && <ContingentDataDebugger zoneId={firstZoneId} />}
    </>
  );
}

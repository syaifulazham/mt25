"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ContestStatsTable } from "./contest-stats-table";
import { ContestLevelGroup } from "../_utils/contest-statistics";
import { DebugRawDataButton } from "./debug-raw-data-button";

// Debug imports
import { useEffect as useEffectOnce } from "react";

type FilterOption = { id: number; name: string };
type ZoneFilter = FilterOption;
type StateFilter = FilterOption & { zoneId?: number };

type ContestStatsClientProps = {
  groupedContests: ContestLevelGroup[];
  summary: {
    totalContests: number;
    totalTeams: number;
    totalContingents: number;
    totalContestants: number;
  };
  zoneFilters: ZoneFilter[];
  stateFilters: StateFilter[];
};

export function ContestStatsClient({
  groupedContests,
  summary,
  zoneFilters,
  stateFilters,
}: ContestStatsClientProps) {
  console.log('[ContestStatsClient] Received props:', {
    groupedContestsLength: groupedContests?.length || 0,
    summary,
    zoneFiltersLength: zoneFilters?.length || 0,
    stateFiltersLength: stateFilters?.length || 0
  });
  
  useEffectOnce(() => {
    console.log('[ContestStatsClient] Detailed groupedContests:', JSON.stringify(groupedContests, null, 2));
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize filters from URL params
  const initialZoneId = searchParams.get('zoneId') ? parseInt(searchParams.get('zoneId')!, 10) : undefined;
  const initialStateId = searchParams.get('stateId') ? parseInt(searchParams.get('stateId')!, 10) : undefined;
  
  // State for filters
  const [currentFilters, setCurrentFilters] = useState<{
    zoneId?: number;
    stateId?: number;
  }>({
    zoneId: initialZoneId,
    stateId: initialStateId
  });

  // Handle filter changes
  const handleFilterChange = (filters: { zoneId?: number; stateId?: number }) => {
    setCurrentFilters(filters);
    
    // Update URL with new filters
    const params = new URLSearchParams();
    
    if (filters.zoneId) {
      params.set('zoneId', filters.zoneId.toString());
    }
    
    if (filters.stateId) {
      params.set('stateId', filters.stateId.toString());
    }
    
    // Replace URL without full page refresh
    const newPath = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    router.push(newPath);
  };

  // Get active event ID (assuming it's 1 for now, but ideally this should be passed from the server)
  const activeEventId = 1;

  return (
    <div className="space-y-4">
      <ContestStatsTable
        groupedContests={groupedContests}
        summary={summary}
        zoneFilters={zoneFilters}
        stateFilters={stateFilters}
        onFilterChange={handleFilterChange}
        currentFilters={currentFilters}
      />
      
      {/* Debug button to show raw data */}
      <div className="flex justify-end">
        <DebugRawDataButton 
          eventId={activeEventId} 
          zoneId={currentFilters.zoneId} 
          stateId={currentFilters.stateId}
        />
      </div>
    </div>
  );
}

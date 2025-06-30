"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ContestStatsTable } from "./contest-stats-table";
import { SchoolLevelGroup } from "../_utils/contest-statistics";

type FilterOption = { id: number; name: string };
type ZoneFilter = FilterOption;
type StateFilter = FilterOption & { zoneId?: number };

type ContestStatsClientProps = {
  groupedContests: SchoolLevelGroup[];
  summary: {
    totalContests: number;
    totalTeams: number;
    totalContingents: number;
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

  return (
    <ContestStatsTable
      groupedContests={groupedContests}
      summary={summary}
      zoneFilters={zoneFilters}
      stateFilters={stateFilters}
      onFilterChange={handleFilterChange}
      currentFilters={currentFilters}
    />
  );
}

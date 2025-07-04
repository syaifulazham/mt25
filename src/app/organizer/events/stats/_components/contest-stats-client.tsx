"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ContestStatsResult, ContestLevelGroup } from "../_utils/contest-statistics";
import { ContestStatsTable } from "./contest-stats-table";
import { DebugRawDataButton } from "./debug-raw-data-button";
import { Skeleton } from "@/components/ui/skeleton";

// Debug imports
import { useEffect as useEffectOnce } from "react";

type FilterOption = { id: number; name: string };
type ZoneFilter = FilterOption;
type StateFilter = FilterOption & { zoneId?: number };

type ContestStatsClientProps = {
  initialStats: ContestStatsResult;
  zones: { id: number; name: string }[];
  states: { id: number; name: string; zoneId: number }[];
};

export function ContestStatsClient({
  initialStats,
  zones,
  states
}: ContestStatsClientProps) {
  // Early defensive check for undefined initialStats
  console.log('[ContestStatsClient] initialStats received:', initialStats);
  // Explicitly type the state to match the ContestStatsResult structure
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize filters from URL params - moved before usage
  const initialZoneId = searchParams.get('zoneId') ? parseInt(searchParams.get('zoneId')!, 10) : undefined;
  const initialStateId = searchParams.get('stateId') ? parseInt(searchParams.get('stateId')!, 10) : undefined;
  
  // Create a safe initial state to guard against undefined initialStats
  const defaultSummary = {
    totalContests: 0,
    totalContingents: 0,
    totalTeams: 0,
    totalContestants: 0
  };

  const [stats, setStats] = useState<ContestStatsResult>({
    groupedContests: initialStats?.groupedContests || [],
    summary: initialStats?.summary || defaultSummary,
    zoneId: initialZoneId,  // Use the URL params for initial state
    stateId: initialStateId  // Use the URL params for initial state
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffectOnce(() => {
    console.log('[ContestStatsClient] Detailed initialStats:', JSON.stringify(initialStats, null, 2));
  }, []);

  // Get active event ID (assuming it's 1 for now, but ideally this should be passed from the server)
  const activeEventId = 1;

  // State for filters
  const [currentFilters, setCurrentFilters] = useState<{
    zoneId?: number;
    stateId?: number;
  }>({
    zoneId: initialZoneId,
    stateId: initialStateId
  });

  // Force refresh when filters change
  const [forceRefresh, setForceRefresh] = useState(0);

  // Handle filter changes
  const handleFilterChange = async (filters: { zoneId?: number; stateId?: number }) => {
    console.log("Filter changed:", filters);
    
    // Reset any previous errors
    setError(null);
    
    // Build the new URL with query parameters
    const params = new URLSearchParams(searchParams.toString());
    
    // Update zone parameter
    if (filters.zoneId) {
      params.set('zoneId', filters.zoneId.toString());
    } else {
      params.delete('zoneId');
    }
    
    // Update state parameter
    if (filters.stateId) {
      params.set('stateId', filters.stateId.toString());
    } else {
      params.delete('stateId');
    }
    
    // Ensure we keep the tab parameter if it exists
    if (searchParams.has('tab')) {
      params.set('tab', searchParams.get('tab')!);
    }
    
    // Use Next.js router to update the URL without refreshing the page
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    
    // Fetch new data client-side
    try {
      setIsLoading(true);
      const queryString = params.toString();
      const response = await fetch(`/api/organizer/events/stats/contest-statistics?${queryString}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching contest statistics: ${response.statusText}`);
      }
      
      const newStats = await response.json();
      // Ensure the response matches our expected shape
      setStats({
        groupedContests: newStats.groupedContests || [],
        summary: newStats.summary || {
          totalContests: 0,
          totalContingents: 0,
          totalTeams: 0,
          totalContestants: 0
        },
        zoneId: newStats.zoneId,
        stateId: newStats.stateId
      });
      console.log("Fetched new data client-side:", newStats);
    } catch (error: any) {
      console.error("Error fetching new contest statistics:", error);
      setError(error.message || 'An error occurred while fetching statistics');
    } finally {
      setIsLoading(false);
    }
  };  

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="space-y-4 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
          <div className="animate-pulse text-center text-muted-foreground">
            Loading contest statistics...
          </div>
        </div>
      ) : error ? (
        <div className="p-4 border border-red-200 bg-red-50 rounded-md">
          <div className="text-red-800 font-medium mb-2">Error loading contest statistics</div>
          <p className="text-red-600">{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
            onClick={() => handleFilterChange({
              zoneId: initialZoneId,
              stateId: initialStateId
            })}
          >
            Retry
          </button>
        </div>
      ) : (
        <ContestStatsTable
          groupedContests={stats.groupedContests || []}
          summary={stats.summary || {
            totalContests: 0,
            totalContingents: 0,
            totalTeams: 0
          }}
          zoneFilters={zones}
          onFilterChange={handleFilterChange}
          currentFilters={{
            zoneId: stats.zoneId,
            stateId: stats.stateId
          }}
        />
      )}
      
      {/* Debug button - only shown in development */}
      {process.env.NODE_ENV === 'development' && (
        <DebugRawDataButton
          zoneId={initialZoneId}
          stateId={initialStateId}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import TeamsSummaryClient from "./teams-summary-client";

interface TeamsSummaryProps {
  participantId: number;
}

export default function TeamsSummary({ participantId }: TeamsSummaryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize with basic placeholder stats
  const [stats, setStats] = useState<{
    teamCount: number;
    contestsJoined: number;
    teamMembersCount: number;
  } | null>({
    teamCount: 0,
    contestsJoined: 0,
    teamMembersCount: 0
  });

  useEffect(() => {
    if (!participantId) {
      setIsLoading(false);
      setError("Missing user ID");
      return;
    }
    
    // Direct fetch of the teams data without using the stats endpoint
    const fetchTeams = async () => {
      try {
        setIsLoading(true);
        
        const timestamp = new Date().getTime();
        // Use the main teams endpoint instead which we know works
        const response = await fetch(`/api/participants/teams?participantId=${participantId}&t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch teams");
        }
        
        const teamsData = await response.json();
        
        // Process the data using the same format as before
        setStats({
          teamCount: teamsData.length || 0,
          contestsJoined: teamsData.length > 0 ? 
            [...new Set(teamsData.map((team: any) => team.contestId).filter(Boolean))].length : 
            0,
          teamMembersCount: teamsData.length > 0 ? 
            teamsData.reduce((acc: number, team: any) => acc + (team.memberCount || 0), 0) : 
            0
        });
        
        setError(null);
      } catch (err) {
        console.error("Error fetching teams:", err);
        // Initialize with empty data but don't show an error
        // This is a more graceful fallback for the dashboard
        setStats({
          teamCount: 0,
          contestsJoined: 0,
          teamMembersCount: 0
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTeams();
  }, [participantId]);
  
  return <TeamsSummaryClient stats={stats} isLoading={isLoading} error={error} />;
}

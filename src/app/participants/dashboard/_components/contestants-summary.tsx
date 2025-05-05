"use client";

import { useState, useEffect } from "react";
import ContestantsSummaryClient from "./contestants-summary-client";

interface ContestantsSummaryProps {
  userId: number;
}

interface ContestantStats {
  total: number;
}

export default function ContestantsSummary({ userId }: ContestantsSummaryProps) {
  const [stats, setStats] = useState<{
    totalContestants: number;
    educationLevels: {
      primaryCount: number;
      secondaryCount: number;
      higherCount: number;
      unknownCount: number;
    }
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContestantStats = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all contestants from managed contingents
        const contestantsResponse = await fetch('/api/participants/contestants');
        
        if (!contestantsResponse.ok) {
          throw new Error("Failed to fetch contestants");
        }
        
        const response = await contestantsResponse.json();
        
        // Handle the new API response format with pagination
        const contestants = response.data || response;
        
        // Calculate statistics from the contestants data with the new format
        let primaryCount = 0;
        let secondaryCount = 0;
        let higherCount = 0;
        let unknownCount = 0;
        
        contestants.forEach((contestant: any) => {
          const eduLevel = contestant.edu_level?.toLowerCase() || '';
          
          if (eduLevel.includes('primary') || eduLevel.includes('sekolah rendah') || eduLevel === 'sr') {
            primaryCount++;
          } else if (eduLevel.includes('secondary') || eduLevel.includes('sekolah menengah') || eduLevel === 'sm') {
            secondaryCount++;
          } else if (eduLevel.includes('higher') || eduLevel.includes('university') || 
                    eduLevel.includes('college') || eduLevel === 'ipt') {
            higherCount++;
          } else {
            unknownCount++;
          }
        });
        
        setStats({
          totalContestants: contestants.length,
          educationLevels: {
            primaryCount,
            secondaryCount,
            higherCount,
            unknownCount
          }
        });
        
        setError(null);
      } catch (error) {
        console.error("Error fetching contestant statistics:", error);
        setError("Could not load contestant statistics");
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContestantStats();
  }, []);

  // Use our client component with the processed data
  return <ContestantsSummaryClient stats={stats} isLoading={isLoading} />;
}

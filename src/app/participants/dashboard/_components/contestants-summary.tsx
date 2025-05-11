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
        
        // Fetch all contestants from managed contingents with limit=1000 to ensure we get all contestants
        const contestantsResponse = await fetch('/api/participants/contestants?limit=1000&t=' + Date.now(), {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!contestantsResponse.ok) {
          throw new Error("Failed to fetch contestants");
        }
        
        const response = await contestantsResponse.json();
        
        // Handle the new API response format with pagination
        const contestants = response.data || response;
        
        console.log(`Total contestants fetched: ${contestants.length}`);
        
        // Calculate statistics from the contestants data with the new format
        let primaryCount = 0;
        let secondaryCount = 0;
        let higherCount = 0;
        let unknownCount = 0;
        
        // Create a map to track all education levels and their counts
        const eduLevelMap = new Map<string, number>();
        
        contestants.forEach((contestant: any) => {
          // Get education level, normalize it by converting to lowercase and trimming
          const eduLevel = (contestant.edu_level || '').toLowerCase().trim();
          
          // Track all education levels for debugging
          if (eduLevel) {
            eduLevelMap.set(eduLevel, (eduLevelMap.get(eduLevel) || 0) + 1);
          } else {
            eduLevelMap.set('empty', (eduLevelMap.get('empty') || 0) + 1);
          }
          
          // More comprehensive check for education levels with exact matches and includes
          if (
            eduLevel === 'primary school' || 
            eduLevel === 'sekolah rendah' || 
            eduLevel === 'primaryang paaralan' ||
            eduLevel === 'sr' ||
            eduLevel.includes('primary') ||
            eduLevel.includes('rendah')
          ) {
            primaryCount++;
          } else if (
            eduLevel === 'secondary school' || 
            eduLevel === 'sekolah menengah' || 
            eduLevel === 'sekundaryong paaralan' ||
            eduLevel === 'sm' ||
            eduLevel.includes('secondary') ||
            eduLevel.includes('menengah')
          ) {
            secondaryCount++;
          } else if (
            eduLevel === 'youth' ||
            eduLevel === 'belia' ||
            eduLevel === 'kabataan' ||
            eduLevel === 'higher' ||
            eduLevel === 'university' ||
            eduLevel === 'college' ||
            eduLevel === 'ipt' ||
            eduLevel.includes('universit') ||
            eduLevel.includes('kolej') ||
            eduLevel.includes('higher') ||
            eduLevel.includes('institute')
          ) {
            higherCount++;
          } else {
            // Log unknown education levels to help with debugging
            console.log('Unknown education level:', eduLevel);
            unknownCount++;
          }
        });
        
        // Log all found education levels and their counts
        console.log('Education levels found:');
        eduLevelMap.forEach((count, level) => {
          console.log(`${level}: ${count}`);
        });
        
        // Verify total count matches
        const calculatedTotal = primaryCount + secondaryCount + higherCount + unknownCount;
        console.log(`Calculated total: ${calculatedTotal} (Primary: ${primaryCount}, Secondary: ${secondaryCount}, Higher: ${higherCount}, Unknown: ${unknownCount})`);
        console.log(`Does this match total contestants? ${calculatedTotal === contestants.length}`);
        
        // If counts don't match, add unknown contestants to the appropriate category
        if (calculatedTotal !== contestants.length && unknownCount > 0) {
          // This contingent member count vs education level mismatch happens because of inconsistent data
          // We'll categorize unknown entries as 'higher' if we detect university-age students
          console.log('Correcting count mismatch...');
          higherCount += unknownCount;
          unknownCount = 0;
        }
        
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

"use client";

import { useState, useEffect } from "react";
import ContingentSummaryClient from "./contingent-summary-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { School, Building, Users, AlertCircle } from "lucide-react";
import Link from "next/link";

interface ContingentSummaryProps {
  userId?: number; // For backward compatibility
  participantId: number;
}

interface Contingent {
  id: number;
  name: string;
  description: string;
  short_name?: string;
  logoUrl?: string;
  school: {
    name: string;
    state: {
      name: string;
    };
  } | null;
  higherInstitution: {
    name: string;
    state: {
      name: string;
    };
  } | null;
  isManager: boolean;
  isOwner: boolean;
  status: 'ACTIVE' | 'PENDING';
  memberCount: number;
  managerCount?: number;
}

export default function ContingentSummary({ participantId, userId }: ContingentSummaryProps) {
  const [contingents, setContingents] = useState<Contingent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh contingent data that can be called from outside the effect
  const refreshContingentData = async () => {
    console.log("Manually refreshing contingent data...");
    try {
      setIsLoading(true);
      
      // Add cache control headers and timestamp to prevent caching issues
      const response = await fetch(`/api/participants/contingents?participantId=${participantId}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error("Failed to fetch contingent data");
      }
      
      const data = await response.json();
      console.log("Contingent data refreshed successfully:", data);
      setContingents(data);
      setError(null); // Clear any previous errors
    } catch (error) {
      console.error("Error refreshing contingent data:", error);
      
      // Try fallback approach with direct database query
      try {
        console.log("Attempting fallback contingent refresh...");
        const fallbackResponse = await fetch(`/api/participants/contingents/fallback?participantId=${participantId}&t=${Date.now()}`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log("Fallback contingent data loaded:", fallbackData);
          setContingents(fallbackData);
          setError(null); // Clear error if fallback succeeds
        } else {
          // Only set error if both main and fallback requests fail
          setError("Could not load your contingent information");
        }
      } catch (fallbackError) {
        console.error("Fallback contingent fetch also failed:", fallbackError);
        setError("Could not load your contingent information");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Track if the component is mounted to prevent state updates after unmounting
    let isMounted = true;
    // Track retry attempts to prevent infinite loops
    let retryCount = 0;
    const MAX_RETRIES = 2;
    
    const fetchContingents = async () => {
      if (retryCount >= MAX_RETRIES) {
        console.log(`Maximum retry attempts (${MAX_RETRIES}) reached, stopping retries`);
        return;
      }
      
      try {
        if (isMounted) setIsLoading(true);
        
        // Add cache control headers and timestamp to prevent caching issues
        const response = await fetch(`/api/participants/contingents?participantId=${participantId}&t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Pragma': 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API error response:", errorText);
          throw new Error("Failed to fetch contingent data");
        }
        
        const data = await response.json();
        console.log("Contingent data loaded successfully:", data);
        if (isMounted) {
          setContingents(data);
          setError(null); // Clear any previous errors
        }
      } catch (error) {
        console.error("Error fetching contingent data:", error);
        
        // Try a fallback approach with a direct database query
        try {
          console.log("Attempting fallback contingent fetch...");
          const fallbackResponse = await fetch(`/api/participants/contingents/fallback?participantId=${participantId}&t=${Date.now()}`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log("Fallback contingent data loaded:", fallbackData);
            if (isMounted) {
              setContingents(fallbackData);
              setError(null); // Clear error if fallback succeeds
            }
          } else {
            // Only set error if both main and fallback requests fail
            if (isMounted) {
              setError("Could not load your contingent information");
            }
          }
        } catch (fallbackError) {
          console.error("Fallback contingent fetch also failed:", fallbackError);
          if (isMounted) {
            setError("Could not load your contingent information");
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchContingents();
    
    // Set up a one-time retry mechanism if initial load fails
    const retryTimeout = setTimeout(() => {
      if (isMounted && retryCount < MAX_RETRIES) {
        console.log(`Retrying contingent fetch (attempt ${retryCount + 1} of ${MAX_RETRIES})...`);
        retryCount++;
        fetchContingents();
      }
    }, 3000);
    
    // Set up a periodic refresh to ensure the contingent data stays up to date
    const refreshInterval = setInterval(() => {
      if (isMounted) {
        console.log("Periodic refresh of contingent data...");
        refreshContingentData();
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => {
      isMounted = false;
      clearTimeout(retryTimeout);
      clearInterval(refreshInterval);
    };
  }, [participantId]); // Only depend on participantId to prevent unnecessary rerenders

  // Process data for the client component
  let clientContingent = null;
  let noContingentYet = false;
  
  // Process the contingent data if it exists
  if (contingents.length > 0) {
    const contingent = contingents[0]; // Get the first contingent (most relevant one)
    
    clientContingent = {
      id: contingent.id,
      name: contingent.name,
      short_name: contingent.short_name,
      logoUrl: contingent.logoUrl,
      isManager: contingent.isManager,
      membersCount: contingent.memberCount,
      institution: contingent.school || contingent.higherInstitution ? {
        name: contingent.school?.name || contingent.higherInstitution?.name || '',
        type: contingent.school ? 'school' : 'higher'
      } : undefined
    };
  } else {
    noContingentYet = true;
  }
  
  // Use our client component with the processed data
  return (
    <ContingentSummaryClient 
      contingent={clientContingent} 
      isLoading={isLoading} 
      error={error}
      noContingentYet={noContingentYet}
    />
  );
}

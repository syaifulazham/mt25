"use client";

import { useState, useEffect } from "react";
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

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[250px] mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full gradient-card-red">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 accent-icon" />
            Error Loading Contingent
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/participants/contingents">Manage Contingents</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (contingents.length === 0) {
    return (
      <Card className="h-full gradient-card-purple">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl">My Contingent</CardTitle>
          <CardDescription>
            You haven't joined a contingent yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Join or create a contingent to participate in Techlympics competitions
          </p>
          <div className="space-y-2">
            <Button 
              asChild 
              className="w-full"
            >
              <Link href="/participants/contingents">Create or Join Contingent</Link>
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={refreshContingentData}
            >
              Refresh Contingent Data
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the first contingent (most relevant one)
  const contingent = contingents[0];
  const institutionName = contingent.school?.name || contingent.higherInstitution?.name || "Unknown Institution";
  const institutionState = contingent.school?.state?.name || contingent.higherInstitution?.state?.name || "Unknown State";
  const institutionType = contingent.school ? "School" : "Higher Institution";
  const institutionIcon = contingent.school ? <School className="h-4 w-4" /> : <Building className="h-4 w-4" />;

  return (
    <Card className="h-full gradient-card-purple">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg md:text-xl">My Contingent</CardTitle>
          {contingent.status === "PENDING" && (
            <Badge variant="secondary">Pending Approval</Badge>
          )}
        </div>
        <CardDescription>
          {contingent.isManager 
            ? contingent.isOwner 
              ? "You are the primary manager of this contingent" 
              : "You are a co-manager of this contingent"
            : "You are a member of this contingent"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-base">{contingent.name}</h3>
            <p className="text-sm text-muted-foreground">{contingent.description || "No description provided"}</p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="accent-icon">{institutionIcon}</span>
            <span>{institutionName}</span>
            <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{institutionType}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 accent-icon" />
            <span>{contingent.memberCount} member{contingent.memberCount !== 1 ? 's' : ''}</span>
          </div>
          
          {contingent.managerCount && contingent.managerCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{contingent.managerCount} manager{contingent.managerCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <Button asChild className="w-full">
            <Link href="/participants/contingents">Manage Contingent</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

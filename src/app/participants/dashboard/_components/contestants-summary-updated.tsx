"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, School, BookOpen, GraduationCap, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface ContestantsSummaryProps {
  userId: number;
}

interface ContestantStats {
  total: number;
  byEduLevel: {
    [key: string]: number;
  };
}

export default function ContestantsSummary({ userId }: ContestantsSummaryProps) {
  const [stats, setStats] = useState<ContestantStats | null>(null);
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
        
        const contestants = await contestantsResponse.json();
        
        // Calculate statistics from the contestants data
        const byEduLevel: {[key: string]: number} = {};
        
        contestants.forEach((contestant: any) => {
          const eduLevel = contestant.edu_level;
          byEduLevel[eduLevel] = (byEduLevel[eduLevel] || 0) + 1;
        });
        
        setStats({
          total: contestants.length,
          byEduLevel
        });
      } catch (error) {
        console.error("Error fetching contestant statistics:", error);
        setError("Could not load contestant statistics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContestantStats();
  }, []);

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
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full mt-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Contestants
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/participants/contestants">View All Contestants</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If no stats are available yet, show a message
  if (!stats) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl">My Contestants</CardTitle>
          <CardDescription>
            You haven't registered any contestants yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Register contestants to participate in Techlympics competitions
          </p>
          <Button asChild className="w-full">
            <Link href="/participants/contestants/new">Add Contestant</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get the appropriate icon for each education level
  const getEduLevelIcon = (eduLevel: string) => {
    const level = eduLevel.toLowerCase();
    if (level.includes("rendah") || level.includes("primary")) {
      return <School className="h-4 w-4" />;
    } else if (level.includes("menengah") || level.includes("secondary")) {
      return <BookOpen className="h-4 w-4" />;
    } else {
      return <GraduationCap className="h-4 w-4" />;
    }
  };

  // Format the education level for display
  const formatEduLevel = (eduLevel: string) => {
    // Map raw database values to more readable formats
    const mapping: { [key: string]: string } = {
      "sekolah rendah": "Primary School",
      "sekolah menengah": "Secondary School",
      "belia": "Youth"
    };
    
    return mapping[eduLevel.toLowerCase()] || eduLevel;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg md:text-xl">My Contestants</CardTitle>
        <CardDescription>
          Manage your registered contestants
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium">Total Contestants: {stats.total}</span>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">By Education Level:</p>
            
            {Object.entries(stats.byEduLevel).map(([level, count]) => (
              <div key={level} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {getEduLevelIcon(level)}
                  <span>{formatEduLevel(level)}</span>
                </div>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            
            {Object.keys(stats.byEduLevel).length === 0 && (
              <p className="text-sm text-muted-foreground italic">No contestants registered yet</p>
            )}
          </div>
        </div>
        
        <div className="mt-4">
          <Button asChild className="w-full">
            <Link href="/participants/contestants">View All Contestants</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

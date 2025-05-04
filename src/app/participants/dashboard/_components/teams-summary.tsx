"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Target, Layout, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface TeamsSummaryProps {
  participantId: number;
}

interface TeamStats {
  total: number;
  teams: TeamSummary[];
}

interface TeamSummary {
  id: number;
  name: string;
  hashcode: string;
  status: string;
  contestName?: string;
  contestId?: number;
  contest?: {
    name: string;
    code: string;
  };
  memberCount?: number;
  members?: Array<any>;
  contingentName?: string;
  contingentId?: number;
  createdAt?: string;
  updatedAt?: string;
  maxMembers?: number;
  isOwner?: boolean;
}

export default function TeamsSummary({ participantId }: TeamsSummaryProps) {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeamStats = async () => {
      try {
        setIsLoading(true);
        
        // Fetch teams from the API endpoint we created
        const teamsResponse = await fetch(`/api/participants/teams?participantId=${participantId}`);
        
        if (!teamsResponse.ok) {
          // Parse error response if available
          let errorMessage = "Failed to fetch teams";
          try {
            const errorData = await teamsResponse.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (e) {
            // Ignore parsing error and use default message
          }
          throw new Error(errorMessage);
        }
        
        // Process the API response
        const teams = await teamsResponse.json();
        
        // The API returns an array of teams directly
        if (Array.isArray(teams)) {
          setStats({
            total: teams.length,
            teams: teams.slice(0, 3) // Take up to 3 teams for display
          });
        } else {
          // Handle case where data might be nested
          const teamArray = teams.data || teams;
          setStats({
            total: teamArray.length,
            teams: teamArray.slice(0, 3) // Take up to 3 teams for display
          });
        }
      } catch (error) {
        console.error("Error fetching team statistics:", error);
        setError("Could not load team statistics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamStats();
  }, [participantId]);

  if (isLoading) {
    return (
      <Card className="h-full gradient-card-orange flex flex-col">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-4 w-[250px] mt-2" />
        </CardHeader>
        <CardContent className="flex flex-col flex-grow">
          <div className="space-y-2 flex-grow">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="mt-auto pt-4">
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full gradient-card-red flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 accent-icon" />
            Error Loading Teams
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-grow">
          <div className="flex-grow"></div>
          <div className="mt-auto pt-4">
            <Button asChild className="w-full">
              <Link href="/participants/teams">Manage Teams</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If no stats are available yet, show a message
  if (!stats || stats.total === 0) {
    return (
      <Card className="h-full gradient-card-orange flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg md:text-xl">My Teams</CardTitle>
          <CardDescription>
            You haven't created or joined any teams yet
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col flex-grow">
          <p className="text-sm text-muted-foreground mb-4 flex-grow">
            Create or join teams to participate in team-based competitions
          </p>
          <div className="mt-auto pt-4">
            <Button asChild className="w-full">
              <Link href="/participants/teams/new">Create Team</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full gradient-card-orange flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg md:text-xl">My Teams</CardTitle>
        <CardDescription>
          Teams you manage or participate in
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow">
        <div className="space-y-4 flex-grow">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="font-medium">Total Teams: {stats.total}</span>
          </div>
          
          <div className="space-y-3">
            {stats.teams.map(team => (
              <div key={team.id} className="border rounded-md p-2 bg-background/50">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{team.name}</div>
                  <div className="text-xs bg-primary/20 px-2 py-0.5 rounded-full">
                    {team.hashcode}
                  </div>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 accent-icon" />
                    <span>{team.contestName || (team.contest?.name)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 accent-icon" />
                    <span>{team.memberCount || (team.members?.length) || 0}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {stats.total > 3 && (
              <div className="text-center text-sm text-muted-foreground">
                +{stats.total - 3} more teams
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-auto pt-4">
          <Button asChild className="w-full">
            <Link href="/participants/teams">Manage Teams</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

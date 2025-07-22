"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PageHeader } from "@/components/page-header-normal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trophy, Medal, Award, Lock, LogOut, Shield, Filter, Loader2 } from "lucide-react";
import { useJudgeAuth } from "@/hooks/useJudgeAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "sonner";
import Link from "next/link";
import { AnimatePresence } from 'framer-motion';
import TeamShowcase from './team-showcase';

interface TeamMember {
  id: number;
  name: string;
}

interface Team {
  attendanceTeamId: number;
  hashcode: string;
  contingentId: number;
  teamId: number;
  eventId: number;
  attendanceStatus: string;
  teamName: string;
  contingentName: string;
  contingentLogoUrl?: string | null;
  stateName?: string | null;
  eventName?: string;
  eventScopeArea?: string;
  eventContestId: number;
  contestName: string;
  judgingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  judgingSessionId: number | null;
  totalScore: number | null;
  members?: TeamMember[];
}



export default function JudgeResultsPage({ 
  params 
}: { 
  params: { 
    hashcode: string;
  } 
}) {
  const router = useRouter();
  const hashcode = params.hashcode;
  
  const { loading, authenticated, judgeEndpoint, authenticate, logout } = useJudgeAuth(hashcode);
  const [passcode, setPasscode] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedStates, setSelectedStates] = useState<{[key: string]: boolean}>({});
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamPosition, setSelectedTeamPosition] = useState<number>(0);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch team members when a team is selected
  const fetchTeamMembers = async (team: Team, position: number) => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/judge/team-members?teamId=${team.teamId}`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch team members");
      }
      
      const data = await res.json();
      console.log("Team members fetched:", data.members);
      
      // Update the selected team with real members
      setSelectedTeam({
        ...team,
        members: data.members
      });
      setSelectedTeamPosition(position);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
      
      // Still show the team even if members couldn't be loaded
      setSelectedTeam(team);
      setSelectedTeamPosition(position);
    } finally {
      setLoadingMembers(false);
    }
  };
  
  // Handle passcode authentication
  const handleAuthenticate = async () => {
    const success = await authenticate(passcode);
    if (success && judgeEndpoint) {
      fetchTeamsData(judgeEndpoint.eventId, judgeEndpoint.contestId);
    }
  };

  // Fetch teams data when authenticated and setup auto-refresh
  useEffect(() => {
    if (authenticated && judgeEndpoint) {
      fetchTeamsData(judgeEndpoint.eventId, judgeEndpoint.contestId);
      
      // Setup auto-refresh every 10 seconds
      const intervalId = setInterval(() => {
        // Pass current selectedStates to preserve state filter during refresh
        fetchTeamsData(judgeEndpoint.eventId, judgeEndpoint.contestId, true);
      }, 10000);
      
      // Clean up interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [authenticated, judgeEndpoint]);

  // Fetch teams data
  const fetchTeamsData = async (eventId: number, contestId: number, silent: boolean = false) => {
    if (!silent) {
      setRefreshing(true);
    }
    
    try {
      // Fetch teams with basic data
      const res = await fetch(`/api/judge/teams?hashcode=${hashcode}&eventId=${eventId}&contestId=${contestId}`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      const teamsData = await res.json();
      
      // We'll only fetch members when a specific team is selected for efficiency
      const teamsWithoutMembers = teamsData.teams;
      
      // Update teams while preserving the current filter state
      setTeams(teamsWithoutMembers);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Error fetching teams data:", error);
      if (!silent) {
        toast.error("Failed to load teams data");
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Get unique states from all teams
  const states = useMemo(() => {
    const stateSet = new Set<string>();
    teams.forEach(team => {
      if (team.stateName) stateSet.add(team.stateName);
    });
    return Array.from(stateSet).sort();
  }, [teams]);
  
  // Initialize selected states when teams change, but preserve existing selections
  useEffect(() => {
    if (states.length) {
      setSelectedStates(prevSelectedStates => {
        // Create a copy of previous selections
        const updatedSelectedStates = { ...prevSelectedStates };
        
        // Check if any new states appeared that aren't in the current selection
        let hasNewStates = false;
        states.forEach(state => {
          if (updatedSelectedStates[state] === undefined) {
            updatedSelectedStates[state] = true; // Initialize new states as selected by default
            hasNewStates = true;
          }
        });
        
        // If this is the first load (no states selected yet) or we have new states, return updated states
        // Otherwise, keep the existing selections intact
        return hasNewStates || Object.keys(prevSelectedStates).length === 0 ? updatedSelectedStates : prevSelectedStates;
      });
    }
  }, [states]);

  // Handle state filter toggle
  const handleStateToggle = (state: string) => {
    setSelectedStates(prev => ({
      ...prev,
      [state]: !prev[state]
    }));
  };
  
  // Handle select all states
  const handleSelectAll = () => {
    const allSelected = states.every(state => selectedStates[state]);
    const newSelectedStates: {[key: string]: boolean} = {};
    states.forEach(state => {
      newSelectedStates[state] = !allSelected;
    });
    setSelectedStates(newSelectedStates);
  };

  // Check if at least one state is selected
  const hasSelectedStates = Object.values(selectedStates).some(selected => selected);

  // Sort teams by totalScore (highest to lowest) and filter by selected states
  const sortedTeams = [...teams]
    // Filter by selected states if it's a ZONE event and state filtering is active
    .filter(team => {
      if (team.eventScopeArea === "ZONE" && team.stateName) {
        return hasSelectedStates ? selectedStates[team.stateName] : true;
      }
      return true;
    })
    .sort((a, b) => {
      // Handle null scores by placing them at the end
      if (a.totalScore === null && b.totalScore === null) return 0;
      if (a.totalScore === null) return 1;
      if (b.totalScore === null) return -1;
      // Sort by score (descending)
      return b.totalScore - a.totalScore;
    });

  // Get rank icon
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
    return null;
  };

  // Authentication screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900 text-white">
        <div className="container mx-auto py-6 space-y-8">
          <PageHeader
            title="Judge Access"
            description="Enter your passcode to view judging results"
          />

          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Authentication Required
              </CardTitle>
              <CardDescription>
                Please enter your 6-character passcode to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg font-mono"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAuthenticate();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleAuthenticate}
                className="w-full"
                variant="default"
              >
                Authenticate
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!judgeEndpoint) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Error" description="Judge endpoint not found" />
        <Card>
          <CardContent className="pt-6">
            <p>The specified judge endpoint could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 via-indigo-900 to-purple-900 text-white">
      <div className="container mx-auto py-6 space-y-8">
        <div className="text-center mb-6">
          <PageHeader
            title={`${judgeEndpoint?.contest?.name || "Judging Results"}`}
            description={`Auto-refreshes every 10 seconds (Last: ${lastRefreshed.toLocaleTimeString()})`}
          />  
          {sortedTeams.length > 0 && sortedTeams[0].eventName && (
            <div className="mt-2 text-white/80">
              <div className="font-medium">{sortedTeams[0].eventName}</div>
              {sortedTeams[0].eventScopeArea && (
                <div className="flex items-center justify-center gap-2">
                  <div className="text-sm text-white/60 uppercase tracking-wide">{sortedTeams[0].eventScopeArea}</div>
                  
                  {/* State filter button (only for ZONE events) */}
                  {sortedTeams[0].eventScopeArea === "ZONE" && states.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md">
                          <Filter className="h-4 w-4 text-white" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-gray-900/95 border-gray-800 text-white backdrop-blur-xl">
                        <DialogHeader>
                          <DialogTitle className="text-white">Filter by State</DialogTitle>
                          <DialogDescription className="text-gray-400">
                            Select states to display in the results.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleSelectAll}
                              className="text-xs text-gray-200 border-gray-700"
                            >
                              {states.every(state => selectedStates[state]) ? "Deselect All" : "Select All"}
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {states.map((state) => (
                              <Toggle
                                key={state}
                                pressed={selectedStates[state] || false}
                                onPressedChange={() => handleStateToggle(state)}
                                variant="outline"
                                className="justify-start data-[state=on]:bg-blue-900/30 data-[state=on]:text-white text-gray-300 border-gray-700"
                              >
                                {state}
                              </Toggle>
                            ))}
                          </div>
                        </div>
                        <DialogClose asChild>
                          <Button className="w-full bg-blue-800 hover:bg-blue-700">Done</Button>
                        </DialogClose>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="pb-8">
          {sortedTeams.length > 0 && sortedTeams[0]?.eventScopeArea === "ZONE" ? (
            // Group by state for ZONE events
            <div className="space-y-8">
              {/* Group teams by state */}
              {Object.entries(sortedTeams.reduce((groups: {[key: string]: Team[]}, team) => {
                const stateKey = team.stateName || "Unknown";
                if (!groups[stateKey]) {
                  groups[stateKey] = [];
                }
                groups[stateKey].push(team);
                return groups;
              }, {})).map(([stateName, stateTeams]) => (
                <Card key={stateName} className="bg-black/30 backdrop-blur-xl border border-white/20 shadow-lg hover:bg-black/40 transition-all duration-300 overflow-hidden">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">{stateName}</CardTitle>
                        <CardDescription className="text-white/80">
                          {stateTeams.length} {stateTeams.length === 1 ? 'team' : 'teams'}
                        </CardDescription>
                      </div>
                      {refreshing && (
                        <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader className="bg-white/10">
                          <TableRow>
                            <TableHead className="text-white w-16">#</TableHead>
                            <TableHead className="text-white">Team</TableHead>
                            <TableHead className="text-white text-right">Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stateTeams.map((team, index) => {
                            // For ZONE events, use state-specific rank (index + 1)
                            // For non-ZONE events, continue using overall rank
                            const stateSpecificRank = index + 1;
                            const overallRank = sortedTeams.findIndex(t => t.attendanceTeamId === team.attendanceTeamId) + 1;
                            
                            // Use state-specific rank for ZONE events
                            const displayRank = team.eventScopeArea === "ZONE" ? stateSpecificRank : overallRank;
                            
                            return (
                              <TableRow 
                                key={team.attendanceTeamId} 
                                className="border-white/10 hover:bg-white/5 cursor-pointer transition-all duration-200"
                                onClick={() => {
                                  fetchTeamMembers(team, stateSpecificRank);
                                }}
                              >
                                <TableCell className="font-medium flex items-center text-white">
                                  {getRankIcon(displayRank)}
                                  <span className="ml-2">{displayRank}</span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-gray-800/50">
                                      {team.contingentLogoUrl ? (
                                        <Image 
                                          src={team.contingentLogoUrl} 
                                          alt={team.contingentName || 'Contingent logo'}
                                          fill
                                          className="object-cover"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <Shield className="w-6 h-6 text-gray-400" />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-white text-lg font-bold">{team.teamName}</div>
                                      <div className="text-xs text-gray-300">
                                        {team.contingentName}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-white text-lg">
                                  {team.totalScore !== null ? parseFloat(team.totalScore.toString()).toFixed(2) : "--"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Default view (single card) for other event scope areas
            <Card className="bg-black/30 backdrop-blur-xl border border-white/20 shadow-lg hover:bg-black/40 transition-all duration-300 overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Judging Results</CardTitle>
                    <CardDescription className="text-white/80">
                      Final scores for all teams
                    </CardDescription>
                  </div>
                  {refreshing && (
                    <Loader2 className="h-4 w-4 text-white/70 animate-spin" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {sortedTeams.length > 0 ? (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader className="bg-white/10">
                        <TableRow>
                          <TableHead className="text-white w-16">#</TableHead>
                          <TableHead className="text-white">Team</TableHead>
                          <TableHead className="text-white text-right">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedTeams.map((team, index) => (
                          <TableRow 
                            key={team.attendanceTeamId} 
                            className="border-white/10 hover:bg-white/5 cursor-pointer transition-all duration-200"
                            onClick={() => {
                              fetchTeamMembers(team, index + 1);
                            }}
                          >
                            <TableCell className="font-medium flex items-center text-white">
                              {getRankIcon(index + 1)}
                              <span className="ml-2">{index + 1}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-gray-800/50">
                                  {team.contingentLogoUrl ? (
                                    <Image 
                                      src={team.contingentLogoUrl} 
                                      alt={team.contingentName || 'Contingent logo'}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Shield className="w-6 h-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-white text-lg font-bold">{team.teamName}</div>
                                  <div className="text-xs text-gray-300">
                                    {team.contingentName}
                                    {team.stateName && (
                                      <span className="ml-1 text-gray-400">• {team.stateName}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-white text-lg">
                              {team.totalScore !== null ? parseFloat(team.totalScore.toString()).toFixed(2) : "--"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium">No results available</p>
                    <p className="text-muted-foreground">
                      Results will appear here once teams have been judged
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Bottom navigation buttons */}
        <div className="fixed bottom-6 left-6 flex items-center gap-2">
          <Button
            onClick={() => router.push(`/judge/${hashcode}`)}
            variant="outline"
            size="icon"
            className="bg-black/30 backdrop-blur-md border-white/10 hover:bg-black/50"
            title="Back to Teams"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Button
            onClick={logout}
            variant="outline"
            size="icon"
            className="bg-black/30 backdrop-blur-md border-white/10 hover:bg-black/50 text-red-500 hover:text-red-700"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Team showcase view (animation handled by AnimatePresence) */}
      <AnimatePresence>
        {selectedTeam && (
          <TeamShowcase 
            team={selectedTeam}
            position={selectedTeamPosition}
            onClose={() => setSelectedTeam(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

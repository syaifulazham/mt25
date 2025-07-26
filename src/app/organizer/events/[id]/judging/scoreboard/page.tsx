"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PageHeader } from "@/components/page-header-normal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Download, Filter, RefreshCw, Medal, Trophy, Award, LogOut, Shield } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { AnimatePresence } from 'framer-motion';
import TeamShowcase from './team-showcase';

interface TeamResult {
  rank: number;
  attendanceTeamId: number;
  team: {
    id: number;
    name: string;
  } | null;
  contingent: {
    id: number;
    name: string;
    logoUrl?: string | null;
  } | null;
  state: {
    id: number;
    name: string;
  } | null;
  averageScore: number;
  sessionCount: number;
}

interface Contest {
  id: number;
  contestId: number;
  name: string;
  contest?: {
    targetgroup?: {
      schoolLevel: string;
    }[];
  };
}

interface State {
  id: number;
  name: string;
}

interface Event {
  id: number;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  status?: string;
  scopeArea?: 'NATIONAL' | 'ZONE' | 'STATE';
  zoneId?: number;
  zoneName?: string;
  stateId?: number | null;
  state?: {
    id: number;
    name: string;
    zone?: {
      id: number;
      name: string;
    };
  };
}

// Helper function for school level labels
const getSchoolLevelLabel = (level: string): string => {
  const labelMap: Record<string, string> = {
    'Primary': 'Kids',
    'Secondary': 'Teens',
    'Higher Education': 'Youth'
  };
  return labelMap[level] || level;
};

// Helper function to trim 'Contingent' word from contingent name
const trimContingentName = (name: string | undefined) => {
  if (!name) return 'Unknown';
  return name.replace(/\s+Contingent$/i, '').trim() || 'Unknown';
};

export default function ScoreboardPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState<TeamResult[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [availableStates, setAvailableStates] = useState<State[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalInProgress: 0,
    totalCompleted: 0
  });
  
  // Filters
  const [selectedContest, setSelectedContest] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedFilterState, setSelectedFilterState] = useState<string>("");
  const [selectedSchoolLevels, setSelectedSchoolLevels] = useState<string[]>([]);
  const [availableSchoolLevels, setAvailableSchoolLevels] = useState<string[]>([]);
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);
  const [selectedTeamPosition, setSelectedTeamPosition] = useState<number>(0);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Fetch team members when a team is selected
  const fetchTeamMembers = async (result: TeamResult, position: number) => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/judge/team-members?teamId=${result.team?.id}`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch team members");
      }
      
      const data = await res.json();
      
      // Create team object for showcase
      const teamForShowcase = {
        attendanceTeamId: result.attendanceTeamId,
        teamName: result.team?.name || 'Unknown Team',
        contingentName: trimContingentName(result.contingent?.name),
        contestName: selectedContest ? contests.find(c => c.id.toString() === selectedContest)?.name || 'Unknown Contest' : 'Unknown Contest',
        totalScore: result.averageScore,
        stateName: result.state?.name || null,
        contingentLogoUrl: result.contingent?.logoUrl || null,
        members: data.members
      };
      
      setSelectedTeam(teamForShowcase);
      setSelectedTeamPosition(position);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
      
      // Still show the team even if members couldn't be loaded
      const teamForShowcase = {
        attendanceTeamId: result.attendanceTeamId,
        teamName: result.team?.name || 'Unknown Team',
        contingentName: trimContingentName(result.contingent?.name),
        contestName: selectedContest ? contests.find(c => c.id.toString() === selectedContest)?.name || 'Unknown Contest' : 'Unknown Contest',
        totalScore: result.averageScore,
        stateName: result.state?.name || null,
        contingentLogoUrl: result.contingent?.logoUrl || null,
        members: []
      };
      
      setSelectedTeam(teamForShowcase);
      setSelectedTeamPosition(position);
    } finally {
      setLoadingMembers(false);
    }
  };
  
  // Filter contests based on selected school levels
  const filteredContests = selectedSchoolLevels.length > 0 
    ? contests.filter((contest: Contest) => {
        return contest.contest?.targetgroup?.some((tg: any) => 
          selectedSchoolLevels.includes(tg.schoolLevel)
        );
      })
    : contests;
  

  
  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const res = await fetch(`/api/organizer/events/${eventId}`, {
          credentials: 'include'
        });
        if (!res.ok) throw new Error('Failed to fetch event');
        const eventData = await res.json();
        setEvent(eventData);
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event data');
      }
    };
    
    fetchEventData();
  }, [eventId]);
  
  // Fetch contests and states
  useEffect(() => {
    const fetchFiltersData = async () => {
      try {
        // Fetch contests for this event
        const contestsRes = await fetch(`/api/judging/contests?eventId=${eventId}`, {
          credentials: 'include'
        });
        if (!contestsRes.ok) throw new Error('Failed to fetch contests');
        const contestsData = await contestsRes.json();
        const contestsWithTargetGroups = contestsData.contests.map((c: any) => ({ 
          id: c.contestId, 
          contestId: c.contestId, 
          name: c.name,
          contest: c.contest
        }));
        setContests(contestsWithTargetGroups);
        
        // Extract unique school levels from all contests
        console.log('DEBUG: contestsWithTargetGroups:', contestsWithTargetGroups);
        const schoolLevels = new Set<string>();
        contestsWithTargetGroups.forEach((contest: any) => {
          console.log('DEBUG: Processing contest:', contest);
          if (contest.contest?.targetgroup) {
            console.log('DEBUG: Found targetgroup:', contest.contest.targetgroup);
            contest.contest.targetgroup.forEach((tg: any) => {
              console.log('DEBUG: Processing targetgroup:', tg);
              if (tg.schoolLevel) {
                console.log('DEBUG: Found schoolLevel:', tg.schoolLevel);
                schoolLevels.add(tg.schoolLevel);
              }
            });
          } else {
            console.log('DEBUG: No targetgroup found for contest:', contest);
          }
        });
        
        console.log('DEBUG: Extracted school levels:', Array.from(schoolLevels));
        
        // Define custom ordering and labels for school levels (using actual database values)
        const schoolLevelOrder = ['Primary', 'Secondary', 'Higher Education'];
        const orderedSchoolLevels = schoolLevelOrder.filter(level => schoolLevels.has(level));
        console.log('DEBUG: Ordered school levels:', orderedSchoolLevels);
        setAvailableSchoolLevels(orderedSchoolLevels);
      } catch (error) {
        console.error('Error fetching filter data:', error);
        toast.error('Failed to load filter data');
      }
    };
    
    if (event) {
      fetchFiltersData();
    }
  }, [eventId, event]);
  
  // Fetch available states when event changes
  useEffect(() => {
    if (event?.scopeArea === 'ZONE' && event?.zoneId) {
      const fetchAvailableStates = async () => {
        try {
          const response = await fetch(`/api/states?zoneId=${event.zoneId}`, {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            setAvailableStates(data);
          }
        } catch (error) {
          console.error("Error fetching available states:", error);
        }
      };
      fetchAvailableStates();
    }
  }, [event?.zoneId, event?.scopeArea]);

  // Fetch scoreboard results
  useEffect(() => {
    const fetchScoreboard = async () => {
      try {
        if (!selectedContest) {
          // Don't fetch results until a contest is selected
          if (contests.length > 0) {
            setSelectedContest(contests[0].id.toString());
          }
          return;
        }
        
        setLoading(true);
        
        // Build query parameters
        const queryParams = new URLSearchParams({
          eventId,
          contestId: selectedContest
        });
        
        // Add stateId for ZONE events if selected
        if (event?.scopeArea === 'ZONE' && selectedFilterState) {
          queryParams.append('stateId', selectedFilterState);
        }
        
        const res = await fetch(`/api/judging/scoreboard?${queryParams.toString()}`, {
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch scoreboard results');
        }
        
        const data = await res.json();
        setResults(data.results);
        setStats({
          totalTeams: data.totalTeams,
          totalInProgress: data.totalInProgress,
          totalCompleted: data.totalCompleted
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching results:', error);
        toast.error('Failed to load scoreboard');
        setLoading(false);
      }
    };
    
    fetchScoreboard();
  }, [eventId, selectedContest, selectedState, selectedFilterState, selectedSchoolLevels, contests, event?.scopeArea]);
  
  // Filter results based on search term and school level
  const filteredResults = results.filter((result) => {
    const matchesSearch = 
      result.team?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.contingent?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // If no school levels are selected, show all results
    if (selectedSchoolLevels.length === 0) {
      return matchesSearch;
    }
    
    // Check if the selected contest has target groups that match selected school levels
    const selectedContestData = contests.find(c => c.id.toString() === selectedContest);
    if (!selectedContestData?.contest?.targetgroup) {
      return matchesSearch;
    }
    
    const contestSchoolLevels = selectedContestData.contest.targetgroup
      .map(tg => tg.schoolLevel)
      .filter(Boolean);
    
    const matchesSchoolLevel = contestSchoolLevels.some(level => 
      selectedSchoolLevels.includes(level)
    );
    
    return matchesSearch && matchesSchoolLevel;
  });
  
  // Handle refreshing the results
  const refreshResults = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        eventId,
        contestId: selectedContest
      });
      
      // Add stateId for ZONE events if selected
      if (event?.scopeArea === 'ZONE' && selectedFilterState) {
        queryParams.append('stateId', selectedFilterState);
      }
      
      const res = await fetch(`/api/judging/scoreboard?${queryParams.toString()}`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to refresh results');
      }
      
      const data = await res.json();
      setResults(data.results);
      setStats({
        totalTeams: data.totalTeams,
        totalInProgress: data.totalInProgress,
        totalCompleted: data.totalCompleted
      });
      
      setLoading(false);
      toast.success('Results refreshed');
    } catch (error) {
      console.error('Error refreshing results:', error);
      toast.error('Failed to refresh results');
      setLoading(false);
    }
  };
  
  // Handle exporting results as CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams({
        eventId,
        contestId: selectedContest
      });
      
      // Add stateId for ZONE events if selected
      if (event?.scopeArea === 'ZONE' && selectedFilterState) {
        queryParams.append('stateId', selectedFilterState);
      }
      
      // First check if export is available
      const checkRes = await fetch(`/api/judging/scoreboard/export?${queryParams.toString()}`, {
        credentials: 'include',
        method: 'HEAD',
      });
      
      if (!checkRes.ok) {
        throw new Error('Export not available');
      }
      
      // If available, trigger download
      const url = `/api/judging/scoreboard/export?${queryParams.toString()}`;
      
      // Create a temporary link to trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = ''; // Browser will use the filename from Content-Disposition
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('Export started');
      setExporting(false);
    } catch (error) {
      console.error('Error exporting results:', error);
      toast.error('Failed to export results');
      setExporting(false);
    }
  };
  
  if (!event) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Loading..." description="Getting event data" />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title={`Keputusan: ${selectedContest ? contests.find(c => c.id.toString() === selectedContest)?.name || 'No Contest Selected' : 'No Contest Selected'}`}
        description={event.name}
      />
      
      {/* Filters & Stats Modal */}
      <Dialog open={filtersModalOpen} onOpenChange={setFiltersModalOpen}>
        <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[90vh] overflow-y-auto bg-black/20 backdrop-blur-xl border-white/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Scoreboard Filters & Statistics</DialogTitle>
            <DialogDescription>
              Configure filters and view statistics for the judging scoreboard.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Teams</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTeams}</div>
                  <div className="text-sm text-gray-500 mt-1">Teams participating</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total In-Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalInProgress}</div>
                  <div className="text-sm text-gray-500 mt-1">Teams awaiting judging</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCompleted}</div>
                  <div className="text-sm text-gray-500 mt-1">Teams with completed judging</div>
                </CardContent>
              </Card>
            </div>
            
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                {/* State Filter (only for ZONE events) */}
                {event.scopeArea === 'ZONE' && availableStates.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      State
                    </label>
                    <Select
                      value={selectedFilterState || "all"}
                      onValueChange={(value) => setSelectedFilterState(value === "all" ? "" : value)}
                    >
                      <SelectTrigger id="state-filter" className="w-full">
                        <SelectValue placeholder="All States" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All States</SelectItem>
                        {availableStates.map((state) => (
                          <SelectItem key={state.id} value={state.id.toString()}>
                            {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Competition Category Filter - Full width row above */}
                {availableSchoolLevels.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Competition Category
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {availableSchoolLevels.map((level) => (
                        <Button
                          key={level}
                          variant={selectedSchoolLevels.includes(level) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newSelectedLevels = selectedSchoolLevels.includes(level)
                              ? selectedSchoolLevels.filter(l => l !== level)
                              : [...selectedSchoolLevels, level];
                            
                            // Calculate filtered contests based on new selection
                            const newFilteredContests = newSelectedLevels.length > 0 
                              ? contests.filter((contest: Contest) => {
                                  return contest.contest?.targetgroup?.some((tg: any) => 
                                    newSelectedLevels.includes(tg.schoolLevel)
                                  );
                                })
                              : contests;
                            
                            // Update state in batch to prevent conflicts
                            setSelectedSchoolLevels(newSelectedLevels);
                            
                            // Auto-select first available contest
                            if (newFilteredContests.length > 0) {
                              setSelectedContest(newFilteredContests[0].id.toString());
                            } else {
                              setSelectedContest("");
                            }
                          }}
                          className="h-8 text-xs"
                        >
                          {getSchoolLevelLabel(level)}
                        </Button>
                      ))}
                      {selectedSchoolLevels.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedSchoolLevels([]);
                            // Auto-select first contest when clearing all categories
                            if (contests.length > 0) {
                              setSelectedContest(contests[0].id.toString());
                            } else {
                              setSelectedContest("");
                            }
                          }}
                          className="h-8 text-xs text-muted-foreground"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Contest Filter */}
                  <div className="flex-1">
                    <label htmlFor="contest-filter" className="block text-sm font-medium mb-1">
                      Contest
                    </label>
                    <Select
                      value={selectedContest}
                      onValueChange={setSelectedContest}
                    >
                      <SelectTrigger id="contest-filter" className="w-full">
                        <SelectValue placeholder="Select a contest" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredContests.map((contest) => (
                          <SelectItem key={contest.id} value={contest.id.toString()}>
                            {contest.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  
                  <div className="flex-none self-end">
                    <Button
                      onClick={() => {
                        refreshResults();
                        setFiltersModalOpen(false);
                      }}
                      disabled={loading || !selectedContest}
                      className="gap-2 h-10"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
      

      
      {/* Results Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : selectedContest && filteredResults.length > 0 ? (
        event.scopeArea === 'ZONE' ? (
          // Group by state for ZONE events
          <div className="space-y-8">
            {/* Group results by state */}
            {Object.entries(filteredResults.reduce((groups: {[key: string]: TeamResult[]}, result) => {
              const stateKey = result.state?.name || "Unknown State";
              if (!groups[stateKey]) {
                groups[stateKey] = [];
              }
              groups[stateKey].push(result);
              return groups;
            }, {})).map(([stateName, stateResults]) => (
              <Card key={stateName} className="bg-black/10 backdrop-blur-xl border-white/20 shadow-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white">{stateName}</CardTitle>
                      <CardDescription className="text-gray-300">
                        {stateResults.length} {stateResults.length === 1 ? 'team' : 'teams'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                          <TableHead className="w-20 text-white pl-6">Rank</TableHead>
                          <TableHead className="text-white">Team</TableHead>
                          <TableHead className="text-right text-white pr-8">Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stateResults.map((result, index) => {
                          // Use state-specific rank (index + 1) for ZONE events
                          const stateSpecificRank = index + 1;
                          
                          return (
                            <TableRow 
                              key={result.attendanceTeamId} 
                              className="border-white/10 hover:bg-white/5 cursor-pointer"
                              onClick={() => fetchTeamMembers(result, stateSpecificRank)}
                            >
                              <TableCell className="font-medium text-white pl-6">
                                <div className="flex items-center">
                                  {stateSpecificRank <= 3 ? (
                                    stateSpecificRank === 1 ? <Trophy className="h-5 w-5 text-yellow-500 mr-2" /> :
                                    stateSpecificRank === 2 ? <Medal className="h-5 w-5 text-gray-400 mr-2" /> :
                                    <Award className="h-5 w-5 text-amber-700 mr-2" />
                                  ) : null}
                                  <span>{stateSpecificRank}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-gray-800/50">
                                    {result.contingent?.logoUrl ? (
                                      <Image 
                                        src={result.contingent.logoUrl} 
                                        alt={result.contingent?.name || 'Contingent logo'}
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
                                    <div className="text-lg font-bold text-white">{result.team?.name || 'Unknown Team'}</div>
                                    <div className="text-sm text-gray-400 mt-1">{trimContingentName(result.contingent?.name)}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-white pr-8">
                                <div className="text-lg font-bold">{result.averageScore.toFixed(2)}</div>
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
          // Default view (single table) for other event scope areas
          <Card className="bg-black/10 backdrop-blur-xl border-white/20 shadow-2xl">
            <CardContent className="p-0">
              <div className="rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="w-20 text-white pl-6">Rank</TableHead>
                      <TableHead className="text-white">Team</TableHead>
                      <TableHead className="text-right text-white">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow 
                        key={result.attendanceTeamId} 
                        className="border-white/10 hover:bg-white/5 cursor-pointer"
                        onClick={() => fetchTeamMembers(result, result.rank)}
                      >
                        <TableCell className="font-medium text-white pl-6">
                          <div className="flex items-center">
                            {result.rank <= 3 ? (
                              result.rank === 1 ? <Trophy className="h-5 w-5 text-yellow-500 mr-2" /> :
                              result.rank === 2 ? <Medal className="h-5 w-5 text-gray-400 mr-2" /> :
                              <Award className="h-5 w-5 text-amber-700 mr-2" />
                            ) : null}
                            <span>{result.rank}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 flex-shrink-0 rounded-md overflow-hidden bg-gray-800/50">
                              {result.contingent?.logoUrl ? (
                                <Image 
                                  src={result.contingent.logoUrl} 
                                  alt={result.contingent?.name || 'Contingent logo'}
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
                              <div className="text-lg font-bold text-white">{result.team?.name || 'Unknown Team'}</div>
                              <div className="text-sm text-gray-400 mt-1">{trimContingentName(result.contingent?.name)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-white pr-8">
                          <div className="text-lg font-bold">{result.averageScore.toFixed(2)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      ) : selectedContest ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>No results found. Teams may not have been judged yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center">
            <p>Please select a contest to view results.</p>
          </CardContent>
        </Card>
      )}
      
      {/* Floating Search - Top Right */}
      <div className="fixed top-6 right-6 z-50">
        <div className="flex items-center gap-2 w-80">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 bg-black/30 backdrop-blur-md border-white/20 text-white placeholder:text-gray-400 focus:border-white/40"
          />
        </div>
      </div>
      
      {/* Floating Action Buttons - Bottom Left */}
      <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.push(`/organizer/events/${eventId}/judging`)}
          className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border-white/20 hover:bg-white/10 text-white"
          title="Back to Judging"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setFiltersModalOpen(true)}
          className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border-white/20 hover:bg-white/10 text-white"
          title="Filters & Statistics"
        >
          <Filter className="h-5 w-5" />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleExportCSV}
          disabled={exporting || results.length === 0}
          className="h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border-white/20 hover:bg-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export CSV"
        >
          {exporting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
          ) : (
            <Download className="h-5 w-5" />
          )}
        </Button>
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

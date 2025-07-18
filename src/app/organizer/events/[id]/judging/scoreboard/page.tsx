"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Download, Filter, RefreshCw, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import Link from "next/link";

interface TeamResult {
  rank: number;
  attendanceTeamId: number;
  sessionCount: number;
  totalScore: number;
  averageScore: number;
  stateId?: number;
  state?: {
    id: number;
    name: string;
  };
  team: {
    id: number;
    name: string;
  };
  contingent: {
    id: number;
    name: string;
  };
}

interface Contest {
  id: number;
  contestId: number;
  name: string;
}

interface State {
  id: number;
  name: string;
}

interface Event {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  scopeArea: 'NATIONAL' | 'ZONE' | 'STATE';
  stateId: number | null;
  state?: {
    id: number;
    name: string;
  };
}

export default function ScoreboardPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState<TeamResult[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalJudges: 0,
    totalSessions: 0
  });
  
  // Filters
  const [selectedContest, setSelectedContest] = useState<string>("");
  const [selectedState, setSelectedState] = useState<string>("");
  
  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const res = await fetch(`/api/organizer/events/${eventId}`);
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
        const contestsRes = await fetch(`/api/judging/contests?eventId=${eventId}`);
        if (!contestsRes.ok) throw new Error('Failed to fetch contests');
        const contestsData = await contestsRes.json();
        setContests(contestsData.contests.map((c: any) => ({ 
          id: c.id, 
          contestId: c.contestId, 
          name: c.name 
        })));
        
        // Fetch states if this is a ZONE event
        if (event?.scopeArea === 'ZONE') {
          const statesRes = await fetch(`/api/organizer/states`);
          if (!statesRes.ok) throw new Error('Failed to fetch states');
          const statesData = await statesRes.json();
          setStates(statesData.states);
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
        toast.error('Failed to load filter data');
      }
    };
    
    if (event) {
      fetchFiltersData();
    }
  }, [eventId, event]);
  
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
        if (event?.scopeArea === 'ZONE' && selectedState) {
          queryParams.append('stateId', selectedState);
        }
        
        const res = await fetch(`/api/judging/scoreboard?${queryParams.toString()}`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch scoreboard results');
        }
        
        const data = await res.json();
        setResults(data.results);
        setStats({
          totalTeams: data.totalTeams,
          totalJudges: data.totalJudges,
          totalSessions: data.totalSessions
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching results:', error);
        toast.error('Failed to load scoreboard');
        setLoading(false);
      }
    };
    
    fetchScoreboard();
  }, [eventId, selectedContest, selectedState, contests, event?.scopeArea]);
  
  // Filter results based on search term
  const filteredResults = results.filter((result) => {
    const matchesSearch = 
      result.team?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.contingent?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
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
      if (event?.scopeArea === 'ZONE' && selectedState) {
        queryParams.append('stateId', selectedState);
      }
      
      const res = await fetch(`/api/judging/scoreboard?${queryParams.toString()}`);
      
      if (!res.ok) {
        throw new Error('Failed to refresh results');
      }
      
      const data = await res.json();
      setResults(data.results);
      setStats({
        totalTeams: data.totalTeams,
        totalJudges: data.totalJudges,
        totalSessions: data.totalSessions
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
      if (event?.scopeArea === 'ZONE' && selectedState) {
        queryParams.append('stateId', selectedState);
      }
      
      // First check if export is available
      const checkRes = await fetch(`/api/judging/scoreboard/export?${queryParams.toString()}`, {
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
        title="Judging Scoreboard" 
        description={`Results for ${event.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/organizer/events/${eventId}/judging`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Judging
            </Button>
          </div>
        }
      />
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Scoreboard Filters</CardTitle>
        </CardHeader>
        <CardContent>
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
                  {contests.map((contest) => (
                    <SelectItem key={contest.id} value={contest.id.toString()}>
                      {contest.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* State Filter (only for ZONE events) */}
            {event.scopeArea === 'ZONE' && (
              <div className="flex-1">
                <label htmlFor="state-filter" className="block text-sm font-medium mb-1">
                  State
                </label>
                <Select
                  value={selectedState}
                  onValueChange={setSelectedState}
                >
                  <SelectTrigger id="state-filter" className="w-full">
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All States</SelectItem>
                    {states.map((state) => (
                      <SelectItem key={state.id} value={state.id.toString()}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="flex-none self-end">
              <Button
                onClick={refreshResults}
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
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTeams}</div>
            <div className="text-sm text-gray-500 mt-1">Teams with completed judging</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Judges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalJudges}</div>
            <div className="text-sm text-gray-500 mt-1">Judges participating</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSessions}</div>
            <div className="text-sm text-gray-500 mt-1">Completed judging sessions</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 w-full max-w-sm">
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleExportCSV}
          disabled={exporting || results.length === 0}
          className="h-9 gap-1"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </Button>
      </div>
      
      {/* Results Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : selectedContest && filteredResults.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Contingent</TableHead>
                {event.scopeArea === 'ZONE' && (
                  <TableHead>State</TableHead>
                )}
                <TableHead className="text-right">Average Score</TableHead>
                <TableHead className="text-center">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => (
                <TableRow key={result.attendanceTeamId}>
                  <TableCell className="font-medium">
                    {result.rank <= 3 ? (
                      <div className="flex items-center">
                        <Medal className={`h-5 w-5 mr-1 ${
                          result.rank === 1 ? 'text-yellow-500' : 
                          result.rank === 2 ? 'text-gray-400' : 
                          'text-amber-700'
                        }`} />
                        {result.rank}
                      </div>
                    ) : result.rank}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{result.team?.name || 'Unknown Team'}</div>
                  </TableCell>
                  <TableCell>
                    <div>{result.contingent?.name || 'Unknown Contingent'}</div>
                  </TableCell>
                  {event.scopeArea === 'ZONE' && (
                    <TableCell>
                      <div>{result.state?.name || 'Unknown State'}</div>
                    </TableCell>
                  )}
                  <TableCell className="text-right font-semibold">
                    {result.averageScore.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    {result.sessionCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
    </div>
  );
}

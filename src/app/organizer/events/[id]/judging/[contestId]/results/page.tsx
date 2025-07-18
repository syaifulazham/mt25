"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Download, Filter, RefreshCw, Medal, Users } from "lucide-react";
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
  sessions: {
    judgeId: number;
    score: number;
    comments: string | null;
  }[];
}

interface Judge {
  userId: number;
  user: {
    id: number;
    name: string;
    username: string;
  };
}

interface Event {
  id: number;
  name: string;
  description: string | null;
  scopeArea: 'NATIONAL' | 'ZONE' | 'STATE';
  stateId: number | null;
}

interface Contest {
  id: number;
  name: string;
  judgingTemplateId: number | null;
}

export default function ContestResultsPage({ 
  params 
}: { 
  params: { 
    id: string;
    contestId: string;
  } 
}) {
  const router = useRouter();
  const eventId = params.id;
  const contestId = params.contestId;
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [results, setResults] = useState<TeamResult[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [contest, setContest] = useState<Contest | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("rankings");
  const [stats, setStats] = useState({
    totalTeams: 0,
    totalJudges: 0,
    totalSessions: 0
  });
  
  // Fetch judging results
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch event details
        const eventRes = await fetch(`/api/organizer/events/${eventId}`);
        if (!eventRes.ok) throw new Error('Failed to fetch event');
        const eventData = await eventRes.json();
        setEvent(eventData);
        
        // Fetch contest details
        const contestRes = await fetch(`/api/organizer/events/${eventId}/contests/${contestId}`);
        if (!contestRes.ok) throw new Error('Failed to fetch contest');
        const contestData = await contestRes.json();
        setContest(contestData);
        
        // Fetch results
        const resultsRes = await fetch(`/api/judging/scoreboard?eventId=${eventId}&contestId=${contestId}`);
        if (!resultsRes.ok) throw new Error('Failed to fetch results');
        const resultsData = await resultsRes.json();
        
        setResults(resultsData.results);
        setJudges(resultsData.judges || []);
        setStats({
          totalTeams: resultsData.totalTeams,
          totalJudges: resultsData.totalJudges,
          totalSessions: resultsData.totalSessions
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load results');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [eventId, contestId]);
  
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
      const res = await fetch(`/api/judging/scoreboard?eventId=${eventId}&contestId=${contestId}`);
      
      if (!res.ok) {
        throw new Error('Failed to refresh results');
      }
      
      const data = await res.json();
      setResults(data.results);
      setJudges(data.judges || []);
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
      
      // First check if export is available
      const checkRes = await fetch(`/api/judging/scoreboard/export?eventId=${eventId}&contestId=${contestId}`, {
        method: 'HEAD',
      });
      
      if (!checkRes.ok) {
        throw new Error('Export not available');
      }
      
      // If available, trigger download
      const url = `/api/judging/scoreboard/export?eventId=${eventId}&contestId=${contestId}`;
      
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
  
  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!event || !contest) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Error" description="Event or contest not found" />
        <Card>
          <CardContent className="pt-6">
            <p>The specified event or contest could not be found.</p>
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/organizer/events/${eventId}/judging`)}
              >
                Back to Judging
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title={`${contest.name} Results`} 
        description={`Judging results for ${event.name}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshResults}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={exporting || results.length === 0}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/organizer/events/${eventId}/judging/${contestId}/teams`)}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              View Teams
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/organizer/events/${eventId}/judging`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Contests
            </Button>
          </div>
        }
      />
      
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
      </div>
      
      <Tabs defaultValue="rankings" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="judges">Judge Details</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-4 mt-4">
          {filteredResults.length > 0 ? (
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
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p>No results found. Teams may not have been judged yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="judges" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Judge Participation</CardTitle>
            </CardHeader>
            <CardContent>
              {judges.length > 0 ? (
                <div className="space-y-6">
                  {judges.map((judge) => {
                    // Count sessions per judge
                    const judgeSessionsCount = results.reduce((count, result) => {
                      const judgeSessionsForTeam = result.sessions?.filter(
                        session => session.judgeId === judge.userId
                      ).length || 0;
                      return count + judgeSessionsForTeam;
                    }, 0);
                    
                    // Calculate average score given by this judge
                    let totalScore = 0;
                    let sessionCount = 0;
                    
                    results.forEach(result => {
                      result.sessions?.forEach(session => {
                        if (session.judgeId === judge.userId) {
                          totalScore += session.score || 0;
                          sessionCount++;
                        }
                      });
                    });
                    
                    const averageScore = sessionCount > 0 ? totalScore / sessionCount : 0;
                    
                    return (
                      <div key={judge.userId} className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{judge.user.name}</h3>
                          <p className="text-sm text-gray-500">{judge.user.username}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="font-medium">{judgeSessionsCount}</span> teams judged
                          </div>
                          <div className="text-sm">
                            Avg score: <span className="font-medium">{averageScore.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center">No judges found for this contest.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

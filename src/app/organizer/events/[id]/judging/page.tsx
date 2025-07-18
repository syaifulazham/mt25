"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Award, ChevronRight, PlusCircle, User, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Contest {
  id: number;
  name: string;
  description: string | null;
  judgingTemplateId: number | null;
  judgingtemplate?: {
    id: number;
    name: string;
    description: string | null;
  };
  _count: {
    attendanceTeam: number;
  };
  stats: {
    totalTeams: number;
    judgedTeams: number;
    inProgressTeams: number;
  };
  contest?: {
    targetgroup?: Array<{
      id: number;
      code: string;
      name: string;
      schoolLevel: string;
    }>;
  };
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

export default function EventJudgingPage({ params }: { params: { id: string } }) {
  const eventId = params.id;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [groupedContests, setGroupedContests] = useState<Record<string, Contest[]>>({});

  useEffect(() => {
    const fetchEventAndContests = async () => {
      try {
        setLoading(true);
        
        // Fetch event details
        const eventRes = await fetch(`/api/organizer/events/${eventId}`);
        if (!eventRes.ok) throw new Error('Failed to fetch event');
        const eventData = await eventRes.json();
        
        // Fetch contests for this event with judging stats
        const contestsRes = await fetch(`/api/judging/contests?eventId=${eventId}`);
        if (!contestsRes.ok) throw new Error('Failed to fetch contests');
        const contestsData = await contestsRes.json();
        
        // Group contests by school level
        const contestsArray = contestsData.contests;
        const grouped = contestsArray.reduce((acc: Record<string, Contest[]>, contest: Contest) => {
          // Get school level from the first target group, or use 'Uncategorized' if not available
          const schoolLevel = contest.contest?.targetgroup?.[0]?.schoolLevel || 'Uncategorized';
          
          if (!acc[schoolLevel]) {
            acc[schoolLevel] = [];
          }
          
          acc[schoolLevel].push(contest);
          return acc;
        }, {} as Record<string, Contest[]>);
        
        setEvent(eventData);
        setContests(contestsData.contests);
        setGroupedContests(grouped);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load event and contests');
        setLoading(false);
      }
    };
    
    fetchEventAndContests();
  }, [eventId]);

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!event) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Event Not Found" description="The specified event could not be found" />
        <Card>
          <CardContent className="pt-6">
            <p>The event you are trying to access does not exist or you don't have permission to view it.</p>
            <div className="mt-4">
              <Button 
                variant="outline"
                onClick={() => router.push('/organizer/events')}
              >
                Back to Events
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center mb-6">
        <PageHeader 
          title="Judging Management" 
          description={`Manage judging for ${event.name}`}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/organizer/events/${eventId}/judging/scoreboard`)}
            className="gap-2"
          >
            <Award className="h-4 w-4" />
            View Scoreboard
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Available Contests</CardTitle>
            <Badge variant={event.scopeArea === 'NATIONAL' ? 'default' : event.scopeArea === 'ZONE' ? 'secondary' : 'outline'}>
              {event.scopeArea} Event
            </Badge>
          </div>
          <CardDescription>
            Select a contest to manage judging sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedContests).length > 0 ? (
            Object.entries(groupedContests).map(([schoolLevel, levelContests]) => (
              <div key={schoolLevel} className="mb-8">
                <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
                  {schoolLevel}
                </h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contest</TableHead>
                        <TableHead>Judging Template</TableHead>
                        <TableHead className="text-center">Teams</TableHead>
                        <TableHead className="text-center">Judged</TableHead>
                        <TableHead className="text-center">In Progress</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {levelContests.map((contest) => (
                        <TableRow key={contest.id}>
                          <TableCell className="font-medium">
                            {contest.name}
                          </TableCell>
                      <TableCell>
                        {contest.judgingTemplateId ? (
                          <div>
                            {contest.judgingtemplate?.name || 'Template Found'}
                          </div>
                        ) : (
                          <div className="flex items-center text-amber-600">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            <span>No Template</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {contest.stats.totalTeams}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={contest.stats.judgedTeams > 0 ? 'bg-green-100 text-green-800' : ''}>
                          {contest.stats.judgedTeams}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={contest.stats.inProgressTeams > 0 ? 'bg-amber-100 text-amber-800' : ''}>
                          {contest.stats.inProgressTeams}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {contest.judgingTemplateId ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild
                            >
                              <Link href={`/organizer/events/${eventId}/judging/${contest.id}/teams`}>
                                Manage Teams
                              </Link>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild
                            >
                              <Link href={`/organizer/events/${eventId}/judging/${contest.id}/results`}>
                                View Results
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            asChild
                            disabled
                          >
                            <Link href={`/organizer/judging-templates?contestId=${contest.id}`}>
                              Assign Template
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contest</TableHead>
                    <TableHead>Judging Template</TableHead>
                    <TableHead className="text-center">Teams</TableHead>
                    <TableHead className="text-center">Judged</TableHead>
                    <TableHead className="text-center">In Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No contests found for this event.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

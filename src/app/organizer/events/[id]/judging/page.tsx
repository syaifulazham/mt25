"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Award, ChevronRight, PlusCircle, User, Users, UserPlus, Copy, Edit, ExternalLink, Settings, Eye, UsersIcon, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface JudgeEndpoint {
  id: number;
  eventId: number;
  contestId: number;
  judge_name: string;
  judge_ic: string;
  judge_email: string;
  judge_phoneNo: string;
  judge_passcode: string;
  hashcode: string;
  createdAt: string;
  updatedAt: string;
  event_id?: number;
  event_name?: string;
  contest_id?: number;
  contest_name?: string;
  contest_code?: string;
}

interface Contest {
  id: number;
  contestId: number; // ID from the contest table
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
  judgeEndpoints?: JudgeEndpoint[];
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
  const [judgeEndpoints, setJudgeEndpoints] = useState<Record<number, JudgeEndpoint[]>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<JudgeEndpoint | null>(null);
  const [judgeForm, setJudgeForm] = useState({
    judge_name: '',
    judge_ic: '',
    judge_email: '',
    judge_phoneNo: ''
  });
  const [editForm, setEditForm] = useState({
    judge_name: '',
    judge_ic: '',
    judge_email: '',
    judge_phoneNo: ''
  });

  // Function to fetch judge endpoints for a specific contest
  const fetchJudgeEndpoints = async (contestId: number) => {
    try {
      const response = await fetch(`/api/judges-endpoints?eventId=${eventId}&contestId=${contestId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch judge endpoints');
      }
      const data = await response.json();
      setJudgeEndpoints(prev => ({
        ...prev,
        [contestId]: data.judgesEndpoints || []
      }));
    } catch (error) {
      console.error('Error fetching judge endpoints:', error);
      toast.error('Failed to load judge endpoints');
    }
  };

  // Function to create a new judge endpoint
  const createJudgeEndpoint = async () => {
    if (!selectedContest) return;
    
    try {
      const response = await fetch('/api/judges-endpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: parseInt(eventId),
          contestId: selectedContest.contestId,
          ...judgeForm
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create judge endpoint');
      }
      
      const newEndpoint = await response.json();
      
      // Update the judgeEndpoints state
      setJudgeEndpoints(prev => ({
        ...prev,
        [selectedContest.contestId]: [
          ...(prev[selectedContest.contestId] || []),
          newEndpoint
        ]
      }));
      
      // Reset form and close dialog
      setJudgeForm({
        judge_name: '',
        judge_ic: '',
        judge_email: '',
        judge_phoneNo: ''
      });
      setCreateDialogOpen(false);
      setSelectedContest(null);
      
      toast.success('Judge endpoint created successfully!');
    } catch (error) {
      console.error('Error creating judge endpoint:', error);
      toast.error('Failed to create judge endpoint');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleEditJudgeEndpoint = (endpoint: JudgeEndpoint) => {
    setSelectedEndpoint(endpoint);
    setEditForm({
      judge_name: endpoint.judge_name || '',
      judge_ic: endpoint.judge_ic || '',
      judge_email: endpoint.judge_email || '',
      judge_phoneNo: endpoint.judge_phoneNo || ''
    });
    setEditDialogOpen(true);
  };

  const updateJudgeEndpoint = async () => {
    if (!selectedEndpoint) return;
    
    try {
      const response = await fetch(`/api/judges-endpoints/${selectedEndpoint.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update judge endpoint');
      }
      
      const updatedEndpoint = await response.json();
      
      // Update the judgeEndpoints state
      setJudgeEndpoints(prev => {
        const contestId = selectedEndpoint.contestId;
        const endpoints = prev[contestId] || [];
        const updatedEndpoints = endpoints.map(ep => 
          ep.id === selectedEndpoint.id ? updatedEndpoint : ep
        );
        return {
          ...prev,
          [contestId]: updatedEndpoints
        };
      });
      
      // Reset form and close dialog
      setEditForm({
        judge_name: '',
        judge_ic: '',
        judge_email: '',
        judge_phoneNo: ''
      });
      setEditDialogOpen(false);
      setSelectedEndpoint(null);
      
      toast.success('Judge endpoint updated successfully!');
    } catch (error) {
      console.error('Error updating judge endpoint:', error);
      toast.error('Failed to update judge endpoint');
    }
  };

  useEffect(() => {
    const fetchEventAndContests = async () => {
      try {
        setLoading(true);
        
        // Fetch event details
        const eventRes = await fetch(`/api/organizer/events/${eventId}`);
        if (!eventRes.ok) throw new Error('Failed to fetch event');
        
        // Fetch contests for this event with judging stats
        const contestsRes = await fetch(`/api/judging/contests?eventId=${eventId}`);
        if (!contestsRes.ok) throw new Error('Failed to fetch contests');
        
        const eventData = await eventRes.json();
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
        
        // Fetch judge endpoints for all contests
        for (const contest of contestsArray) {
          await fetchJudgeEndpoints(contest.contestId);
        }
        
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
                      {levelContests.map((contest) => {
                        const endpoints = judgeEndpoints[contest.contestId] || [];
                        return (
                          <React.Fragment key={contest.id}>
                            <TableRow>
                              <TableCell className="font-medium">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="cursor-help">
                                        {contest.name.length > 25 
                                          ? `${contest.name.substring(0, 25)}...` 
                                          : contest.name
                                        }
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{contest.name}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                                <div className="flex justify-end gap-1 flex-wrap">
                                  {contest.judgingTemplateId ? (
                                    <>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              variant="outline" 
                                              size="sm" 
                                              className="h-8 w-8 p-0 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-600"
                                              asChild
                                            >
                                              <Link href={`/organizer/events/${eventId}/judging/${contest.contestId}/teams`}>
                                                <UsersIcon className="h-4 w-4" />
                                              </Link>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Manage Teams</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button 
                                              variant="outline" 
                                              size="sm" 
                                              className="h-8 w-8 p-0 border-green-200 bg-green-50 hover:bg-green-100 text-green-600"
                                              asChild
                                            >
                                              <Link href={`/organizer/events/${eventId}/judging/${contest.contestId}/results`}>
                                                <Eye className="h-4 w-4" />
                                              </Link>
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>View Results</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </>
                                  ) : (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 w-8 p-0 border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-600"
                                            asChild
                                          >
                                            <Link href={`/organizer/contests/${contest.contestId}/edit`}>
                                              <Settings className="h-4 w-4" />
                                            </Link>
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Assign Template</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="outline" 
                                          size="sm" 
                                          className="h-8 w-8 p-0 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-600"
                                          onClick={() => {
                                            setSelectedContest(contest);
                                            setCreateDialogOpen(true);
                                          }}
                                        >
                                          <UserPlus className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Create Judge</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                            
                            {/* Judge Endpoints Row - directly beneath this contest */}
                            {endpoints.length > 0 && (
                              <TableRow className="bg-yellow-50">
                                <TableCell colSpan={6} className="p-0">
                                  <div className="p-4">
                                    <h4 className="text-sm font-medium text-yellow-800 mb-3">
                                      Judge Endpoints ({endpoints.length})
                                    </h4>
                                    <div className="rounded-md border border-yellow-200 bg-yellow-50">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-xs h-8">Judge Name</TableHead>
                                            <TableHead className="text-xs h-8">Endpoint Link</TableHead>
                                            <TableHead className="text-xs h-8">Passcode</TableHead>
                                            <TableHead className="text-xs h-8 w-16">Actions</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {endpoints.map((endpoint) => {
                                            const endpointUrl = `${window.location.origin}/judge/${endpoint.hashcode}`;
                                            return (
                                              <TableRow key={endpoint.id} className="h-10">
                                                <TableCell className="text-xs font-medium">
                                                  {endpoint.judge_name || 'Anonymous Judge'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                  <div className="flex items-center gap-1">
                                                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono max-w-[200px] truncate">
                                                      /judge/{endpoint.hashcode.substring(0, 8)}...
                                                    </code>
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0"
                                                            onClick={() => copyToClipboard(endpointUrl, 'Endpoint link')}
                                                          >
                                                            <Copy className="h-3 w-3" />
                                                          </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>Copy endpoint link</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                  <div className="flex items-center gap-1">
                                                    <Badge variant="secondary" className="font-mono text-xs">
                                                      {endpoint.judge_passcode}
                                                    </Badge>
                                                    <TooltipProvider>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0"
                                                            onClick={() => copyToClipboard(endpoint.judge_passcode, 'Passcode')}
                                                          >
                                                            <Copy className="h-3 w-3" />
                                                          </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                          <p>Copy passcode</p>
                                                        </TooltipContent>
                                                      </Tooltip>
                                                    </TooltipProvider>
                                                  </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                  <TooltipProvider>
                                                    <Tooltip>
                                                      <TooltipTrigger asChild>
                                                        <Button
                                                          variant="ghost"
                                                          size="sm"
                                                          className="h-6 w-6 p-0"
                                                          onClick={() => handleEditJudgeEndpoint(endpoint)}
                                                        >
                                                          <Edit className="h-3 w-3" />
                                                        </Button>
                                                      </TooltipTrigger>
                                                      <TooltipContent>
                                                        <p>Edit judge endpoint</p>
                                                      </TooltipContent>
                                                    </Tooltip>
                                                  </TooltipProvider>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
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
      
      {/* Create Judge Endpoint Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Judge Endpoint</DialogTitle>
            <DialogDescription>
              Create a new judge endpoint for {selectedContest?.name}. All fields are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="judge_name" className="text-right">
                Name
              </Label>
              <Input
                id="judge_name"
                value={judgeForm.judge_name}
                onChange={(e) => setJudgeForm(prev => ({ ...prev, judge_name: e.target.value }))}
                className="col-span-3"
                placeholder="Judge name (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="judge_ic" className="text-right">
                IC
              </Label>
              <Input
                id="judge_ic"
                value={judgeForm.judge_ic}
                onChange={(e) => setJudgeForm(prev => ({ ...prev, judge_ic: e.target.value }))}
                className="col-span-3"
                placeholder="IC number (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="judge_email" className="text-right">
                Email
              </Label>
              <Input
                id="judge_email"
                type="email"
                value={judgeForm.judge_email}
                onChange={(e) => setJudgeForm(prev => ({ ...prev, judge_email: e.target.value }))}
                className="col-span-3"
                placeholder="Email address (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="judge_phoneNo" className="text-right">
                Phone
              </Label>
              <Input
                id="judge_phoneNo"
                value={judgeForm.judge_phoneNo}
                onChange={(e) => setJudgeForm(prev => ({ ...prev, judge_phoneNo: e.target.value }))}
                className="col-span-3"
                placeholder="Phone number (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setSelectedContest(null);
                setJudgeForm({
                  judge_name: '',
                  judge_ic: '',
                  judge_email: '',
                  judge_phoneNo: ''
                });
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={createJudgeEndpoint}>
              Create Judge Endpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Judge Endpoint Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Judge Endpoint</DialogTitle>
            <DialogDescription>
              Update the judge information for this endpoint. All fields are optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_judge_name" className="text-right">
                Name
              </Label>
              <Input
                id="edit_judge_name"
                value={editForm.judge_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, judge_name: e.target.value }))}
                className="col-span-3"
                placeholder="Judge name (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_judge_ic" className="text-right">
                IC
              </Label>
              <Input
                id="edit_judge_ic"
                value={editForm.judge_ic}
                onChange={(e) => setEditForm(prev => ({ ...prev, judge_ic: e.target.value }))}
                className="col-span-3"
                placeholder="IC number (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_judge_email" className="text-right">
                Email
              </Label>
              <Input
                id="edit_judge_email"
                type="email"
                value={editForm.judge_email}
                onChange={(e) => setEditForm(prev => ({ ...prev, judge_email: e.target.value }))}
                className="col-span-3"
                placeholder="Email address (optional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_judge_phoneNo" className="text-right">
                Phone
              </Label>
              <Input
                id="edit_judge_phoneNo"
                value={editForm.judge_phoneNo}
                onChange={(e) => setEditForm(prev => ({ ...prev, judge_phoneNo: e.target.value }))}
                className="col-span-3"
                placeholder="Phone number (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedEndpoint(null);
                setEditForm({
                  judge_name: '',
                  judge_ic: '',
                  judge_email: '',
                  judge_phoneNo: ''
                });
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={updateJudgeEndpoint}>
              Update Judge Endpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  AlertTriangle,
  PencilIcon,
  User,
  UserCog,
  School,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { eventApi } from '@/lib/api-client';

// Extend the existing eventApi with the necessary functions for this page
const eventContestApi = {
  // Get an event contest details by ID
  getEventContestDetails: (eventId: number, eventContestId: number) =>
    eventApi.getEventContest(eventId, eventContestId),
  
  // Get teams participating in the event contest
  getEventContestTeams: (eventId: number, eventContestId: number) =>
    fetch(`/api/events/${eventId}/contests/${eventContestId}/teams`).then(res => res.json()),
  
  // Approve a team for participation
  approveTeam: (eventId: number, eventContestId: number, teamId: number, notes?: string) =>
    fetch(`/api/events/${eventId}/contests/${eventContestId}/teams/${teamId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes }),
    }).then(res => res.json()),
  
  // Reject a team from participation
  rejectTeam: (eventId: number, eventContestId: number, teamId: number, reason: string) =>
    fetch(`/api/events/${eventId}/contests/${eventContestId}/teams/${teamId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    }).then(res => res.json()),
};

export default function EventContestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = parseInt(params.id as string);
  const eventContestId = parseInt(params.eventcontestid as string);
  
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [eventContest, setEventContest] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  
  // Dialog states
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isDocumentViewOpen, setIsDocumentViewOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<any>(null);
  
  // Fetch event contest details and teams
  useEffect(() => {
    const fetchEventContestDetails = async () => {
      if (!eventId || !eventContestId) return;
      
      try {
        setIsLoading(true);
        
        // Get event details
        const eventData = await eventApi.getEvent(eventId);
        setEvent(eventData);
        
        // Get event contest details
        const eventContestData = await eventContestApi.getEventContestDetails(eventId, eventContestId);
        setEventContest(eventContestData);
        
        // Get teams for this event contest
        const teamsData = await eventContestApi.getEventContestTeams(eventId, eventContestId);
        setTeams(Array.isArray(teamsData) ? teamsData : []);
      } catch (error) {
        console.error('Error fetching event contest details:', error);
        toast.error('Failed to load event contest details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEventContestDetails();
  }, [eventId, eventContestId]);
  
  // Open approval dialog
  const openApproveDialog = (team: any) => {
    setSelectedTeam(team);
    setApprovalNotes('');
    setIsApproveDialogOpen(true);
  };
  
  // Open rejection dialog
  const openRejectDialog = (team: any) => {
    setSelectedTeam(team);
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };
  
  // Open document view dialog
  const openDocumentView = (document: any) => {
    setViewingDocument(document);
    setIsDocumentViewOpen(true);
  };
  
  // Handle team approval
  const handleApproveTeam = async () => {
    if (!selectedTeam) return;
    
    try {
      setIsLoading(true);
      
      const response = await eventContestApi.approveTeam(
        eventId, 
        eventContestId, 
        selectedTeam.id, 
        approvalNotes
      );
      
      toast.success('Team approved successfully');
      
      // Update the team status in the list
      setTeams(prev => prev.map(team => 
        team.id === selectedTeam.id 
          ? { ...team, status: 'APPROVED', statusUpdatedAt: new Date().toISOString() } 
          : team
      ));
      
      // Close dialog
      setIsApproveDialogOpen(false);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error approving team:', error);
      toast.error('Failed to approve team');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle team rejection
  const handleRejectTeam = async () => {
    if (!selectedTeam || !rejectionReason.trim()) return;
    
    try {
      setIsLoading(true);
      
      const response = await eventContestApi.rejectTeam(
        eventId, 
        eventContestId, 
        selectedTeam.id, 
        rejectionReason
      );
      
      toast.success('Team rejected');
      
      // Update the team status in the list
      setTeams(prev => prev.map(team => 
        team.id === selectedTeam.id 
          ? { ...team, status: 'REJECTED', statusUpdatedAt: new Date().toISOString(), rejectionReason } 
          : team
      ));
      
      // Close dialog
      setIsRejectDialogOpen(false);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error rejecting team:', error);
      toast.error('Failed to reject team');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render loading skeleton
  if (isLoading && !eventContest) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" disabled className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        
        <Skeleton className="h-12 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        
        <div className="grid grid-cols-1 gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }
  
  // Get contingent type icon
  const getContingentTypeIcon = (type: string) => {
    switch (type) {
      case 'SCHOOL':
        return <School className="h-4 w-4" />;
      case 'HIGHER':
        return <Briefcase className="h-4 w-4" />;
      case 'INDEPENDENT':
        return <User className="h-4 w-4" />;
      default:
        return <UserCog className="h-4 w-4" />;
    }
  };
  
  // Get team status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Rejected</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending Review</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Unknown</Badge>;
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/organizer/events/${eventId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Event
          </Link>
        </Button>
        
        {eventContest && (
          <>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">
                  {eventContest.contest.code} - {eventContest.contest.name}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {event?.name} • {eventContest.contest.contestType} Contest
                </p>
              </div>
              
              <Badge variant={eventContest.isActive ? "default" : "secondary"}>
                {eventContest.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Contest Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Category:</dt>
                      <dd className="text-sm font-medium">
                        {eventContest.contest.targetgroup?.[0]?.name || 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Type:</dt>
                      <dd className="text-sm font-medium">{eventContest.contest.contestType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Max Teams:</dt>
                      <dd className="text-sm font-medium">{eventContest.maxteampercontingent}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-muted-foreground">Person In Charge:</dt>
                      <dd className="text-sm font-medium">{eventContest.person_incharge || 'N/A'}</dd>
                    </div>
                    {eventContest.person_incharge_phone && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-muted-foreground">Contact:</dt>
                        <dd className="text-sm font-medium">{eventContest.person_incharge_phone}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Participation Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-md">
                      <span className="text-3xl font-bold text-blue-600">{teams.length}</span>
                      <span className="text-sm text-blue-700">Total Teams</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-md">
                      <span className="text-3xl font-bold text-green-600">
                        {teams.filter(team => team.status === 'APPROVED').length}
                      </span>
                      <span className="text-sm text-green-700">Approved</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-yellow-50 rounded-md">
                      <span className="text-3xl font-bold text-yellow-600">
                        {teams.filter(team => team.status === 'PENDING').length}
                      </span>
                      <span className="text-sm text-yellow-700">Pending Review</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Participating Teams</CardTitle>
              <CardDescription>
                Review and manage teams registered for this contest
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-medium mb-1">No teams registered yet</h3>
              <p className="text-muted-foreground">
                Teams will appear here once contingents register for this contest
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Contingent</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getContingentTypeIcon(team.contingent.type)}
                          <span className="ml-2">{team.contingent.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{team.members?.length || 0} members</TableCell>
                      <TableCell>
                        {team.documents?.length > 0 ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openDocumentView(team.documents[0])}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Proof
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">No documents</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(team.status || 'PENDING')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          {team.status === 'PENDING' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-green-200 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => openApproveDialog(team)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openRejectDialog(team)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {team.status === 'APPROVED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => openRejectDialog(team)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Revoke
                            </Button>
                          )}
                          {team.status === 'REJECTED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-200 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => openApproveDialog(team)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Approve Team Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Team Participation</DialogTitle>
            <DialogDescription>
              Approving this team will allow them to participate in the contest.
            </DialogDescription>
          </DialogHeader>
          
          {selectedTeam && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Team Name</p>
                  <p className="text-sm">{selectedTeam.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Contingent</p>
                  <p className="text-sm">{selectedTeam.contingent?.name}</p>
                </div>
              </div>
              
              <div>
                <label htmlFor="notes" className="text-sm font-medium">
                  Approval Notes (Optional)
                </label>
                <Textarea
                  id="notes"
                  placeholder="Enter any notes for this approval"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApproveTeam}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Team
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Team Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTeam?.status === 'APPROVED' ? 'Revoke Approval' : 'Reject Team Participation'}
            </DialogTitle>
            <DialogDescription>
              {selectedTeam?.status === 'APPROVED' 
                ? 'This will revoke the team\'s approval to participate in the contest.'
                : 'Please provide a reason for rejecting this team.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTeam && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Team Name</p>
                  <p className="text-sm">{selectedTeam.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Contingent</p>
                  <p className="text-sm">{selectedTeam.contingent?.name}</p>
                </div>
              </div>
              
              <div>
                <label htmlFor="reason" className="text-sm font-medium">
                  {selectedTeam?.status === 'APPROVED' ? 'Reason for Revoking' : 'Rejection Reason'} *
                </label>
                <Textarea
                  id="reason"
                  placeholder="Enter the reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This reason will be visible to the team and contingent managers
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRejectTeam}
              disabled={isLoading || !rejectionReason.trim()}
              variant="destructive"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  {selectedTeam?.status === 'APPROVED' ? 'Revoke Approval' : 'Reject Team'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Document View Dialog */}
      <Dialog open={isDocumentViewOpen} onOpenChange={setIsDocumentViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Team Documentation</DialogTitle>
            <DialogDescription>
              Review the proof documents uploaded by the team
            </DialogDescription>
          </DialogHeader>
          
          {viewingDocument && (
            <div className="max-h-[70vh] overflow-auto">
              {viewingDocument.mimetype?.includes('image') ? (
                <div className="flex justify-center">
                  <img 
                    src={viewingDocument.url} 
                    alt="Team documentation" 
                    className="max-w-full object-contain rounded-md"
                  />
                </div>
              ) : viewingDocument.mimetype?.includes('pdf') ? (
                <iframe 
                  src={viewingDocument.url} 
                  className="w-full h-[500px] border rounded-md"
                  title="PDF Document"
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p>This document format cannot be previewed</p>
                  <Button 
                    variant="outline" 
                    asChild 
                    className="mt-4"
                  >
                    <a href={viewingDocument.url} target="_blank" rel="noopener noreferrer">
                      Download Document
                    </a>
                  </Button>
                </div>
              )}
              
              <div className="mt-4 bg-muted p-3 rounded-md">
                <h4 className="font-medium mb-2">Document Details</h4>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">File Name:</dt>
                  <dd>{viewingDocument.name || 'Unnamed'}</dd>
                  
                  <dt className="text-muted-foreground">Uploaded On:</dt>
                  <dd>{viewingDocument.createdAt ? format(new Date(viewingDocument.createdAt), 'PPP p') : 'Unknown'}</dd>
                  
                  <dt className="text-muted-foreground">Size:</dt>
                  <dd>{viewingDocument.size ? `${Math.round(viewingDocument.size / 1024)} KB` : 'Unknown'}</dd>
                  
                  <dt className="text-muted-foreground">Type:</dt>
                  <dd>{viewingDocument.mimetype || 'Unknown'}</dd>
                </dl>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDocumentViewOpen(false)}
            >
              Close
            </Button>
            {viewingDocument && (
              <Button 
                asChild
              >
                <a href={viewingDocument.url} target="_blank" rel="noopener noreferrer">
                  <FileText className="mr-2 h-4 w-4" />
                  Download
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

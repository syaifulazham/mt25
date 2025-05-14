'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, PencilIcon, PlusCircle, Trash2 } from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { eventApi, contestApi } from '@/lib/api-client';

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = parseInt(params.id as string);
  
  // State
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [eventContests, setEventContests] = useState<any[]>([]);
  const [availableContests, setAvailableContests] = useState<any[]>([]);
  const [selectedContests, setSelectedContests] = useState<number[]>([]);
  const [isAddingContests, setIsAddingContests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contestTypeFilter, setContestTypeFilter] = useState('all');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contestToRemove, setContestToRemove] = useState<any>(null);
  
  // State for editing contest details
  const [editingContestId, setEditingContestId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    maxteampercontingent: number;
    person_incharge: string;
    person_incharge_phone: string;
  }>({ 
    maxteampercontingent: 1, 
    person_incharge: '', 
    person_incharge_phone: '' 
  });
  
  // Fetch event details
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) return;
      
      try {
        setIsLoading(true);
        const eventData = await eventApi.getEvent(eventId);
        setEvent(eventData);
        
        // Fetch event contests
        try {
          const eventContestsData = await eventApi.getEventContests(eventId);
          setEventContests(Array.isArray(eventContestsData) ? eventContestsData : []);
        } catch (error) {
          console.error('Error fetching event contests:', error);
          toast.error('Failed to load event contests');
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
        toast.error('Failed to load event details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [eventId]);
  
  // Fetch available contests
  const fetchAvailableContests = async () => {
    try {
      setIsLoading(true);
      const filters: any = { search: searchQuery };
      if (contestTypeFilter !== 'all') {
        filters.contestType = contestTypeFilter;
      }
      
      const contestsData = await contestApi.getContests(filters);
      
      // Filter out contests that are already assigned to this event
      const assignedContestIds = eventContests.map(ec => ec.contestId);
      const filteredContests = Array.isArray(contestsData) 
        ? contestsData.filter(contest => !assignedContestIds.includes(contest.id))
        : [];
        
      setAvailableContests(filteredContests);
    } catch (error) {
      console.error('Error fetching available contests:', error);
      toast.error('Failed to load available contests');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Call fetchAvailableContests when dialog is opened
  useEffect(() => {
    if (isAddingContests) {
      fetchAvailableContests();
    }
  }, [isAddingContests, searchQuery, contestTypeFilter]);
  
  // Handle adding selected contests to the event
  const handleAddContests = async () => {
    if (selectedContests.length === 0) {
      toast.error('Please select at least one contest');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Call the API to add contests to the event
      const response = await eventApi.addContestsToEvent(eventId, {
        contestIds: selectedContests,
        maxteampercontingent: 1, // Default value, could be made configurable in the UI
        person_incharge: '', // Could be added to the dialog form
        person_incharge_phone: '', // Could be added to the dialog form
      });
      
      toast.success(response.message || `${selectedContests.length} contests added to event`);
      
      // Reset selection and close dialog
      setSelectedContests([]);
      setIsAddingContests(false);
      
      // Refresh event contests list
      const updatedEventContests = await eventApi.getEventContests(eventId);
      setEventContests(Array.isArray(updatedEventContests) ? updatedEventContests : []);
    } catch (error) {
      console.error('Error adding contests to event:', error);
      toast.error('Failed to add contests to event');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle contest selection toggle
  const toggleContestSelection = (contestId: number) => {
    setSelectedContests(prev => 
      prev.includes(contestId)
        ? prev.filter(id => id !== contestId)
        : [...prev, contestId]
    );
  };
  
  // Handle contest removal confirmation
  const confirmRemoveContest = (eventcontest: any) => {
    setContestToRemove(eventcontest);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle removing a contest from the event
  const handleRemoveContest = async () => {
    if (!contestToRemove) return;
    
    try {
      setIsLoading(true);
      
      // Call the API to remove the contest from the event
      await eventApi.removeContestFromEvent(eventId, contestToRemove.contestId);
      
      toast.success('Contest removed from event');
      
      // Reset state and close dialog
      setIsDeleteDialogOpen(false);
      setContestToRemove(null);
      
      // Refresh the event contests list
      const updatedEventContests = await eventApi.getEventContests(eventId);
      setEventContests(Array.isArray(updatedEventContests) ? updatedEventContests : []);
    } catch (error) {
      console.error('Error removing contest from event:', error);
      toast.error('Failed to remove contest from event');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Start editing a contest
  const startEditingContest = (eventcontest: any) => {
    setEditingContestId(eventcontest.id);
    setEditForm({
      maxteampercontingent: eventcontest.maxteampercontingent || 1,
      person_incharge: eventcontest.person_incharge || '',
      person_incharge_phone: eventcontest.person_incharge_phone || ''
    });
  };

  // Handle updating contest details
  const handleUpdateContest = async (eventcontestId: number) => {
    try {
      setIsLoading(true);
      
      // Call API to update the contest details
      await eventApi.updateEventContest(eventId, eventcontestId, editForm);
      
      toast.success('Contest details updated');
      
      // Reset editing state
      setEditingContestId(null);
      
      // Refresh the event contests list
      const updatedEventContests = await eventApi.getEventContests(eventId);
      setEventContests(Array.isArray(updatedEventContests) ? updatedEventContests : []);
    } catch (error) {
      console.error('Error updating contest details:', error);
      toast.error('Failed to update contest details');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: name === 'maxteampercontingent' ? parseInt(value) || 1 : value
    }));
  };
  
  // Render loading skeleton
  if (isLoading && !event) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" disabled className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
        
        <Skeleton className="h-12 w-3/4 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/organizer/events">
                <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>
        
        {event && (
          <>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">{event.name}</h1>
                <p className="text-gray-500 mt-1">
                  {format(new Date(event.startDate), 'PPP')} - {format(new Date(event.endDate), 'PPP')}
                </p>
              </div>
              
              <Button variant="outline" asChild className="mr-2">
                <Link href={`/organizer/events/${event.id}/edit`}>
                  <PencilIcon className="mr-2 h-4 w-4" />
                  Edit Event
                </Link>
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant={event.isActive ? "default" : "secondary"}>
                {event.isActive ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline">
                Scope: {event.scopeArea || 'OPEN'}
              </Badge>
              {event.code && (
                <Badge variant="outline">
                  Code: {event.code}
                </Badge>
              )}
            </div>
          </>
        )}
      </div>
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Event Details</TabsTrigger>
          <TabsTrigger value="contests">Contests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          {event && (
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
                <CardDescription>
                  Detailed information about this event.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Basic Details</h3>
                    <dl className="space-y-2">
                      <div className="flex flex-col">
                        <dt className="text-sm font-medium text-gray-500">Event Name</dt>
                        <dd>{event.name}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-sm font-medium text-gray-500">Event Code</dt>
                        <dd>{event.code || 'N/A'}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-sm font-medium text-gray-500">Date Range</dt>
                        <dd>
                          {format(new Date(event.startDate), 'PPP')} - {format(new Date(event.endDate), 'PPP')}
                        </dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-sm font-medium text-gray-500">Scope Area</dt>
                        <dd>{event.scopeArea || 'OPEN'}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-sm font-medium text-gray-500">Status</dt>
                        <dd>
                          <Badge variant={event.isActive ? "default" : "secondary"}>
                            {event.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Location Information</h3>
                    <dl className="space-y-2">
                      <div className="flex flex-col">
                        <dt className="text-sm font-medium text-gray-500">Venue</dt>
                        <dd>{event.venue || 'N/A'}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-sm font-medium text-gray-500">Address</dt>
                        <dd>{event.address || 'N/A'}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-sm font-medium text-gray-500">City</dt>
                        <dd>{event.city || 'N/A'}</dd>
                      </div>
                      <div className="flex flex-col">
                        <dt className="text-sm font-medium text-gray-500">State</dt>
                        <dd>{event.addressState || 'N/A'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                
                {event.description && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Description</h3>
                    <p className="whitespace-pre-line">{event.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="contests" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Event Contests</CardTitle>
                  <CardDescription>
                    Manage contests that are available in this event.
                  </CardDescription>
                </div>
                <Dialog open={isAddingContests} onOpenChange={setIsAddingContests}>
                  <DialogTrigger asChild>
                    <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Contests
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Add Contests to Event</DialogTitle>
                      <DialogDescription>
                        Select contests to make available in this event.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="grid flex-1 gap-2">
                        <Input
                          placeholder="Search contests..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Select
                        value={contestTypeFilter}
                        onValueChange={setContestTypeFilter}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                          <SelectItem value="TEAM">Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[50px]">Select</TableHead>
                            <TableHead>Contest Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Category</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {availableContests.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-4">
                                {isLoading ? (
                                  <div className="flex justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                  </div>
                                ) : (
                                  'No contests available'
                                )}
                              </TableCell>
                            </TableRow>
                          ) : (
                            availableContests.map((contest) => (
                              <TableRow key={contest.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedContests.includes(contest.id)}
                                    onCheckedChange={() => toggleContestSelection(contest.id)}
                                  />
                                </TableCell>
                                <TableCell>{contest.code} - {contest.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {contest.contestType}
                                  </Badge>
                                </TableCell>
                                <TableCell>{contest.category?.name || 'N/A'}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSelectedContests([]);
                          setIsAddingContests(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        disabled={selectedContests.length === 0 || isLoading} 
                        onClick={handleAddContests}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>Add Selected ({selectedContests.length})</>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {eventContests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No contests added to this event yet.</p>
                  <Button 
                    variant="outline"
                    onClick={() => setIsAddingContests(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add your first contest
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {eventContests.map((eventcontest) => (
                    <Card key={eventcontest.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardHeader className="bg-slate-50 pb-2">
                        <CardTitle className="text-lg font-bold truncate">
                          {eventcontest.contest.code} - {eventcontest.contest.name}
                        </CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {eventcontest.contest.contestType}
                          </Badge>
                          {eventcontest.contest.participation_mode && (
                            <Badge variant="secondary">
                              {eventcontest.contest.participation_mode}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Category:</span>
                            <span className="text-sm font-medium">
                              {eventcontest.contest.targetgroup?.[0]?.name || 'N/A'}
                            </span>
                          </div>
                          
                          {editingContestId === eventcontest.id ? (
                            <>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <label htmlFor={`maxteams-${eventcontest.id}`} className="text-sm text-muted-foreground">
                                    Max Teams:
                                  </label>
                                  <Input
                                    id={`maxteams-${eventcontest.id}`}
                                    name="maxteampercontingent"
                                    type="number"
                                    min="1"
                                    className="w-24 h-8 text-sm"
                                    value={editForm.maxteampercontingent}
                                    onChange={handleInputChange}
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <label htmlFor={`pic-${eventcontest.id}`} className="text-sm text-muted-foreground">
                                    Person In Charge:
                                  </label>
                                  <Input
                                    id={`pic-${eventcontest.id}`}
                                    name="person_incharge"
                                    className="w-36 h-8 text-sm"
                                    value={editForm.person_incharge}
                                    onChange={handleInputChange}
                                    placeholder="Name"
                                  />
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <label htmlFor={`phone-${eventcontest.id}`} className="text-sm text-muted-foreground">
                                    Contact No.:
                                  </label>
                                  <Input
                                    id={`phone-${eventcontest.id}`}
                                    name="person_incharge_phone"
                                    className="w-36 h-8 text-sm"
                                    value={editForm.person_incharge_phone}
                                    onChange={handleInputChange}
                                    placeholder="Phone number"
                                  />
                                </div>
                                
                                <div className="flex justify-end space-x-2 mt-2">
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-8 text-sm"
                                    onClick={() => setEditingContestId(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    className="h-8 text-sm" 
                                    onClick={() => handleUpdateContest(eventcontest.id)}
                                    disabled={isLoading}
                                  >
                                    {isLoading ? (
                                      <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Saving...
                                      </>
                                    ) : 'Save'}
                                  </Button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Max Teams:</span>
                                <span className="text-sm font-medium">{eventcontest.maxteampercontingent}</span>
                              </div>
                              
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">In Charge:</span>
                                <span className="text-sm font-medium">{eventcontest.person_incharge || '-'}</span>
                              </div>
                              
                              {eventcontest.person_incharge_phone && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-muted-foreground">Contact:</span>
                                  <span className="text-sm font-medium">{eventcontest.person_incharge_phone}</span>
                                </div>
                              )}
                              
                              <div className="flex justify-end">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-xs text-blue-600 hover:text-blue-800"
                                  onClick={() => startEditingContest(eventcontest)}
                                >
                                  <PencilIcon className="mr-1 h-3 w-3" />
                                  Edit Details
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="border-t bg-slate-50 flex justify-between p-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          title="View Contest Details"
                        >
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => confirmRemoveContest(eventcontest)}
                          title="Remove Contest from Event"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Remove Contest Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contest from Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{contestToRemove?.contest?.code} - {contestToRemove?.contest?.name}</strong> from this event?
              This will not delete the contest, only remove it from this event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveContest}
              className="bg-red-600 hover:bg-red-700 text-white" 
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

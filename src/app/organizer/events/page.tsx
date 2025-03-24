'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { CalendarIcon, MoreHorizontal, PlusIcon, SearchIcon } from 'lucide-react';
import { format } from 'date-fns';
import { eventApi } from '@/lib/api-client';
import { stateApi } from '@/lib/api-client';
import { toast } from 'sonner';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStateId, setSelectedStateId] = useState<string>('all');
  const [selectedScopeArea, setSelectedScopeArea] = useState<string>('all');
  const [activeOnly, setActiveOnly] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch events with pagination and filters
  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      
      const response = await eventApi.getEventsPaginated({
        search,
        addressState: selectedStateId === 'all' ? '' : selectedStateId,
        scopeArea: selectedScopeArea === 'all' ? '' : selectedScopeArea,
        activeOnly,
        page: currentPage,
        pageSize,
      });
      
      setEvents(response.data);
      setTotalPages(response.meta.totalPages);
      setTotalCount(response.meta.totalCount);
      
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch states for filter dropdown
  const fetchStates = async () => {
    try {
      const statesData = await stateApi.getStates();
      setStates(statesData);
    } catch (error) {
      console.error('Error fetching states:', error);
    }
  };

  // Initial data loading
  useEffect(() => {
    fetchStates();
  }, []);

  // Fetch events when filters or pagination changes
  useEffect(() => {
    fetchEvents();
  }, [search, selectedStateId, selectedScopeArea, activeOnly, currentPage, pageSize]);

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  // Handle state filter change
  const handleStateChange = (value: string) => {
    setSelectedStateId(value === 'all' ? '' : value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle scope area filter change
  const handleScopeAreaChange = (value: string) => {
    setSelectedScopeArea(value === 'all' ? '' : value);
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Handle active filter change
  const handleActiveChange = (value: string) => {
    setActiveOnly(value === 'active');
    setCurrentPage(1); // Reset to first page on filter change
  };

  // Navigate to create new event page
  const handleCreateEvent = () => {
    router.push('/organizer/events/new');
  };

  // Navigate to event details page
  const handleViewEvent = (id: number) => {
    router.push(`/organizer/events/${id}`);
  };

  // Navigate to edit event page
  const handleEditEvent = (id: number) => {
    router.push(`/organizer/events/${id}/edit`);
  };

  // Handle event deletion
  const handleDeleteEvent = async (id: number) => {
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await eventApi.deleteEvent(id);
        toast.success('Event deleted successfully');
        fetchEvents(); // Refresh the list
      } catch (error: any) {
        console.error('Error deleting event:', error);
        toast.error(error.message || 'Failed to delete event');
      }
    }
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    const items = [];
    
    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink 
          onClick={() => setCurrentPage(1)}
          isActive={currentPage === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    );
    
    // Show ellipsis if needed
    if (currentPage > 3) {
      items.push(
        <PaginationItem key="ellipsis-1">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Show current page and surrounding pages
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue; // Skip first and last pages as they're always shown
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis-2">
          <PaginationEllipsis />
        </PaginationItem>
      );
    }
    
    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink 
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events Management</h1>
        <Button onClick={handleCreateEvent}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter events by name, state, or status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search events..."
                className="pl-8"
                value={search}
                onChange={handleSearchChange}
              />
            </div>
            
            <Select value={selectedStateId} onValueChange={handleStateChange}>
              <SelectTrigger>
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.id.toString()}>
                    {state.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedScopeArea} onValueChange={handleScopeAreaChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Scope Areas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scope Areas</SelectItem>
                <SelectItem value="NATIONAL">National</SelectItem>
                <SelectItem value="ZONE">Zone</SelectItem>
                <SelectItem value="STATE">State</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={activeOnly ? 'active' : 'all'} 
              onValueChange={handleActiveChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Page Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Scope Area</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    Loading events...
                  </TableCell>
                </TableRow>
              ) : events.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    No events found. Try adjusting your filters or create a new event.
                  </TableCell>
                </TableRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleViewEvent(event.id)}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>{event.code}</TableCell>
                    <TableCell>{event.venue || 'N/A'}</TableCell>
                    <TableCell>{event.addressState || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {event.scopeArea === 'NATIONAL' ? 'National' :
                         event.scopeArea === 'ZONE' ? `Zone: ${event.zone?.name || 'N/A'}` :
                         event.scopeArea === 'STATE' ? `State: ${event.state?.name || 'N/A'}` : 'Open'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                        <span>
                          {format(new Date(event.startDate), 'MMM d, yyyy')} - {format(new Date(event.endDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={event.isActive ? "default" : "secondary"}>
                        {event.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleViewEvent(event.id);
                          }}>
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEditEvent(event.id);
                          }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEvent(event.id);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {!isLoading && events.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} events
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      isActive={currentPage > 1}
                    />
                  </PaginationItem>
                  
                  {renderPaginationItems()}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      isActive={currentPage < totalPages}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

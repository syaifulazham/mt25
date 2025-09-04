'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, Loader2, Search, School } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';

interface SchoolChangerProps {
  contingentId: number;
  schoolId: number;
  schoolName: string;
}

interface SchoolSearchResult {
  id: number;
  name: string;
  state: string | { name: string };
  ppd?: string;
  category?: string;
}

export function SchoolChanger({ contingentId, schoolId, schoolName }: SchoolChangerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [schools, setSchools] = useState<SchoolSearchResult[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolSearchResult | null>(null);
  
  // Use debounced search query to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Function to get state name, handling both string and object formats
  const getStateName = (state: string | { name: string }) => {
    if (typeof state === 'string') return state;
    return state.name;
  };

  // Search for schools when the debounced query changes
  useEffect(() => {
    const searchSchools = async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
        setSchools([]);
        return;
      }

      try {
        setIsSearching(true);
        const response = await fetch(`/api/organizer/schools/search?q=${encodeURIComponent(debouncedSearchQuery)}`);
        
        if (!response.ok) {
          throw new Error('Failed to search schools');
        }

        const data = await response.json();
        setSchools(data);
      } catch (error) {
        console.error('Error searching schools:', error);
        toast({
          title: 'Error',
          description: 'Failed to search schools. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsSearching(false);
      }
    };

    searchSchools();
  }, [debouncedSearchQuery, toast]);

  // Function to handle school selection
  const handleSelectSchool = (school: SchoolSearchResult) => {
    setSelectedSchool(school);
  };

  // Function to update contingent's school
  const updateContingentSchool = async () => {
    if (!selectedSchool) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/organizer/contingents/${contingentId}/update-school`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schoolId: selectedSchool.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update school');
      }

      toast({
        title: 'Success',
        description: `School updated to ${selectedSchool.name}`,
        variant: 'default',
      });

      // Close the dialog and refresh the page
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating school:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update school',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <School className="h-3.5 w-3.5 mr-1" />
          Change School
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Contingent School</DialogTitle>
          <DialogDescription>
            Update the school associated with this contingent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current School</label>
            <Card className="bg-muted/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center">
                  <School className="h-4 w-4 mr-2 text-amber-500" />
                  <span>{schoolName}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Search for New School</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type school name to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {isSearching && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            )}

            {schools.length > 0 && !isSearching && (
              <Card className="overflow-hidden">
                <CardHeader className="py-2">
                  <CardTitle className="text-sm">Search Results</CardTitle>
                  <CardDescription className="text-xs">
                    {schools.length} school{schools.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </CardHeader>
                <ScrollArea className="h-52">
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {schools.map((school) => (
                        <div 
                          key={school.id} 
                          className={`p-3 cursor-pointer hover:bg-muted/50 flex items-start justify-between ${
                            selectedSchool?.id === school.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => handleSelectSchool(school)}
                        >
                          <div className="flex flex-col">
                            <div className="font-medium text-sm">{school.name}</div>
                            <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                              <span>{getStateName(school.state)}</span>
                              {school.ppd && <span>PPD: {school.ppd}</span>}
                              {school.category && <span>Category: {school.category}</span>}
                            </div>
                          </div>
                          {selectedSchool?.id === school.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </ScrollArea>
              </Card>
            )}

            {debouncedSearchQuery.length >= 2 && schools.length === 0 && !isSearching && (
              <div className="text-sm text-muted-foreground p-2">
                No schools found. Try a different search term.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={updateContingentSchool}
              disabled={!selectedSchool || isUpdating}
            >
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isUpdating ? 'Updating...' : 'Update School'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

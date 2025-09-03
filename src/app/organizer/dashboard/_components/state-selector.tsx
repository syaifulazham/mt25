'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Define the state data type
type State = {
  id: number;
  name: string;
};

export default function StateSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Fetch the list of states when the modal is opened
  useEffect(() => {
    if (isOpen) {
      fetchStates();
    }
  }, [isOpen]);

  // Function to fetch states from the API
  const fetchStates = async () => {
    if (states.length === 0) {
      setLoading(true);
      try {
        // Try to fetch with credentials
        const response = await fetch('/api/dashboard/states', {
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Content-Type': 'application/json'
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            console.warn('Authentication error when fetching states. Will retry with fallback.');
            // If unauthorized, try a second time with fallback authentication
            const retryResponse = await fetch('/api/dashboard/states', {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer session-fallback'
              },
            });
            
            if (!retryResponse.ok) {
              throw new Error(`Failed to fetch states: ${retryResponse.status}`);
            }
            
            const retryData = await retryResponse.json();
            setStates(retryData);
            return;
          } else {
            throw new Error(`Failed to fetch states: ${response.status}`);
          }
        }
        
        const data = await response.json();
        setStates(data);
      } catch (error) {
        console.error('Error fetching states:', error);
        setError(`Unable to load states: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Provide some fallback states if the API completely fails
        setStates([]);
      } finally {
        setLoading(false);
      }
    }
  };

  // Format state name for display
  const formatStateName = (name: string): string => {
    // Handle specific state name formatting
    if (name === 'WILAYAH PERSEKUTUAN KUALA LUMPUR') {
      return 'WP KL';
    }
    if (name.includes('WILAYAH PERSEKUTUAN')) {
      return name.replace('WILAYAH PERSEKUTUAN', 'WP');
    }
    if (name === 'KUALA LUMPUR') {
      return 'KL';
    }
    return name;
  };

  // Handle state selection
  const handleStateSelect = (stateId: number) => {
    router.push(`/organizer/dashboard/${stateId}`);
    setIsOpen(false);
  };

  // Filter states based on search query
  const filteredStates = states.filter(state => 
    state.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2"
      >
        <MapPin className="h-4 w-4" />
        <span>Select State</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select a State</DialogTitle>
            <DialogDescription className="pb-4">
              Select a state to view its dashboard
            </DialogDescription>
          </DialogHeader>
          
          {/* Search input - only show if we have states and no error */}
          {!error && filteredStates.length > 0 && (
            <Input
              type="text"
              placeholder="Search states..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
          )}
          
          {/* States grid */}
          <div className="h-[300px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="text-destructive font-medium text-center">{error}</div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setError(null);
                    fetchStates();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : filteredStates.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {filteredStates.map((state) => (
                  <Button
                    key={state.id}
                    variant="outline"
                    className="text-left"
                    onClick={() => handleStateSelect(state.id)}
                    title={state.name} // Show full name on hover
                  >
                    {formatStateName(state.name)}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No states found
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

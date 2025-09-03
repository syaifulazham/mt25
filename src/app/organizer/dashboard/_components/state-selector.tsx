'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/states');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch states: ${response.status}`);
      }
      
      const data = await response.json();
      setStates(data);
    } catch (error) {
      console.error('Error fetching states:', error);
    } finally {
      setLoading(false);
    }
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
          </DialogHeader>
          
          <div className="py-4">
            <Input
              placeholder="Search states..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : states.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No states available
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[40vh] overflow-y-auto p-1">
                {filteredStates.map((state) => (
                  <Button
                    key={state.id}
                    variant="outline"
                    className="justify-start overflow-hidden text-ellipsis"
                    onClick={() => handleStateSelect(state.id)}
                  >
                    <span className="truncate">{state.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

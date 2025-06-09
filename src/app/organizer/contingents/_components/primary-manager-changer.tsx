"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UserCog } from "lucide-react";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Define the manager types
interface Manager {
  id: number;
  isOwner: boolean;
  participant: {
    id: number;
    name: string;
    email: string;
  };
}

interface PrimaryManagerChangerProps {
  contingentId: number;
  managers: Manager[];
  onManagersUpdated: () => void;
}

export function PrimaryManagerChanger({ contingentId, managers, onManagersUpdated }: PrimaryManagerChangerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  
  // Find current primary manager to pre-select
  const currentPrimaryManager = managers.find(m => m.isOwner);

  // Initialize the selected manager to the current primary manager
  React.useEffect(() => {
    if (currentPrimaryManager && !selectedManagerId) {
      setSelectedManagerId(currentPrimaryManager.id);
    }
  }, [currentPrimaryManager, selectedManagerId]);

  const handleManagerChange = async () => {
    if (!selectedManagerId || selectedManagerId === currentPrimaryManager?.id) {
      setOpen(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/organizer/contingents/${contingentId}/primary-manager`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPrimaryManagerId: selectedManagerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update primary manager');
      }

      toast.success('Primary manager updated successfully');
      onManagersUpdated();
    } catch (error) {
      console.error('Failed to update primary manager:', error);
      toast.error('Failed to update primary manager: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-xs flex gap-1 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <UserCog className="h-3.5 w-3.5" />
        Change Primary Manager
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Primary Manager</DialogTitle>
            <DialogDescription>
              Select the manager who will become the primary manager for this contingent.
              The primary manager has complete control over the contingent.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <RadioGroup 
              value={selectedManagerId?.toString()} 
              onValueChange={(value) => setSelectedManagerId(parseInt(value, 10))}
              className="space-y-3"
            >
              {managers.map((manager) => {
                const initials = manager.participant.name
                  .split(' ')
                  .map(part => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                  
                return (
                  <div key={manager.id} className="flex items-center space-x-2 border p-3 rounded-md">
                    <RadioGroupItem value={manager.id.toString()} id={`manager-${manager.id}`} />
                    <Label htmlFor={`manager-${manager.id}`} className="flex items-center gap-2 flex-1 cursor-pointer">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm flex items-center">
                          {manager.participant.name} 
                          {manager.isOwner && <Badge variant="outline" className="ml-1 text-xs bg-amber-50 text-amber-700">Current Primary</Badge>}
                        </span>
                        <span className="text-xs text-muted-foreground">{manager.participant.email}</span>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleManagerChange} 
              disabled={loading || selectedManagerId === currentPrimaryManager?.id}
            >
              {loading ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

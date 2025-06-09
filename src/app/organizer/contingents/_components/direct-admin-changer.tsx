"use client";

import React, { useState, useEffect } from 'react';
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
import { Shield } from "lucide-react";
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

interface DirectAdminChangerProps {
  contingentId: number;
  managers: Manager[];
  adminEmail: string;
}

export function DirectAdminChanger({ contingentId, managers, adminEmail }: DirectAdminChangerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  
  // Find current primary manager to pre-select
  const currentPrimaryManager = managers.find(m => m.isOwner);

  // Initialize the selected manager to the current primary manager
  useEffect(() => {
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
      // Use the direct admin API that bypasses all auth checks
      const response = await fetch(`/api/organizer/contingents/${contingentId}/admin-direct`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Email': adminEmail
        },
        credentials: 'include',
        body: JSON.stringify({
          newPrimaryManagerId: selectedManagerId,
          adminEmail: adminEmail // Send it in both header and body for redundancy
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to update primary manager');
        console.error('Error response:', errorData);
        return;
      }

      const result = await response.json();
      console.log('Primary manager update result:', result);
      
      toast.success('Primary manager updated successfully!');
      
      // Force reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Failed to update primary manager:', error);
      toast.error('An error occurred while updating the primary manager');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="text-xs flex gap-1 bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
        onClick={() => setOpen(true)}
      >
        <Shield className="h-3.5 w-3.5" />
        Direct Admin Override
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Direct Admin Override</DialogTitle>
            <DialogDescription>
              This is a direct admin override that bypasses all authentication checks.
              Your admin status has been directly verified through your email: <strong>{adminEmail}</strong>
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
                    <RadioGroupItem value={manager.id.toString()} id={`direct-manager-${manager.id}`} />
                    <Label htmlFor={`direct-manager-${manager.id}`} className="flex items-center gap-2 flex-1 cursor-pointer">
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
              variant="destructive"
              disabled={loading || selectedManagerId === currentPrimaryManager?.id}
            >
              {loading ? 'Updating...' : 'Change Primary Manager'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

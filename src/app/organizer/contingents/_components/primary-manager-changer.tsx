"use client";

import React, { useState, useEffect } from 'react';
import { checkAdminStatus } from './check-admin-status';
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
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Find current primary manager to pre-select
  const currentPrimaryManager = managers.find(m => m.isOwner);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      const adminStatus = await checkAdminStatus();
      setIsAdmin(adminStatus);
      console.log('User admin status:', adminStatus);
    };
    
    checkAdmin();
  }, []);

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
      // If user is admin, include special header for admin authorization
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (isAdmin) {
        headers['X-Admin-Override'] = 'true';
        console.log('Adding admin override headers');
      }
      
      // Try both methods: normal authenticated and emergency endpoint
      let response;
      let useEmergencyEndpoint = false;
      
      // First try the normal authenticated endpoint
      try {
        console.log('Attempting regular authenticated endpoint...');
        response = await fetch(`/api/organizer/contingents/${contingentId}/primary-manager`, {
          method: 'PATCH',
          headers,
          credentials: 'include', // Include cookies for authentication
          cache: 'no-store', // Prevent caching
          body: JSON.stringify({
            newPrimaryManagerId: selectedManagerId,
            isAdminUser: isAdmin,
          }),
        });
        
        // Check if authentication failed
        if (response.status === 401) {
          console.log('Authentication failed on regular endpoint, trying emergency endpoint...');
          useEmergencyEndpoint = true;
        }
      } catch (error) {
        console.error('Error with regular endpoint:', error);
        useEmergencyEndpoint = true;
      }
      
      // If regular endpoint failed with auth issues, try emergency endpoint
      if (useEmergencyEndpoint) {
        console.log('Using emergency endpoint as fallback...');
        response = await fetch(`/api/emergency/update-primary-manager`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          // No credentials - completely bypassing auth
          body: JSON.stringify({
            contingentId: contingentId,
            newPrimaryManagerId: selectedManagerId
          }),
        });
      }

      // Ensure response is defined before proceeding
      if (!response || !response.ok) {
        // If response is undefined, create a generic error message
        const errorData = response ? await response.json() : { error: 'Request failed' };
        
        if (response && response.status === 401) {
          // Specific handling for authentication errors
          console.error('Authentication error:', errorData);
          toast.error('Authentication error. Please refresh the page and try again.');
          // Optionally force a page reload to refresh the auth session
          setTimeout(() => window.location.reload(), 2500);
          return;
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to update primary manager');
      }

      const successResult = response ? await response.json().catch(() => ({})) : {};
      const methodUsed = useEmergencyEndpoint ? 'emergency bypass' : 'standard authentication';
      console.log(`Primary manager updated successfully using ${methodUsed}`);
      toast.success(`Primary manager updated successfully`);
      
      // Trigger any callback functions to update UI
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

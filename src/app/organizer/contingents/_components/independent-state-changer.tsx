"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface State {
  id: number;
  name: string;
  zoneId: number;
}

interface IndependentInfo {
  id: number;
  name: string;
  address: string | null;
  town: string | null;
  postcode: string | null;
  stateId: number;
  institution: string | null;
  type: string;
  state: {
    id: number;
    name: string;
    zoneId: number;
  };
}

interface IndependentStateChangerProps {
  contingentId: number;
  independent: IndependentInfo;
  allStates: State[];
  onStateUpdated?: (updatedIndependent: IndependentInfo) => void;
}

export function IndependentStateChanger({ 
  contingentId, 
  independent, 
  allStates, 
  onStateUpdated 
}: IndependentStateChangerProps) {
  const [selectedStateId, setSelectedStateId] = useState<string>(independent.stateId.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStateUpdate = async () => {
    if (selectedStateId === independent.stateId.toString()) {
      toast.info("No changes to save");
      return;
    }

    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/organizer/contingents/${contingentId}/update-state`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stateId: parseInt(selectedStateId)
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update state');
      }

      toast.success(data.message);
      
      // Call the callback to refresh the parent component data
      if (onStateUpdated && data.independent) {
        onStateUpdated(data.independent);
      }
      
      // Refresh the page to show updated data
      window.location.reload();
      
    } catch (error) {
      console.error('Error updating state:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update state');
    } finally {
      setIsUpdating(false);
    }
  };

  const selectedState = allStates.find(state => state.id.toString() === selectedStateId);
  const hasChanges = selectedStateId !== independent.stateId.toString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          State Management
        </CardTitle>
        <CardDescription>
          Update the state for this independent contingent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Current State</label>
          <div className="text-sm text-muted-foreground">
            {independent.state.name}
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Select New State</label>
          <Select value={selectedStateId} onValueChange={setSelectedStateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {allStates.map((state) => (
                <SelectItem key={state.id} value={state.id.toString()}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedState && selectedState.id !== independent.stateId && (
          <div className="p-3 bg-blue-50 rounded-md">
            <div className="text-sm">
              <span className="font-medium">Preview:</span> State will be changed to{' '}
              <span className="font-medium text-blue-700">{selectedState.name}</span>
            </div>
          </div>
        )}

        <Button 
          onClick={handleStateUpdate}
          disabled={!hasChanges || isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating State...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Update State
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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

interface EmergencyPrimaryManagerFormProps {
  contingentId: number;
  managers: Manager[];
}

export function EmergencyPrimaryManagerForm({ contingentId, managers }: EmergencyPrimaryManagerFormProps) {
  const [loading, setLoading] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  
  // Find current primary manager to pre-select
  const currentPrimaryManager = managers.find(m => m.isOwner);

  // Initialize the selected manager to the current primary manager
  useEffect(() => {
    if (currentPrimaryManager) {
      setSelectedManagerId(currentPrimaryManager.id);
    }
  }, [currentPrimaryManager]);

  const handleManagerChange = async () => {
    if (!selectedManagerId || selectedManagerId === currentPrimaryManager?.id) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Direct call with no auth, not even credentials included
      const response = await fetch(`/api/organizer/contingents/${contingentId}/force-update-primary`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        // No credentials - bypassing all auth
        body: JSON.stringify({
          newPrimaryManagerId: selectedManagerId
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setResult(`ERROR: ${data.error || 'Unknown error'}`);
        toast.error(data.error || 'Failed to update primary manager');
        console.error('Error response:', data);
      } else {
        setResult(`SUCCESS: ${data.message || 'Primary manager updated successfully'}`);
        toast.success('Primary manager updated successfully');
        
        // Manually update the UI to reflect changes without reload
        // This is important since we're not reloading the page
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to update primary manager:', error);
      setResult(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error('An error occurred while updating the primary manager');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-red-500">
      <CardHeader className="bg-red-500 text-white">
        <CardTitle>EMERGENCY: Change Primary Manager</CardTitle>
        <CardDescription className="text-white text-opacity-90">
          Use this form to force update the primary manager without any authentication
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="mb-4">
          <p className="text-red-500 font-bold">Warning: This bypasses all authentication checks.</p>
        </div>
        
        <RadioGroup 
          value={selectedManagerId?.toString()} 
          onValueChange={(value) => setSelectedManagerId(parseInt(value, 10))}
          className="space-y-2"
        >
          {managers.map((manager) => (
            <div key={manager.id} className="flex items-center space-x-2 border p-2 rounded-md">
              <RadioGroupItem value={manager.id.toString()} id={`emergency-manager-${manager.id}`} />
              <Label htmlFor={`emergency-manager-${manager.id}`} className="flex items-center gap-2 flex-1 cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-sm flex items-center">
                    {manager.participant.name} 
                    {manager.isOwner && <Badge variant="outline" className="ml-1 text-xs bg-amber-50 text-amber-700">Current Primary</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground">{manager.participant.email}</span>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
        
        {result && (
          <div className={`mt-4 p-2 rounded ${result.startsWith('ERROR') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {result}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleManagerChange}
          variant="destructive"
          className="w-full"
          disabled={loading || selectedManagerId === currentPrimaryManager?.id}
        >
          {loading ? 'Updating...' : 'EMERGENCY: Force Change Primary Manager'}
        </Button>
      </CardFooter>
    </Card>
  );
}

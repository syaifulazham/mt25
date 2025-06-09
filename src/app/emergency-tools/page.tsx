"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Page accessible directly with no authentication checks
export default function EmergencyToolsPage() {
  const [contingentId, setContingentId] = useState("");
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);

  // Function to fetch managers directly from database
  const fetchManagers = async () => {
    if (!contingentId || isNaN(parseInt(contingentId))) {
      setError("Please enter a valid contingent ID");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Direct database query using Prisma in API route
      const response = await fetch(`/api/emergency/contingent-managers?id=${contingentId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch managers");
      }
      
      const data = await response.json();
      
      if (!data.managers || data.managers.length <= 1) {
        setError("Contingent has no managers or only one manager");
        setManagers([]);
        return;
      }
      
      setManagers(data.managers);
      
      // Preselect current primary manager
      const currentPrimary = data.managers.find((m: any) => m.isOwner);
      if (currentPrimary) {
        setSelectedManagerId(currentPrimary.id);
      }
      
    } catch (err) {
      console.error("Error fetching managers:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch managers");
      setManagers([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to update primary manager with no auth
  const updatePrimaryManager = async () => {
    if (!selectedManagerId || !contingentId) {
      setError("Please select a manager and enter contingent ID");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Direct POST to emergency endpoint with no auth
      const response = await fetch('/api/emergency/update-primary-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // No credentials - completely bypassing all auth
        body: JSON.stringify({
          contingentId: parseInt(contingentId),
          newPrimaryManagerId: selectedManagerId
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update primary manager");
      }

      const data = await response.json();
      setSuccess(`SUCCESS: ${data.message || 'Primary manager updated successfully'}`);
      
      // Re-fetch managers to show updated state
      setTimeout(() => {
        fetchManagers();
      }, 1000);
      
    } catch (err) {
      console.error("Error updating primary manager:", err);
      setError(err instanceof Error ? err.message : "Failed to update primary manager");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-500 mb-6">
          <CardHeader className="bg-red-500 text-white">
            <CardTitle>EMERGENCY PRIMARY MANAGER TOOL</CardTitle>
            <CardDescription className="text-white text-opacity-90">
              This tool bypasses all authentication checks
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Primary Manager Emergency Change</h2>
              <p className="mb-4 text-red-500 font-bold">WARNING: This tool bypasses all authentication!</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="contingentId" className="block text-sm font-medium mb-1">
                    Contingent ID
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={contingentId}
                      onChange={(e) => setContingentId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Enter contingent ID"
                    />
                    <Button 
                      onClick={fetchManagers}
                      disabled={loading || !contingentId}
                      variant="outline"
                    >
                      {loading ? 'Loading...' : 'Fetch Managers'}
                    </Button>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md mb-4">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md mb-4">
                  {success}
                </div>
              )}
              
              {managers.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Select New Primary Manager</h3>
                  <div className="space-y-2 mb-4">
                    {managers.map((manager) => (
                      <div 
                        key={manager.id}
                        className={`border p-3 rounded-md cursor-pointer ${selectedManagerId === manager.id ? 'bg-blue-50 border-blue-300' : ''}`}
                        onClick={() => setSelectedManagerId(manager.id)}
                      >
                        <div className="flex items-center">
                          <input
                            type="radio"
                            checked={selectedManagerId === manager.id}
                            onChange={() => setSelectedManagerId(manager.id)}
                            className="mr-2"
                          />
                          <div>
                            <div className="font-medium">{manager.participant.name}</div>
                            <div className="text-sm text-gray-500">{manager.participant.email}</div>
                            {manager.isOwner && (
                              <div className="mt-1 inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded">
                                Current Primary
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={updatePrimaryManager}
                    disabled={loading || !selectedManagerId || managers.find(m => m.id === selectedManagerId)?.isOwner}
                    variant="destructive"
                    className="w-full"
                  >
                    {loading ? 'Updating...' : 'EMERGENCY: Update Primary Manager'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

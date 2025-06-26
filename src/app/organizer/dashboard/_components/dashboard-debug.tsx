'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BugPlay } from "lucide-react";

export default function DashboardDebug() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  
  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching dashboard debug data...');
      const response = await fetch('/api/dashboard/debug', {
        credentials: 'include', // Ensure cookies are sent for authentication
        cache: 'no-store', // Prevent caching issues
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API debug response not OK:', response.status, errorText);
        throw new Error(`Failed to fetch debug data: ${response.statusText} (${response.status})`);
      }
      
      const result = await response.json();
      console.log('Received dashboard debug data:', result);
      setData(result);
    } catch (err) {
      console.error('Error fetching debug data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      {!showDebug ? (
        <div className="text-right p-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowDebug(true)}
            title="Show debug info"
          >
            <BugPlay className="h-4 w-4 mr-1" />
            Debug
          </Button>
        </div>
      ) : (
        <Card className="my-4">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Dashboard Debug Information</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowDebug(false)}
              >
                Hide
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="default" 
              onClick={fetchDebugData} 
              disabled={loading}
              className="mb-4"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fetch Database Counts
            </Button>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mt-2">
                Error: {error}
              </div>
            )}
            
            {data && (
              <div className="mt-2 border rounded p-3 bg-slate-50">
                <h3 className="font-semibold mb-2">Database Counts:</h3>
                <ul className="space-y-1">
                  <li><strong>Contestants:</strong> {data.counts.contestants}</li>
                  <li><strong>Teams:</strong> {data.counts.teams}</li>
                  <li><strong>Schools:</strong> {data.counts.schools}</li>
                  <li><strong>Contingents:</strong> {data.counts.contingents}</li>
                  <li><strong>States:</strong> {data.counts.states}</li>
                  <li><strong>Users:</strong> {data.counts.users}</li>
                </ul>
                
                <h3 className="font-semibold mt-4 mb-2">Current User:</h3>
                <ul className="space-y-1">
                  <li><strong>Email:</strong> {data.counts.currentUser.email}</li>
                  <li><strong>Role:</strong> {data.counts.currentUser.role}</li>
                  <li><strong>Name:</strong> {data.counts.currentUser.name}</li>
                </ul>
                
                <div className="text-xs text-gray-500 mt-4">
                  Fetched at: {data.timestamp}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

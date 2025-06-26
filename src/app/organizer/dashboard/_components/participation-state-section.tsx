'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ParticipationStateChart from "./participation-state-chart";
import { Loader2 } from "lucide-react";

type ParticipationStateData = {
  state: string;
  MALE: number;
  FEMALE: number;
};

export default function ParticipationStateSection() {
  const [data, setData] = useState<ParticipationStateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching participation state data...');
        const response = await fetch('/api/dashboard/participation-states', {
          credentials: 'include', // Ensure cookies are sent for authentication
          cache: 'no-store' // Prevent caching issues
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API response not OK:', response.status, errorText);
          throw new Error(`Failed to fetch data: ${response.statusText} (${response.status})`);
        }
        
        const result = await response.json();
        console.log('Received participation state data:', result);
        
        if (Array.isArray(result) && result.length > 0) {
          setData(result);
        } else {
          // If we got an empty array or invalid data format
          console.warn('Received empty or invalid data format', result);
          setError('No participation data available');
        }
      } catch (err) {
        console.error('Error fetching participation state data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle>Participations by State</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full text-destructive">
            <p>Error: {error}</p>
          </div>
        ) : (
          <div className="h-full w-full">
            <ParticipationStateChart data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

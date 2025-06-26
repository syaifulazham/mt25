'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EducationLevelChart from "./education-level-chart";
import { Loader2 } from "lucide-react";

type EducationLevelData = {
  level: string;
  count: number;
};

export default function EducationLevelSection() {
  const [data, setData] = useState<EducationLevelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching education level data...');
        const response = await fetch('/api/dashboard/education-levels', {
          credentials: 'include', // Ensure cookies are sent for authentication
          cache: 'no-store' // Prevent caching issues
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API response not OK:', response.status, errorText);
          throw new Error(`Failed to fetch data: ${response.statusText} (${response.status})`);
        }
        
        const result = await response.json();
        console.log('Received education level data:', result);
        
        if (Array.isArray(result) && result.length > 0) {
          setData(result);
        } else {
          // If we got an empty array or invalid data format
          console.warn('Received empty or invalid data format', result);
          setError('No education level data available');
        }
      } catch (err) {
        console.error('Error fetching education level data:', err);
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
        <CardTitle>Education Levels</CardTitle>
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
            <EducationLevelChart data={data} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

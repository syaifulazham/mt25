'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EducationLevelChart from "./education-level-chart";
import { Loader2, ExternalLink } from "lucide-react";
import Link from 'next/link';

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
        <div className="flex items-center justify-between">
          <CardTitle>Education Levels</CardTitle>
          <Link 
            href="/organizer/dashboard/by-education-level"
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
          >
            Show Details
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
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

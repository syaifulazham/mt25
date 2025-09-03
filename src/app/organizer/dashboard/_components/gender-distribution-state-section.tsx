'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OverallGenderPieChart from "./overall-gender-pie-chart";
import { Loader2 } from "lucide-react";

// Type for the API response data
type GenderApiData = {
  gender: string;
  count: number;
};

// Type for the chart data
type GenderDistributionData = {
  MALE: number;
  FEMALE: number;
};

// Transform the API data format to the format expected by the chart component
function transformData(data: GenderApiData[]): GenderDistributionData {
  const result: GenderDistributionData = {
    MALE: 0,
    FEMALE: 0
  };

  // Map the data from array format to object format
  data.forEach(item => {
    if (item.gender === 'MALE' || item.gender === 'FEMALE') {
      result[item.gender as keyof GenderDistributionData] = item.count;
    }
  });

  return result;
}

export default function GenderDistributionSection({ stateId }: { stateId: string }) {
  // Store formatted data directly - the chart expects this format
  const [chartData, setChartData] = useState<GenderDistributionData>({ MALE: 0, FEMALE: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        console.log('Fetching gender distribution data for state:', stateId);
        const response = await fetch(`/api/dashboard/gender-distribution?stateId=${stateId}`, {
          credentials: 'include', // Ensure cookies are sent for authentication
          cache: 'no-store' // Prevent caching issues
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API response not OK:', response.status, errorText);
          throw new Error(`Failed to fetch data: ${response.statusText} (${response.status})`);
        }
        
        const result = await response.json();
        console.log('Received gender distribution data:', result);
        
        if (Array.isArray(result) && result.length > 0) {
          // Transform API data to chart format
          const transformedData = transformData(result as GenderApiData[]);
          console.log('Transformed gender data for chart:', transformedData);
          
          if (transformedData.MALE > 0 || transformedData.FEMALE > 0) {
            setChartData(transformedData);
          } else {
            console.warn('Transformed data has no valid entries');
            setError('No valid gender distribution data available for this state');
          }
        } else {
          // If we got an empty or invalid data format
          console.warn('Received invalid data format', result);
          setError('No gender distribution data available for this state');
        }
      } catch (err) {
        console.error('Error fetching gender distribution data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [stateId]);
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <CardTitle>Gender Distribution</CardTitle>
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
            <OverallGenderPieChart data={chartData} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

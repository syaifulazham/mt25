"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import ParticipationHistoryChart from "./participation-history-chart";

export default function ParticipationHistorySection() {
  const [historyData, setHistoryData] = useState<Array<{date: string, count: number}>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistoryData() {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard/participation-history');
        
        if (!response.ok) {
          throw new Error('Failed to fetch participation history');
        }
        
        const data = await response.json();
        setHistoryData(data.data || []);
      } catch (err) {
        console.error('Error fetching participation history:', err);
        setError('Could not load participation history data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchHistoryData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-80 flex items-center justify-center border rounded-lg bg-background/50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading participation history...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full h-80 flex items-center justify-center border rounded-lg bg-background/50">
        <div className="text-center p-6">
          <p className="text-lg font-medium text-destructive mb-2">Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!historyData || historyData.length === 0) {
    return (
      <div className="w-full h-80 flex items-center justify-center border rounded-lg bg-background/50">
        <div className="text-center p-6">
          <p className="text-lg font-medium mb-2">No Participation Data</p>
          <p className="text-sm text-muted-foreground">
            No contest participation records found. Records will appear here once contestants start registering for contests.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <ParticipationHistoryChart data={historyData} />
  );
}

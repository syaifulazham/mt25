'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from "lucide-react";
import ActivityTabs from "./activity-tab";

export default function ActivityTabWrapper() {
  const [data, setData] = useState({
    systemStats: { contestCount: 0, participantCount: 0 },
    recentParticipants: [],
    recentLogins: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        // Here you would fetch actual data from an API endpoint
        // For now, let's simulate data with realistic sample data
        const mockData = {
          systemStats: {
            contestCount: 8,
            participantCount: 450
          },
          recentParticipants: [
            { id: 1, name: "John Doe", email: "john@example.com", createdAt: new Date() },
            { id: 2, name: "Jane Smith", email: "jane@example.com", createdAt: new Date() }
          ],
          recentLogins: [
            { id: 1, name: "Admin User", role: "ADMIN", lastLogin: new Date() },
            { id: 2, name: "Manager User", role: "MANAGER", lastLogin: new Date() }
          ]
        };
        
        // In a real implementation, you would fetch data like this:
        // const response = await fetch('/api/dashboard/activity');
        // const mockData = await response.json();
        
        setData(mockData);
      } catch (err) {
        console.error('Error fetching activity data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center py-8 text-destructive">
        <p>Error: {error}</p>
      </div>
    );
  }
  
  return (
    <ActivityTabs 
      systemStats={data.systemStats}
      recentParticipants={data.recentParticipants}
      recentLogins={data.recentLogins}
    />
  );
}

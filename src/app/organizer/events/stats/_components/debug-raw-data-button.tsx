"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

/**
 * Debug button that fetches and displays raw team data from the API
 */
export function DebugRawDataButton({
  eventId,
  zoneId,
  stateId,
}: {
  eventId?: number;
  zoneId?: number;
  stateId?: number;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRawData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Build the API URL with optional filters
      let url = `/api/organizer/events/stats/teams-raw-data`;
      
      const params = new URLSearchParams();
      if (eventId) params.append("eventId", eventId.toString());
      if (zoneId) params.append("zoneId", zoneId.toString());
      if (stateId) params.append("stateId", stateId.toString());
      
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      console.log(`[DebugRawDataButton] Fetching raw data from: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[DebugRawDataButton] Raw data fetched:", data);
      setRawData(data);
    } catch (err: any) {
      console.error("[DebugRawDataButton] Error fetching raw data:", err);
      setError(err.message || "Failed to fetch raw data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          onClick={() => {
            if (!rawData) {
              fetchRawData();
            }
          }}
          className="mt-2"
        >
          Show Raw Data for Debugging
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Raw Team Data</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            <span>Loading raw data...</span>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 border border-red-300 rounded bg-red-50">
            <strong>Error:</strong> {error}
          </div>
        ) : rawData ? (
          <Tabs defaultValue="formatted">
            <TabsList>
              <TabsTrigger value="formatted">Formatted</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>
            
            <TabsContent value="formatted" className="pt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Summary</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <p>Total Records: {Array.isArray(rawData) ? rawData.length : 'N/A'}</p>
                  </div>
                </div>
                
                {Array.isArray(rawData) && rawData.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium">Sample Records</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-2">Event</th>
                            <th className="border border-gray-300 px-4 py-2">State</th>
                            <th className="border border-gray-300 px-4 py-2">Zone</th>
                            <th className="border border-gray-300 px-4 py-2">Contest</th>
                            <th className="border border-gray-300 px-4 py-2">Contingent</th>
                            <th className="border border-gray-300 px-4 py-2">Team</th>
                            <th className="border border-gray-300 px-4 py-2">Members</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rawData.slice(0, 20).map((item: any, index: number) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-4 py-2">{item.eventName || 'N/A'}</td>
                              <td className="border border-gray-300 px-4 py-2">{item.stateName || 'N/A'}</td>
                              <td className="border border-gray-300 px-4 py-2">{item.zoneName || 'N/A'}</td>
                              <td className="border border-gray-300 px-4 py-2">{item.contestName || 'N/A'} ({item.contestCode || 'N/A'})</td>
                              <td className="border border-gray-300 px-4 py-2">{item.contingentName || 'N/A'}</td>
                              <td className="border border-gray-300 px-4 py-2">{item.teamName || 'N/A'}</td>
                              <td className="border border-gray-300 px-4 py-2">{item.numberOfMembers || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rawData.length > 20 && (
                      <p className="text-sm text-gray-500 mt-2">Showing first 20 of {rawData.length} records</p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="raw">
              <div className="bg-gray-50 p-4 rounded overflow-auto max-h-[60vh]">
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-gray-500 p-4">No data available</div>
        )}
        
        <div className="flex justify-end mt-4">
          {!isLoading && (
            <Button 
              variant="outline" 
              onClick={fetchRawData} 
              disabled={isLoading}
            >
              Refresh Data
            </Button>
          )}
          <DialogClose asChild>
            <Button className="ml-2">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

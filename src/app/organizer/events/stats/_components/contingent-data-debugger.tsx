'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { prismaExecute } from '@/lib/prisma';
import { ChevronDown, ChevronRight, Bug, DatabaseIcon, FilterIcon, TableProperties } from 'lucide-react';

type DebugDataType = {
  rawSchoolContingents: any[];
  rawIndependentContingents: any[];
  rawTeams: any[];
  processedStateGroups: any[];
  eventcontestteams: any[];
};

export function ContingentDataDebugger({ zoneId }: { zoneId: number }) {
  const [debugActive, setDebugActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<DebugDataType | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchDebugData() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/debug/contingent-data?zoneId=${zoneId}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching debug data: ${response.status}`);
      }
      
      const data = await response.json();
      setDebugData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch debug data');
      console.error('Debug data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-900 hover:bg-yellow-200 dark:hover:bg-yellow-800"
        onClick={() => {
          setDebugActive(!debugActive);
          if (!debugActive && !debugData) {
            fetchDebugData();
          }
        }}
      >
        <Bug className="h-4 w-4" />
        {debugActive ? 'Hide Debug View' : 'Debug Contingent Data'}
      </Button>
      
      {debugActive && (
        <Card className="mt-2 border-yellow-300 dark:border-yellow-700">
          <CardHeader className="bg-yellow-50 dark:bg-yellow-900">
            <CardTitle className="text-sm font-medium">Contingent Data Debugger</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
              </div>
            ) : error ? (
              <div className="text-red-500 p-4">{error}</div>
            ) : debugData ? (
              <Tabs defaultValue="raw">
                <TabsList className="mb-4">
                  <TabsTrigger value="raw" className="flex items-center gap-1">
                    <DatabaseIcon className="h-4 w-4" />
                    Raw Data
                  </TabsTrigger>
                  <TabsTrigger value="processed" className="flex items-center gap-1">
                    <FilterIcon className="h-4 w-4" />
                    Processed Data
                  </TabsTrigger>
                  <TabsTrigger value="eventcontestteams" className="flex items-center gap-1">
                    <TableProperties className="h-4 w-4" />
                    EventContestTeams
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="raw">
                  <div className="space-y-4">
                    <DebugSection 
                      title="School Contingents" 
                      data={debugData.rawSchoolContingents} 
                      count={debugData.rawSchoolContingents.length}
                    />
                    <DebugSection 
                      title="Independent Contingents" 
                      data={debugData.rawIndependentContingents} 
                      count={debugData.rawIndependentContingents.length}
                    />
                    <DebugSection 
                      title="Teams" 
                      data={debugData.rawTeams} 
                      count={debugData.rawTeams.length}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="processed">
                  <DebugSection 
                    title="Processed State Groups" 
                    data={debugData.processedStateGroups} 
                    count={debugData.processedStateGroups.length}
                  />
                </TabsContent>
                
                <TabsContent value="eventcontestteams">
                  <DebugSection 
                    title="EventContestTeam Records" 
                    data={debugData.eventcontestteams} 
                    count={debugData.eventcontestteams.length}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-4">
                <Button onClick={fetchDebugData}>Load Debug Data</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DebugSection({ title, data, count }: { title: string; data: any[]; count: number }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border rounded-md">
      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 text-left">
        <div className="font-medium">{title} ({count})</div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      
      <CollapsibleContent className="p-4 pt-0 border-t">
        <pre className="text-xs overflow-auto max-h-[400px] p-2 bg-gray-100 dark:bg-gray-900 rounded">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

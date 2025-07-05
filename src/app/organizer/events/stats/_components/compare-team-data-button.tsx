"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileSearch, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CompareTeamDataButtonProps {
  zoneId: number;
  zoneName: string;
}

interface TeamComparisonData {
  rawDataTeams: Array<{
    id: number;
    name: string;
    contingentName: string;
    contestName?: string;
  }>;
  participantListTeams: Array<{
    id: number;
    name: string;
    contingentName: string;
  }>;
  matchedTeams: Array<{
    id: number;
    name: string;
    contingentName: string;
    inBoth: boolean;
  }>;
}

export function CompareTeamDataButton({ zoneId, zoneName }: CompareTeamDataButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<TeamComparisonData | null>(null);

  const handleCompare = async () => {
    try {
      setIsLoading(true);
      toast({
        title: 'Comparing team data',
        description: 'Fetching and comparing teams from different sources...',
      });

      const response = await fetch(
        `/api/organizer/events/stats/${zoneId}/compare-team-data`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch team comparison data');
      }

      const data: TeamComparisonData = await response.json();
      setComparisonData(data);
      setIsOpen(true);

      toast({
        title: 'Comparison Ready',
        description: 'Team data comparison has been loaded.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Comparison error:', error);
      toast({
        title: 'Error',
        description: 'Failed to compare team data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCompare}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Comparing...
          </>
        ) : (
          <>
            <FileSearch className="h-4 w-4" />
            Compare Team Data
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[98vw] max-w-full max-h-[90vh] overflow-y-auto p-8 m-0" style={{ width: '98vw', margin: '0 auto' }}>
          <DialogHeader>
            <DialogTitle>Team Data Comparison for {zoneName} Zone</DialogTitle>
            <DialogDescription>
              This comparison shows teams from both the raw data and participant list sources.
              <div className="mt-2">
                <strong>Raw Data Teams:</strong> {comparisonData?.rawDataTeams.length}
                <br />
                <strong>Participant List Teams:</strong> {comparisonData?.participantListTeams.length}
                <br />
                <strong>Teams in both sources:</strong> {comparisonData?.matchedTeams.filter(team => team.inBoth).length}
                <br />
                <strong className="text-blue-600">Note:</strong> Contestant counts may differ between summary views due to different counting methods. 
                <ul className="list-disc ml-6 text-sm mt-1">
                  <li>Top summary: Counts all team memberships</li>
                  <li>Participant list: Counts unique contestant+contest combinations</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>

          {comparisonData ? (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-2">Matched Teams</h3>
                <Table className="border rounded-md">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-bold text-center w-16">#</TableHead>
                      <TableHead className="font-bold text-center">Team ID</TableHead>
                      <TableHead className="font-bold">Team Name</TableHead>
                      <TableHead className="font-bold">Contingent</TableHead>
                      <TableHead className="font-bold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.matchedTeams.map((team, index) => (
                      <TableRow key={team.id}>
                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                        <TableCell>{team.id}</TableCell>
                        <TableCell>{team.name}</TableCell>
                        <TableCell>{team.contingentName}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              team.inBoth
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {team.inBoth ? 'In Both' : 'Missing in One'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Teams Raw Data</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team ID</TableHead>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Contingent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.rawDataTeams.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell>{team.id}</TableCell>
                          <TableCell>{team.name}</TableCell>
                          <TableCell>{team.contingentName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Participant List Teams</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team ID</TableHead>
                        <TableHead>Team Name</TableHead>
                        <TableHead>Contingent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonData.participantListTeams.map((team) => (
                        <TableRow key={team.id}>
                          <TableCell>{team.id}</TableCell>
                          <TableCell>{team.name}</TableCell>
                          <TableCell>{team.contingentName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading comparison data...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

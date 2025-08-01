'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Info, RefreshCw, Calendar, CalendarRange, MapPin, Activity } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { CalendarClock, Clipboard, BarChart3, Map, Mail, FileText, Award, LineChart, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useParams } from "next/navigation";

// Type for sync mismatches
type MismatchItem = {
  id: number;
  name?: string;
};

type Mismatches = {
  contingents?: {
    missingInAttendance?: MismatchItem[];
    extraInAttendance?: MismatchItem[];
  };
  teams?: {
    missingInAttendance?: MismatchItem[];
    extraInAttendance?: MismatchItem[];
  };
  contestants?: {
    missingInAttendance?: MismatchItem[];
    extraInAttendance?: MismatchItem[];
  };
  managers?: {
    missingInAttendance?: MismatchItem[];
    extraInAttendance?: MismatchItem[];
  };
};

// Type for missing team info
type MissingTeam = {
  id: number;
  teamName: string;
  contingentName: string;
  contestName: string;
};

// Type for API response
type SyncStatusResponse = {
  isSynced: boolean;
  lastSyncDate?: string;
  differences?: {
    teams: number;
    contestants: number;
    managers: number;
    contingents: number;
  };
  actualCounts?: {
    teams: number;
    contestants: number;
    managers: number;
    contingents: number;
  };
  expectedCounts?: {
    teams: number;
    contestants: number;
    managers: number;
    contingents: number;
  };
  mismatches?: Mismatches;
  missingTeams?: MissingTeam[];
};

export default function AttendancePage() {
  const { id: eventId } = useParams();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [syncNeeded, setSyncNeeded] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  // Chunked sync states
  const [syncPaused, setSyncPaused] = useState(false);
  const [syncStopped, setSyncStopped] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [processedTeams, setProcessedTeams] = useState(0);
  const [totalTeams, setTotalTeams] = useState(0);
  const [syncMetrics, setSyncMetrics] = useState({
    newContingents: 0,
    updatedContingents: 0,
    newTeams: 0,
    updatedTeams: 0,
    newContestants: 0,
    updatedContestants: 0,
    newManagers: 0,
    updatedManagers: 0,
    errorCount: 0,
    errors: [] as string[]
  });
  
  // Sync differences states
  const [differencesDialogOpen, setDifferencesDialogOpen] = useState(false);
  const [syncMismatches, setSyncMismatches] = useState<Mismatches | null>(null);
  const [syncStatusData, setSyncStatusData] = useState<SyncStatusResponse | null>(null);
  const [loadingDifferences, setLoadingDifferences] = useState(false);
  
  // Contingent sync states
  const [contingentSyncDialogOpen, setContingentSyncDialogOpen] = useState(false);
  const [availableContingents, setAvailableContingents] = useState<any[]>([]);
  const [selectedContingent, setSelectedContingent] = useState<number | null>(null);
  const [loadingContingents, setLoadingContingents] = useState(false);
  const [contingentSyncing, setContingentSyncing] = useState(false);
  const [contingentSearchText, setContingentSearchText] = useState('');
  
  // Cleanup states
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<any>(null);
  
  // Sync results states
  const [syncResultsDialogOpen, setSyncResultsDialogOpen] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  
  // Function to check if there are actual mismatches in the data
  const hasMismatches = () => {
    if (!syncMismatches) return false;
    
    // Check for any missing or extra entries in any category
    const hasMissingContingents = syncMismatches?.contingents?.missingInAttendance && syncMismatches.contingents.missingInAttendance.length > 0;
    const hasMissingTeams = syncMismatches?.teams?.missingInAttendance && syncMismatches.teams.missingInAttendance.length > 0;
    const hasMissingContestants = syncMismatches?.contestants?.missingInAttendance && syncMismatches.contestants.missingInAttendance.length > 0;
    const hasMissingManagers = syncMismatches?.managers?.missingInAttendance && syncMismatches.managers.missingInAttendance.length > 0;
    
    const hasExtraContingents = syncMismatches?.contingents?.extraInAttendance && syncMismatches.contingents.extraInAttendance.length > 0;
    const hasExtraTeams = syncMismatches?.teams?.extraInAttendance && syncMismatches.teams.extraInAttendance.length > 0;
    const hasExtraContestants = syncMismatches?.contestants?.extraInAttendance && syncMismatches.contestants.extraInAttendance.length > 0;
    const hasExtraManagers = syncMismatches?.managers?.extraInAttendance && syncMismatches.managers.extraInAttendance.length > 0;
    
    return (
      hasMissingContingents || hasMissingTeams || hasMissingContestants || hasMissingManagers ||
      hasExtraContingents || hasExtraTeams || hasExtraContestants || hasExtraManagers
    );
  };
  
  // Function to check if there are numerical differences in counts
  const hasDifferencesInCounts = () => {
    if (!syncStatusData?.differences) return false;
    
    return (
      (syncStatusData.differences.teams !== 0 && syncStatusData.differences.teams !== undefined) ||
      (syncStatusData.differences.contestants !== 0 && syncStatusData.differences.contestants !== undefined) ||
      (syncStatusData.differences.managers !== 0 && syncStatusData.differences.managers !== undefined)
    );
  };

  // Reset attendance states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [userEnteredCode, setUserEnteredCode] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);

  // State for event details
  const [eventDetails, setEventDetails] = useState<{
    name: string;
    startDate: string;
    endDate: string;
    zoneName: string;
    status: string;
  } | null>(null);

  // Function to fetch event details
  const fetchEventDetails = async () => {
    try {
      const res = await fetch(`/api/organizer/events/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setEventDetails(data);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
    }
  };

  // Function to check sync status
  const checkSyncStatus = async () => {
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/attendance/sync-status`);
      const data = await res.json();
      
      if (res.ok) {
        console.log('Sync status response:', data);
        // Set syncNeeded to true if isSynced is false or there are mismatches
        const hasMismatches = data.mismatches && (
          (data.mismatches.contingents?.missingInAttendance?.length > 0) ||
          (data.mismatches.teams?.missingInAttendance?.length > 0) ||
          (data.mismatches.contestants?.missingInAttendance?.length > 0) ||
          (data.mismatches.managers?.missingInAttendance?.length > 0) ||
          (data.mismatches.contingents?.extraInAttendance?.length > 0) ||
          (data.mismatches.teams?.extraInAttendance?.length > 0) ||
          (data.mismatches.contestants?.extraInAttendance?.length > 0) ||
          (data.mismatches.managers?.extraInAttendance?.length > 0)
        );
        
        // Also check numerical differences directly
        const hasDifferences = 
          (data.differences && (
            data.differences.teams !== 0 || 
            data.differences.contestants !== 0 || 
            data.differences.managers !== 0
          ));
        
        // Store API response data for displaying in the differences dialog
        setSyncMismatches(data.mismatches || null);
        setSyncStatusData(data);
        
        // Use isSynced from the API response if available, otherwise check for mismatches or differences
        setSyncNeeded(data.isSynced === false || hasMismatches || hasDifferences);
      }
    } catch (error) {
      console.error("Error checking sync status:", error);
    }
  };
  
  // Check sync status on component mount
  useEffect(() => {
    checkSyncStatus();
    fetchEventDetails();
    
    // Generate a random reset code
    setResetCode(Math.random().toString(36).substring(2, 8).toUpperCase());
  }, []);

  // Handle sync button click
  // Generate a random 6-character alphanumeric code
  const generateResetCode = useCallback(() => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }, []);

  // Open reset confirmation dialog
  const openResetDialog = useCallback(() => {
    const newCode = generateResetCode();
    setResetCode(newCode);
    setUserEnteredCode('');
    setResetError(null);
    setResetDialogOpen(true);
  }, [generateResetCode]);

  // Handle reset confirmation
  const handleReset = async () => {
    if (userEnteredCode !== resetCode) {
      setResetError("The verification code doesn't match. Please try again.");
      return;
    }

    try {
      setResetting(true);
      setResetError(null);

      const response = await fetch(`/api/organizer/events/${eventId}/attendance/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          verificationCode: userEnteredCode,
          expectedCode: resetCode
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset attendance data');
      }

      const result = await response.json();
      console.log('Reset successful:', result);

      // Close the dialog and refresh attendance status
      setResetDialogOpen(false);
      checkSyncStatus(); // Re-check sync status after reset
      
      // Show success message or notification
      alert(`Reset completed successfully! Removed:\n- ${result.result.deletedContestants} contestant records\n- ${result.result.deletedTeams} team records\n- ${result.result.deletedContingents} contingent records`);
    } catch (error) {
      console.error('Reset error:', error);
      setResetError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setResetting(false);
    }
  };

  // Show the differences dialog with up-to-date information
  const handleShowDifferences = async () => {
    if (!syncNeeded) return;
    
    setLoadingDifferences(true);
    setDifferencesDialogOpen(true);
    
    try {
      const res = await fetch(`/api/organizer/events/${eventId}/attendance/sync-status`);
      if (res.ok) {
        const data = await res.json();
        setSyncMismatches(data.mismatches || null);
      }
    } catch (error) {
      console.error('Error fetching sync differences:', error);
      toast({
        title: "Error",
        description: "Could not fetch synchronization differences.",
        variant: "destructive"
      });
    } finally {
      setLoadingDifferences(false);
    }
  };
  
  const handleSync = async () => {
    if (syncing) return;
    
    setSyncing(true);
    setSyncPaused(false);
    setSyncStopped(false);
    setSyncProgress(0);
    setCurrentChunk(0);
    setProcessedTeams(0);
    setSyncMetrics({
      newContingents: 0,
      updatedContingents: 0,
      newTeams: 0,
      updatedTeams: 0,
      newContestants: 0,
      updatedContestants: 0,
      newManagers: 0,
      updatedManagers: 0,
      errorCount: 0,
      errors: []
    });
    
    try {
      // First, get the total count of teams to process
      const countRes = await fetch(`/api/organizer/events/${eventId}/attendance/sync-chunked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'count' })
      });
      
      const countData = await countRes.json();
      if (!countData.success) {
        throw new Error(countData.error || 'Failed to get team count');
      }
      
      const { totalTeams: totalTeamsCount, totalChunks: totalChunksCount, chunkSize } = countData;
      setTotalTeams(totalTeamsCount);
      setTotalChunks(totalChunksCount);
      
      if (totalTeamsCount === 0) {
        toast({
          title: "No Teams to Sync",
          description: "No teams found for synchronization.",
        });
        return;
      }
      
      // Process chunks sequentially
      let cumulativeMetrics = {
        newContingents: 0,
        updatedContingents: 0,
        newTeams: 0,
        updatedTeams: 0,
        newContestants: 0,
        updatedContestants: 0,
        newManagers: 0,
        updatedManagers: 0,
        errorCount: 0,
        errors: [] as string[]
      };
      
      for (let chunkIndex = 0; chunkIndex < totalChunksCount && !syncStopped; chunkIndex++) {
        // Wait if paused
        while (syncPaused && !syncStopped) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (syncStopped) break;
        
        setCurrentChunk(chunkIndex + 1);
        const offset = chunkIndex * chunkSize;
        
        try {
          const chunkRes = await fetch(`/api/organizer/events/${eventId}/attendance/sync-chunked`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'chunk', 
              chunkSize,
              offset 
            })
          });
          
          const chunkData = await chunkRes.json();
          
          if (chunkData.success && chunkData.syncResults) {
            const results = chunkData.syncResults;
            
            // Update cumulative metrics
            cumulativeMetrics.newContingents += results.newContingents || 0;
            cumulativeMetrics.updatedContingents += results.updatedContingents || 0;
            cumulativeMetrics.newTeams += results.newTeams || 0;
            cumulativeMetrics.updatedTeams += results.updatedTeams || 0;
            cumulativeMetrics.newContestants += results.newContestants || 0;
            cumulativeMetrics.updatedContestants += results.updatedContestants || 0;
            cumulativeMetrics.newManagers += results.newManagers || 0;
            cumulativeMetrics.updatedManagers += results.updatedManagers || 0;
            cumulativeMetrics.errorCount += results.errorCount || 0;
            
            if (results.errors && results.errors.length > 0) {
              cumulativeMetrics.errors.push(...results.errors);
            }
            
            setProcessedTeams(prev => prev + (results.processedTeams || 0));
            setSyncMetrics({ ...cumulativeMetrics });
            
            // Update progress
            const progress = ((chunkIndex + 1) / totalChunksCount) * 100;
            setSyncProgress(progress);
            
          } else {
            console.error(`Chunk ${chunkIndex + 1} failed:`, chunkData.error);
            cumulativeMetrics.errorCount++;
            cumulativeMetrics.errors.push(`Chunk ${chunkIndex + 1}: ${chunkData.error || 'Unknown error'}`);
            setSyncMetrics({ ...cumulativeMetrics });
          }
        } catch (chunkError) {
          console.error(`Error processing chunk ${chunkIndex + 1}:`, chunkError);
          cumulativeMetrics.errorCount++;
          cumulativeMetrics.errors.push(`Chunk ${chunkIndex + 1}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`);
          setSyncMetrics({ ...cumulativeMetrics });
        }
        
        // Small delay between chunks to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (syncStopped) {
        toast({
          title: "Synchronization Stopped",
          description: `Processed ${processedTeams} out of ${totalTeamsCount} teams before stopping.`,
        });
      } else {
        const totalProcessed = cumulativeMetrics.newContingents + cumulativeMetrics.updatedContingents +
                              cumulativeMetrics.newTeams + cumulativeMetrics.updatedTeams +
                              cumulativeMetrics.newContestants + cumulativeMetrics.updatedContestants +
                              cumulativeMetrics.newManagers + cumulativeMetrics.updatedManagers;
        
        // Store sync results and open persistent dialog
        const syncResultsData = {
          totalProcessed,
          processedTeams,
          metrics: cumulativeMetrics,
          completedAt: new Date().toLocaleString()
        };
        setSyncResults(syncResultsData);
        setSyncResultsDialogOpen(true);
        
        toast({
          title: "Synchronization Complete",
          description: `Successfully processed ${totalProcessed} records across ${processedTeams} teams. Click to view detailed results.`,
        });
        setSyncNeeded(false);
      }
      
    } catch (error) {
      console.error("Error during sync:", error);
      toast({
        title: "Synchronization Error",
        description: error instanceof Error ? error.message : "Failed to synchronize attendance data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setSyncing(false);
        setSyncProgress(0);
        setCurrentChunk(0);
        setProcessedTeams(0);
        setSyncPaused(false);
        setSyncStopped(false);
      }, 500);
    }
  };
  
  const handlePauseSync = () => {
    setSyncPaused(!syncPaused);
  };
  
  const handleStopSync = () => {
    setSyncStopped(true);
    setSyncPaused(false);
  };

  // Handle cleanup of outdated attendance records
  const handleCleanup = async () => {
    setCleaning(true);
    setCleanupResults(null);
    
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setCleanupResults(data);
        toast({
          title: "Cleanup Complete",
          description: `Removed ${data.totalRemovedRecords} outdated records from attendance tables.`,
        });
        
        // Refresh sync status after cleanup
        checkSyncStatus();
      } else {
        toast({
          title: "Cleanup Failed",
          description: data.error || "Failed to cleanup attendance records",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      toast({
        title: "Cleanup Error",
        description: "An unexpected error occurred during cleanup",
        variant: "destructive",
      });
    } finally {
      setCleaning(false);
    }
  };

  // Function to fetch available contingents from endlist
  const fetchAvailableContingents = async () => {
    setLoadingContingents(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/endlist-contingents`);
      if (!response.ok) {
        throw new Error('Failed to fetch contingents');
      }
      const data = await response.json();
      setAvailableContingents(data.contingents || []);
    } catch (error) {
      console.error('Error fetching contingents:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch contingents list',
        variant: 'destructive',
      });
    } finally {
      setLoadingContingents(false);
    }
  };

  // Function to handle contingent sync
  const handleContingentSync = async () => {
    if (!selectedContingent) {
      toast({
        title: 'Error',
        description: 'Please select a contingent to sync',
        variant: 'destructive',
      });
      return;
    }

    setContingentSyncing(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/attendance/sync-contingent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contingentId: selectedContingent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync contingent');
      }

      toast({
        title: 'Success',
        description: `Contingent sync completed successfully. ${data.syncResults?.newTeams || 0} new teams, ${data.syncResults?.newContestants || 0} new contestants synced.`,
      });

      // Refresh the sync status and contingents list
      await checkSyncStatus();
      await fetchAvailableContingents();
      
      // Close the dialog
      setContingentSyncDialogOpen(false);
      setSelectedContingent(null);

    } catch (error) {
      console.error('Error syncing contingent:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sync contingent',
        variant: 'destructive',
      });
    } finally {
      setContingentSyncing(false);
    }
  };

  // Function to filter contingents based on search text
  const getFilteredContingents = () => {
    if (!contingentSearchText.trim()) {
      return availableContingents;
    }
    
    const searchLower = contingentSearchText.toLowerCase();
    return availableContingents.filter(contingent => 
      contingent.name.toLowerCase().includes(searchLower) ||
      contingent.institutionName.toLowerCase().includes(searchLower) ||
      contingent.stateName.toLowerCase().includes(searchLower)
    );
  };

  // Function to open contingent sync dialog
  const handleOpenContingentSync = async () => {
    setContingentSyncDialogOpen(true);
    setContingentSearchText(''); // Reset search when opening
    setSelectedContingent(null); // Reset selection when opening
    await fetchAvailableContingents();
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Event Attendance Management</h1>

      {/* Sync Differences Dialog */}
      <Dialog open={differencesDialogOpen} onOpenChange={setDifferencesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              Synchronization Differences
            </DialogTitle>
            <DialogDescription>
              The following differences were detected between the approved teams and attendance records.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {loadingDifferences ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (hasMismatches() || hasDifferencesInCounts()) ? (
              <>
                {/* Contingents */}
                <div className="space-y-2">
                  <h3 className="text-base font-medium">Contingents</h3>
                  
                  {syncMismatches?.contingents?.missingInAttendance?.length ? (
                    <div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 mb-2">
                        Missing in Attendance Records
                      </Badge>
                      <ul className="list-disc pl-5 space-y-1">
                        {syncMismatches.contingents.missingInAttendance.map(item => (
                          <li key={`contingent-missing-${item.id}`}>{item.name || `ID: ${item.id}`}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  
                  {syncMismatches?.contingents?.extraInAttendance?.length ? (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-red-50 text-red-700 mb-2">
                        Extra in Attendance Records
                      </Badge>
                      <ul className="list-disc pl-5 space-y-1">
                        {syncMismatches.contingents.extraInAttendance.map(item => (
                          <li key={`contingent-extra-${item.id}`}>{item.name || `ID: ${item.id}`}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  
                  {!syncMismatches?.contingents?.missingInAttendance?.length && 
                   !syncMismatches?.contingents?.extraInAttendance?.length && (
                    <p className="text-green-600 text-sm">No differences</p>
                  )}
                </div>
                
                {/* Teams */}
                <div className="space-y-2">
                  <h3 className="text-base font-medium">Teams</h3>
                  
                  {syncStatusData?.missingTeams?.length ? (
                    <div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 mb-2">
                        Missing in Attendance Records (First 10)
                      </Badge>
                      <div className="space-y-2">
                        {syncStatusData.missingTeams.map(team => (
                          <div key={`team-missing-${team.id}`} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <div className="font-medium text-amber-800">{team.teamName}</div>
                            <div className="text-sm text-amber-600">
                              <span className="font-medium">Contingent:</span> {team.contingentName}
                            </div>
                            <div className="text-sm text-amber-600">
                              <span className="font-medium">Contest:</span> {team.contestName}
                            </div>
                          </div>
                        ))}
                      </div>
                      {syncStatusData.differences?.teams && syncStatusData.differences.teams > syncStatusData.missingTeams.length && (
                        <p className="text-sm text-amber-600 mt-2">
                          ... and {syncStatusData.differences.teams - syncStatusData.missingTeams.length} more teams
                        </p>
                      )}
                    </div>
                  ) : syncStatusData?.differences?.teams && syncStatusData.differences.teams > 0 ? (
                    <div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 mb-2">
                        {syncStatusData.differences.teams} Teams Missing in Attendance Records
                      </Badge>
                      <p className="text-sm text-amber-600">Details not available - please run sync to see specific teams.</p>
                    </div>
                  ) : (
                    <p className="text-green-600 text-sm">No team differences</p>
                  )}
                </div>
                
                {/* Contestants */}
                <div className="space-y-2">
                  <h3 className="text-base font-medium">Contestants</h3>
                  
                  {syncMismatches?.contestants?.missingInAttendance?.length ? (
                    <div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 mb-2">
                        Missing in Attendance Records
                      </Badge>
                      <ul className="list-disc pl-5 space-y-1">
                        {syncMismatches.contestants.missingInAttendance.map(item => (
                          <li key={`contestant-missing-${item.id}`}>{item.name || `ID: ${item.id}`}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  
                  {syncMismatches?.contestants?.extraInAttendance?.length ? (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-red-50 text-red-700 mb-2">
                        Extra in Attendance Records
                      </Badge>
                      <ul className="list-disc pl-5 space-y-1">
                        {syncMismatches.contestants.extraInAttendance.map(item => (
                          <li key={`contestant-extra-${item.id}`}>{item.name || `ID: ${item.id}`}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  
                  {!syncMismatches?.contestants?.missingInAttendance?.length && 
                   !syncMismatches?.contestants?.extraInAttendance?.length && (
                    <p className="text-green-600 text-sm">No differences</p>
                  )}
                </div>

                {/* Managers */}
                <div className="space-y-2 mt-4">
                  <h3 className="text-base font-medium">Managers</h3>
                  
                  {syncMismatches?.managers?.missingInAttendance?.length ? (
                    <div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 mb-2">
                        Missing in Attendance Records
                      </Badge>
                      <ul className="list-disc pl-5 space-y-1">
                        {syncMismatches.managers.missingInAttendance.map(item => (
                          <li key={`manager-missing-${item.id}`}>{item.name || `ID: ${item.id}`}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  
                  {syncMismatches?.managers?.extraInAttendance?.length ? (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-red-50 text-red-700 mb-2">
                        Extra in Attendance Records
                      </Badge>
                      <ul className="list-disc pl-5 space-y-1">
                        {syncMismatches.managers.extraInAttendance.map(item => (
                          <li key={`manager-extra-${item.id}`}>{item.name || `ID: ${item.id}`}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  
                  {/* Show either numerical differences or no differences */}
                  {!syncMismatches?.managers?.missingInAttendance?.length && 
                   !syncMismatches?.managers?.extraInAttendance?.length && (
                    syncStatusData?.differences?.managers !== undefined && 
                    syncStatusData?.differences?.managers !== 0 && 
                    syncStatusData?.differences?.managers > 0 ? (
                      <div className="mt-2">
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 mb-2">
                          Missing in Attendance Records
                        </Badge>
                        <p className="text-sm">There are {syncStatusData.differences.managers} managers missing in attendance records.</p>
                      </div>
                    ) : (
                      <p className="text-green-600 text-sm">No differences</p>
                    )
                  )}
                  
                  {/* Old numerical differences fallback (replaced by combined conditional above) */}
                  {false && (
                    <div className="mt-2">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 mb-2">
                        Missing in Attendance Records
                      </Badge>
                      <p className="text-sm">There are {syncStatusData?.differences?.managers} managers missing in attendance records.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p>No synchronization differences found.</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button onClick={() => setDifferencesDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? 'Syncing...' : 'Synchronize Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Contingent Sync Dialog */}
      <Dialog open={contingentSyncDialogOpen} onOpenChange={setContingentSyncDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              Sync by Contingent
            </DialogTitle>
            <DialogDescription>
              Select a specific contingent to sync from the endlist to attendance records.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {loadingContingents ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Loading contingents...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="contingent-search">Search Contingents</Label>
                  <Input
                    id="contingent-search"
                    type="text"
                    placeholder="Search by contingent name, institution, or state..."
                    value={contingentSearchText}
                    onChange={(e) => setContingentSearchText(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contingent-select">Select Contingent</Label>
                  <select
                    id="contingent-select"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={selectedContingent || ''}
                    onChange={(e) => setSelectedContingent(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">-- Select a contingent --</option>
                    {getFilteredContingents().map((contingent) => (
                      <option key={contingent.id} value={contingent.id}>
                        {contingent.name} ({contingent.stateName}) - {contingent.teamCount} teams
                        {contingent.needsSync ? ' ⚠️ Needs Sync' : ' ✅ Synced'}
                      </option>
                    ))}
                  </select>
                  
                  {contingentSearchText && (
                    <p className="text-sm text-gray-600">
                      Showing {getFilteredContingents().length} of {availableContingents.length} contingents
                    </p>
                  )}
                </div>
                
                {selectedContingent && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-md">
                    {(() => {
                      const contingent = availableContingents.find(c => c.id === selectedContingent);
                      return contingent ? (
                        <div className="text-sm">
                          <p><strong>Institution:</strong> {contingent.institutionName}</p>
                          <p><strong>State:</strong> {contingent.stateName}</p>
                          <p><strong>Teams:</strong> {contingent.teamCount}</p>
                          <p><strong>Contestants:</strong> {contingent.contestantCount}</p>
                          <p><strong>Status:</strong> 
                            <span className={contingent.needsSync ? 'text-amber-600' : 'text-green-600'}>
                              {contingent.needsSync ? ' Needs Sync' : ' Already Synced'}
                            </span>
                          </p>
                          {contingent.needsSync && (
                            <p className="text-amber-600 text-xs mt-1">
                              This contingent has {contingent.teamCount - contingent.syncedTeamCount} teams that need to be synced.
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setContingentSyncDialogOpen(false);
                setSelectedContingent(null);
              }}
              disabled={contingentSyncing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleContingentSync} 
              disabled={contingentSyncing || !selectedContingent}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {contingentSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Syncing...
                </>
              ) : (
                'Sync Contingent'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Sync Results Dialog */}
      <Dialog open={syncResultsDialogOpen} onOpenChange={setSyncResultsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <RefreshCw className="h-5 w-5" />
              Synchronization Complete
            </DialogTitle>
            <DialogDescription>
              Detailed results from the attendance synchronization process.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {syncResults && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-3">Synchronization Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Records Processed:</span> {syncResults.totalProcessed}
                    </div>
                    <div>
                      <span className="font-medium">Teams Processed:</span> {syncResults.processedTeams}
                    </div>
                    <div>
                      <span className="font-medium">Completed At:</span> {syncResults.completedAt}
                    </div>
                    <div>
                      <span className="font-medium">Errors:</span> 
                      <span className={syncResults.metrics.errorCount > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {syncResults.metrics.errorCount}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Detailed Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Contingents */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 text-blue-700">Contingents</h4>
                    <div className="space-y-1 text-sm">
                      <div>New: <span className="font-medium">{syncResults.metrics.newContingents}</span></div>
                      <div>Updated: <span className="font-medium">{syncResults.metrics.updatedContingents}</span></div>
                    </div>
                  </div>
                  
                  {/* Teams */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 text-purple-700">Teams</h4>
                    <div className="space-y-1 text-sm">
                      <div>New: <span className="font-medium">{syncResults.metrics.newTeams}</span></div>
                      <div>Updated: <span className="font-medium">{syncResults.metrics.updatedTeams}</span></div>
                    </div>
                  </div>
                  
                  {/* Contestants */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 text-green-700">Contestants</h4>
                    <div className="space-y-1 text-sm">
                      <div>New: <span className="font-medium">{syncResults.metrics.newContestants}</span></div>
                      <div>Updated: <span className="font-medium">{syncResults.metrics.updatedContestants}</span></div>
                    </div>
                  </div>
                  
                  {/* Managers */}
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 text-orange-700">Managers</h4>
                    <div className="space-y-1 text-sm">
                      <div>New: <span className="font-medium">{syncResults.metrics.newManagers}</span></div>
                      <div>Updated: <span className="font-medium">{syncResults.metrics.updatedManagers}</span></div>
                    </div>
                  </div>
                </div>
                
                {/* Errors Section */}
                {syncResults.metrics.errorCount > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium mb-2 text-red-700">Errors ({syncResults.metrics.errorCount})</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {syncResults.metrics.errors.map((error: string, index: number) => (
                        <div key={index} className="text-sm text-red-600 p-2 bg-red-100 rounded border">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setSyncResultsDialogOpen(false);
                setSyncResults(null);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Cleanup Dialog */}
      <Dialog open={cleanupDialogOpen} onOpenChange={setCleanupDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Cleanup Outdated Records
            </DialogTitle>
            <DialogDescription>
              This will remove attendance records for teams and contestants that are no longer in the approved endlist.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {cleanupResults ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-800 mb-2">Cleanup Complete</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Valid Teams in Endlist:</span> {cleanupResults.validTeamsInEndlist}
                    </div>
                    <div>
                      <span className="font-medium">Valid Contestants in Endlist:</span> {cleanupResults.validContestantsInEndlist}
                    </div>
                    <div>
                      <span className="font-medium">Outdated Teams Removed:</span> {cleanupResults.removedTeams}
                    </div>
                    <div>
                      <span className="font-medium">Outdated Contestants Removed:</span> {cleanupResults.removedContestants}
                    </div>
                    <div>
                      <span className="font-medium">Contestants from Removed Teams:</span> {cleanupResults.removedContestantsFromTeams}
                    </div>
                    <div>
                      <span className="font-medium">Total Records Removed:</span> {cleanupResults.totalRemovedRecords}
                    </div>
                  </div>
                </div>
                
                {cleanupResults.outdatedTeamsDetails?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Removed Teams:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {cleanupResults.outdatedTeamsDetails.map((team: any) => (
                        <div key={team.teamId} className="text-sm p-2 bg-red-50 rounded border">
                          Team ID: {team.teamId}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {cleanupResults.outdatedContestantsDetails?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Removed Contestants:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {cleanupResults.outdatedContestantsDetails.map((contestant: any) => (
                        <div key={contestant.contestantId} className="text-sm p-2 bg-red-50 rounded border">
                          Contestant ID: {contestant.contestantId}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  This operation will:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                  <li>Remove contestants from attendance records who are no longer in approved teams</li>
                  <li>Remove teams from attendance records that are no longer approved/accepted</li>
                  <li>Remove all contestant records associated with removed teams</li>
                </ul>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-sm text-amber-700">
                    <strong>Note:</strong> This only removes outdated records. Valid attendance data will remain intact.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setCleanupDialogOpen(false);
                setCleanupResults(null);
              }}
              variant="outline"
            >
              {cleanupResults ? 'Close' : 'Cancel'}
            </Button>
            {!cleanupResults && (
              <Button 
                onClick={handleCleanup}
                disabled={cleaning}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {cleaning ? 'Cleaning...' : 'Start Cleanup'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">⚠️ Confirm Attendance Data Reset</DialogTitle>
            <DialogDescription>
              This will permanently delete ALL attendance records for this event. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Enter the following verification code to confirm: <strong className="font-mono">{resetCode}</strong>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label htmlFor="resetCode">Verification Code</Label>
              <Input 
                id="resetCode" 
                placeholder="Enter the code above" 
                value={userEnteredCode}
                onChange={(e) => setUserEnteredCode(e.target.value)}
              />
            </div>
            
            {resetError && (
              <p className="text-sm text-red-500 mt-2">{resetError}</p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} disabled={resetting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReset} 
              disabled={resetting || userEnteredCode.length < 6}
            >
              {resetting ? 'Resetting...' : 'Reset Attendance Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Event Details Section */}
      {eventDetails && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {eventDetails.name}
            </CardTitle>
            <CardDescription>
              Event Details and Information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Dates:</span>
                  <span className="text-sm">
                    {new Date(eventDetails.startDate).toLocaleDateString()} - {new Date(eventDetails.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Zone:</span>
                  <span className="text-sm">{eventDetails.zoneName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={eventDetails.status === 'ACTIVE' ? 'default' : 'secondary'} 
                    className={eventDetails.status === 'ACTIVE' ? 'bg-green-500' : ''}
                  >
                    {eventDetails.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Sync Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Sync Approved Teams
            </CardTitle>
            <CardDescription>
              Synchronize approved teams with attendance tracking system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {syncNeeded ? (
              <button 
                onClick={handleShowDifferences}
                className="text-amber-600 flex items-center gap-1 hover:underline"
              >
                <Info size={16} />
                Synchronization needed to update attendance records
              </button>
            ) : (
              <p className="text-green-600">Attendance data is up to date</p>
            )}
            
            {syncing && (
              <div className="space-y-4 mt-4">
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                    style={{ width: `${syncProgress}%` }}
                  ></div>
                </div>
                
                {/* Progress Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Overall Progress</p>
                    <p className="text-gray-600">{Math.round(syncProgress)}%</p>
                  </div>
                  <div>
                    <p className="font-medium">Teams Processed</p>
                    <p className="text-gray-600">{processedTeams} / {totalTeams}</p>
                  </div>
                  <div>
                    <p className="font-medium">Current Chunk</p>
                    <p className="text-gray-600">{currentChunk} / {totalChunks}</p>
                  </div>
                  <div>
                    <p className="font-medium">Status</p>
                    <p className="text-gray-600">
                      {syncPaused ? 'Paused' : syncStopped ? 'Stopping...' : 'Processing'}
                    </p>
                  </div>
                </div>
                
                {/* Sync Metrics */}
                {(syncMetrics.newContingents + syncMetrics.updatedContingents + 
                  syncMetrics.newTeams + syncMetrics.updatedTeams + 
                  syncMetrics.newContestants + syncMetrics.updatedContestants + 
                  syncMetrics.newManagers + syncMetrics.updatedManagers) > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-medium text-sm mb-2">Processing Results</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>New Contingents: {syncMetrics.newContingents}</div>
                      <div>Updated Contingents: {syncMetrics.updatedContingents}</div>
                      <div>New Teams: {syncMetrics.newTeams}</div>
                      <div>Updated Teams: {syncMetrics.updatedTeams}</div>
                      <div>New Contestants: {syncMetrics.newContestants}</div>
                      <div>Updated Contestants: {syncMetrics.updatedContestants}</div>
                      <div>New Managers: {syncMetrics.newManagers}</div>
                      <div>Updated Managers: {syncMetrics.updatedManagers}</div>
                      {syncMetrics.errorCount > 0 && (
                        <div className="text-red-600 col-span-2">Errors: {syncMetrics.errorCount}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Error Details */}
                {syncMetrics.errors.length > 0 && (
                  <div className="bg-red-50 p-3 rounded-lg">
                    <p className="font-medium text-sm text-red-800 mb-2">Error Details</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {syncMetrics.errors.slice(0, 5).map((error, index) => (
                        <p key={index} className="text-xs text-red-700">{error}</p>
                      ))}
                      {syncMetrics.errors.length > 5 && (
                        <p className="text-xs text-red-600">... and {syncMetrics.errors.length - 5} more errors</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Control Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePauseSync}
                    disabled={syncStopped}
                    className="flex-1"
                  >
                    {syncPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleStopSync}
                    disabled={syncStopped}
                    className="flex-1"
                  >
                    Stop
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              onClick={handleSync} 
              disabled={syncing || resetting}
              className="w-full"
            >
              {syncing ? 'Syncing...' : 'Synchronize Now'}
            </Button>
            <Button 
              onClick={handleOpenContingentSync}
              disabled={syncing || resetting}
              variant="outline"
              className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
              Sync by Contingent
            </Button>
            <Button 
              onClick={() => setCleanupDialogOpen(true)}
              disabled={syncing || resetting || cleaning}
              variant="outline"
              className="w-full bg-orange-50 text-orange-700 hover:bg-orange-100"
            >
              {cleaning ? 'Cleaning...' : 'Cleanup Outdated Records'}
            </Button>
            <Button 
              onClick={openResetDialog}
              disabled={syncing || resetting}
              variant="destructive"
              className="w-full"
            >
              Reset Attendance Data
            </Button>
          </CardFooter>
        </Card>
        
        {/* QR Code Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clipboard className="h-5 w-5" />
              QR Code Check-in
            </CardTitle>
            <CardDescription>
              Use QR code scanner to check in contingents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Scan QR codes to quickly mark attendance for entire contingents</p>
          </CardContent>
          <CardFooter>
            <Link href={`/organizer/events/${eventId}/attendance/log/byqrcode`} className="w-full">
              <Button className="w-full">
                Open QR Scanner
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Manual Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clipboard className="h-5 w-5" />
              Manual Check-in
            </CardTitle>
            <CardDescription>
              Manually record attendance for contingents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>View and update attendance records manually from a list</p>
          </CardContent>
          <CardFooter>
            <Link href={`/organizer/events/${eventId}/attendance/log/bymanual`} className="w-full">
              <Button className="w-full">
                Open Manual Entry
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Attendance Dashboard
            </CardTitle>
            <CardDescription>
              View attendance statistics and reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Monitor attendance rates and analyze participation patterns</p>
          </CardContent>
          <CardFooter>
            <Link href={`/organizer/events/${eventId}/attendance/dashboard`} className="w-full">
              <Button className="w-full">
                View Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Sections Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Event Sections
            </CardTitle>
            <CardDescription>
              Manage competition sections and locations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Create and manage sections, assign PICs for different competition areas</p>
          </CardContent>
          <CardFooter>
            <Link href={`/organizer/events/${eventId}/attendance/sections`} className="w-full">
              <Button className="w-full">
                Manage Sections
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Email Blasting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Blasting
            </CardTitle>
            <CardDescription>
              Send mass communications to participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Compose and send emails to contestants, teams, and contingents</p>
          </CardContent>
          <CardFooter>
            <Link href={`/organizer/events/${eventId}/email`} className="w-full">
              <Button className="w-full">
                Go to Email Center
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Reports & Prints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Reports & Prints
            </CardTitle>
            <CardDescription>
              Generate documentation and reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Create attendance reports, certificates, and other printable documents</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Link href={`/organizer/events/${eventId}/reports`} className="w-full">
              <Button className="w-full">
                View Reports
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center gap-2 bg-green-500 text-white hover:bg-green-600"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/organizer/events/${eventId}/attendance/download`);
                  if (!response.ok) {
                    throw new Error('Failed to download attendance list');
                  }
                  
                  // Get the filename from the Content-Disposition header if available
                  const contentDisposition = response.headers.get('Content-Disposition');
                  let filename = `attendance-list-event-${eventId}.xlsx`;
                  if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename=\"(.+)\"/i);
                    if (filenameMatch && filenameMatch[1]) {
                      filename = filenameMatch[1];
                    }
                  }
                  
                  // Convert the response to a blob
                  const blob = await response.blob();
                  
                  // Create a URL for the blob and trigger download
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', filename);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  
                  // Clean up the URL object
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error downloading attendance list:', error);
                  toast({
                    title: 'Error',
                    description: 'Failed to download attendance list',
                    variant: 'destructive',
                  });
                }
              }}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download List
            </Button>
          </CardFooter>
        </Card>

        {/* Judging */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Judging
            </CardTitle>
            <CardDescription>
              Manage contest judging and scoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Record contest scores and manage judging assignments</p>
          </CardContent>
          <CardFooter>
            <Link href={`/organizer/events/${eventId}/judging`} className="w-full">
              <Button className="w-full">
                Go to Judging
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Scorecard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Scorecard
            </CardTitle>
            <CardDescription>
              View contestant and team scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Access detailed scoring information and contest results</p>
          </CardContent>
          <CardFooter>
            <Link href={`/organizer/events/${eventId}/scorecard`} className="w-full">
              <Button className="w-full">
                View Scorecard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

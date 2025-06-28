'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import ParticipationStateChart from "./participation-state-chart";
import { Loader2, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ParticipationStateData = {
  state: string;
  MALE: number;
  FEMALE: number;
};

type ProcessingStats = {
  totalCount: number;
  chunkSize: number;
  totalChunks: number;
  processedChunks: number;
  processedRecords: number;
  currentChunk: number;
  isProcessing: boolean;
  isPaused: boolean;
  startTime?: Date;
  estimatedTimeRemaining?: number;
};

export default function ParticipationStateSection() {
  const [data, setData] = useState<ParticipationStateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null);
  const useChunkedProcessing = true; // Always use chunked processing
  
  // Aggregate chunk data into final state totals
  const aggregateChunkData = (chunks: { state: string; MALE: number; FEMALE: number; }[][]) => {
    const stateMap = new Map<string, { MALE: number; FEMALE: number }>();
    
    chunks.flat().forEach(item => {
      if (!stateMap.has(item.state)) {
        stateMap.set(item.state, { MALE: 0, FEMALE: 0 });
      }
      const existing = stateMap.get(item.state)!;
      existing.MALE += item.MALE;
      existing.FEMALE += item.FEMALE;
    });
    
    return Array.from(stateMap.entries()).map(([state, counts]) => ({
      state,
      MALE: counts.MALE,
      FEMALE: counts.FEMALE
    }));
  };
  
  // Chunked processing function
  const processDataInChunks = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Get total count first
      console.log('Getting total count for chunked processing...');
      const countResponse = await fetch('/api/dashboard/participation-states-chunked?action=count', {
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!countResponse.ok) {
        throw new Error(`Failed to get count: ${countResponse.statusText}`);
      }
      
      const countData = await countResponse.json();
      console.log('Total count data:', countData);
      
      const stats: ProcessingStats = {
        totalCount: countData.totalCount,
        chunkSize: countData.chunkSize,
        totalChunks: countData.totalChunks,
        processedChunks: 0,
        processedRecords: 0,
        currentChunk: 0,
        isProcessing: true,
        isPaused: false,
        startTime: new Date()
      };
      
      setProcessingStats(stats);
      
      const allChunkData: { state: string; MALE: number; FEMALE: number; }[][] = [];
      
      // Process chunks sequentially
      for (let chunk = 0; chunk < countData.totalChunks; chunk++) {
        // Check if processing is paused
        while (processingStats?.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const offset = chunk * countData.chunkSize;
        
        console.log(`Processing chunk ${chunk + 1}/${countData.totalChunks} (offset: ${offset})`);
        
        const chunkResponse = await fetch(`/api/dashboard/participation-states-chunked?action=chunk&offset=${offset}`, {
          credentials: 'include',
          cache: 'no-store'
        });
        
        if (!chunkResponse.ok) {
          throw new Error(`Failed to process chunk ${chunk + 1}: ${chunkResponse.statusText}`);
        }
        
        const chunkResult = await chunkResponse.json();
        allChunkData.push(chunkResult.chunkData);
        
        // Update processing stats
        const newProcessedRecords = stats.processedRecords + chunkResult.processed;
        const elapsedTime = Date.now() - stats.startTime!.getTime();
        const recordsPerMs = newProcessedRecords / elapsedTime;
        const remainingRecords = stats.totalCount - newProcessedRecords;
        const estimatedTimeRemaining = remainingRecords / recordsPerMs;
        
        const updatedStats = {
          ...stats,
          processedChunks: chunk + 1,
          processedRecords: newProcessedRecords,
          currentChunk: chunk + 1,
          estimatedTimeRemaining: estimatedTimeRemaining
        };
        
        setProcessingStats(updatedStats);
        
        // Update data with current progress
        const aggregatedData = aggregateChunkData(allChunkData);
        setData(aggregatedData);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Final aggregation
      const finalData = aggregateChunkData(allChunkData);
      setData(finalData);
      
      setProcessingStats(prev => prev ? { ...prev, isProcessing: false } : null);
      
      console.log('Chunked processing completed successfully');
      
    } catch (err) {
      console.error('Error in chunked processing:', err);
      setError(err instanceof Error ? err.message : 'Unknown error in chunked processing');
      setProcessingStats(prev => prev ? { ...prev, isProcessing: false } : null);
    } finally {
      setLoading(false);
    }
  };
  
  // Standard processing function (original method)
  const processDataStandard = async () => {
    try {
      console.log('Fetching participation state data...');
      const response = await fetch('/api/dashboard/participation-states', {
        credentials: 'include',
        cache: 'no-store'
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
        console.warn('Received empty or invalid data format', result);
        setError('No participation data available');
      }
    } catch (err) {
      console.error('Error fetching participation state data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    processDataInChunks();
  }, []);
  
  const togglePause = () => {
    setProcessingStats(prev => prev ? { ...prev, isPaused: !prev.isPaused } : null);
  };
  
  const resetProcessing = () => {
    setProcessingStats(null);
    setData([]);
    setError(null);
    setLoading(false);
  };
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-none">
        <div className="flex justify-between items-center">
          <CardTitle>Participations by State</CardTitle>
          {processingStats?.isProcessing && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePause}
              >
                {processingStats.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetProcessing}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {/* Main Content */}
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Processing data in chunks...
              </p>
              
              {/* Centered Progress Indicator - Only show when processing */}
              {processingStats && processingStats.isProcessing && (
                <div className="mt-6 max-w-md mx-auto">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {processingStats.isPaused ? '(Paused)' : '(Processing...)'}
                    </span>
                  </div>
                  
                  <Progress 
                    value={(processingStats.processedRecords / processingStats.totalCount) * 100} 
                    className="mb-3"
                  />
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-muted-foreground">Records</div>
                      <div className="font-medium">
                        {processingStats.processedRecords.toLocaleString()} / {processingStats.totalCount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Chunks</div>
                      <div className="font-medium">
                        {processingStats.processedChunks} / {processingStats.totalChunks}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Chunk Size</div>
                      <div className="font-medium">{processingStats.chunkSize.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">ETA</div>
                      <div className="font-medium">
                        {processingStats.estimatedTimeRemaining && processingStats.isProcessing
                          ? formatTime(processingStats.estimatedTimeRemaining)
                          : 'Calculating...'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-full text-destructive">
            <div className="text-center">
              <p className="font-medium mb-2">Error: {error}</p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  processDataInChunks();
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <ParticipationStateChart data={data} />
            {data.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground text-center">
                Showing {data.length} states with participation data
                {processingStats && (
                  <span className="ml-2">
                    (Processed {processingStats.processedRecords.toLocaleString()} records)
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

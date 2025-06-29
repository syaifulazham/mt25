"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { Award, Loader2, Play, Pause } from "lucide-react";

interface BulkAssignContestsButtonProps {
  contingentId: number;
  contingentName: string;
  contestantCount: number;
}

interface ProcessingState {
  isRunning: boolean;
  isPaused: boolean;
  currentChunk: number;
  totalChunks: number;
  processedCount: number;
  totalCount: number;
  totalAssignments: number;
  errors: any[];
}

export default function BulkAssignContestsButton({ 
  contingentId, 
  contingentName, 
  contestantCount 
}: BulkAssignContestsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({
    isRunning: false,
    isPaused: false,
    currentChunk: 0,
    totalChunks: 0,
    processedCount: 0,
    totalCount: 0,
    totalAssignments: 0,
    errors: []
  });
  const [isComplete, setIsComplete] = useState(false);
  const pauseRef = useRef(false);

  const CHUNK_SIZE = 50;

  const handleBulkAssign = async () => {
    // Convert BigInt to Number for arithmetic operations
    const contestantCountNumber = Number(contestantCount);
    console.log("handleBulkAssign called", { contingentId, contestantCount: contestantCountNumber });
    try {
      const totalChunks = Math.ceil(contestantCountNumber / CHUNK_SIZE);
      
      setProcessing({
        isRunning: true,
        isPaused: false,
        currentChunk: 0,
        totalChunks,
        processedCount: 0,
        totalCount: contestantCountNumber,
        totalAssignments: 0,
        errors: []
      });
      setIsComplete(false);
      
      let totalAssignments = 0;
      let allErrors: any[] = [];
      
      // Process chunks sequentially
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        // Check if paused using ref to avoid stale closure
        while (pauseRef.current) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Update current chunk being processed
        setProcessing(prev => ({
          ...prev,
          currentChunk: chunkIndex + 1
        }));
        
        try {
          const response = await fetch("/api/organizer/contests/assign-by-contingent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              contingentId, 
              chunkSize: CHUNK_SIZE, 
              chunkIndex 
            }),
          });
          
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.error || "Failed to assign contests");
          }
          
          // Update progress
          totalAssignments += data.assignmentsCreated || 0;
          if (data.errors) {
            allErrors.push(...data.errors);
          }
          
          setProcessing(prev => ({
            ...prev,
            processedCount: data.processedCount || prev.processedCount,
            totalAssignments,
            errors: allErrors
          }));
          
          // If this was the last chunk, mark as complete
          if (data.isComplete) {
            setIsComplete(true);
            break;
          }
          
          // Small delay between chunks to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (chunkError) {
          console.error(`Error processing chunk ${chunkIndex + 1}:`, chunkError);
          allErrors.push({
            chunk: chunkIndex + 1,
            error: (chunkError as Error).message
          });
        }
      }
      
      // Final update
      setProcessing(prev => ({
        ...prev,
        isRunning: false,
        totalAssignments,
        errors: allErrors
      }));
      
      // Show completion toast
      toast({
        title: "Processing Complete!",
        description: `Successfully created ${totalAssignments} contest assignments for ${contingentName}`,
        variant: "default",
      });
      
    } catch (error) {
      console.error("Error in bulk assignment:", error);
      setProcessing(prev => ({
        ...prev,
        isRunning: false
      }));
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to assign contests",
        variant: "destructive",
      });
    }
  };

  const handlePauseResume = () => {
    setProcessing(prev => {
      const newPausedState = !prev.isPaused;
      pauseRef.current = newPausedState;
      return {
        ...prev,
        isPaused: newPausedState
      };
    });
  };

  const handleStop = () => {
    pauseRef.current = false;
    setProcessing(prev => ({
      ...prev,
      isRunning: false,
      isPaused: false
    }));
  };

  const progressPercentage = processing.totalCount > 0 
    ? Math.round((processing.processedCount / processing.totalCount) * 100) 
    : 0;

  return (
    <>
      <Button 
        variant="outline"
        size="icon"
        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-9 w-9"
        onClick={() => setIsOpen(true)}
      >
        <Award className="h-4 w-4" />
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Assign Contests</DialogTitle>
            <DialogDescription>
              Process {contestantCount} contestants in chunks of {CHUNK_SIZE} to assign eligible contests based on age criteria.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {!processing.isRunning && !isComplete && (
              <>
                <p className="text-sm text-muted-foreground mb-2">
                  This process will:
                </p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  <li>Process contestants in batches of {CHUNK_SIZE}</li>
                  <li>Match each contestant with eligible contests based on age</li>
                  <li>Create contest participation records</li>
                  <li>Skip contestants already registered for contests</li>
                </ul>
              </>
            )}
            
            {(processing.isRunning || isComplete) && (
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="w-full" />
                </div>
                
                {/* Status Information */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm">Total Contestants:</span>
                      <span className="font-medium">{Number(contestantCount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processed:</span>
                      <span className="font-medium">{processing.processedCount.toLocaleString()} / {processing.totalCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Chunk:</span>
                      <span className="font-medium">{processing.currentChunk} / {processing.totalChunks}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assignments:</span>
                      <span className="font-medium text-green-600">{processing.totalAssignments.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Errors:</span>
                      <span className={`font-medium ${processing.errors.length > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {processing.errors.length}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Status Message */}
                <div className="p-3 rounded-md bg-blue-50">
                  <div className="flex items-center">
                    {processing.isRunning && !processing.isPaused && (
                      <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-600" />
                    )}
                    {processing.isPaused && (
                      <Pause className="h-4 w-4 mr-2 text-amber-600" />
                    )}
                    {isComplete && (
                      <Award className="h-4 w-4 mr-2 text-green-600" />
                    )}
                    <p className="text-sm">
                      {processing.isPaused && "Process paused - click Resume to continue"}
                      {processing.isRunning && !processing.isPaused && `Processing chunk ${processing.currentChunk} of ${processing.totalChunks}...`}
                      {isComplete && "Processing completed successfully!"}
                    </p>
                  </div>
                </div>
                
                {/* Error Details */}
                {processing.errors.length > 0 && (
                  <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      {processing.errors.length} errors encountered:
                    </p>
                    <div className="max-h-20 overflow-y-auto text-xs text-amber-700">
                      {processing.errors.slice(0, 3).map((error, index) => (
                        <div key={index} className="mb-1">
                          {error.chunk ? `Chunk ${error.chunk}: ` : ''}{error.error || 'Unknown error'}
                        </div>
                      ))}
                      {processing.errors.length > 3 && (
                        <div className="text-amber-600">...and {processing.errors.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={processing.isRunning && !processing.isPaused}
            >
              {isComplete ? 'Close' : 'Cancel'}
            </Button>
            
            <div className="flex gap-2">
              {processing.isRunning && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePauseResume}
                    className="flex items-center gap-1"
                  >
                    {processing.isPaused ? (
                      <><Play className="h-3 w-3" /> Resume</>
                    ) : (
                      <><Pause className="h-3 w-3" /> Pause</>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStop}
                  >
                    Stop
                  </Button>
                </>
              )}
              
              {!processing.isRunning && !isComplete && (
                <Button
                  onClick={() => {
                    console.log("Start Processing button clicked");
                    handleBulkAssign();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Start Processing
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

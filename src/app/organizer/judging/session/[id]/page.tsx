"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, CheckCircle, AlertTriangle, Clock, X, Play, Square, Timer, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

// Types for discrete values
interface DiscreteValue {
  text: string;
  value: number;
}

// Types for judging session
interface JudgingSessionScore {
  id: number;
  judgingSessionId: number;
  criterionId: number;
  score: number | null;
  comments: string | null;
  criterionName: string;
  criterionDescription: string;
  criterionWeight: number;
  criterionType: string; // 'POINTS', 'DISCRETE', 'DISCRETE_SINGLE', 'DISCRETE_MULTIPLE', 'TIME'
  maxScore: number;
  discreteValues?: string; // JSON string of string[] or DiscreteValue[]
  selectedDiscreteText?: string;
  selectedDiscreteTexts?: string[]; // For DISCRETE_MULTIPLE
  startTime?: string;
  endTime?: string;
  totalTime?: number;
}

interface JudgingSession {
  id: number;
  judgeId: number;
  attendanceTeamId: number;
  eventContestId: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startTime: Date;
  endTime: Date | null;
  totalScore: number | null;
  comments: string | null;
  judgingSessionScores: JudgingSessionScore[];
}

interface Team {
  id: number;
  name?: string;
  teamName?: string;
}

interface Contingent {
  id: number;
  name: string;
}

interface EventContest {
  id: number;
  eventId: number;
  contestId: number;
  contest: {
    id: number;
    name: string;
  }
}

export default function JudgingSessionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [judgingSession, setJudgingSession] = useState<JudgingSession | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [contingent, setContingent] = useState<Contingent | null>(null);
  const [eventContest, setEventContest] = useState<EventContest | null>(null);
  const [scores, setScores] = useState<JudgingSessionScore[]>([]);
  const [comments, setComments] = useState("");

  // Calculate total weight of criteria - with safety check
  const totalWeight = scores && scores.length > 0 ? 
    scores.reduce((acc, score) => acc + score.criterionWeight, 0) : 0;
  
  // Calculate current total score as sum of all criterion scores (reactive to scores state)
  const currentTotalScore = useMemo(() => {
    if (!scores || scores.length === 0) return 0;
    return scores.reduce((acc, score) => {
      const scoreValue = typeof score.score === 'number' ? score.score : 0;
      return acc + scoreValue;
    }, 0);
  }, [scores]);
  
  // Calculate weighted score for backend submission (reactive to scores state)
  const currentWeightedScore = useMemo(() => {
    if (!scores || scores.length === 0) return 0;
    return scores.reduce((acc, score) => {
      const scoreValue = typeof score.score === 'number' ? score.score : 0;
      const weightedScore = (score.criterionWeight / 100) * scoreValue;
      return acc + weightedScore;
    }, 0);
  }, [scores]);
  
  // Check if all criteria are answered (not weight-based) - with safety check
  const allCriteriaScored = scores && scores.length > 0 ? 
    scores.every(score => {
      let isAnswered = false;
      if (score.criterionType === 'POINTS') {
        isAnswered = score.score !== null && score.score !== undefined && parseFloat(String(score.score)) > 0;
      } else if (score.criterionType === 'TIME') {
        isAnswered = Boolean(score.startTime) && Boolean(score.endTime);
      } else if (score.criterionType === 'DISCRETE' || score.criterionType === 'DISCRETE_SINGLE' || score.criterionType === 'DISCRETE_MULTIPLE') {
        isAnswered = Boolean(score.selectedDiscreteTexts && score.selectedDiscreteTexts.length > 0) || 
                   Boolean(score.selectedDiscreteText && score.selectedDiscreteText !== null && score.selectedDiscreteText !== '');
      }
      return isAnswered;
    }) : false;

  // Fetch judging session data
  useEffect(() => {
    const fetchJudgingSession = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/judging/sessions/${params.id}`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch judging session');
        }
        
        const data = await res.json();
        setJudgingSession(data.judgingSession);
        setTeam(data.team);
        setContingent(data.contingent);
        setEventContest(data.eventContest);
        
        // Process scores to ensure proper data types and reconstruct discrete selections
        const processedScores = (data.judgingSession.judgingSessionScore || []).map((score: any) => {
          // Convert string score to number
          const numericScore = typeof score.score === 'string' ? parseFloat(score.score) : score.score;
          
          const processedScore = {
            ...score,
            score: numericScore,
            selectedDiscreteTexts: [] // Initialize empty array
          };
          
          console.log(`Processing ${score.criterionName} (${score.criterionType}): score=${score.score} -> ${numericScore}`);
          
          // Handle discrete criteria reconstruction
          if (score.criterionType === 'DISCRETE_SINGLE' || score.criterionType === 'DISCRETE_MULTIPLE' || score.criterionType === 'DISCRETE') {
            // Parse discrete values to get the options
            let discreteOptions: any[] = [];
            try {
              if (score.discreteValues) {
                let parsed = JSON.parse(score.discreteValues as string);
                if (typeof parsed === 'string') {
                  parsed = JSON.parse(parsed);
                }
                if (Array.isArray(parsed)) {
                  discreteOptions = parsed;
                }
              }
            } catch (e) {
              console.error('Failed to parse discreteValues:', e);
              // Fallback to legacy format
              if (score.criterionDescription) {
                discreteOptions = score.criterionDescription.split(',').map((t: string, i: number) => ({ text: t.trim(), value: i }));
              }
            }
            
            console.log(`Discrete options for ${score.criterionName}:`, discreteOptions);
            
            // If we have selectedDiscreteText with indices, reconstruct the selections
            if (score.selectedDiscreteText) {
              try {
                const selectedIndices = JSON.parse(score.selectedDiscreteText);
                if (Array.isArray(selectedIndices)) {
                  const selectedTexts = selectedIndices
                    .filter((idx: number) => idx >= 0 && idx < discreteOptions.length)
                    .map((idx: number) => discreteOptions[idx]?.text)
                    .filter((text: string) => text !== undefined);
                  processedScore.selectedDiscreteTexts = selectedTexts;
                  console.log(`Reconstructed selections from indices:`, selectedTexts);
                }
              } catch (e) {
                console.error('Failed to parse selectedDiscreteText indices:', e);
                // Handle legacy format where selectedDiscreteText contains text
                if (score.criterionType === 'DISCRETE_MULTIPLE') {
                  const texts = score.selectedDiscreteText.split(', ').filter((t: string) => t.trim());
                  processedScore.selectedDiscreteTexts = texts;
                } else {
                  processedScore.selectedDiscreteTexts = [score.selectedDiscreteText];
                }
              }
            } else {
              // If no selectedDiscreteText, try to reverse-engineer from score and discreteOptions
              console.log(`No selectedDiscreteText, reverse-engineering from score ${numericScore}`);
              if (discreteOptions.length > 0 && numericScore > 0) {
                if (score.criterionType === 'DISCRETE_SINGLE') {
                  // Find the option that matches the score
                  const matchingOption = discreteOptions.find(opt => opt.value === numericScore);
                  if (matchingOption) {
                    processedScore.selectedDiscreteTexts = [matchingOption.text];
                    console.log(`Found matching option for DISCRETE_SINGLE:`, matchingOption.text);
                  }
                } else if (score.criterionType === 'DISCRETE_MULTIPLE') {
                  // For multiple selection, find all options that sum to the score
                  // This is complex, so let's try a simpler approach: find options with value 1 that sum to the score
                  const selectedOptions = discreteOptions.filter(opt => opt.value === 1).slice(0, numericScore);
                  if (selectedOptions.length > 0) {
                    processedScore.selectedDiscreteTexts = selectedOptions.map(opt => opt.text);
                    console.log(`Reverse-engineered DISCRETE_MULTIPLE selections:`, selectedOptions.map(opt => opt.text));
                  }
                }
              }
            }
          }
          
          return processedScore;
        });
        
        setScores(processedScores);
        setComments(data.judgingSession.comments || "");
        setLoading(false);
      } catch (error) {
        console.error('Error fetching judging session:', error);
        toast.error('Failed to load judging session');
        setLoading(false);
      }
    };
    
    fetchJudgingSession();
  }, [params.id]);
  
  // Format time in HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };
  
  // Calculate total time in seconds between two dates
  const calculateTotalTime = (start: Date, end: Date): number => {
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  };
  
  // Handle score change for POINTS type
  const handleScoreChange = (index: number, newScore: number[]) => {
    const updatedScores = [...scores];
    updatedScores[index].score = newScore[0];
    setScores(updatedScores);
  };
  
  // Handle discrete option selection
  const handleDiscreteSelection = (index: number, text: string, value?: number) => {
    const updatedScores = [...scores];
    const criterionType = updatedScores[index].criterionType;
    
    // Parse discrete values to get the array of options
    let discreteOptions: any[] = [];
    try {
      let parsed = JSON.parse(updatedScores[index].discreteValues as string);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      if (Array.isArray(parsed)) {
        discreteOptions = parsed;
      }
    } catch (e) {
      console.error('Failed to parse discreteValues:', e);
      // Fallback to legacy format
      if (updatedScores[index].criterionDescription) {
        discreteOptions = updatedScores[index].criterionDescription.split(',').map((t, i) => ({ text: t.trim(), value: i }));
      }
    }
    
    // Find the index of the selected option
    const optionIndex = discreteOptions.findIndex(opt => opt.text === text);
    if (optionIndex === -1) {
      console.error('Selected option not found in discrete values');
      return;
    }
    
    if (criterionType === 'DISCRETE_SINGLE' || criterionType === 'DISCRETE') {
      // Single selection behavior - store as array with single index
      const selectedIndices = [optionIndex];
      updatedScores[index].selectedDiscreteText = JSON.stringify(selectedIndices); // Store as "[0]"
      updatedScores[index].selectedDiscreteTexts = [text]; // Keep array in sync for UI
      
      // Set the score value
      if (typeof value === 'number') {
        updatedScores[index].score = value;
      } else if (discreteOptions[optionIndex]?.value !== undefined) {
        updatedScores[index].score = discreteOptions[optionIndex].value;
      } else {
        // Legacy format: calculate score based on position
        updatedScores[index].score = calculateLegacyScore(updatedScores[index], text);
      }
    } else if (criterionType === 'DISCRETE_MULTIPLE') {
      // Multiple selection behavior
      const currentSelections = updatedScores[index].selectedDiscreteTexts || [];
      let currentIndices: number[] = [];
      
      // Parse current selected indices from selectedDiscreteText
      try {
        if (updatedScores[index].selectedDiscreteText) {
          currentIndices = JSON.parse(updatedScores[index].selectedDiscreteText);
        }
      } catch (e) {
        console.error('Failed to parse current selectedDiscreteText:', e);
        currentIndices = [];
      }
      
      let newSelections: string[];
      let newIndices: number[];
      
      if (currentSelections.includes(text)) {
        // Deselect if already selected
        newSelections = currentSelections.filter(t => t !== text);
        newIndices = currentIndices.filter(i => i !== optionIndex);
      } else {
        // Add to selections
        newSelections = [...currentSelections, text];
        newIndices = [...currentIndices, optionIndex];
      }
      
      updatedScores[index].selectedDiscreteTexts = newSelections;
      updatedScores[index].selectedDiscreteText = JSON.stringify(newIndices); // Store as "[0, 3, 4]"
      
      // Calculate total score as sum of selected values
      let totalScore = 0;
      if (discreteOptions.length > 0) {
        totalScore = newIndices.reduce((sum, idx) => {
          const option = discreteOptions[idx];
          return sum + (option?.value || 0);
        }, 0);
      } else {
        // Legacy format: sum of position-based scores
        totalScore = newSelections.reduce((sum, selectedText) => {
          return sum + calculateLegacyScore(updatedScores[index], selectedText);
        }, 0);
      }
      
      updatedScores[index].score = totalScore;
    }
    
    setScores(updatedScores);
    setUnsavedChanges(true);
  };
  
  // Helper function for legacy score calculation
  const calculateLegacyScore = (scoreItem: any, text: string): number => {
    let discreteValues: string[] = [];
    
    if (scoreItem.discreteValues) {
      try {
        const parsed = JSON.parse(scoreItem.discreteValues as string);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'string') {
            discreteValues = parsed;
          }
        }
      } catch (e) {
        console.error('Failed to parse discreteValues:', e);
      }
    }
    
    if (discreteValues.length === 0 && scoreItem.criterionDescription) {
      discreteValues = scoreItem.criterionDescription.split(',').map((v: string) => v.trim());
    }
    
    const position = discreteValues.indexOf(text);
    return position >= 0 
      ? (scoreItem.maxScore / (discreteValues.length - 1)) * position 
      : 0;
  };
  
  // Handle unsaved changes state
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Handle time control
  const handleStartTimer = (index: number) => {
    const updatedScores = [...scores];
    // Store as ISO string for compatibility with the string type
    updatedScores[index].startTime = new Date().toISOString();
    updatedScores[index].endTime = undefined;
    updatedScores[index].totalTime = 0;
    setScores(updatedScores);
    setUnsavedChanges(true);
  };
  
  const handleEndTimer = (index: number) => {
    const updatedScores = [...scores];
    const now = new Date();
    
    if (updatedScores[index].startTime) {
      updatedScores[index].endTime = now.toISOString();
      const startTime = new Date(updatedScores[index].startTime);
      const totalSeconds = calculateTotalTime(startTime, now);
      updatedScores[index].totalTime = totalSeconds;
      
      // Calculate score inversely proportional to time (faster = higher score)
      // Assuming a maximum time of 10 minutes (600 seconds) for a score of 0
      // and a minimum time of 0 seconds for a score of maxScore
      const maxTime = 600; // 10 minutes in seconds
      const timeScore = Math.max(0, Math.min(updatedScores[index].maxScore, 
        updatedScores[index].maxScore * (1 - totalSeconds / maxTime)));
      
      updatedScores[index].score = timeScore;
      setScores(updatedScores);
    }
  };
  
  const handleResetTimer = (index: number) => {
    const updatedScores = [...scores];
    updatedScores[index].startTime = undefined;
    updatedScores[index].endTime = undefined;
    updatedScores[index].totalTime = 0;
    updatedScores[index].score = 0;
    setScores(updatedScores);
    setUnsavedChanges(true);
  };
  
  // Handle score comment change
  const handleScoreCommentChange = (index: number, comment: string) => {
    const updatedScores = [...scores];
    updatedScores[index].comments = comment;
    setScores(updatedScores);
  };
  
  // Save scores
  const handleSaveScores = async () => {
    try {
      setSaving(true);
      
      // Format scores for the API
      const scoreUpdates = scores.map(score => {
        // Base score data
        const update: any = {
          scoreId: score.id,
          score: score.score,
          comments: score.comments
        };
        
        // Add specific fields based on criterion type
        if (score.criterionType === 'DISCRETE' || score.criterionType === 'DISCRETE_SINGLE' || score.criterionType === 'DISCRETE_MULTIPLE') {
          update.selectedDiscreteText = score.selectedDiscreteText;
          console.log(`Saving ${score.criterionName} (${score.criterionType}): selectedDiscreteText=${score.selectedDiscreteText}`);
        }
        
        if (score.criterionType === 'TIME') {
          update.startTime = score.startTime;
          update.endTime = score.endTime;
          update.totalTime = score.totalTime;
        }
        
        return update;
      });
      
      // Call the batch update API
      const res = await fetch('/api/judging/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scores: scoreUpdates
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save scores');
      }
      
      // Also update the session comments
      if (judgingSession) {
        await fetch(`/api/judging/sessions/${judgingSession.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comments: comments
          }),
        });
      }
      
      toast.success('Scores saved successfully');
      setSaving(false);
    } catch (error) {
      console.error('Error saving scores:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save scores');
      setSaving(false);
    }
  };
  
  // Complete judging session
  const handleCompleteJudging = async () => {
    try {
      setCompleting(true);
      
      if (!allCriteriaScored) {
        toast.error('All criteria must be scored before completing the judging');
        setCompleting(false);
        return;
      }
      
      if (!judgingSession) {
        toast.error('No active judging session');
        setCompleting(false);
        return;
      }
      
      // First save all scores
      await handleSaveScores();
      
      // Then complete the session
      const res = await fetch(`/api/judging/sessions/${judgingSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          comments: comments,
          totalScore: currentTotalScore
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to complete judging session');
      }
      
      toast.success('Judging completed successfully');
      setCompleting(false);
      setShowCompleteConfirm(false);
      
      // Navigate back to teams list
      if (eventContest) {
        setTimeout(() => {
          router.push(`/organizer/events/${eventContest.eventId}/judging/${eventContest.contestId}/teams`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error completing judging session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete judging session');
      setCompleting(false);
      setShowCompleteConfirm(false);
    }
  };

  // Revert judging session from COMPLETED to IN_PROGRESS
  const handleRevertToInProgress = async () => {
    try {
      setReverting(true);
      
      if (!judgingSession) {
        toast.error('No active judging session');
        setReverting(false);
        return;
      }
      
      if (judgingSession.status !== 'COMPLETED') {
        toast.error('Can only revert completed judging sessions');
        setReverting(false);
        return;
      }
      
      // Revert the session status to IN_PROGRESS
      const res = await fetch(`/api/judging/sessions/${judgingSession.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'IN_PROGRESS'
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to revert judging session');
      }
      
      // Update local state
      setJudgingSession(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
      
      toast.success('Judging session reverted to In Progress');
      setReverting(false);
    } catch (error) {
      console.error('Error reverting judging session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to revert judging session');
      setReverting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Loading..." description="Loading judging session" />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  if (!judgingSession || !team || !eventContest) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Error" description="Judging session not found" />
        <Card>
          <CardContent className="pt-6">
            <p>The specified judging session was not found.</p>
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/organizer/judging')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Judging Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Judge Team" 
        description={`Scoring ${team.name} from ${contingent?.name || 'Unknown Contingent'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/organizer/events/${eventContest.eventId}/judging/${eventContest.contestId}/teams`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Teams
            </Button>
          </div>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team & Contest Info */}
        <Card>
          <CardHeader>
            <CardTitle>Session Info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Team</dt>
                <dd className="text-base">{team.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contingent</dt>
                <dd className="text-base">{contingent?.name || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contest</dt>
                <dd className="text-base">{eventContest.contest.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd>
                  <Badge 
                    className={
                      judgingSession.status === "COMPLETED" ? "bg-blue-100 text-blue-800" :
                      "bg-green-100 text-green-800"
                    }
                  >
                    {judgingSession.status === "COMPLETED" ? "Completed" : "In Progress"}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        
        {/* Current Score */}
        <Card>
          <CardHeader>
            <CardTitle>Current Score</CardTitle>
            <CardDescription>
              Total sum of all criterion scores
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-5xl font-bold">
                {currentTotalScore.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                out of {scores && scores.length > 0 ? scores.reduce((acc, score) => acc + score.maxScore, 0).toFixed(2) : '0.00'} maximum
              </div>
              <div className="mt-6">
                {allCriteriaScored ? (
                  <div className="flex items-center justify-center text-green-600 gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>All criteria scored</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-amber-600 gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Some criteria not scored</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Save your progress or complete judging
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <Button 
              onClick={handleSaveScores}
              disabled={saving || judgingSession.status === 'COMPLETED'} 
              className="w-full gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Scores
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => setShowCompleteConfirm(true)}
              disabled={completing || !allCriteriaScored || judgingSession.status === 'COMPLETED'}
              className="w-full gap-2"
              variant={judgingSession.status === 'COMPLETED' ? 'outline' : 'default'}
            >
              {completing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Completing...
                </>
              ) : judgingSession.status === 'COMPLETED' ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Judging Completed
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Complete Judging
                </>
              )}
            </Button>
            
            {/* Revert to In Progress Button - only show when COMPLETED */}
            {judgingSession.status === 'COMPLETED' && (
              <Button 
                onClick={handleRevertToInProgress}
                disabled={reverting}
                className="w-full gap-2"
                variant="outline"
              >
                {reverting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600"></div>
                    Reverting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Revert to In Progress
                  </>
                )}
              </Button>
            )}
            
            {!allCriteriaScored && judgingSession.status !== 'COMPLETED' && (
              <p className="text-sm text-amber-600">
                All criteria must be scored before completing the judging.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* General Comments */}
      <Card>
        <CardHeader>
          <CardTitle>General Comments</CardTitle>
          <CardDescription>
            Provide overall feedback about the team's performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Enter your overall comments here..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            disabled={judgingSession.status === 'COMPLETED'}
            rows={4}
          />
        </CardContent>
      </Card>
      
      {/* Criteria Scoring */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Criteria</CardTitle>
          <CardDescription>
            Score each criterion on a scale of 0-10
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {scores && scores.length > 0 ? scores.map((score, index) => (
              <div key={score.id} className="border-b pb-6 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div>
                      <h3 className="font-medium">{score.criterionName}</h3>
                      {score.criterionDescription && score.criterionType !== 'DISCRETE' && (
                        <p className="text-sm text-gray-500">{score.criterionDescription}</p>
                      )}
                    </div>
                    {/* Green check icon for answered criteria */}
                    {(() => {
                      let isAnswered = false;
                      if (score.criterionType === 'POINTS') {
                        isAnswered = score.score !== null && score.score !== undefined && parseFloat(String(score.score)) > 0;
                      } else if (score.criterionType === 'TIME') {
                        isAnswered = Boolean(score.startTime) && Boolean(score.endTime);
                      } else if (score.criterionType === 'DISCRETE' || score.criterionType === 'DISCRETE_SINGLE' || score.criterionType === 'DISCRETE_MULTIPLE') {
                        isAnswered = Boolean(score.selectedDiscreteTexts && score.selectedDiscreteTexts.length > 0) || 
                                   Boolean(score.selectedDiscreteText && score.selectedDiscreteText !== null && score.selectedDiscreteText !== '');
                      }
                      
                      return isAnswered ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : null;
                    })()}
                  </div>

                </div>
                
                {/* POINTS type scoring UI */}
                {score.criterionType === 'POINTS' && (
                  <div className="mt-4">
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm">0</span>
                        <span className="text-sm">{score.maxScore}</span>
                      </div>
                      <Slider
                        defaultValue={[score.score ?? 0]}
                        max={score.maxScore}
                        min={0}
                        step={0.5}
                        onValueChange={(newScore) => handleScoreChange(index, newScore)}
                        disabled={judgingSession.status === 'COMPLETED'}
                      />
                      <div className="text-center mt-2 font-medium">
                        {score.score ?? 0}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* DISCRETE type scoring UI */}
                {(score.criterionType === 'DISCRETE' || score.criterionType === 'DISCRETE_SINGLE' || score.criterionType === 'DISCRETE_MULTIPLE') && (
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Parse discreteValues as JSON if available, otherwise fall back to criterionDescription */}
                      {(() => {
                        let options: Array<string | DiscreteValue> = [];
                        
                        // First try to parse discreteValues as double-encoded JSON array
                        if (score.discreteValues) {
                          try {
                            // The API returns discreteValues as a JSON-encoded string, so we need to parse it twice
                            let parsed = JSON.parse(score.discreteValues as string);
                            
                            // If it's still a string (double-encoded), parse it again
                            if (typeof parsed === 'string') {
                              parsed = JSON.parse(parsed);
                            }
                            
                            if (Array.isArray(parsed)) {
                              options = parsed;
                              console.log('Successfully parsed discreteValues:', options);
                            }
                          } catch (e) {
                            console.error('Failed to parse discreteValues JSON:', e, 'Raw value:', score.discreteValues);
                          }
                        }
                        
                        // If JSON parsing failed or no discreteValues, fall back to criterionDescription
                        if (options.length === 0 && score.criterionDescription) {
                          options = score.criterionDescription.split(',').map(opt => opt.trim());
                        }
                        
                        return options.map((option, optionIndex) => {
                          // Handle both string options and {text, value} objects
                          const optionText = typeof option === 'string' ? option.trim() : option.text.trim();
                          const optionValue = typeof option === 'string' ? optionText : option.value;
                          
                          // Determine if this option is selected based on criterion type
                          let isSelected = false;
                          if (score.criterionType === 'DISCRETE_MULTIPLE') {
                            // For multiple selection, check if text is in the array
                            isSelected = (score.selectedDiscreteTexts || []).includes(optionText);
                          } else {
                            // For single selection, check if this option's index is in the stored indices
                            if (score.selectedDiscreteTexts && score.selectedDiscreteTexts.length > 0) {
                              isSelected = score.selectedDiscreteTexts.includes(optionText);
                            } else if (score.selectedDiscreteText) {
                              // Fallback: try to parse indices and check if current option index is selected
                              try {
                                const selectedIndices = JSON.parse(score.selectedDiscreteText);
                                if (Array.isArray(selectedIndices)) {
                                  isSelected = selectedIndices.includes(optionIndex);
                                } else {
                                  // Legacy format: direct text comparison
                                  isSelected = score.selectedDiscreteText === optionText;
                                }
                              } catch (e) {
                                // Legacy format: direct text comparison
                                isSelected = score.selectedDiscreteText === optionText;
                              }
                            }
                          }
                          
                          return (
                            <Button 
                              key={optionIndex}
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => handleDiscreteSelection(index, optionText, typeof optionValue === 'number' ? optionValue : undefined)}
                              disabled={judgingSession.status === 'COMPLETED'}
                              className={`flex-1 flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <span className="truncate">{optionText}</span>
                              {typeof option !== 'string' && (
                                <span className="ml-1 text-xs opacity-70">({option.value})</span>
                              )}
                              {isSelected && <CheckCircle className="ml-1 h-4 w-4 flex-shrink-0" />}
                            </Button>
                          );
                        });
                      })()}
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      {score.criterionType === 'DISCRETE_MULTIPLE' ? (
                        <>
                          <span className="text-gray-500">Selected values:</span>
                          <span className="font-medium">
                            {(score.selectedDiscreteTexts && score.selectedDiscreteTexts.length > 0) 
                              ? score.selectedDiscreteTexts.join(', ') 
                              : 'None'}
                          </span>
                          <span className="text-gray-500 ml-4">Total Score:</span>
                          <span className="font-medium">{typeof score.score === 'number' ? score.score.toFixed(1) : '0.0'}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-500">Selected value:</span>
                          <span className="font-medium">{score.selectedDiscreteText || 'None'}</span>
                          <span className="text-gray-500 ml-4">Score:</span>
                          <span className="font-medium">{typeof score.score === 'number' ? score.score.toFixed(1) : '0.0'}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* TIME type scoring UI */}
                {score.criterionType === 'TIME' && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      {!score.startTime && !score.endTime && (
                        <Button
                          onClick={() => handleStartTimer(index)}
                          disabled={judgingSession.status === 'COMPLETED'}
                        >
                          <Play className="mr-1 h-4 w-4" /> Start Timer
                        </Button>
                      )}
                      
                      {score.startTime && !score.endTime && (
                        <Button
                          onClick={() => handleEndTimer(index)}
                          variant="destructive"
                          disabled={judgingSession.status === 'COMPLETED'}
                        >
                          <Square className="mr-1 h-4 w-4" /> Stop Timer
                        </Button>
                      )}
                      
                      {score.startTime && score.endTime && (
                        <Button
                          onClick={() => handleResetTimer(index)}
                          variant="outline"
                          disabled={judgingSession.status === 'COMPLETED'}
                        >
                          <RotateCcw className="mr-1 h-4 w-4" /> Reset Timer
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Start Time</p>
                        <p className="font-medium">
                          {score.startTime ? new Date(score.startTime).toLocaleTimeString() : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">End Time</p>
                        <p className="font-medium">
                          {score.endTime ? new Date(score.endTime).toLocaleTimeString() : '-'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center mb-2">
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">Total Time</p>
                        <p className="font-mono text-lg font-medium">
                          {score.totalTime ? formatTime(score.totalTime) : '00:00:00'}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">Score (based on time)</p>
                        <p className="font-medium">{typeof score.score === 'number' ? score.score.toFixed(1) : '0.0'}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-4">
                  <label className="text-sm font-medium mb-1 block">
                    Criterion Comments (Optional)
                  </label>
                  <Textarea
                    placeholder="Comments for this criterion..."
                    value={score.comments || ''}
                    onChange={(e) => handleScoreCommentChange(index, e.target.value)}
                    disabled={judgingSession.status === 'COMPLETED'}
                    rows={2}
                  />
                </div>
              </div>
            )) : <p className="text-center text-gray-500 py-4">No scoring criteria available.</p>}
          </div>
          
          {scores && scores.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-gray-500">No criteria found for this judging template.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6">
          <Button 
            onClick={handleSaveScores}
            disabled={saving || judgingSession.status === 'COMPLETED'} 
            className="gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Scores
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Complete Confirmation Dialog */}
      <Dialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Judging Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to complete this judging session? This will finalize your scores and you won't be able to make changes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <h3 className="font-medium mb-2">Final Score: {currentTotalScore.toFixed(2)}</h3>
            <p className="text-sm text-gray-500">
              This score is the sum of all criterion scores.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteConfirm(false)} disabled={completing}>
              Cancel
            </Button>
            <Button onClick={handleCompleteJudging} disabled={completing} className="gap-2">
              {completing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Complete Judging
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

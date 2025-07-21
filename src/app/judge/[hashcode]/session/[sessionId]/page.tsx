"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, CheckCircle, AlertTriangle, Clock, X, Play, Square, Timer, RotateCcw, LogOut } from "lucide-react";
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
import { useJudgeAuth } from "@/hooks/useJudgeAuth";

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
  criterionType: string;
  maxScore: number;
  discreteValues?: string;
  selectedDiscreteText?: string | null;
  selectedDiscreteTexts?: string[];
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
  };
}

// Helper functions
const calculateTotalTime = (startTime: Date, endTime: Date): number => {
  return Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function JudgeJudgingSessionPage({ params }: { params: { hashcode: string; sessionId: string } }) {
  const router = useRouter();
  const { hashcode, sessionId } = params;
  
  const { loading: authLoading, authenticated, judgeEndpoint, authenticate, logout } = useJudgeAuth(hashcode);
  const [passcode, setPasscode] = useState("");
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
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Calculate current total score (reactive to scores state)
  const currentTotalScore = useMemo(() => {
    if (!scores || scores.length === 0) return 0;
    return scores.reduce((acc, score) => {
      const scoreValue = typeof score.score === 'number' ? score.score : 0;
      return acc + scoreValue;
    }, 0);
  }, [scores]);
  
  // Check if all criteria are answered
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

  // Handle authentication
  const handleAuthenticate = async () => {
    const success = await authenticate(passcode);
  };

  // Fetch session data
  useEffect(() => {
    if (authenticated) {
      const fetchJudgingSession = async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/judge/session/${sessionId}?hashcode=${hashcode}`);
          
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch judging session');
          }
          
          const data = await res.json();
          
          setJudgingSession(data.session);
          setTeam(data.team);
          setContingent(data.contingent);
          setEventContest(data.eventContest);
          setComments(data.session.comments || "");
          
          // Process scores with proper type conversion
          const processedScores = (data.session.judgingSessionScores || []).map((score: any) => {
            // Debug logging for DISCRETE_MULTIPLE criteria
            if (score.criterionType === 'DISCRETE_MULTIPLE' && score.criterionName === 'Checkpoint') {
              console.log('DEBUG - Checkpoint criterion raw data:', {
                criterionName: score.criterionName,
                criterionType: score.criterionType,
                score: score.score,
                selectedDiscreteText: score.selectedDiscreteText,
                discreteValues: score.discreteValues
              });
            }
            
            const processedScore = {
              ...score,
              score: score.score !== null ? parseFloat(String(score.score)) : null,
              selectedDiscreteTexts: [] as string[]
            };
            
            // Handle discrete values reconstruction
            if ((score.criterionType === 'DISCRETE' || score.criterionType === 'DISCRETE_SINGLE' || score.criterionType === 'DISCRETE_MULTIPLE') && score.discreteValues) {
              try {
                let discreteOptions: DiscreteValue[] = [];
                
                // Parse discreteValues
                let parsed = JSON.parse(score.discreteValues);
                if (typeof parsed === 'string') {
                  parsed = JSON.parse(parsed);
                }
                
                if (Array.isArray(parsed)) {
                  if (parsed.length > 0 && typeof parsed[0] === 'object' && 'text' in parsed[0]) {
                    discreteOptions = parsed as DiscreteValue[];
                  } else {
                    discreteOptions = (parsed as string[]).map((text, index) => ({
                      text,
                      value: index
                    }));
                  }
                }
                
                const numericScore = typeof score.score === 'string' ? parseFloat(score.score) : (score.score || 0);
                
                // Reconstruct selections from selectedDiscreteText
                if (score.selectedDiscreteText) {
                  try {
                    const parsedIndices = JSON.parse(score.selectedDiscreteText);
                    if (Array.isArray(parsedIndices)) {
                      processedScore.selectedDiscreteTexts = parsedIndices.map((index: number) => 
                        discreteOptions[index]?.text || ''
                      ).filter(Boolean);
                      console.log(`Reconstructed from indices for ${score.criterionName}:`, {
                        indices: parsedIndices,
                        texts: processedScore.selectedDiscreteTexts,
                        discreteOptions: discreteOptions.map(opt => opt.text)
                      });
                    } else {
                      // Handle single value (not array)
                      const singleIndex = typeof parsedIndices === 'number' ? parsedIndices : parseInt(parsedIndices);
                      if (!isNaN(singleIndex) && discreteOptions[singleIndex]) {
                        processedScore.selectedDiscreteTexts = [discreteOptions[singleIndex].text];
                        console.log(`Reconstructed single selection for ${score.criterionName}:`, processedScore.selectedDiscreteTexts);
                      }
                    }
                  } catch (e) {
                    console.error('Failed to parse selectedDiscreteText indices:', e);
                    // Handle legacy format where selectedDiscreteText contains text directly
                    if (typeof score.selectedDiscreteText === 'string') {
                      if (score.criterionType === 'DISCRETE_MULTIPLE') {
                        // Try to split by comma for multiple selections
                        const texts = score.selectedDiscreteText.split(',').map((t: string) => t.trim()).filter(Boolean);
                        processedScore.selectedDiscreteTexts = texts;
                      } else {
                        // Single selection
                        processedScore.selectedDiscreteTexts = [score.selectedDiscreteText.trim()];
                      }
                      console.log(`Using legacy text format for ${score.criterionName}:`, processedScore.selectedDiscreteTexts);
                    }
                  }
                } else {
                  // If no selectedDiscreteText, try to reverse-engineer from score and discreteOptions
                  console.log(`No selectedDiscreteText, reverse-engineering from score ${numericScore} for ${score.criterionName}`);
                  if (discreteOptions.length > 0 && numericScore > 0) {
                    if (score.criterionType === 'DISCRETE_SINGLE') {
                      // Find the option that matches the score
                      const matchingOption = discreteOptions.find(opt => opt.value === numericScore);
                      if (matchingOption) {
                        processedScore.selectedDiscreteTexts = [matchingOption.text];
                        // Also update selectedDiscreteText with the correct index
                        processedScore.selectedDiscreteText = JSON.stringify([discreteOptions.indexOf(matchingOption)]);
                        console.log(`Reverse-engineered DISCRETE_SINGLE:`, {
                          text: matchingOption.text,
                          index: discreteOptions.indexOf(matchingOption)
                        });
                      }
                    } else if (score.criterionType === 'DISCRETE_MULTIPLE') {
                      // For multiple selection, this is more complex - try to find combinations that sum to the score
                      const selectedOptions: DiscreteValue[] = [];
                      let remainingScore = numericScore;
                      
                      // Simple greedy approach: select options in order until we reach the target score
                      for (const option of discreteOptions) {
                        if (remainingScore >= option.value && remainingScore > 0) {
                          selectedOptions.push(option);
                          remainingScore -= option.value;
                        }
                      }
                      
                      if (selectedOptions.length > 0) {
                        processedScore.selectedDiscreteTexts = selectedOptions.map(opt => opt.text);
                        const selectedIndices = selectedOptions.map(opt => discreteOptions.indexOf(opt));
                        processedScore.selectedDiscreteText = JSON.stringify(selectedIndices);
                        console.log(`Reverse-engineered DISCRETE_MULTIPLE:`, {
                          texts: processedScore.selectedDiscreteTexts,
                          indices: selectedIndices,
                          targetScore: numericScore,
                          achievedScore: selectedOptions.reduce((sum, opt) => sum + opt.value, 0)
                        });
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Error parsing discrete values:', error);
              }
            }
            
            return processedScore;
          });
          
          setScores(processedScores);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching judging session:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to load judging session');
          setLoading(false);
        }
      };
      
      fetchJudgingSession();
    }
  }, [authenticated, sessionId, hashcode]);

  // Handle score changes
  const handleScoreChange = (index: number, value: number) => {
    const updatedScores = [...scores];
    updatedScores[index].score = value;
    setScores(updatedScores);
    setUnsavedChanges(true);
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
  
  // Handle time controls
  const handleStartTimer = (index: number) => {
    const updatedScores = [...scores];
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
      
      const maxTime = 600; // 10 minutes
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
      const res = await fetch('/api/judge/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashcode,
          scores: scoreUpdates
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save scores');
      }
      
      // Also update the session comments if there is a judgingSession
      if (judgingSession && comments !== judgingSession.comments) {
        const commentsRes = await fetch(`/api/judge/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hashcode,
            comments: comments
          }),
        });
        
        if (!commentsRes.ok) {
          const error = await commentsRes.json();
          console.warn('Failed to update session comments:', error);
          // Don't throw here, just warn as this is not critical
        }
      }
      
      setUnsavedChanges(false);
      toast.success('Scores saved successfully');
      setSaving(false);
    } catch (error) {
      console.error('Error saving scores:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save scores');
      setSaving(false);
    }
  };
  
  // Complete session
  const handleCompleteSession = async () => {
    if (!allCriteriaScored) {
      toast.error('Please score all criteria before completing the session');
      return;
    }
    
    try {
      setCompleting(true);
      
      await handleSaveScores();
      
      const res = await fetch(`/api/judge/session/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashcode,
          status: 'COMPLETED',
          comments,
          totalScore: currentTotalScore
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to complete judging session');
      }
      
      setJudgingSession(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
      
      toast.success('Judging session completed successfully');
      setShowCompleteConfirm(false);
      setCompleting(false);
    } catch (error) {
      console.error('Error completing judging session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete judging session');
      setCompleting(false);
    }
  };
  
  // Revert session
  const handleRevertSession = async () => {
    if (!judgingSession) return;
    
    try {
      setReverting(true);
      
      const res = await fetch(`/api/judge/session/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hashcode,
          status: 'IN_PROGRESS'
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to revert judging session');
      }
      
      setJudgingSession(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
      
      toast.success('Judging session reverted to In Progress');
      setReverting(false);
    } catch (error) {
      console.error('Error reverting judging session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to revert judging session');
      setReverting(false);
    }
  };
  
  // Authentication loading
  if (authLoading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Loading..." description="Authenticating judge access" />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // Authentication form
  if (!authenticated) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Judge Authentication" description="Enter your passcode to access the judging session" />
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Judge Access Required
            </CardTitle>
            <CardDescription>
              Please enter your judge passcode to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
              />
            </div>
            <Button 
              onClick={handleAuthenticate} 
              className="w-full"
              disabled={!passcode.trim()}
            >
              Authenticate
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Loading session data
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
  
  // Error state
  if (!judgingSession || !team || !eventContest) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <PageHeader title="Error" description="Judging session not found" />
        <Card>
          <CardContent className="pt-6">
            <p>The specified judging session was not found.</p>
            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/judge/${hashcode}`)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Teams
              </Button>
              <Button 
                variant="outline" 
                onClick={logout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Main UI - will be added in next part
  return (
    <div className="container mx-auto py-6 space-y-8">
      <PageHeader 
        title="Judge Team" 
        description={`Scoring ${team.name || team.teamName} from ${contingent?.name || 'Unknown Contingent'} Contingent`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/judge/${hashcode}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Teams
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
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
                <dd className="text-base">{team.name || team.teamName}</dd>
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
                  <Badge variant={judgingSession.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {judgingSession.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
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
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-yellow-100 px-3 py-1 rounded inline-block">
              {currentTotalScore.toFixed(2)}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {scores.filter(s => {
                if (s.criterionType === 'POINTS') {
                  return s.score !== null && s.score !== undefined && parseFloat(String(s.score)) > 0;
                } else if (s.criterionType === 'TIME') {
                  return Boolean(s.startTime) && Boolean(s.endTime);
                } else if (s.criterionType === 'DISCRETE' || s.criterionType === 'DISCRETE_SINGLE' || s.criterionType === 'DISCRETE_MULTIPLE') {
                  return Boolean(s.selectedDiscreteTexts && s.selectedDiscreteTexts.length > 0) || 
                         Boolean(s.selectedDiscreteText && s.selectedDiscreteText !== null && s.selectedDiscreteText !== '');
                }
                return false;
              }).length} of {scores.length} criteria answered
            </p>
          </CardContent>
        </Card>
        
        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={handleSaveScores} 
              disabled={saving || !unsavedChanges}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Scores'}
            </Button>
            
            {judgingSession.status === 'IN_PROGRESS' && (
              <Button 
                onClick={() => setShowCompleteConfirm(true)}
                disabled={!allCriteriaScored || completing}
                variant={allCriteriaScored ? 'default' : 'secondary'}
                className="w-full gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {completing ? 'Completing...' : 'Complete Session'}
              </Button>
            )}
            
            {judgingSession.status === 'COMPLETED' && (
              <Button 
                onClick={handleRevertSession}
                disabled={reverting}
                variant="outline"
                className="w-full gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {reverting ? 'Reverting...' : 'Revert to In Progress'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Criteria Scoring */}
      <div className="space-y-6">
        {scores.map((score, index) => {
          // Parse discrete values for this criterion
          let discreteOptions: DiscreteValue[] = [];
          if (score.discreteValues) {
            try {
              const parsed = JSON.parse(score.discreteValues);
              if (Array.isArray(parsed)) {
                if (parsed.length > 0 && typeof parsed[0] === 'object' && 'text' in parsed[0]) {
                  discreteOptions = parsed as DiscreteValue[];
                } else {
                  discreteOptions = (parsed as string[]).map((text, idx) => ({
                    text,
                    value: idx
                  }));
                }
              }
            } catch (error) {
              console.error('Error parsing discrete values:', error);
            }
          }
          
          return (
            <Card key={score.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{score.criterionName}</CardTitle>
                    {/* Show answered indicator */}
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
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{score.criterionType}</Badge>
                    <Badge variant="secondary">Max: {score.maxScore}</Badge>
                  </div>
                </div>
                {score.criterionDescription && (
                  <CardDescription>{score.criterionDescription}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Points Criterion */}
                {score.criterionType === 'POINTS' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-[60px]">Score:</label>
                      <div className="flex-1">
                        <Slider
                          value={[score.score || 0]}
                          onValueChange={(value) => handleScoreChange(index, value[0])}
                          max={score.maxScore}
                          step={1}
                          className="flex-1"
                        />
                      </div>
                      <div className="min-w-[80px] text-right">
                        <span className="text-lg font-semibold">{(score.score || 0).toFixed(1)}</span>
                        <span className="text-sm text-gray-500">/{score.maxScore}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium min-w-[60px]">Manual:</label>
                      <Input
                        type="number"
                        value={score.score || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          handleScoreChange(index, Math.min(Math.max(0, value), score.maxScore));
                        }}
                        max={score.maxScore}
                        min={0}
                        step={1}
                        className="w-24"
                      />
                    </div>
                  </div>
                )}
                
                {/* Time Criterion */}
                {score.criterionType === 'TIME' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {!score.startTime && (
                        <Button
                          onClick={() => handleStartTimer(index)}
                          className="gap-2"
                          variant="outline"
                        >
                          <Play className="h-4 w-4" />
                          Start Timer
                        </Button>
                      )}
                      
                      {score.startTime && !score.endTime && (
                        <Button
                          onClick={() => handleEndTimer(index)}
                          className="gap-2"
                          variant="default"
                        >
                          <Square className="h-4 w-4" />
                          Stop Timer
                        </Button>
                      )}
                      
                      {score.startTime && score.endTime && (
                        <div className="flex items-center gap-2">
                          <div className="text-lg font-semibold">
                            {formatTime(score.totalTime || 0)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Score: {(score.score || 0).toFixed(2)}
                          </div>
                          <Button
                            onClick={() => handleResetTimer(index)}
                            size="sm"
                            variant="outline"
                            className="gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                          </Button>
                        </div>
                      )}
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
                          
                          // Determine if this option is selected - use selectedDiscreteTexts as primary source
                          let isSelected = false;
                          
                          // Primary check: use selectedDiscreteTexts array if available
                          if (score.selectedDiscreteTexts && Array.isArray(score.selectedDiscreteTexts)) {
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
                          
                          console.log('Button selection state:', {
                            optionText,
                            optionIndex,
                            isSelected,
                            selectedDiscreteTexts: score.selectedDiscreteTexts,
                            selectedDiscreteText: score.selectedDiscreteText
                          });
                          
                          return (
                            <Button 
                              key={optionIndex}
                              variant={isSelected ? "default" : "outline"}
                              onClick={() => handleDiscreteSelection(index, optionText, typeof option !== 'string' ? option.value : undefined)}
                              disabled={judgingSession?.status === 'COMPLETED'}
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
                          <span className="font-medium bg-yellow-100 px-2 py-1 rounded">{typeof score.score === 'number' ? score.score.toFixed(1) : '0.0'}</span>
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
                
                {/* Comments */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Comments (optional):</label>
                  <Textarea
                    value={score.comments || ''}
                    onChange={(e) => handleScoreCommentChange(index, e.target.value)}
                    placeholder="Add any comments for this criterion..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Session Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Session Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Add overall comments for this judging session..."
            rows={4}
          />
        </CardContent>
      </Card>
      
      {/* Complete Session Confirmation Dialog */}
      <Dialog open={showCompleteConfirm} onOpenChange={setShowCompleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Judging Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to complete this judging session? This will finalize all scores and mark the session as completed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteSession} disabled={completing}>
              {completing ? 'Completing...' : 'Complete Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

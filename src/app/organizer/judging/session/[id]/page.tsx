"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, CheckCircle, AlertTriangle } from "lucide-react";
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

interface JudgingSessionScore {
  id: number;
  judgingSessionId: number;
  criterionId: number;
  score: number;
  comments: string | null;
  criterionName: string;
  criterionDescription: string | null;
  criterionWeight: number;
  criterionType: string;
  maxScore: number;
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
  name: string;
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
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [judgingSession, setJudgingSession] = useState<JudgingSession | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [contingent, setContingent] = useState<Contingent | null>(null);
  const [eventContest, setEventContest] = useState<EventContest | null>(null);
  const [scores, setScores] = useState<JudgingSessionScore[]>([]);
  const [comments, setComments] = useState("");

  // Calculate total weight of criteria
  const totalWeight = scores.reduce((acc, score) => acc + score.criterionWeight, 0);
  
  // Calculate current weighted score
  const currentTotalScore = scores.reduce((acc, score) => {
    const weightedScore = (score.criterionWeight / 100) * score.score;
    return acc + weightedScore;
  }, 0);
  
  // Check if all criteria have scores
  const allCriteriaScored = scores.every(score => score.score > 0);

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
        setScores(data.judgingSession.judgingSessionScores);
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
  
  // Handle score change
  const handleScoreChange = (index: number, newScore: number[]) => {
    const updatedScores = [...scores];
    updatedScores[index].score = newScore[0];
    setScores(updatedScores);
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
      const scoreUpdates = scores.map(score => ({
        scoreId: score.id,
        score: score.score,
        comments: score.comments
      }));
      
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
          router.push(`/organizer/judging/teams?eventId=${eventContest.eventId}&contestId=${eventContest.contestId}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error completing judging session:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete judging session');
      setCompleting(false);
      setShowCompleteConfirm(false);
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
              onClick={() => router.push(`/organizer/judging/teams?eventId=${eventContest.eventId}&contestId=${eventContest.contestId}`)}
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
              Weighted score based on criteria
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-5xl font-bold">
                {currentTotalScore.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                out of 10.00 maximum
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
            {scores.map((score, index) => (
              <div key={score.id} className="border-b pb-6 last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{score.criterionName}</h3>
                    {score.criterionDescription && (
                      <p className="text-sm text-gray-500">{score.criterionDescription}</p>
                    )}
                  </div>
                  <Badge variant="outline">{score.criterionWeight}%</Badge>
                </div>
                
                <div className="grid grid-cols-12 gap-4 items-center mt-4">
                  <div className="col-span-10">
                    <Slider
                      defaultValue={[score.score]}
                      min={0}
                      max={10}
                      step={0.5}
                      value={[score.score]}
                      onValueChange={(value) => handleScoreChange(index, value)}
                      disabled={judgingSession.status === 'COMPLETED'}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      value={score.score.toFixed(1)}
                      onChange={(e) => {
                        const newValue = parseFloat(e.target.value);
                        if (!isNaN(newValue) && newValue >= 0 && newValue <= 10) {
                          handleScoreChange(index, [newValue]);
                        }
                      }}
                      disabled={judgingSession.status === 'COMPLETED'}
                      className="text-center"
                    />
                  </div>
                </div>
                
                <div className="mt-2">
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
            ))}
          </div>
          
          {scores.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-gray-500">No criteria found for this judging template.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="text-sm text-gray-500">
            Total Weight: {totalWeight}% (should be 100%)
          </div>
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
            <h3 className="font-medium mb-2">Final Score: {currentTotalScore.toFixed(2)} / 10.00</h3>
            <p className="text-sm text-gray-500">
              This score is calculated based on the weights of each criterion.
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

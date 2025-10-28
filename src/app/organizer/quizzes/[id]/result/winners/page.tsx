"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Trophy, Award, Star, Users, Filter, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Quiz {
  id: number;
  quiz_name: string;
  target_group: string;
  time_limit: number | null;
  status: string;
  publishedAt: string | null;
}

interface QuizResult {
  rank: number;
  attemptId: number;
  contestantId: number;
  contestantName: string;
  contestantHash: string;
  contingentName: string;
  institutionName: string;
  contingentLogoUrl?: string | null;
  startTime: string;
  endTime: string;
  timeTaken: number;
  score: number;
  summary: {
    totalQuestions: number;
    correctAnswers: number;
    percentage: number;
  };
}

interface TemplateInfo {
  quiz: {
    id: number;
    quiz_name: string;
    status: string;
    hasNextQuiz: boolean;
  };
  templates: {
    winner: {
      id: number;
      templateName: string;
      winnerRangeStart: number | null;
      winnerRangeEnd: number | null;
    } | null;
  };
  nextQuiz: {
    id: number;
    quiz_name: string;
  } | null;
}

export default function QuizWinnersPage({ params }: { params: { id: string } }) {
  const quizId = parseInt(params.id);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [winners, setWinners] = useState<QuizResult[]>([]);
  const [templates, setTemplates] = useState<TemplateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingCert, setGeneratingCert] = useState<number | null>(null);
  const [progressing, setProgressing] = useState<number | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [rankFilter, setRankFilter] = useState<'3' | '10' | 'all'>('all');
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [currentGeneratingName, setCurrentGeneratingName] = useState<string>('');
  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string }>({ show: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm: () => void }>({ show: false, title: '', message: '', onConfirm: () => {} });
  const [progressedContestants, setProgressedContestants] = useState<Set<number>>(new Set());
  const [selectedContestants, setSelectedContestants] = useState<Set<number>>(new Set());
  const [bulkSelectCount, setBulkSelectCount] = useState<number>(10);
  const [bulkProgressing, setBulkProgressing] = useState(false);
  const [progressionProgress, setProgressionProgress] = useState<{ current: number; total: number } | null>(null);

  // Fetch quiz results and templates
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch quiz results
        const resultsResponse = await fetch(`/api/organizer/quizzes/${quizId}/results`);
        if (!resultsResponse.ok) {
          throw new Error('Failed to load quiz results');
        }
        const resultsData = await resultsResponse.json();
        setQuiz(resultsData.quiz);
        setAllResults(resultsData.results);
        
        // Fetch template info
        const templatesResponse = await fetch(`/api/organizer/quizzes/${quizId}/templates`);
        if (!templatesResponse.ok) {
          throw new Error('Failed to load templates');
        }
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData);
        
        // Fetch progression status
        const progressionResponse = await fetch(`/api/organizer/quizzes/${quizId}/progress`);
        if (progressionResponse.ok) {
          const progressionData = await progressionResponse.json();
          const progressedIds = new Set<number>(
            progressionData.progressions?.map((p: any) => p.contestantId as number) || []
          );
          setProgressedContestants(progressedIds);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (quizId) {
      fetchData();
    }
  }, [quizId]);

  // Filter winners based on rank filter
  useEffect(() => {
    if (allResults.length === 0) return;

    let filteredWinners: QuizResult[] = [];
    
    switch (rankFilter) {
      case '3':
        filteredWinners = allResults.filter((result) => result.rank <= 3);
        break;
      case '10':
        filteredWinners = allResults.filter((result) => result.rank <= 10);
        break;
      case 'all':
        filteredWinners = allResults;
        break;
    }
    
    setWinners(filteredWinners);
  }, [allResults, rankFilter]);

  // Format time duration
  const formatTimeTaken = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get rank badge
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <Badge className="bg-yellow-100 text-yellow-800 font-bold">1st Place</Badge>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-gray-400" />
            <Badge className="bg-gray-200 text-gray-800 font-bold">2nd Place</Badge>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <Badge className="bg-amber-100 text-amber-800 font-bold">3rd Place</Badge>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-blue-500" />
            <Badge className="bg-blue-100 text-blue-800">{rank}th Place</Badge>
          </div>
        );
    }
  };

  // Generate achievement certificate for a winner
  const handleGenerateCertificate = async (result: QuizResult) => {
    if (!templates?.templates?.winner) {
      alert('No winner certificate template configured for this quiz');
      return;
    }

    try {
      setGeneratingCert(result.contestantId);
      
      const response = await fetch(
        `/api/organizer/quizzes/${quizId}/certificates/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contestantId: result.contestantId,
            certificateType: 'ACHIEVEMENT'
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate certificate');
      }

      setAlertModal({
        show: true,
        title: `Certificate ${data.regenerated ? 'Regenerated' : 'Generated'}`,
        message: `✓ Successfully ${data.regenerated ? 'regenerated' : 'generated'} achievement certificate for ${result.contestantName}\n\nSerial: ${data.certificate.serialNumber}\nAward: ${data.certificate.awardTitle || `Rank ${result.rank}`}\nStatus: PDF ${data.regenerated ? 'Regenerated' : 'Generated'}`
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      setAlertModal({
        show: true,
        title: 'Generation Failed',
        message: error instanceof Error ? error.message : 'Failed to generate certificate'
      });
    } finally {
      setGeneratingCert(null);
    }
  };

  // Progress winner to next level
  const handleProgressToNext = async (result: QuizResult) => {
    if (!templates?.nextQuiz) {
      setAlertModal({
        show: true,
        title: 'Configuration Missing',
        message: 'No next quiz configured for progression.'
      });
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Progress to Next Level',
      message: `Progress ${result.contestantName} to ${templates.nextQuiz.quiz_name}?\n\nThis will register them for the next level.`,
      onConfirm: () => executeProgressToNext(result)
    });
  };

  const executeProgressToNext = async (result: QuizResult) => {
    if (!templates?.nextQuiz) return;

    try {
      setProgressing(result.contestantId);
      
      const response = await fetch(
        `/api/organizer/quizzes/${quizId}/progress`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contestantId: result.contestantId
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to progress contestant');
      }

      // Add contestant to progressed set
      setProgressedContestants(prev => new Set(prev).add(result.contestantId));
      
      setAlertModal({
        show: true,
        title: 'Success',
        message: `✓ ${result.contestantName} has been progressed to ${templates.nextQuiz.quiz_name}!`
      });
    } catch (error) {
      console.error('Error progressing contestant:', error);
      setAlertModal({
        show: true,
        title: 'Progression Failed',
        message: error instanceof Error ? error.message : 'Failed to progress contestant'
      });
    } finally {
      setProgressing(null);
    }
  };

  // Bulk generate certificates for all winners
  const handleBulkGenerate = async () => {
    if (!templates?.templates?.winner) {
      setAlertModal({
        show: true,
        title: 'Template Not Found',
        message: 'No winner certificate template configured for this quiz.'
      });
      return;
    }

    const filterText = rankFilter === '3' ? 'top 3' : rankFilter === '10' ? 'top 10' : 'all';
    setConfirmModal({
      show: true,
      title: 'Generate Certificates',
      message: `Generate achievement certificates for all ${winners.length} winners (${filterText})?\n\nThis will create certificates for the selected winners.`,
      onConfirm: () => executeBulkGenerate()
    });
  };

  const executeBulkGenerate = async () => {

    try {
      setBulkGenerating(true);
      setBulkProgress({ current: 0, total: winners.length });
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        
        // Update progress
        setBulkProgress({ current: i + 1, total: winners.length });
        setCurrentGeneratingName(winner.contestantName);

        try {
          const response = await fetch(
            `/api/organizer/quizzes/${quizId}/certificates/generate`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contestantId: winner.contestantId,
                certificateType: 'ACHIEVEMENT'
              })
            }
          );

          if (response.ok) {
            successCount++;
          } else {
            const data = await response.json();
            errorCount++;
            errors.push(`${winner.contestantName}: ${data.error}`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`${winner.contestantName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      let message = `Bulk generation complete!\n\n`;
      message += `✓ Successfully generated: ${successCount} PDFs\n`;
      if (errorCount > 0) {
        message += `\n❌ Errors: ${errorCount}\n`;
        if (errors.length > 0) {
          message += `\nDetails:\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) {
            message += `\n...and ${errors.length - 5} more errors`;
          }
        }
      }

      setAlertModal({
        show: true,
        title: 'Bulk Generation Complete',
        message
      });
    } catch (error) {
      console.error('Error in bulk generation:', error);
      setAlertModal({
        show: true,
        title: 'Generation Failed',
        message: 'Failed to complete bulk generation. Please try again.'
      });
    } finally {
      setBulkGenerating(false);
      setBulkProgress(null);
      setCurrentGeneratingName('');
    }
  };

  // Selection handlers
  const handleSelectContestant = (contestantId: number) => {
    setSelectedContestants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contestantId)) {
        newSet.delete(contestantId);
      } else {
        newSet.add(contestantId);
      }
      return newSet;
    });
  };

  const handleSelectFirst = (count: number) => {
    const firstN = winners.slice(0, count).map(w => w.contestantId);
    setSelectedContestants(new Set(firstN));
  };

  const handleSelectAll = () => {
    const allIds = winners.map(w => w.contestantId);
    setSelectedContestants(new Set(allIds));
  };

  const handleClearSelection = () => {
    setSelectedContestants(new Set());
  };

  // Bulk progress to next quiz
  const handleBulkProgressToNext = async () => {
    if (!templates?.nextQuiz) {
      setAlertModal({
        show: true,
        title: 'Configuration Missing',
        message: 'No next quiz configured for progression.'
      });
      return;
    }

    if (selectedContestants.size === 0) {
      setAlertModal({
        show: true,
        title: 'No Selection',
        message: 'Please select contestants to progress.'
      });
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Bulk Progress to Next Level',
      message: `Progress ${selectedContestants.size} contestant(s) to ${templates.nextQuiz.quiz_name}?\n\nThis will register them for the next level.`,
      onConfirm: () => executeBulkProgressToNext()
    });
  };

  const executeBulkProgressToNext = async () => {
    if (!templates?.nextQuiz) return;

    try {
      setBulkProgressing(true);
      setProgressionProgress({ current: 0, total: selectedContestants.size });
      
      const contestantIds = Array.from(selectedContestants);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < contestantIds.length; i++) {
        const contestantId = contestantIds[i];
        const contestant = winners.find(w => w.contestantId === contestantId);
        
        // Update progress
        setProgressionProgress({ current: i + 1, total: contestantIds.length });

        try {
          const response = await fetch(
            `/api/organizer/quizzes/${quizId}/progress`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contestantId
              })
            }
          );

          const data = await response.json();

          if (response.ok) {
            successCount++;
            // Add to progressed set
            setProgressedContestants(prev => new Set(prev).add(contestantId));
          } else {
            errorCount++;
            errors.push(`${contestant?.contestantName || contestantId}: ${data.error || 'Unknown error'}`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`${contestant?.contestantName || contestantId}: Network error`);
        }
      }

      // Clear selection after completion
      setSelectedContestants(new Set());

      // Show summary
      let message = `✓ Successfully progressed ${successCount} contestant(s) to ${templates.nextQuiz.quiz_name}`;
      if (errorCount > 0) {
        message += `\n\n⚠️ ${errorCount} failed:\n${errors.slice(0, 5).join('\n')}`;
        if (errors.length > 5) {
          message += `\n... and ${errors.length - 5} more`;
        }
      }

      setAlertModal({
        show: true,
        title: errorCount > 0 ? 'Progression Completed with Errors' : 'Success',
        message
      });
    } catch (error) {
      console.error('Error in bulk progression:', error);
      setAlertModal({
        show: true,
        title: 'Progression Failed',
        message: 'Failed to complete bulk progression. Please try again.'
      });
    } finally {
      setBulkProgressing(false);
      setProgressionProgress(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p>Loading winners...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !quiz) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-red-800">Error Loading Winners</h2>
          <p className="text-red-700">{error || 'Quiz not found'}</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href={`/organizer/quizzes/${quizId}/result`}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Results
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader 
          title={`${quiz.quiz_name} - Winners`}
          description={`Top performers (${winners.length} winners)`}
        />
        <div className="flex items-center gap-2">
          {/* Rank Filter */}
          <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-1.5">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value as '3' | '10' | 'all')}
              className="text-sm font-medium border-0 focus:outline-none focus:ring-0 bg-transparent cursor-pointer"
            >
              <option value="3">First 3</option>
              <option value="10">First 10</option>
              <option value="all">All</option>
            </select>
          </div>
          
          <Button variant="outline" size="sm" asChild>
            <Link href={`/organizer/quizzes/${quizId}/result`}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              All Results
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Winners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winners.length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {rankFilter === '3' && 'Top 3 positions'}
              {rankFilter === '10' && 'Top 10 positions'}
              {rankFilter === 'all' && 'All participants'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Certificate Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {templates?.templates?.winner?.templateName || 'Not configured'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Achievement certificates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Next Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {templates?.nextQuiz?.quiz_name || 'Not configured'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Progression available</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {winners.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
            <CardDescription>Select and apply actions to multiple contestants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selection Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Select first:</label>
                <input
                  type="number"
                  min="1"
                  max={winners.length}
                  value={bulkSelectCount}
                  onChange={(e) => setBulkSelectCount(parseInt(e.target.value) || 1)}
                  className="w-20 px-2 py-1 border rounded-md text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectFirst(bulkSelectCount)}
                  disabled={bulkProgressing}
                >
                  Select
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={bulkProgressing}
              >
                Select All ({winners.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                disabled={selectedContestants.size === 0 || bulkProgressing}
              >
                Clear Selection
              </Button>
              <div className="text-sm text-gray-600">
                {selectedContestants.size > 0 && (
                  <span className="font-medium">{selectedContestants.size} selected</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {templates?.templates?.winner && (
                <Button 
                  onClick={handleBulkGenerate}
                  disabled={bulkGenerating}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  {bulkGenerating ? 'Generating...' : `Generate All ${winners.length} Certificates`}
                </Button>
              )}
              {templates?.nextQuiz && selectedContestants.size > 0 && (
                <Button
                  onClick={handleBulkProgressToNext}
                  disabled={bulkProgressing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  {bulkProgressing 
                    ? `Progressing... (${progressionProgress?.current || 0}/${progressionProgress?.total || 0})`
                    : `${selectedContestants.size} Progress to Next Quiz`
                  }
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Winners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Winners List</CardTitle>
          <CardDescription>
            Achievement certificate management for top performers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {winners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-16 h-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-medium mb-2">No Winners Yet</h2>
              <p className="text-gray-500">
                Winners will appear here based on the configured rank range
              </p>
            </div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        checked={selectedContestants.size === winners.length && winners.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleSelectAll();
                          } else {
                            handleClearSelection();
                          }
                        }}
                        className="cursor-pointer"
                        disabled={bulkProgressing}
                      />
                    </TableHead>
                    <TableHead className="w-[180px]">Rank</TableHead>
                    <TableHead>Contestant</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {winners.map((winner) => (
                    <TableRow key={winner.attemptId}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedContestants.has(winner.contestantId)}
                          onChange={() => handleSelectContestant(winner.contestantId)}
                          className="cursor-pointer"
                          disabled={bulkProgressing}
                        />
                      </TableCell>
                      <TableCell>
                        {getRankBadge(winner.rank)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {winner.contingentLogoUrl ? (
                            <div className="relative w-10 h-10 overflow-hidden rounded-full border-2 border-yellow-300">
                              <Image 
                                src={winner.contingentLogoUrl} 
                                alt={winner.contingentName} 
                                width={40} 
                                height={40} 
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-300">
                              <Users className="h-5 w-5 text-yellow-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">{winner.contestantName}</div>
                            <div className="text-sm text-gray-500">
                              {winner.contingentName.replace(' Contingent', '')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-lg">{winner.score}</div>
                        <div className="text-xs text-gray-500">points</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{formatTimeTaken(winner.timeTaken)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {winner.summary.percentage}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {winner.summary.correctAnswers}/{winner.summary.totalQuestions} correct
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {templates?.templates?.winner && (
                            <Button
                              variant="default"
                              size="icon"
                              onClick={() => handleGenerateCertificate(winner)}
                              disabled={generatingCert === winner.contestantId}
                              title={generatingCert === winner.contestantId ? 'Generating Certificate...' : 'Generate Achievement Certificate'}
                              className="h-8 w-8 bg-indigo-600 hover:bg-indigo-700"
                            >
                              <Award className="h-4 w-4" />
                            </Button>
                          )}
                          {templates?.nextQuiz && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleProgressToNext(winner)}
                              disabled={progressing === winner.contestantId}
                              title={
                                progressing === winner.contestantId 
                                  ? 'Processing...' 
                                  : progressedContestants.has(winner.contestantId)
                                  ? 'Already Progressed to Next Level'
                                  : 'Progress to Next Level'
                              }
                              className={`h-8 w-8 ${
                                progressedContestants.has(winner.contestantId)
                                  ? 'bg-green-100 border-green-500 text-green-700 hover:bg-green-200'
                                  : ''
                              }`}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Generation Progress Modal */}
      {bulkProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Generating Certificates</h3>
            
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress</span>
                  <span>{bulkProgress.current} of {bulkProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-green-600 h-full transition-all duration-300 ease-out"
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  />
                </div>
                <div className="text-center text-sm font-medium text-gray-700 mt-2">
                  {Math.round((bulkProgress.current / bulkProgress.total) * 100)}%
                </div>
              </div>

              {/* Current Item */}
              <div className="border-t pt-4">
                <div className="text-sm text-gray-600 mb-1">Currently generating:</div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full"></div>
                  {currentGeneratingName}
                </div>
              </div>

              {/* Info Message */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-800">
                  Please wait while certificates are being generated. Do not close this window.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <Dialog open={alertModal.show} onOpenChange={(open) => setAlertModal({ ...alertModal, show: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alertModal.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="whitespace-pre-wrap text-sm text-gray-700">{alertModal.message}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setAlertModal({ ...alertModal, show: false })}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Modal */}
      <Dialog open={confirmModal.show} onOpenChange={(open) => setConfirmModal({ ...confirmModal, show: open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmModal.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="whitespace-pre-wrap text-sm text-gray-700">{confirmModal.message}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setConfirmModal({ ...confirmModal, show: false })}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setConfirmModal({ ...confirmModal, show: false });
                confirmModal.onConfirm();
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

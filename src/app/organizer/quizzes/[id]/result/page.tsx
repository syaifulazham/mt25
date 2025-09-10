"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Download, Clock, BarChart, Medal, Users, X, UserCircle, Calendar, Timer } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
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

export default function QuizResultPage({ params }: { params: { id: string } }) {
  const quizId = parseInt(params.id);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<QuizResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);

  // Fetch quiz results
  useEffect(() => {
    const fetchQuizResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/organizer/quizzes/${quizId}/results`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load quiz results');
        }
        
        const data = await response.json();
        setQuiz(data.quiz);
        setResults(data.results);
        setFilteredResults(data.results);
      } catch (error) {
        console.error('Error loading quiz results:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (quizId) {
      fetchQuizResults();
    }
  }, [quizId]);

  // Filter results based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredResults(results);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = results.filter(result => 
        result.contestantName.toLowerCase().includes(term) || 
        result.contestantHash.toLowerCase().includes(term) ||
        result.contingentName.toLowerCase().includes(term) ||
        result.institutionName.toLowerCase().includes(term)
      );
      setFilteredResults(filtered);
    }
  }, [searchTerm, results]);

  // Format time duration in minutes and seconds
  const formatTimeTaken = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'created':
        return <Badge className="bg-yellow-100 text-yellow-800">Draft</Badge>;
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case 'retracted':
        return <Badge className="bg-gray-100 text-gray-800">Retracted</Badge>;
      case 'ended':
        return <Badge className="bg-red-100 text-red-800">Ended</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get medal for top 3 ranks
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-100 text-yellow-800">🥇 Gold</Badge>;
      case 2:
        return <Badge className="bg-gray-200 text-gray-800">🥈 Silver</Badge>;
      case 3:
        return <Badge className="bg-amber-100 text-amber-800">🥉 Bronze</Badge>;
      default:
        return <span className="text-gray-500">{rank}</span>;
    }
  };

  // Generate CSV data for export
  const exportToCSV = () => {
    if (!results.length || !quiz) return;
    
    const headers = [
      "Rank", 
      "Contestant Name", 
      "Contestant ID",
      "Institution", 
      "Score", 
      "Correct Answers", 
      "Total Questions", 
      "Percentage", 
      "Time Taken"
    ];
    
    const csvData = results.map(result => [
      result.rank,
      result.contestantName,
      result.contestantHash,
      `${result.contingentName.replace(' Contingent', '')} - ${result.institutionName}`,
      result.score,
      result.summary.correctAnswers,
      result.summary.totalQuestions,
      `${result.summary.percentage}%`,
      formatTimeTaken(result.timeTaken)
    ]);
    
    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${quiz.quiz_name} - Results.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show loading or error states
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p>Loading quiz results...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-red-800">Error Loading Results</h2>
          <p className="text-red-700">{error || 'Quiz not found'}</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href={`/organizer/quizzes/${quizId}`}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Quiz
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <PageHeader 
            title={`${quiz.quiz_name} - Results`}
            description={`No attempts found for this quiz`}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/organizer/quizzes/${quizId}`}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Quiz
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-medium mb-2">No Attempts Yet</h2>
            <p className="text-gray-500 mb-6">
              There are no attempts for this quiz yet. Results will appear here once contestants take the quiz.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/organizer/quizzes/${quizId}`}>
                Return to Quiz
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title={`${quiz.quiz_name} - Results`}
          description={`Showing ${results.length} contestant results`}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/organizer/quizzes/${quizId}`}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Quiz
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Attempts</p>
                <p className="text-2xl font-bold">{results.length}</p>
              </div>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-2xl font-bold">
                  {Math.round(results.reduce((sum, r) => sum + r.summary.percentage, 0) / results.length)}%
                </p>
              </div>
              <div className="p-2 bg-green-100 text-green-600 rounded-full">
                <BarChart className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Highest Score</p>
                <p className="text-2xl font-bold">{results[0]?.summary.percentage}%</p>
              </div>
              <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full">
                <Medal className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Time</p>
                <p className="text-2xl font-bold">
                  {formatTimeTaken(
                    Math.round(results.reduce((sum, r) => sum + r.timeTaken, 0) / results.length)
                  )}
                </p>
              </div>
              <div className="p-2 bg-purple-100 text-purple-600 rounded-full">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quiz Results</CardTitle>
            <CardDescription>
              Ranked by number of correct answers and fastest time taken
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by name, contingent, or institution..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Rank</TableHead>
                  <TableHead>Contestant</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Correct / Total</TableHead>
                  <TableHead>Time Taken</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      No results match your search
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((result) => (
                    <TableRow key={result.attemptId}>
                      <TableCell className="font-medium">
                        {getRankBadge(result.rank)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {result.contingentLogoUrl ? (
                            <div className="relative w-8 h-8 overflow-hidden rounded-full border border-gray-100">
                              <Image 
                                src={result.contingentLogoUrl} 
                                alt={result.contingentName || 'Contingent logo'} 
                                width={32} 
                                height={32} 
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500">
                              <Users className="h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{result.contestantName}</div>
                            <div className="text-xs text-gray-500">
                              {result.contingentName.replace(' Contingent', '')} 
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-primary">
                          {result.summary.percentage}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {result.score} points
                        </div>
                      </TableCell>
                      <TableCell>
                        {result.summary.correctAnswers} / {result.summary.totalQuestions}
                      </TableCell>
                      <TableCell>
                        {formatTimeTaken(result.timeTaken)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(result.endTime), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(result.endTime), "MMM d, yyyy h:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedResult(result);
                            setDetailsOpen(true);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Contestant Quiz Details</span>
              <DialogClose className="w-6 h-6 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4" />
              </DialogClose>
            </DialogTitle>
          </DialogHeader>
          
          {selectedResult && (
            <div className="space-y-6">
              {/* Contestant Information */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <UserCircle className="w-5 h-5 mr-2 text-primary" />
                    Contestant Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-4">
                    {selectedResult.contingentLogoUrl ? (
                      <div className="relative w-16 h-16 overflow-hidden rounded-full border border-gray-100">
                        <Image 
                          src={selectedResult.contingentLogoUrl} 
                          alt={selectedResult.contingentName || 'Contingent logo'} 
                          width={64} 
                          height={64} 
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-500">
                        <Users className="h-8 w-8" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-lg">{selectedResult.contestantName}</div>
                      <div className="text-sm text-gray-500">ID: {selectedResult.contestantHash}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <div className="text-sm text-gray-500">Contingent</div>
                      <div>{selectedResult.contingentName.replace(' Contingent', '')}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Institution</div>
                      <div>{selectedResult.institutionName}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Attempt Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Medal className="w-5 h-5 mr-2 text-primary" />
                    Quiz Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 text-green-600 rounded-full mr-3">
                        <BarChart className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Score</div>
                        <div className="font-medium">{selectedResult.score} points ({selectedResult.summary.percentage}%)</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-full mr-3">
                        <Timer className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Time Taken</div>
                        <div className="font-medium">{formatTimeTaken(selectedResult.timeTaken)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm text-gray-500">Questions</div>
                        <div className="font-medium">{selectedResult.summary.correctAnswers} / {selectedResult.summary.totalQuestions} correct</div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm text-gray-500">Completed</div>
                        <div className="font-medium">{format(new Date(selectedResult.endTime), "MMM d, yyyy h:mm a")}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm text-gray-500 mb-1">Quiz Timing</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Start: </span>
                        {format(new Date(selectedResult.startTime), "h:mm:ss a")}
                      </div>
                      <div>
                        <span className="text-gray-500">End: </span>
                        {format(new Date(selectedResult.endTime), "h:mm:ss a")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Rank Information */}
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-md">
                <div>
                  <div className="text-sm text-gray-500">Rank</div>
                  <div className="text-xl font-bold flex items-center">
                    #{selectedResult.rank}
                    {selectedResult.rank <= 3 && (
                      <span className="ml-2">
                        {selectedResult.rank === 1 && "🥇"}
                        {selectedResult.rank === 2 && "🥈"}
                        {selectedResult.rank === 3 && "🥉"}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDetailsOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

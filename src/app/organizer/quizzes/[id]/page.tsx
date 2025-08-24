"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Edit, ChevronLeft, Pencil, Eye, List, Check, X, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Question = {
  id: number;
  target_group: string;
  knowledge_field: string;
  question: string;
  question_image?: string;
  answer_type: "single_selection" | "multiple_selection" | "binary";
  answer_options: Array<{
    option: string;
    answer: string;
  }>;
  answer_correct: string;
};

type QuizQuestion = Question & {
  order: number;
  points: number;
};

// Interface for Quiz with correct types
type Quiz = {
  id: number;
  quiz_name: string;
  description: string | null;
  target_group: string;
  time_limit: number | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  creatorName: string;
  totalQuestions: number;
  totalPoints: number;
  questions?: QuizQuestion[];
};

export default function QuizDetailPage({ params }: { params: { id: string } }) {
  const quizId = parseInt(params.id);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [assignedQuestions, setAssignedQuestions] = useState<QuizQuestion[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isRetractDialogOpen, setIsRetractDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch quiz data
  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch quiz details
        const quizResponse = await fetch(`/api/organizer/quizzes/${quizId}`);
        if (!quizResponse.ok) {
          throw new Error('Failed to load quiz details');
        }
        const quizData = await quizResponse.json();
        setQuiz(quizData);
        
        // Fetch questions for this quiz
        const questionsResponse = await fetch(`/api/organizer/quizzes/${quizId}/questions`);
        if (!questionsResponse.ok) {
          throw new Error('Failed to load quiz questions');
        }
        const questionsData = await questionsResponse.json();
        setAssignedQuestions(questionsData);
      } catch (error) {
        console.error('Error loading quiz data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (quizId) {
      fetchQuizData();
    }
  }, [quizId]);

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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'single_selection':
        return 'Single Selection';
      case 'multiple_selection':
        return 'Multiple Selection';
      case 'binary':
        return 'Binary (Yes/No)';
      default:
        return type;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'single_selection':
        return 'bg-blue-100 text-blue-800';
      case 'multiple_selection':
        return 'bg-purple-100 text-purple-800';
      case 'binary':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const publishQuiz = async () => {
    setActionLoading(true);

    try {
      // Send the request to publish the quiz
      const response = await fetch(`/api/organizer/quizzes/${quizId}/publish`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish quiz');
      }

      toast.success("Quiz published successfully!");
      setIsPublishDialogOpen(false);

      // Refresh quiz data
      const updatedQuizResponse = await fetch(`/api/organizer/quizzes/${quizId}`);
      if (updatedQuizResponse.ok) {
        const updatedQuizData = await updatedQuizResponse.json();
        setQuiz(updatedQuizData);
      }
    } catch (error) {
      console.error("Error publishing quiz:", error);
      toast.error(error instanceof Error ? error.message : "Failed to publish quiz");
    } finally {
      setActionLoading(false);
    }
  };

  const retractQuiz = async () => {
    setActionLoading(true);

    try {
      // Send the request to retract the quiz by updating its status
      const response = await fetch(`/api/organizer/quizzes/${quizId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quiz_name: quiz!.quiz_name,
          description: quiz!.description,
          target_group: quiz!.target_group,
          time_limit: quiz!.time_limit,
          status: 'created'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retract quiz');
      }

      toast.success("Quiz retracted successfully!");
      setIsRetractDialogOpen(false);

      // Refresh quiz data
      const updatedQuizResponse = await fetch(`/api/organizer/quizzes/${quizId}`);
      if (updatedQuizResponse.ok) {
        const updatedQuizData = await updatedQuizResponse.json();
        setQuiz(updatedQuizData);
      }
    } catch (error) {
      console.error("Error retracting quiz:", error);
      toast.error(error instanceof Error ? error.message : "Failed to retract quiz");
    } finally {
      setActionLoading(false);
    }
  };

  // Show loading or error states
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex flex-col items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <h2 className="text-lg font-semibold text-red-800">Error Loading Quiz</h2>
          <p className="text-red-700">{error || 'Quiz not found'}</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/organizer/quizzes">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Quizzes
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title={quiz.quiz_name}
          description={`Quiz for ${quiz.target_group}`}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/organizer/quizzes">
              <ChevronLeft className="w-4 h-4 mr-2" />
              All Quizzes
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Target Group</p>
                      <p className="font-medium">{quiz.target_group}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Status</p>
                      <div>{getStatusBadge(quiz.status)}</div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Time Limit</p>
                      <p className="font-medium flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {quiz.time_limit ? `${quiz.time_limit} minutes` : "No time limit"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Created On</p>
                      <p className="font-medium flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {format(new Date(quiz.createdAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Questions</p>
                      <p className="font-medium">{assignedQuestions.length} questions</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Total Points</p>
                      <p className="font-medium">{assignedQuestions.reduce((sum, q) => sum + q.points, 0)} points</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Created By</p>
                      <p className="font-medium">{quiz.creatorName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Published Date</p>
                      <p className="font-medium">
                        {quiz.publishedAt 
                          ? format(new Date(quiz.publishedAt), "MMMM d, yyyy") 
                          : "Not published yet"}
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-between">
                  <Button variant="outline" asChild>
                    <Link href={`/organizer/quizzes/${quizId}/edit`}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Quiz
                    </Link>
                  </Button>
                  <div className="flex gap-2">
                    <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          disabled={quiz.status !== 'created' || assignedQuestions.length === 0}
                        >
                          Publish Quiz
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Publish Quiz</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to publish this quiz? Once published, it will be available to participants.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <div className="flex items-start gap-2 bg-yellow-50 p-4 rounded-md text-yellow-800">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Important Note</p>
                              <p className="text-sm">
                                After publishing, you won't be able to edit the quiz questions, but you can still retract the quiz if needed.
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-3">
                            <div className="flex justify-between">
                              <span>Quiz Name:</span>
                              <span className="font-medium">{quiz.quiz_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Questions:</span>
                              <span className="font-medium">{assignedQuestions.length} questions</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Time Limit:</span>
                              <span className="font-medium">
                                {quiz.time_limit ? `${quiz.time_limit} minutes` : "No time limit"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsPublishDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={publishQuiz} disabled={actionLoading}>
                            {actionLoading ? "Publishing..." : "Publish Quiz"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Retract Quiz Dialog */}
                    <Dialog open={isRetractDialogOpen} onOpenChange={setIsRetractDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Retract Quiz</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to retract this quiz? This will change its status back to draft and make it unavailable to participants.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <div className="flex items-start gap-2 bg-red-50 p-4 rounded-md text-red-800">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Warning</p>
                              <p className="text-sm">
                                Retracting this quiz will change its status back to draft and make it immediately unavailable to all participants. You can then edit and republish it if needed.
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-3">
                            <div className="flex justify-between">
                              <span>Quiz Name:</span>
                              <span className="font-medium">{quiz.quiz_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Current Status:</span>
                              <span className="font-medium">Published → Draft</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Published On:</span>
                              <span className="font-medium">
                                {quiz.publishedAt ? format(new Date(quiz.publishedAt), "MMMM d, yyyy") : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsRetractDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={retractQuiz} 
                            disabled={actionLoading}
                          >
                            {actionLoading ? "Retracting..." : "Retract Quiz"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Quiz Questions</CardTitle>
                    <CardDescription>
                      {assignedQuestions.length} questions • {assignedQuestions.reduce((sum, q) => sum + q.points, 0)} total points
                    </CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/organizer/quizzes/${quizId}/questions`}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Manage Questions
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {assignedQuestions.length === 0 ? (
                    <div className="text-center py-12 border rounded-md bg-gray-50">
                      <h3 className="text-lg font-medium mb-2">No questions assigned</h3>
                      <p className="text-gray-500 mb-4">
                        This quiz doesn't have any questions yet. Add questions to create your quiz.
                      </p>
                      <Button asChild>
                        <Link href={`/organizer/quizzes/${quizId}/questions`}>
                          Add Questions
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[60px]">Order</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assignedQuestions.map((question) => (
                            <TableRow key={question.id}>
                              <TableCell className="font-medium text-center">{question.order}</TableCell>
                              <TableCell>
                                <div className="line-clamp-2">{question.question}</div>
                                {question.question_image && (
                                  <div className="text-xs text-blue-600 mt-1">Has image</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge className={getTypeBadgeColor(question.answer_type)}>
                                  {getTypeLabel(question.answer_type)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {question.points} point{question.points !== 1 ? 's' : ''}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Preview</CardTitle>
                  <CardDescription>
                    Preview how the quiz will appear to participants
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-w-2xl mx-auto border rounded-lg overflow-hidden">
                    <div className="bg-primary/10 p-4 border-b">
                      <h2 className="text-xl font-bold">{quiz.quiz_name}</h2>
                      {quiz.description && <p className="text-sm mt-1">{quiz.description}</p>}
                      
                      <div className="flex items-center gap-2 mt-3">
                        <div className="bg-white rounded-full px-3 py-1 text-sm flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {quiz.time_limit ? `${quiz.time_limit} min` : "No limit"}
                        </div>
                        <div className="bg-white rounded-full px-3 py-1 text-sm flex items-center">
                          <List className="w-3.5 h-3.5 mr-1" />
                          {assignedQuestions.length} questions
                        </div>
                        <div className="bg-white rounded-full px-3 py-1 text-sm flex items-center">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {assignedQuestions.reduce((sum, q) => sum + q.points, 0)} points
                        </div>
                      </div>
                    </div>
                    
                    {assignedQuestions.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <p>No questions have been added to this quiz yet.</p>
                      </div>
                    ) : (
                      <>
                        <div className="p-6 border-b">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-sm text-gray-500">Question 1 of {assignedQuestions.length}</span>
                              <h3 className="text-lg font-medium">
                                {assignedQuestions[0].question}
                              </h3>
                            </div>
                            <Badge>{assignedQuestions[0].points} pt{assignedQuestions[0].points !== 1 ? 's' : ''}</Badge>
                          </div>
                          
                          <div className="space-y-2 mt-4">
                            {assignedQuestions[0].answer_options.map((option) => (
                              <div 
                                key={option.option} 
                                className="flex items-center gap-3 p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                              >
                                <div className="w-6 h-6 flex items-center justify-center bg-primary/10 rounded-full">
                                  {option.option}
                                </div>
                                <div>{option.answer}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="p-4 flex justify-between items-center bg-gray-50">
                          <Button variant="outline" disabled>Previous</Button>
                          <span className="text-sm text-gray-500">Question 1 of {assignedQuestions.length}</span>
                          <Button>Next Question</Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-6 flex justify-end">
                  <Button asChild>
                    <Link href={`/organizer/quizzes/${quizId}/preview`}>
                      <Eye className="w-4 h-4 mr-2" />
                      Full Preview
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quiz Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="text-xl font-semibold">
                    {getStatusBadge(quiz.status)}
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  {quiz.status === 'created' && (
                    <>
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>Quiz created successfully</div>
                      </div>
                      {assignedQuestions.length > 0 ? (
                        <div className="flex items-start gap-2 text-sm">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div>Questions added ({assignedQuestions.length})</div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 text-sm">
                          <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <div>No questions added yet</div>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-sm">
                        <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div>Not published yet</div>
                      </div>
                    </>
                  )}
                  
                  {quiz.status === 'published' && (
                    <>
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>Quiz created successfully</div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>Questions added ({assignedQuestions.length})</div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>Published on {quiz.publishedAt ? format(new Date(quiz.publishedAt), "MMMM d, yyyy") : 'N/A'}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 flex flex-col gap-2">
              {quiz.status === 'created' && (
                <>
                  <Button 
                    className="w-full" 
                    disabled={assignedQuestions.length === 0}
                    onClick={() => setIsPublishDialogOpen(true)}
                  >
                    Publish Quiz
                  </Button>
                  {assignedQuestions.length === 0 && (
                    <p className="text-xs text-amber-600 text-center">
                      Add at least one question before publishing
                    </p>
                  )}
                </>
              )}
              
              {quiz.status === 'published' && (
                <Button 
                  variant="outline" 
                  className="w-full bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                  onClick={() => setIsRetractDialogOpen(true)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Retract Quiz'}
                </Button>
              )}
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quiz Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/organizer/quizzes/${quizId}/edit`}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Quiz Details
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/organizer/quizzes/${quizId}/questions`}>
                  <List className="w-4 h-4 mr-2" />
                  Manage Questions
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href={`/organizer/quizzes/${quizId}/preview`}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Quiz
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled={quiz.status !== 'published'} asChild>
                <Link href={`/organizer/quizzes/${quizId}/result`}>
                  <Check className="w-4 h-4 mr-2" />
                  View Results
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

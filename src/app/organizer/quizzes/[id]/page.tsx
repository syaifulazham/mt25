"use client";

import React, { useState } from "react";
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

// Mock quiz data
const mockQuiz = {
  id: 1,
  quiz_name: "Science Knowledge Quiz",
  description: "Test your understanding of basic scientific concepts",
  target_group: "SECONDARY",
  time_limit: 30,
  status: "created",
  publishedAt: null,
  createdAt: new Date("2025-04-28"),
  updatedAt: new Date("2025-04-28"),
  createdBy: 1,
  creatorName: "Admin User",
  totalQuestions: 2,
  totalPoints: 3,
};

// Mock data for questions already assigned to the quiz
const mockAssignedQuestions: QuizQuestion[] = [
  {
    id: 2,
    target_group: "SECONDARY",
    knowledge_field: "physics",
    question: "What is the formula for calculating force?",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "F = ma" },
      { option: "B", answer: "F = mg" },
      { option: "C", answer: "F = mv²/r" },
      { option: "D", answer: "F = mc²" }
    ],
    answer_correct: "A",
    order: 1,
    points: 1,
  },
  {
    id: 4,
    target_group: "SECONDARY",
    knowledge_field: "chemistry",
    question: "Which of the following is a noble gas?",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "Hydrogen" },
      { option: "B", answer: "Oxygen" },
      { option: "C", answer: "Neon" },
      { option: "D", answer: "Nitrogen" }
    ],
    answer_correct: "C",
    order: 2,
    points: 2,
  },
];

export default function QuizDetailPage({ params }: { params: { id: string } }) {
  const quizId = parseInt(params.id);
  const [activeTab, setActiveTab] = useState("overview");
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    
    try {
      // Here we would send the request to publish the quiz
      // const response = await fetch(`/api/organizer/quizzes/${quizId}/publish`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   }
      // });
      
      // For demo purposes, we'll just simulate an API call
      setTimeout(() => {
        toast.success("Quiz published successfully!");
        setIsLoading(false);
        setIsPublishDialogOpen(false);
        // Refresh the page to show updated status
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error("Error publishing quiz:", error);
      toast.error("Failed to publish quiz. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title={mockQuiz.quiz_name} 
          description={mockQuiz.description || "No description provided"}
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
                      <p className="font-medium">{mockQuiz.target_group}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Status</p>
                      <div>{getStatusBadge(mockQuiz.status)}</div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Time Limit</p>
                      <p className="font-medium flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-gray-400" />
                        {mockQuiz.time_limit ? `${mockQuiz.time_limit} minutes` : "No time limit"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Created On</p>
                      <p className="font-medium flex items-center">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {format(mockQuiz.createdAt, "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Questions</p>
                      <p className="font-medium">{mockQuiz.totalQuestions} questions</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Total Points</p>
                      <p className="font-medium">{mockQuiz.totalPoints} points</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Created By</p>
                      <p className="font-medium">{mockQuiz.creatorName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500">Published Date</p>
                      <p className="font-medium">
                        {mockQuiz.publishedAt 
                          ? format(mockQuiz.publishedAt, "MMMM d, yyyy") 
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
                          disabled={mockQuiz.status !== 'created' || mockQuiz.totalQuestions === 0}
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
                              <span className="font-medium">{mockQuiz.quiz_name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Questions:</span>
                              <span className="font-medium">{mockQuiz.totalQuestions} questions</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Time Limit:</span>
                              <span className="font-medium">
                                {mockQuiz.time_limit ? `${mockQuiz.time_limit} minutes` : "No time limit"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsPublishDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={publishQuiz} disabled={isLoading}>
                            {isLoading ? "Publishing..." : "Publish Quiz"}
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
                      {mockAssignedQuestions.length} questions • {mockAssignedQuestions.reduce((sum, q) => sum + q.points, 0)} total points
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
                  {mockAssignedQuestions.length === 0 ? (
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
                            <TableHead>Field</TableHead>
                            <TableHead className="text-right">Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mockAssignedQuestions.map((question) => (
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
                              <TableCell>
                                <div className="capitalize">{question.knowledge_field}</div>
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
                      <h2 className="text-xl font-bold">{mockQuiz.quiz_name}</h2>
                      {mockQuiz.description && <p className="text-sm mt-1">{mockQuiz.description}</p>}
                      
                      <div className="flex items-center gap-2 mt-3">
                        <div className="bg-white rounded-full px-3 py-1 text-sm flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {mockQuiz.time_limit ? `${mockQuiz.time_limit} min` : "No limit"}
                        </div>
                        <div className="bg-white rounded-full px-3 py-1 text-sm flex items-center">
                          <List className="w-3.5 h-3.5 mr-1" />
                          {mockQuiz.totalQuestions} questions
                        </div>
                        <div className="bg-white rounded-full px-3 py-1 text-sm flex items-center">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          {mockQuiz.totalPoints} points
                        </div>
                      </div>
                    </div>
                    
                    {mockAssignedQuestions.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <p>No questions have been added to this quiz yet.</p>
                      </div>
                    ) : (
                      <>
                        <div className="p-6 border-b">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-sm text-gray-500">Question 1 of {mockAssignedQuestions.length}</span>
                              <h3 className="text-lg font-medium">
                                {mockAssignedQuestions[0].question}
                              </h3>
                            </div>
                            <Badge>{mockAssignedQuestions[0].points} pt{mockAssignedQuestions[0].points !== 1 ? 's' : ''}</Badge>
                          </div>
                          
                          <div className="space-y-2 mt-4">
                            {mockAssignedQuestions[0].answer_options.map((option) => (
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
                          <span className="text-sm text-gray-500">Question 1 of {mockAssignedQuestions.length}</span>
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
                    {getStatusBadge(mockQuiz.status)}
                  </div>
                </div>
                
                <div className="space-y-3 pt-2">
                  {mockQuiz.status === 'created' && (
                    <>
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>Quiz created successfully</div>
                      </div>
                      {mockQuiz.totalQuestions > 0 ? (
                        <div className="flex items-start gap-2 text-sm">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div>Questions added ({mockQuiz.totalQuestions})</div>
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
                  
                  {mockQuiz.status === 'published' && (
                    <>
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>Quiz created successfully</div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>Questions added ({mockQuiz.totalQuestions})</div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <div>Published on {mockQuiz.publishedAt ? format(mockQuiz.publishedAt, "MMMM d, yyyy") : "N/A"}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 flex flex-col gap-2">
              {mockQuiz.status === 'created' && (
                <>
                  <Button 
                    className="w-full" 
                    disabled={mockQuiz.totalQuestions === 0}
                    onClick={() => setIsPublishDialogOpen(true)}
                  >
                    Publish Quiz
                  </Button>
                  {mockQuiz.totalQuestions === 0 && (
                    <p className="text-xs text-amber-600 text-center">
                      Add at least one question before publishing
                    </p>
                  )}
                </>
              )}
              
              {mockQuiz.status === 'published' && (
                <Button variant="outline" className="w-full bg-red-50 hover:bg-red-100 text-red-600 border-red-200">
                  Retract Quiz
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
              <Button variant="outline" className="w-full justify-start" disabled={mockQuiz.status !== 'published'}>
                <Check className="w-4 h-4 mr-2" />
                View Results
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

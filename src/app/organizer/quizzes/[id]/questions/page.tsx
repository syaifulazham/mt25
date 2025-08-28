"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, Filter, ChevronLeft, Plus, Save, X, ArrowUp, ArrowDown } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { QuestionDetailModal } from "../../questions/question-detail-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

type Question = {
  id: number;
  questionId: number;
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
  points?: number;
};

type QuizQuestion = Question & {
  order: number;
  points: number;
};

// Enhanced Question type including assignment status
type EnhancedQuestion = Question & {
  isAlreadyAssigned?: boolean;
};

// Interface for Quiz
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
  totalQuestions: number;
  totalPoints: number;
};

export default function QuizQuestionsPage({ params }: { params: { id: string } }) {
  const quizId = parseInt(params.id);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [assignedQuestions, setAssignedQuestions] = useState<QuizQuestion[]>([]);
  const [questionBank, setQuestionBank] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetGroups, setTargetGroups] = useState<Array<{code: string, name: string, minAge: number, maxAge: number}>>([]);
  const [strictAgeFilter, setStrictAgeFilter] = useState(false);
  
  // Question detail modal state
  const [selectedQuestionDetail, setSelectedQuestionDetail] = useState<Question | null>(null);
  const [isQuestionDetailOpen, setIsQuestionDetailOpen] = useState(false);

  // Load quiz details and assigned questions
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
        
        // Fetch assigned questions
        const questionsResponse = await fetch(`/api/organizer/quizzes/${quizId}/questions`);
        if (!questionsResponse.ok) {
          throw new Error('Failed to load quiz questions');
        }
        const questionsData = await questionsResponse.json();
        setAssignedQuestions(questionsData);
        
        // Fetch question bank and target groups
        const [questionBankResponse, targetGroupsResponse] = await Promise.all([
          fetch('/api/organizer/questions?pageSize=1000', {
            credentials: 'include', // Include credentials for authenticated requests
            cache: 'no-store' // Ensure fresh data
          }),
          fetch('/api/organizer/targetgroups', {
            credentials: 'include', // Include credentials for authenticated requests
            cache: 'no-store' // Ensure fresh data
          })
        ]);
        
        if (!questionBankResponse.ok) {
          throw new Error('Failed to load question bank');
        }
        if (!targetGroupsResponse.ok) {
          throw new Error('Failed to load target groups');
        }
        
        const questionBankData = await questionBankResponse.json();
        const targetGroupsData = await targetGroupsResponse.json();
        
        // Check for error or unauthorized response
        if (questionBankData.error) {
          console.error('Question bank API returned error:', questionBankData.error);
          setQuestionBank([]);
        }
        // Check for pagination structure - API returns { questions: [...], pagination: {...} }
        else if (questionBankData.questions && Array.isArray(questionBankData.questions)) {
          console.log('Retrieved', questionBankData.questions.length, 'questions from API');
          console.log('Pagination info:', questionBankData.pagination);
          // Log how many questions match the target group
          const quizTargetGroup = quizData.target_group;
          const matchingQuestions = questionBankData.questions.filter(q => q.target_group === quizTargetGroup);
          console.log(`Questions matching quiz target group '${quizTargetGroup}':`, matchingQuestions.length);
          setQuestionBank(questionBankData.questions);
        }
        // Ensure questionBankData is an array
        else if (!Array.isArray(questionBankData)) {
          console.error('API returned non-array questionBankData:', questionBankData);
          setQuestionBank([]);
        } else {
          setQuestionBank(questionBankData);
        }
        setTargetGroups(targetGroupsData.map((tg: any) => ({
          code: tg.value,
          name: tg.label,
          minAge: tg.minAge,
          maxAge: tg.maxAge
        })));
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
  
  // Helper function to check if quiz target group is compatible with question target group
  const isTargetGroupCompatible = (quizTargetGroup: string, questionTargetGroup: string) => {
    // If not using strict age filtering, just compare codes
    if (!strictAgeFilter) {
      return quizTargetGroup === questionTargetGroup;
    }
    
    // With strict filtering, check if quiz age range engulfs the question age range
    const quizTG = targetGroups.find(tg => tg.code === quizTargetGroup);
    const questionTG = targetGroups.find(tg => tg.code === questionTargetGroup);
    
    if (!quizTG || !questionTG) {
      // Fallback to direct code comparison if target group data not found
      return quizTargetGroup === questionTargetGroup;
    }
    
    // Check if quiz age range engulfs the question age range
    // Quiz min age must be <= question min age AND quiz max age must be >= question max age
    return quizTG.minAge <= questionTG.minAge && quizTG.maxAge >= questionTG.maxAge;
  };

  // Filter question bank questions, showing all matching questions but marking already assigned ones
  const filterQuestionBank = (questions: any) => {
    // Ensure questions is an array before proceeding
    if (!Array.isArray(questions)) {
      console.error('Expected questions to be an array but got:', typeof questions);
      return [];
    }
    
    // Check if a question is already assigned to this quiz
    // The API returns question IDs (questionId field) from the junction table
    const assignedQuestionIds = assignedQuestions.map(q => q.questionId || q.id);
    console.log('Already assigned question IDs:', assignedQuestionIds);
    
    // Instead of filtering out assigned questions, we'll include all questions
    // that match other criteria (target group and search term)
    return questions.filter(q => {
      // Ensure the question is a valid object with required properties
      if (!q || typeof q !== 'object' || !('id' in q)) return false;
      
      // Check if quiz exists and target group is compatible
      if (!quiz) return false;
      if (!q.target_group || !isTargetGroupCompatible(quiz.target_group, q.target_group)) return false;
      
      // Check if it matches the search term
      return searchTerm === '' || 
        (q.question && typeof q.question === 'string' && q.question.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (q.knowledge_field && typeof q.knowledge_field === 'string' && q.knowledge_field.toLowerCase().includes(searchTerm.toLowerCase()));
    }).map(q => {
      // Check if this question is already assigned to the quiz
      const isAlreadyAssigned = assignedQuestionIds.includes(q.id);
      if (isAlreadyAssigned) {
        console.log(`Question ${q.id} (${q.question}) is already assigned`);
      }
      return {
        ...q,
        isAlreadyAssigned
      };
    });
  };

  const availableQuestions: EnhancedQuestion[] = filterQuestionBank(questionBank);

  const toggleQuestionSelection = (id: number) => {
    // Find the question in available questions
    const question = availableQuestions.find(q => q.id === id);
    
    // Don't allow selection if the question is already assigned to the quiz
    if (question && question.isAlreadyAssigned) {
      toast.warning("This question is already added to the quiz");
      console.log(`Prevented selection of already assigned question ${id}`);
      return;
    }
    
    setSelectedQuestions((prevState: number[]) => {
      const isSelected = prevState.includes(id);
      if (isSelected) {
        return prevState.filter(qId => qId !== id);
      } else {
        return [...prevState, id];
      }
    });
  };

  const selectAllAvailableQuestions = () => {
    // Only select questions that aren't already assigned
    const selectableQuestions = availableQuestions.filter(q => !q.isAlreadyAssigned);
    setSelectedQuestions(selectableQuestions.map(q => q.id));
    
    // Show a message if some questions couldn't be selected because they're already assigned
    const alreadyAssignedCount = availableQuestions.filter(q => q.isAlreadyAssigned).length;
    if (alreadyAssignedCount > 0) {
      toast.info(`${alreadyAssignedCount} question(s) were skipped because they are already in the quiz.`);
      console.log(`Skipped ${alreadyAssignedCount} already assigned questions in Select All operation`);
    }
  };

  const deselectAllQuestions = () => {
    setSelectedQuestions([]);
  };

  const addSelectedQuestions = () => {
    // Get the selected questions from the question bank
    // Make sure we only add questions that aren't already assigned
    const questionsToAdd = availableQuestions
      .filter(q => selectedQuestions.includes(q.id) && !q.isAlreadyAssigned)
      .map((q, index) => ({
        ...q,
        order: assignedQuestions.length + index + 1,
        points: 1 // Default points
      }));
    
    if (questionsToAdd.length === 0) {
      toast.warning("No new questions were added. Selected questions might already be in the quiz.");
      setIsAddDialogOpen(false);
      return;
    }
    
    setAssignedQuestions(prev => [...prev, ...questionsToAdd]);
    setSelectedQuestions([]);
    setIsAddDialogOpen(false);
    
    toast.success(`Added ${questionsToAdd.length} questions to the quiz`);
  };

  const removeQuestion = (id: number) => {
    setAssignedQuestions(prev => {
      const filtered = prev.filter(q => q.id !== id);
      // Re-number the order of remaining questions
      return filtered.map((q, index) => ({
        ...q,
        order: index + 1
      }));
    });
    
    toast.success("Question removed from quiz");
  };

  const moveQuestionUp = (id: number) => {
    setAssignedQuestions(prev => {
      const index = prev.findIndex(q => q.id === id);
      if (index <= 0) return prev; // Already at the top
      
      const newQuestions = [...prev];
      // Swap with the question above
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      
      // Update order properties
      return newQuestions.map((q, i) => ({
        ...q,
        order: i + 1
      }));
    });
  };

  const moveQuestionDown = (id: number) => {
    setAssignedQuestions(prev => {
      const index = prev.findIndex(q => q.id === id);
      if (index === -1 || index === prev.length - 1) return prev; // Already at the bottom
      
      const newQuestions = [...prev];
      // Swap with the question below
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      
      // Update order properties
      return newQuestions.map((q, i) => ({
        ...q,
        order: i + 1
      }));
    });
  };

  const updateQuestionPoints = (id: number, points: number) => {
    setAssignedQuestions(prev => 
      prev.map(q => q.id === id ? { ...q, points } : q)
    );
  };

  const saveQuizQuestions = async () => {
    setIsSaving(true);
    
    try {
      // Check session first
      const sessionCheck = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      
      const sessionData = await sessionCheck.json();
      console.log('Current session data:', sessionData);
      
      if (!sessionData.user) {
        toast.error("You're not authenticated. Please log in again.");
        setIsSaving(false);
        return;
      }
      
      // Send the assigned questions to the API
      console.log('Saving quiz questions:', JSON.stringify({
        questions: assignedQuestions.map(q => ({
          questionId: q.questionId || q.id,
          order: q.order,
          points: q.points
        }))
      }, null, 2));
      
      const response = await fetch(`/api/organizer/quizzes/${quizId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          questions: assignedQuestions.map(q => ({
            questionId: q.questionId || q.id, // Use questionId if available, otherwise fall back to id
            order: q.order,
            points: q.points
          }))
        }),
      });
      
      if (!response.ok) {
        console.error(`Error response status: ${response.status}`);
        const responseText = await response.text();
        console.error('Response body:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse error response as JSON', e);
          throw new Error(`HTTP Error ${response.status}: ${responseText}`);
        }
        
        throw new Error(errorData.error || `Failed to save quiz questions: ${response.status}`);
      }
      
      toast.success(`Updated quiz questions successfully!`);
      
      // Redirect to quizzes list page after saving
      window.location.href = `/organizer/quizzes`;
      
    } catch (error) {
      console.error("Error saving quiz questions:", error);
      toast.error("Failed to save quiz questions. Please try again.");
      setIsSaving(false);
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

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader 
          title={`Manage Quiz Questions: ${quiz?.quiz_name || 'Loading...'}`} 
          description="Add and organize questions for this quiz"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/organizer/quizzes/${quizId}`}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Quiz
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/organizer/quizzes">
              <ChevronLeft className="w-4 h-4 mr-2" />
              All Quizzes
            </Link>
          </Button>
        </div>
      </div>

      {quiz?.status === "published" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-center">
          <AlertTriangle className="text-amber-500 h-5 w-5 mr-2" />
          <div>
            <h4 className="font-medium text-amber-800">Published Quiz</h4>
            <p className="text-sm text-amber-700">This quiz is published and cannot be edited. You must retract it first to make changes.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quiz Questions</CardTitle>
          <CardDescription>
            {assignedQuestions.length} questions • {assignedQuestions.reduce((sum, q) => sum + q.points, 0)} total points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Dialog open={isAddDialogOpen} onOpenChange={quiz?.status !== "published" ? setIsAddDialogOpen : undefined}>
                <DialogTrigger asChild>
                  <Button disabled={quiz?.status === "published"} 
                    title={quiz?.status === "published" ? "Cannot edit questions for a published quiz" : "Add questions to this quiz"}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Questions
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-none w-[98vw] h-[95vh] flex flex-col m-0 p-6 !max-w-none !w-[98vw] left-[1vw] top-[2.5vh] transform-none">
                  <DialogHeader>
                    <DialogTitle>Add Questions to Quiz</DialogTitle>
                    <DialogDescription>
                      Select questions from the question bank to add to this quiz
                    </DialogDescription>
                    {quiz && (
                      <div className="mt-4 p-2 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-800">
                        <p className="font-medium">Debug Information:</p>
                        <p>Quiz Target Group: {quiz.target_group}</p>
                        <p>Quiz Age Range: {targetGroups.find(tg => tg.code === quiz.target_group)?.minAge || '?'}-{targetGroups.find(tg => tg.code === quiz.target_group)?.maxAge || '?'} years</p>
                        <p>Total Questions in Bank: {questionBank.length}</p>
                        <p>Questions with Same Target Group: {questionBank.filter(q => q.target_group === quiz.target_group).length}</p>
                        <p>Questions After Age Range Filter: {availableQuestions.length}</p>
                      </div>
                    )}
                  </DialogHeader>
                  
                  <div className="flex justify-between items-center my-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      <Input
                        placeholder="Search questions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 w-80"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Exact target group matching</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={!strictAgeFilter}
                          onChange={() => setStrictAgeFilter(!strictAgeFilter)} 
                          className="sr-only peer" 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <span className="text-sm">Strict age range filtering</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{availableQuestions.length} questions available</Badge>
                      <Badge variant="outline">{selectedQuestions.length} selected</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={selectAllAvailableQuestions}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={deselectAllQuestions}>
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  
                  <div className="overflow-y-auto flex-1 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Question</TableHead>
                          <TableHead className="w-[150px]">Target Group</TableHead>
                          <TableHead className="w-[150px]">Type</TableHead>
                          <TableHead className="w-[150px]">Field</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableQuestions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                              {searchTerm ? (
                                <>No matching questions found. Try a different search term.</>
                              ) : (
                                <>No available questions found for this target group.</>
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          availableQuestions.map((question) => {
                            // Determine if this question is already assigned to the quiz
                            const isDisabled = question.isAlreadyAssigned === true;
                            return (
                              <TableRow key={question.id} className={isDisabled ? 'opacity-60' : ''}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedQuestions.includes(question.id)}
                                    onCheckedChange={() => {
                                      // Only toggle selection if the question isn't already assigned
                                      if (!isDisabled) {
                                        toggleQuestionSelection(question.id);
                                      } else {
                                        toast.warning("This question is already added to the quiz");
                                      }
                                    }}
                                    disabled={isDisabled}
                                    className={isDisabled ? 'cursor-not-allowed' : ''}
                                  />
                                </TableCell>
                                <TableCell 
                                  className="cursor-pointer hover:bg-gray-50"
                                  onClick={() => {
                                    setSelectedQuestionDetail(question);
                                    setIsQuestionDetailOpen(true);
                                  }}
                                >
                                  <div 
                                    className="break-words max-w-[35ch]" 
                                    title={question.question}
                                  >
                                    {question.question.length > 50 
                                      ? `${question.question.substring(0, 50)}...` 
                                      : question.question}
                                  </div>
                                  {isDisabled && (
                                    <div className="text-xs text-amber-600 mt-1 font-medium">Note: Already in quiz</div>
                                  )}
                                  {question.question_image && (
                                    <div className="text-xs text-blue-600 mt-1">Has image</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const targetGroup = targetGroups.find(tg => tg.code === question.target_group);
                                    return targetGroup ? targetGroup.name : question.target_group;
                                  })()}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getTypeBadgeColor(question.answer_type)}>
                                    {getTypeLabel(question.answer_type)}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="capitalize">{question.knowledge_field}</div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={addSelectedQuestions} 
                      disabled={selectedQuestions.length === 0}
                    >
                      Add {selectedQuestions.length} Question{selectedQuestions.length !== 1 ? 's' : ''}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div>
              <div className="text-sm text-gray-500">
                Quiz requires minimum 1 question to publish
              </div>
            </div>
          </div>
          
          {assignedQuestions.length === 0 ? (
            <div className="text-center py-12 border rounded-md bg-gray-50">
              <h3 className="text-lg font-medium mb-2">No questions assigned</h3>
              <p className="text-gray-500 mb-4">
                This quiz doesn't have any questions yet. Add questions to create your quiz.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Question
              </Button>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">Order</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[100px]">Field</TableHead>
                    <TableHead className="w-[100px]">Points</TableHead>
                    <TableHead className="w-[180px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="font-medium text-center">{question.order}</TableCell>
                      <TableCell 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setSelectedQuestionDetail(question);
                          setIsQuestionDetailOpen(true);
                        }}
                      >
                        <div 
                          className="break-words max-w-[35ch]" 
                          title={question.question} // Add tooltip with full text
                        >
                          {question.question.length > 50 
                            ? `${question.question.substring(0, 50)}...` 
                            : question.question}
                        </div>
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              {question.points} point{question.points !== 1 ? 's' : ''}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Set Points</DropdownMenuLabel>
                            {[1, 2, 3, 5, 10].map((points) => (
                              <DropdownMenuItem 
                                key={points}
                                onClick={() => updateQuestionPoints(question.id, points)}
                                className={question.points === points ? "bg-blue-50 text-blue-700 font-medium" : ""}
                              >
                                {points} point{points !== 1 ? 's' : ''}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveQuestionUp(question.id)}
                            disabled={question.order === 1}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => moveQuestionDown(question.id)}
                            disabled={question.order === assignedQuestions.length}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeQuestion(question.id)}
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => window.location.href = `/organizer/quizzes/${quizId}`}
          >
            Cancel
          </Button>
          <div className="fixed bottom-8 right-8 z-10">
            <Button 
              onClick={saveQuizQuestions} 
              disabled={isSaving || quiz?.status === "published"}
              size="lg"
              title={quiz?.status === "published" ? "Cannot edit questions for a published quiz" : "Save question changes"}
            >
              {isSaving ? 'Saving...' : 'Save Questions'}
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Question Detail Modal */}
      <QuestionDetailModal
        question={selectedQuestionDetail}
        open={isQuestionDetailOpen}
        onOpenChange={setIsQuestionDetailOpen}
      />
    </div>
  );
}

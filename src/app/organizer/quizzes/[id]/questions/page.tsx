"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Search, Filter, ChevronLeft, Plus, Save, X, ArrowUp, ArrowDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
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
          fetch('/api/organizer/questions', {
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
  
  // Helper function to check if two age ranges overlap
  const ageRangesOverlap = (quizTargetGroup: string, questionTargetGroup: string) => {
    const quizTG = targetGroups.find(tg => tg.code === quizTargetGroup);
    const questionTG = targetGroups.find(tg => tg.code === questionTargetGroup);
    
    if (!quizTG || !questionTG) {
      // Fallback to direct code comparison if target group data not found
      return quizTargetGroup === questionTargetGroup;
    }
    
    // Check if age ranges overlap
    // Two ranges overlap if: max1 >= min2 && max2 >= min1
    return quizTG.maxAge >= questionTG.minAge && questionTG.maxAge >= quizTG.minAge;
  };

  // Filter question bank questions, excluding ones already assigned
  const filterQuestionBank = (questions: any) => {
    // Ensure questions is an array before proceeding
    if (!Array.isArray(questions)) {
      console.error('Expected questions to be an array but got:', typeof questions);
      return [];
    }
    
    const assignedIds = assignedQuestions.map(q => q.id);
    
    return questions.filter(q => {
      // Ensure the question is a valid object with required properties
      if (!q || typeof q !== 'object' || !('id' in q)) return false;
      
      // First check if the question is already assigned
      if (assignedIds.includes(q.id)) return false;
      
      // Then check if quiz exists and age ranges overlap
      if (!quiz) return false;
      if (!q.target_group || !ageRangesOverlap(quiz.target_group, q.target_group)) return false;
      
      // Finally check if it matches the search term
      return searchTerm === '' || 
        (q.question && typeof q.question === 'string' && q.question.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (q.knowledge_field && typeof q.knowledge_field === 'string' && q.knowledge_field.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  };

  const availableQuestions = filterQuestionBank(questionBank);

  const toggleQuestionSelection = (id: number) => {
    setSelectedQuestions(prev => 
      prev.includes(id) 
        ? prev.filter(qId => qId !== id) 
        : [...prev, id]
    );
  };

  const selectAllAvailableQuestions = () => {
    setSelectedQuestions(availableQuestions.map(q => q.id));
  };

  const deselectAllQuestions = () => {
    setSelectedQuestions([]);
  };

  const addSelectedQuestions = () => {
    // Get the selected questions from the question bank
    const questionsToAdd = availableQuestions
      .filter(q => selectedQuestions.includes(q.id))
      .map((q, index) => ({
        ...q,
        order: assignedQuestions.length + index + 1,
        points: 1 // Default points
      }));
    
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
      // Send the assigned questions to the API
      const response = await fetch(`/api/organizer/quizzes/${quizId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questions: assignedQuestions.map(q => ({
            questionId: q.id,
            order: q.order,
            points: q.points
          }))
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save quiz questions');
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
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
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
                  </DialogHeader>
                  
                  <div className="flex items-center gap-2 my-4">
                    <Search className="w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9"
                    />
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
                          <TableHead className="w-[150px]">Type</TableHead>
                          <TableHead className="w-[150px]">Field</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableQuestions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                              {searchTerm ? (
                                <>No matching questions found. Try a different search term.</>
                              ) : (
                                <>No available questions found for this target group.</>
                              )}
                            </TableCell>
                          </TableRow>
                        ) : (
                          availableQuestions.map((question) => (
                            <TableRow key={question.id} className="cursor-pointer hover:bg-gray-50" onClick={() => toggleQuestionSelection(question.id)}>
                              <TableCell className="p-2">
                                <Checkbox
                                  checked={selectedQuestions.includes(question.id)}
                                  onCheckedChange={() => toggleQuestionSelection(question.id)}
                                  className="mt-1"
                                />
                              </TableCell>
                              <TableCell className="font-medium">
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
                            </TableRow>
                          ))
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
          <Button onClick={saveQuizQuestions} disabled={assignedQuestions.length === 0 || isSaving}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Questions"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

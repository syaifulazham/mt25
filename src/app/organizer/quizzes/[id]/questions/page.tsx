"use client";

import React, { useState } from "react";
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
};

// Mock data for questions in the question bank
const mockQuestionBank: Question[] = [
  {
    id: 1,
    target_group: "SECONDARY",
    knowledge_field: "general science",
    question: "Which of the following is NOT a state of matter?",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "Solid" },
      { option: "B", answer: "Liquid" },
      { option: "C", answer: "Gas" },
      { option: "D", answer: "Energy" }
    ],
    answer_correct: "D",
  },
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
  },
  {
    id: 3,
    target_group: "SECONDARY",
    knowledge_field: "robotics",
    question: "Which of the following sensors would be most appropriate for a line-following robot?",
    question_image: "/images/line-following-robot.jpg",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "Ultrasonic sensor" },
      { option: "B", answer: "IR reflectance sensor" },
      { option: "C", answer: "Temperature sensor" },
      { option: "D", answer: "Microphone" }
    ],
    answer_correct: "B",
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
  },
  {
    id: 5,
    target_group: "SECONDARY",
    knowledge_field: "biology",
    question: "Which organelle is responsible for photosynthesis in plant cells?",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "Mitochondria" },
      { option: "B", answer: "Nucleus" },
      { option: "C", answer: "Chloroplast" },
      { option: "D", answer: "Ribosome" }
    ],
    answer_correct: "C",
  },
];

// Mock data for questions already assigned to the quiz
const mockAssignedQuestions: QuizQuestion[] = [
  {
    ...mockQuestionBank[1],
    order: 1,
    points: 1,
  },
  {
    ...mockQuestionBank[3],
    order: 2,
    points: 2,
  },
];

export default function QuizQuestionsPage({ params }: { params: { id: string } }) {
  const quizId = parseInt(params.id);
  const [assignedQuestions, setAssignedQuestions] = useState<QuizQuestion[]>(mockAssignedQuestions);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filter question bank questions, excluding ones already assigned
  const filterQuestionBank = (questions: Question[]) => {
    const assignedIds = assignedQuestions.map(q => q.id);
    
    return questions.filter(q => 
      !assignedIds.includes(q.id) && // Not already assigned
      q.target_group === mockQuiz.target_group && // Matches quiz target group
      (q.question.toLowerCase().includes(searchTerm.toLowerCase()) || // Matches search
       q.knowledge_field.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const availableQuestions = filterQuestionBank(mockQuestionBank);

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
      // Here we would send the assigned questions to the API
      // const response = await fetch(`/api/organizer/quizzes/${quizId}/questions`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     questions: assignedQuestions.map(q => ({
      //       questionId: q.id,
      //       order: q.order,
      //       points: q.points
      //     }))
      //   }),
      // });
      
      // For demo purposes, we'll just simulate an API call
      setTimeout(() => {
        toast.success(`Updated quiz questions successfully!`);
        setIsSaving(false);
        // Redirect to quiz details page after saving
        window.location.href = `/organizer/quizzes/${quizId}`;
      }, 1500);
      
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
          title={`Manage Quiz Questions: ${mockQuiz.quiz_name}`} 
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
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
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

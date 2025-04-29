"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Clock, CheckCircle, ArrowLeft, ArrowRight, Info } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

type Question = {
  id: number;
  question: string;
  question_image?: string;
  answer_type: "single_selection" | "multiple_selection" | "binary";
  answer_options: Array<{
    option: string;
    answer: string;
  }>;
  answer_correct: string;
  points: number;
  order: number;
};

// Mock quiz data
const mockQuiz = {
  id: 1,
  quiz_name: "Science Knowledge Quiz",
  description: "Test your understanding of basic scientific concepts",
  target_group: "SECONDARY",
  time_limit: 30,
  status: "created",
  totalQuestions: 5,
  totalPoints: 8
};

// Mock questions data
const mockQuestions: Question[] = [
  {
    id: 1,
    question: "What is the formula for calculating force?",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "F = ma" },
      { option: "B", answer: "F = mg" },
      { option: "C", answer: "F = mv²/r" },
      { option: "D", answer: "F = mc²" }
    ],
    answer_correct: "A",
    points: 1,
    order: 1
  },
  {
    id: 2,
    question: "Which of the following is a noble gas?",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "Hydrogen" },
      { option: "B", answer: "Oxygen" },
      { option: "C", answer: "Neon" },
      { option: "D", answer: "Nitrogen" }
    ],
    answer_correct: "C",
    points: 2,
    order: 2
  },
  {
    id: 3,
    question: "Identify the primary colors of light:",
    answer_type: "multiple_selection",
    answer_options: [
      { option: "A", answer: "Red" },
      { option: "B", answer: "Yellow" },
      { option: "C", answer: "Blue" },
      { option: "D", answer: "Green" }
    ],
    answer_correct: "A,C,D",
    points: 3,
    order: 3
  },
  {
    id: 4,
    question: "Is water a compound?",
    answer_type: "binary",
    answer_options: [
      { option: "A", answer: "Yes" },
      { option: "B", answer: "No" }
    ],
    answer_correct: "A",
    points: 1,
    order: 4
  },
  {
    id: 5,
    question: "What is the chemical formula for water?",
    answer_type: "single_selection",
    answer_options: [
      { option: "A", answer: "H₂O" },
      { option: "B", answer: "CO₂" },
      { option: "C", answer: "NaCl" },
      { option: "D", answer: "C₆H₁₂O₆" }
    ],
    answer_correct: "A",
    points: 1,
    order: 5
  }
];

export default function QuizPreviewPage({ params }: { params: { id: string } }) {
  const quizId = parseInt(params.id);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string[]>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [timer, setTimer] = useState(mockQuiz.time_limit * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  
  const currentQuestion = mockQuestions[currentQuestionIndex];
  const totalQuestions = mockQuestions.length;
  
  // Format timer as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Start timer
  const startTimer = () => {
    setIsTimerRunning(true);
  };
  
  // Handle option selection
  const handleOptionSelect = (option: string) => {
    if (quizCompleted) return;
    
    if (currentQuestion.answer_type === "multiple_selection") {
      // For multiple selection, toggle the selected option
      setSelectedAnswers((prev) => {
        const currentSelections = prev[currentQuestion.id] || [];
        if (currentSelections.includes(option)) {
          return {
            ...prev,
            [currentQuestion.id]: currentSelections.filter(opt => opt !== option)
          };
        } else {
          return {
            ...prev,
            [currentQuestion.id]: [...currentSelections, option]
          };
        }
      });
    } else {
      // For single selection or binary, just select one option
      setSelectedAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: [option]
      }));
    }
  };
  
  // Check if option is selected
  const isOptionSelected = (option: string) => {
    return (selectedAnswers[currentQuestion.id] || []).includes(option);
  };
  
  // Navigate to previous question
  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Navigate to next question
  const goToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Check if answer is correct
  const isAnswerCorrect = (questionId: number) => {
    const question = mockQuestions.find(q => q.id === questionId);
    if (!question) return false;
    
    const userAnswers = selectedAnswers[questionId] || [];
    const correctAnswers = question.answer_correct.split(',');
    
    if (userAnswers.length !== correctAnswers.length) return false;
    
    return correctAnswers.every(ca => userAnswers.includes(ca)) && 
           userAnswers.every(ua => correctAnswers.includes(ua));
  };
  
  // Calculate total score
  const calculateScore = () => {
    return mockQuestions.reduce((total, question) => {
      return total + (isAnswerCorrect(question.id) ? question.points : 0);
    }, 0);
  };
  
  // Complete the quiz
  const completeQuiz = () => {
    setQuizCompleted(true);
    setIsTimerRunning(false);
    setShowAnswers(true);
    toast.success("Quiz completed! View your results below.");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader 
          title="Quiz Preview" 
          description="View the quiz exactly as participants will see it"
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => setShowInfoDialog(true)}>
                  <Info className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Preview Information</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </PageHeader>
        
        <Button variant="outline" size="sm" asChild>
          <Link href={`/organizer/quizzes/${quizId}`}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Quiz
          </Link>
        </Button>
      </div>
      
      {/* Preview Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quiz Preview Mode</DialogTitle>
            <DialogDescription>
              This is a preview of how the quiz will appear to participants. You can interact with it to test the experience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium">Preview Features:</h4>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Navigate through all questions</li>
                <li>Select answers to see how the interface works</li>
                <li>View correct answers after completing the quiz</li>
                <li>See score calculation and results page</li>
                <li>Test timer functionality (simulated)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Quiz Information:</h4>
              <ul className="text-sm space-y-1">
                <li><span className="font-medium">Name:</span> {mockQuiz.quiz_name}</li>
                <li><span className="font-medium">Questions:</span> {mockQuiz.totalQuestions}</li>
                <li><span className="font-medium">Total Points:</span> {mockQuiz.totalPoints}</li>
                <li><span className="font-medium">Time Limit:</span> {mockQuiz.time_limit} minutes</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInfoDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Quiz container */}
      <div className="max-w-3xl mx-auto">
        {!quizCompleted ? (
          <Card className="shadow-md border-primary/20">
            <CardHeader className="border-b bg-primary/5">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{mockQuiz.quiz_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{mockQuiz.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {!isTimerRunning ? (
                    <Button onClick={startTimer} size="sm">
                      Start Quiz
                    </Button>
                  ) : (
                    <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1.5 rounded-full">
                      <Clock className="h-4 w-4 text-primary/80" />
                      <span className="font-medium">{formatTime(timer)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span>Progress: {currentQuestionIndex + 1} of {totalQuestions} questions</span>
                  <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
                </div>
                <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} />
              </div>
            </CardHeader>
            
            <CardContent className="pt-6">
              {isTimerRunning ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="text-sm text-muted-foreground">
                        Question {currentQuestionIndex + 1} of {totalQuestions}
                      </div>
                      <Badge variant="outline">
                        {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    <h3 className="text-xl font-medium">{currentQuestion.question}</h3>
                    
                    {currentQuestion.question_image && (
                      <div className="my-4 bg-gray-100 p-4 rounded-md flex items-center justify-center">
                        <div className="text-sm text-gray-500">
                          [Image would be displayed here]
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm mt-2 text-primary/70">
                      {currentQuestion.answer_type === "multiple_selection" 
                        ? "Select all that apply" 
                        : "Select one option"}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    {currentQuestion.answer_options.map((option) => (
                      <div 
                        key={option.option}
                        className={`
                          border rounded-md p-4 flex items-center gap-3 cursor-pointer transition-colors
                          ${isOptionSelected(option.option) 
                            ? 'bg-primary/10 border-primary/30' 
                            : 'hover:bg-gray-50'}
                        `}
                        onClick={() => handleOptionSelect(option.option)}
                      >
                        <div className={`
                          w-6 h-6 flex items-center justify-center rounded-md border
                          ${isOptionSelected(option.option) 
                            ? 'bg-primary text-white border-primary' 
                            : 'bg-white border-gray-300'}
                        `}>
                          {option.option}
                        </div>
                        <div className="flex-1">{option.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <h3 className="text-xl font-medium mb-2">Welcome to the quiz preview</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    This preview lets you experience the quiz as participants will see it. 
                    Click "Start Quiz" to begin.
                  </p>
                  <Button onClick={startTimer}>Start Quiz</Button>
                </div>
              )}
            </CardContent>
            
            {isTimerRunning && (
              <CardFooter className="border-t flex justify-between py-4">
                <Button
                  variant="outline"
                  onClick={goToPrevQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                
                {currentQuestionIndex === totalQuestions - 1 ? (
                  <Button onClick={completeQuiz}>
                    Finish Quiz
                  </Button>
                ) : (
                  <Button onClick={goToNextQuestion}>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        ) : (
          <Card className="shadow-md">
            <CardHeader className="border-b bg-primary/5">
              <CardTitle>Quiz Results</CardTitle>
              <p className="text-sm text-muted-foreground">
                Quiz completed successfully
              </p>
            </CardHeader>
            
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-green-800">Quiz Completed!</h3>
                    <p className="text-sm text-green-700">
                      You've completed the {mockQuiz.quiz_name}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                  <div className="bg-slate-50 p-4 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-sm text-slate-500 mb-1">Your Score</div>
                    <div className="text-3xl font-bold text-primary">
                      {calculateScore()}/{mockQuiz.totalPoints}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {Math.round((calculateScore() / mockQuiz.totalPoints) * 100)}%
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-sm text-slate-500 mb-1">Questions</div>
                    <div className="text-3xl font-bold text-primary">
                      {mockQuestions.filter(q => isAnswerCorrect(q.id)).length}/{totalQuestions}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      Correct Answers
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-sm text-slate-500 mb-1">Time Used</div>
                    <div className="text-3xl font-bold text-primary">
                      {formatTime((mockQuiz.time_limit * 60) - timer)}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      of {mockQuiz.time_limit} minutes
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-6">
                  <h3 className="font-medium text-lg">Answer Review</h3>
                  
                  {mockQuestions.map((question, index) => {
                    const userAnswers = selectedAnswers[question.id] || [];
                    const correctAnswers = question.answer_correct.split(',');
                    const isCorrect = isAnswerCorrect(question.id);
                    
                    return (
                      <div 
                        key={question.id} 
                        className={`border rounded-md p-4 ${
                          isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex justify-between">
                          <h4 className="font-medium">Question {index + 1}</h4>
                          <Badge 
                            variant="outline" 
                            className={isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                          >
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                        </div>
                        
                        <p className="mt-2">{question.question}</p>
                        
                        <div className="mt-4 space-y-2">
                          {question.answer_options.map((option) => {
                            const isUserSelected = userAnswers.includes(option.option);
                            const isCorrectOption = correctAnswers.includes(option.option);
                            
                            let optionClass = 'border rounded-md p-3 flex items-center gap-3';
                            if (isUserSelected && isCorrectOption) {
                              optionClass += ' bg-green-100 border-green-300';
                            } else if (isUserSelected && !isCorrectOption) {
                              optionClass += ' bg-red-100 border-red-300';
                            } else if (!isUserSelected && isCorrectOption) {
                              optionClass += ' bg-blue-50 border-blue-200';
                            }
                            
                            return (
                              <div key={option.option} className={optionClass}>
                                <div className={`
                                  w-6 h-6 flex items-center justify-center rounded-md border
                                  ${isUserSelected 
                                    ? (isCorrectOption ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500') 
                                    : (isCorrectOption ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-300')}
                                `}>
                                  {option.option}
                                </div>
                                <div className="flex-1">{option.answer}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="border-t p-4 flex justify-between">
              <Button variant="outline" asChild>
                <Link href={`/organizer/quizzes/${quizId}`}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Quiz
                </Link>
              </Button>
              <Button onClick={() => {
                setQuizCompleted(false);
                setIsTimerRunning(false);
                setShowAnswers(false);
                setSelectedAnswers({});
                setCurrentQuestionIndex(0);
                setTimer(mockQuiz.time_limit * 60);
              }}>
                Restart Preview
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

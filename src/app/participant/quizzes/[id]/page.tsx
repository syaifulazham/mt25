"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Types for the quiz data
interface Question {
  id: number;
  question: string;
  question_image?: string;
  answer_type: "single_selection" | "multiple_selection" | "binary";
  answer_options: Array<{
    option: string;
    answer: string;
  }>;
  order: number;
  points: number;
}

interface Quiz {
  id: number;
  quiz_name: string;
  description: string | null;
  target_group: string;
  time_limit: number | null;
  status: string;
  totalQuestions: number;
  totalPoints: number;
  questions: Question[];
}

// Main component for quiz taking
export default function QuizTakingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const quizId = parseInt(params.id);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);

  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setIsLoading(true);
        // In a real implementation, fetch from API
        // const response = await fetch(`/api/participant/quizzes/${quizId}`);
        
        // Use mock data for now
        const mockQuiz: Quiz = {
          id: quizId,
          quiz_name: "Science Knowledge Quiz",
          description: "Test your understanding of basic scientific concepts",
          target_group: "SECONDARY",
          time_limit: 30,
          status: "published",
          totalQuestions: 5,
          totalPoints: 8,
          questions: [
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
              order: 1,
              points: 1
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
              order: 2,
              points: 2
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
              order: 3,
              points: 3
            },
            {
              id: 4,
              question: "Is water a compound?",
              answer_type: "binary",
              answer_options: [
                { option: "A", answer: "Yes" },
                { option: "B", answer: "No" }
              ],
              order: 4,
              points: 1
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
              order: 5,
              points: 1
            }
          ]
        };
        
        setQuiz(mockQuiz);
        if (mockQuiz.time_limit) {
          setTimeLeft(mockQuiz.time_limit * 60); // Convert minutes to seconds
        }
      } catch (err) {
        console.error("Failed to fetch quiz:", err);
        setError("Failed to load quiz. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  // Timer effect
  useEffect(() => {
    if (!quizStarted || !quiz?.time_limit || quizSubmitted) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quizStarted, quiz, quizSubmitted]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Start the quiz
  const startQuiz = () => {
    setQuizStarted(true);
  };

  // Handle option selection
  const handleOptionSelect = (questionId: number, option: string) => {
    const question = quiz?.questions.find(q => q.id === questionId);
    if (!question) return;
    
    if (question.answer_type === "multiple_selection") {
      // For multiple selection, toggle the selected option
      setSelectedAnswers(prev => {
        const currentSelections = prev[questionId] || [];
        if (currentSelections.includes(option)) {
          return {
            ...prev,
            [questionId]: currentSelections.filter(opt => opt !== option)
          };
        } else {
          return {
            ...prev,
            [questionId]: [...currentSelections, option]
          };
        }
      });
    } else {
      // For single selection or binary, just select one option
      setSelectedAnswers(prev => ({
        ...prev,
        [questionId]: [option]
      }));
      
      // Auto-advance to next question if it's not the last one
      if (question.answer_type === "single_selection" || question.answer_type === "binary") {
        if (currentQuestionIndex < (quiz?.questions.length || 0) - 1) {
          setTimeout(() => {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
          }, 300);
        }
      }
    }
  };

  // Check if option is selected
  const isOptionSelected = (questionId: number, option: string) => {
    return (selectedAnswers[questionId] || []).includes(option);
  };

  // Navigate to next question
  const goToNextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Navigate to previous question
  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Submit quiz answers
  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    
    try {
      setIsLoading(true);
      
      // Create payload for submission
      const payload = {
        quizId: quiz.id,
        answers: Object.entries(selectedAnswers).map(([questionId, options]) => ({
          questionId: parseInt(questionId),
          selectedOptions: options
        }))
      };
      
      // In a real implementation, send to API
      // const response = await fetch('/api/participant/quiz-attempts', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });
      
      // Mock response data
      const mockResults = {
        totalScore: 6,
        maxScore: 8,
        percentageScore: 75,
        correctQuestions: 4,
        totalQuestions: 5,
        timeUsed: (quiz.time_limit || 0) * 60 - timeLeft,
        questionResults: quiz.questions.map(q => {
          const isCorrect = Math.random() > 0.3; // Just for mock data
          return {
            questionId: q.id,
            correct: isCorrect,
            points: isCorrect ? q.points : 0,
            maxPoints: q.points
          };
        })
      };
      
      setQuizResults(mockResults);
      setQuizSubmitted(true);
      toast.success("Quiz submitted successfully!");
    } catch (err) {
      console.error("Failed to submit quiz:", err);
      toast.error("Failed to submit quiz. Please try again.");
    } finally {
      setIsLoading(false);
      setShowConfirmationDialog(false);
    }
  };

  // If still loading or error
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Quiz</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "Failed to load quiz data. The quiz may not exist or you don't have access to it."}</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/participant/quizzes">Back to Quizzes</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show quiz instructions before starting
  if (!quizStarted) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{quiz.quiz_name}</CardTitle>
            <CardDescription>{quiz.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium text-lg">Quiz Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Questions</p>
                  <p className="font-medium">{quiz.totalQuestions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Points</p>
                  <p className="font-medium">{quiz.totalPoints}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time Limit</p>
                  <p className="font-medium">{quiz.time_limit ? `${quiz.time_limit} minutes` : "No time limit"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Target Group</p>
                  <p className="font-medium">{quiz.target_group}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-lg">Instructions</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Read each question carefully before answering.</li>
                <li>Some questions may have multiple correct answers.</li>
                <li>You can navigate between questions using the previous and next buttons.</li>
                <li>You can review your answers before final submission.</li>
                {quiz.time_limit && (
                  <li>The quiz has a time limit of {quiz.time_limit} minutes. It will auto-submit when time runs out.</li>
                )}
              </ul>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Important Note</p>
                  <p className="text-sm text-yellow-700">
                    Once you start the quiz, the timer will begin and cannot be paused. Make sure you have enough time to complete it.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/participant/quizzes">Back to Quizzes</Link>
            </Button>
            <Button onClick={startQuiz}>Start Quiz</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show quiz results after submission
  if (quizSubmitted && quizResults) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="border-b">
            <CardTitle>Quiz Results</CardTitle>
            <CardDescription>You have completed the quiz: {quiz.quiz_name}</CardDescription>
          </CardHeader>
          <CardContent className="py-6 space-y-6">
            <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium text-green-800">Quiz Completed!</h3>
                <p className="text-sm text-green-700">
                  You've successfully completed the quiz
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
              <div className="bg-slate-50 p-4 rounded-lg flex flex-col items-center justify-center">
                <div className="text-sm text-slate-500 mb-1">Your Score</div>
                <div className="text-3xl font-bold text-primary">
                  {quizResults.totalScore}/{quizResults.maxScore}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {quizResults.percentageScore}%
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg flex flex-col items-center justify-center">
                <div className="text-sm text-slate-500 mb-1">Questions</div>
                <div className="text-3xl font-bold text-primary">
                  {quizResults.correctQuestions}/{quizResults.totalQuestions}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  Correct Answers
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-lg flex flex-col items-center justify-center">
                <div className="text-sm text-slate-500 mb-1">Time Used</div>
                <div className="text-3xl font-bold text-primary">
                  {formatTime(quizResults.timeUsed)}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  of {quiz.time_limit || 'N/A'} minutes
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-lg">Question Summary</h3>
              <div className="space-y-3">
                {quizResults.questionResults.map((result: any, index: number) => (
                  <div 
                    key={result.questionId} 
                    className={`flex items-center justify-between p-3 rounded-md border ${
                      result.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.correct ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <span>Question {index + 1}</span>
                    </div>
                    <span className="font-medium">
                      {result.points}/{result.maxPoints} points
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6 flex justify-between">
            <Button variant="outline" asChild>
              <Link href="/participant/quizzes">Back to Quizzes</Link>
            </Button>
            <Button asChild>
              <Link href="/participant/dashboard">Go to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Get current question
  const currentQuestion = quiz.questions[currentQuestionIndex];
  
  // Main quiz taking interface
  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="border-b bg-primary/5">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{quiz.quiz_name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <Clock className="h-4 w-4 text-primary/80" />
              <span className="font-medium">{formatTime(timeLeft)}</span>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span>Progress: {currentQuestionIndex + 1} of {quiz.questions.length} questions</span>
              <span>{Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}%</span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / quiz.questions.length) * 100} />
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-medium">{currentQuestion.question}</h3>
                </div>
                <Badge variant="outline">
                  {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                </Badge>
              </div>
              
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
                    ${isOptionSelected(currentQuestion.id, option.option) 
                      ? 'bg-primary/10 border-primary/30' 
                      : 'hover:bg-gray-50'}
                  `}
                  onClick={() => handleOptionSelect(currentQuestion.id, option.option)}
                >
                  <div className={`
                    w-6 h-6 flex items-center justify-center rounded-md border
                    ${isOptionSelected(currentQuestion.id, option.option) 
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
        </CardContent>
        
        <CardFooter className="border-t flex justify-between py-4">
          <Button
            variant="outline"
            onClick={goToPrevQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          {currentQuestionIndex === quiz.questions.length - 1 ? (
            <Button onClick={() => setShowConfirmationDialog(true)}>
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={goToNextQuestion}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Submit confirmation dialog */}
      <Dialog open={showConfirmationDialog} onOpenChange={setShowConfirmationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quiz</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your answers? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-start gap-2 bg-yellow-50 p-4 rounded-md text-yellow-800">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Review your answers</p>
                <p className="text-sm">
                  Make sure you have answered all questions. You won't be able to change your answers after submission.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <span className="font-medium">{quiz.questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Answered Questions:</span>
                <span className="font-medium">{Object.keys(selectedAnswers).length} of {quiz.questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Time Remaining:</span>
                <span className="font-medium">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmationDialog(false)}>
              Continue Quiz
            </Button>
            <Button onClick={handleSubmitQuiz} disabled={isLoading}>
              {isLoading ? "Submitting..." : "Submit Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

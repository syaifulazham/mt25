'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Timer, 
  AlertCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Helper component to render text with LaTeX math
const MathText = ({ children, className = '' }: { children: string, className?: string }) => {
  if (!children) return null;
  
  // Check if text contains LaTeX math expressions
  const hasInlineMath = children.includes('$') && !children.includes('$$');
  const hasBlockMath = children.includes('$$');
  
  if (!hasInlineMath && !hasBlockMath) {
    // No math, render as plain text
    return <span className={className}>{children}</span>;
  }
  
  try {
    if (hasBlockMath) {
      // Handle block math ($$...$$)
      const parts = children.split(/(\$\$[^$]+\$\$)/);
      return (
        <span className={className}>
          {parts.map((part, index) => {
            if (part.startsWith('$$') && part.endsWith('$$')) {
              const math = part.slice(2, -2);
              return <BlockMath key={index} math={math} />;
            }
            return <span key={index}>{part}</span>;
          })}
        </span>
      );
    } else if (hasInlineMath) {
      // Handle inline math ($...$)
      const parts = children.split(/(\$[^$]+\$)/);
      return (
        <span className={className}>
          {parts.map((part, index) => {
            if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
              const math = part.slice(1, -1);
              return <InlineMath key={index} math={math} />;
            }
            return <span key={index}>{part}</span>;
          })}
        </span>
      );
    }
  } catch (error) {
    console.warn('Error rendering LaTeX:', error);
    // Fallback to plain text if LaTeX rendering fails
    return <span className={className}>{children}</span>;
  }
  
  return <span className={className}>{children}</span>;
};

interface Question {
  id: number;
  question: string;
  question_image?: string;
  answer_type: string;
  answer_options: Array<{option: string, answer: string}>;
  answer_correct: string;
  knowledge_field: string;
  target_group: string;
}

interface QuizData {
  id: number;
  quiz_name: string;
  description: string;
  target_group: string;
  time_limit: number;
  totalQuestions: number;
  status: string;
  questions: Question[];
}

interface ContestantData {
  contestant: {
    id: number;
    name: string;
    ic: string;
  };
  contingent: {
    name: string;
    logoUrl: string;
  };
}

interface QuizTakingClientProps {
  contestantHashcode: string;
  quizId: number;
}

export default function QuizTakingClient({ contestantHashcode, quizId }: QuizTakingClientProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [contestant, setContestant] = useState<ContestantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [randomizedQuestions, setRandomizedQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const { t, language } = useLanguage();

  // Shuffle array function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (timeLeft <= 0 || !quiz) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up - auto submit
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quiz]);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Get attempt ID from localStorage (set by quiz start page)
        const storedAttemptId = localStorage.getItem(`quiz_${quizId}_attempt_id`);
        if (storedAttemptId) {
          setAttemptId(parseInt(storedAttemptId));
        }
        
        // Fetch quiz data and contestant data using contestant-friendly API
        const [quizResponse, contestantResponse] = await Promise.all([
          fetch(`/api/arena/contestant/${contestantHashcode}/quiz/${quizId}`),
          fetch(`/api/arena/contestant/${contestantHashcode}`)
        ]);

        if (!quizResponse.ok) {
          const errorData = await quizResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Quiz not found or not available');
        }

        if (!contestantResponse.ok) {
          const errorData = await contestantResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Contestant data not found');
        }

        const quizResult = await quizResponse.json();
        const contestantResult = await contestantResponse.json();

        if (!quizResult.success) {
          throw new Error(quizResult.message || 'Failed to load quiz data');
        }

        if (!contestantResult.success) {
          throw new Error(contestantResult.message || 'Failed to load contestant data');
        }

        // Randomize questions (properly type the response)
        const shuffledQuestions = shuffleArray(quizResult.questions as Question[]);
        
        // Debug: Log the first question to see the data structure
        if (shuffledQuestions.length > 0) {
          console.log('First question data:', shuffledQuestions[0]);
          console.log('Answer options:', shuffledQuestions[0].answer_options);
          console.log('Answer type:', shuffledQuestions[0].answer_type);
        }

        setQuiz({
          ...quizResult.quiz,
          questions: shuffledQuestions
        });
        setRandomizedQuestions(shuffledQuestions);
        setContestant(contestantResult);

        // Set timer (convert minutes to seconds)
        setTimeLeft(quizResult.quiz.time_limit * 60);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quiz data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [contestantHashcode, quizId]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < randomizedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleQuestionJump = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmitQuiz = async () => {
    if (isSubmitting || !attemptId) return;
    
    setIsSubmitting(true);
    try {
      // Calculate time taken (quiz time limit - remaining time)
      const timeTakenSeconds = quiz ? (quiz.time_limit * 60) - timeLeft : 0;
      
      // Store answers and time taken in localStorage for results page
      localStorage.setItem(`quiz_${quizId}_answers`, JSON.stringify(answers));
      localStorage.setItem(`quiz_${quizId}_time_taken`, timeTakenSeconds.toString());
      
      // Submit quiz answers to database
      const submitResponse = await fetch(`/api/arena/contestant/${contestantHashcode}/quiz/${quizId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attemptId: attemptId,
          answers: answers
        })
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit quiz');
      }

      const submitResult = await submitResponse.json();
      
      if (!submitResult.success) {
        throw new Error(submitResult.message || 'Failed to submit quiz');
      }
      
      console.log('Quiz submitted successfully:', submitResult);
      console.log('Time taken:', timeTakenSeconds, 'seconds');
      
      // Clean up attempt ID from localStorage
      localStorage.removeItem(`quiz_${quizId}_attempt_id`);
      
      // Redirect to results page
      router.push(`/arena/${contestantHashcode}/quiz/${quizId}/results`);
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Failed to submit quiz. Please try again.');
      setIsSubmitting(false);
    }
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-white/80">
                {language === 'my' ? 'Memuatkan kuiz...' : 'Loading quiz...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <div className="text-red-400 text-lg font-medium mb-2">
                {language === 'my' ? 'Ralat' : 'Error'}
              </div>
              <p className="text-white/80 mb-4">{error}</p>
              <Button 
                onClick={() => router.push(`/arena/${contestantHashcode}`)}
                variant="outline" 
                className="border-white/20 text-black hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2 text-black" />
                {language === 'my' ? 'Kembali ke Arena' : 'Back to Arena'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz || !contestant || randomizedQuestions.length === 0) {
    return null;
  }

  const currentQuestion = randomizedQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / randomizedQuestions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Fixed Timer Header */}
      <div className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src={contestant.contingent.logoUrl || '/default-logo.png'} 
                alt="Contingent Logo" 
                className="w-8 h-8 rounded-full object-cover border border-cyan-400"
              />
              <div>
                <h1 className="text-white font-semibold text-lg">{quiz.quiz_name}</h1>
                <p className="text-cyan-400 text-sm">{contestant.contestant.name}</p>
              </div>
            </div>
            
            {/* Countdown Timer */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-white/60 text-sm">
                  {language === 'my' ? 'Masa Tinggal' : 'Time Left'}
                </div>
                <div className={`text-2xl font-mono font-bold ${
                  timeLeft <= 300 ? 'text-red-400' : timeLeft <= 600 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  <Timer className="w-5 h-5 inline mr-2" />
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/80 text-sm">
                {language === 'my' ? 'Kemajuan' : 'Progress'}
              </span>
              <span className="text-white/80 text-sm">
                {currentQuestionIndex + 1} / {randomizedQuestions.length}
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-xl">
                  {language === 'my' ? 'Soalan' : 'Question'} {currentQuestionIndex + 1}
                </CardTitle>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {currentQuestion.knowledge_field}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-white text-lg leading-relaxed">
                <MathText className="text-white text-lg leading-relaxed">
                  {currentQuestion.question}
                </MathText>
              </div>

              {/* Display question image if available */}
              {currentQuestion.question_image && currentQuestion.question_image !== "null" && (
                <div className="my-4 flex items-center justify-center">
                  <div className="relative w-full max-w-md h-64">
                    <Image 
                      src={currentQuestion.question_image}
                      alt="Question image"
                      fill
                      style={{ objectFit: 'contain' }}
                      className="rounded-md"
                    />
                  </div>
                </div>
              )}

              {/* Answer Options - Dynamic based on answer_type */}
              {(() => {
                // Handle different possible data structures for answer_options
                let options = [];
                
                if (Array.isArray(currentQuestion.answer_options)) {
                  // If it's already an array of objects with option and answer
                  options = currentQuestion.answer_options;
                } else if (typeof currentQuestion.answer_options === 'object' && currentQuestion.answer_options !== null) {
                  // If it's an object, convert to array format
                  options = Object.entries(currentQuestion.answer_options).map(([key, value]) => ({
                    option: key,
                    answer: String(value)
                  }));
                } else {
                  // Fallback: create basic A, B, C, D options if data is malformed
                  console.warn('Invalid answer_options format:', currentQuestion.answer_options);
                  options = [
                    { option: 'A', answer: 'Option A' },
                    { option: 'B', answer: 'Option B' },
                    { option: 'C', answer: 'Option C' },
                    { option: 'D', answer: 'Option D' }
                  ];
                }
                
                console.log('Processed options for question', currentQuestion.id, ':', options);
                
                return currentQuestion.answer_type === 'multiple_selection' ? (
                  // Multiple selection (checkboxes)
                  <div className="space-y-3">
                    {options.map((option, index) => (
                      <div key={option.option} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${answers[currentQuestion.id]?.split(',').includes(option.option) ? 'bg-cyan-500/30 border border-cyan-400' : 'bg-white/5 hover:bg-white/10'}`}>
                        <input
                          type="checkbox"
                          id={`option-${option.option}`}
                          value={option.option}
                          checked={answers[currentQuestion.id]?.split(',').includes(option.option) || false}
                          onChange={(e) => {
                            const currentAnswers = answers[currentQuestion.id]?.split(',').filter(Boolean) || [];
                            if (e.target.checked) {
                              handleAnswerChange(currentQuestion.id, [...currentAnswers, option.option].join(','));
                            } else {
                              handleAnswerChange(currentQuestion.id, currentAnswers.filter(a => a !== option.option).join(','));
                            }
                          }}
                          className="w-4 h-4 text-cyan-400 bg-transparent border-2 border-cyan-400 rounded focus:ring-cyan-400"
                        />
                        <Label 
                          htmlFor={`option-${option.option}`} 
                          className="text-white cursor-pointer flex-1 text-base"
                        >
                          <span className="font-semibold text-cyan-400 mr-2">{option.option}.</span>
                          <MathText className="text-white">
                            {option.answer || 'No answer text available'}
                          </MathText>
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Single selection (radio buttons) - for 'single_selection' and 'binary'
                  <RadioGroup 
                    value={answers[currentQuestion.id] || ''} 
                    onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    className="space-y-3"
                  >
                    {options.map((option, index) => (
                      <div key={option.option} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${answers[currentQuestion.id] === option.option ? 'bg-cyan-500/30 border border-cyan-400' : 'bg-white/5 hover:bg-white/10'}`}>
                        <RadioGroupItem value={option.option} id={`option-${option.option}`} className="text-cyan-400" />
                        <Label 
                          htmlFor={`option-${option.option}`} 
                          className="text-white cursor-pointer flex-1 text-base"
                        >
                          <span className="font-semibold text-cyan-400 mr-2">{option.option}.</span>
                          <MathText className="text-white">
                            {option.answer || 'No answer text available'}
                          </MathText>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                );
              })()}
            </CardContent>
          </Card>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Button 
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              variant="outline"
              className="flex-1 border-white/20 text-black hover:bg-white/10 h-12"
            >
              <ChevronLeft className="w-5 h-5 mr-2 text-black" />
              {language === 'my' ? 'Sebelumnya' : 'Previous'}
            </Button>

            <Button 
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === randomizedQuestions.length - 1}
              variant="outline"
              className="flex-1 border-white/20 text-black hover:bg-white/10 h-12"
            >
              {language === 'my' ? 'Seterusnya' : 'Next'}
              <ChevronRight className="w-5 h-5 ml-2 text-black" />
            </Button>
          </div>

          {/* Question Navigator */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-lg">
                {language === 'my' ? 'Navigasi Soalan' : 'Question Navigator'}
                <span className="text-cyan-400 ml-2">
                  ({getAnsweredCount()}/{randomizedQuestions.length} {language === 'my' ? 'dijawab' : 'answered'})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {randomizedQuestions.map((_, index) => (
                  <Button
                    key={index}
                    onClick={() => handleQuestionJump(index)}
                    variant={currentQuestionIndex === index ? "default" : "outline"}
                    className={`h-10 w-10 p-0 ${
                      currentQuestionIndex === index 
                        ? 'bg-cyan-500 text-white' 
                        : answers[randomizedQuestions[index].id]
                          ? 'border-green-400 bg-green-400/20 text-green-400'
                          : 'border-white/20 text-white hover:bg-white/10'
                    }`}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="text-center">
            {getAnsweredCount() === randomizedQuestions.length ? (
              <Button 
                onClick={handleSubmitQuiz}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-3 text-lg font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {language === 'my' ? 'Menghantar...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Flag className="w-5 h-5 mr-2" />
                    {language === 'my' ? 'Selesai Kuiz' : 'Finish Quiz'}
                  </>
                )}
              </Button>
            ) : (
              <div className="bg-amber-100/20 border border-amber-400/30 rounded-lg p-4 flex items-center justify-center space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <p className="text-amber-200">
                  {language === 'my' 
                    ? `${randomizedQuestions.length - getAnsweredCount()} soalan belum dijawab` 
                    : `${randomizedQuestions.length - getAnsweredCount()} question${randomizedQuestions.length - getAnsweredCount() !== 1 ? 's' : ''} left unanswered`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

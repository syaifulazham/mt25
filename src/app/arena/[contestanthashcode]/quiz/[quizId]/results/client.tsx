'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Trophy, Home, ArrowLeft } from 'lucide-react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

interface Question {
  id: number;
  question: string;
  question_image?: string;
  answer_type: string;
  answer_options: any[];
  answer_correct: string;
  knowledge_field: string;
  target_group: string;
  order: number;
  points: number;
}

interface Quiz {
  id: number;
  quiz_name: string;
  description: string;
  target_group: string;
  time_limit: number;
  status: string;
  totalQuestions: number;
  publishedAt: string;
  questions: Question[];
}

interface Contestant {
  success: boolean;
  contestant: {
    id: number;
    name: string;
    ic: string;
    email: string;
    gender: string;
    age: number;
    edu_level: string;
    class_grade: string;
    class_name: string;
  };
  contingent: {
    id: number;
    name: string;
    logoUrl?: string;
    institutionName: string;
    contingentType?: string;
  };
  scheduledQuizzes: any[];
  loginCount: number;
}

interface QuizResultsClientProps {
  contestantHashcode: string;
  quizId: string;
}

// Helper component to render math text
const MathText = ({ children }: { children: string }) => {
  if (!children) return null;
  
  // Check for block math ($$...$$)
  const blockMathRegex = /\$\$(.*?)\$\$/g;
  const inlineMathRegex = /\$(.*?)\$/g;
  
  let parts: (string | JSX.Element)[] = [children];
  
  // Process block math first
  parts = parts.flatMap((part, partIndex) => {
    if (typeof part !== 'string') return [part];
    const blockParts = part.split(blockMathRegex);
    return blockParts.map((p, i) => {
      if (i % 2 === 1) {
        return <BlockMath key={`block-${partIndex}-${i}`} math={p} />;
      }
      return p;
    });
  });
  
  // Process inline math
  parts = parts.flatMap((part, partIndex) => {
    if (typeof part !== 'string') return [part];
    const inlineParts = part.split(inlineMathRegex);
    return inlineParts.map((p, i) => {
      if (i % 2 === 1) {
        return <InlineMath key={`inline-${partIndex}-${i}`} math={p} />;
      }
      return p;
    });
  });
  
  return <>{parts}</>;
};

export default function QuizResultsClient({ contestantHashcode, quizId }: QuizResultsClientProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [contestant, setContestant] = useState<Contestant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | string[]>>({});
  const [score, setScore] = useState<{ correct: number; total: number; percentage: number }>({ correct: 0, total: 0, percentage: 0 });
  const [isUsingDatabaseResults, setIsUsingDatabaseResults] = useState<boolean>(false);

  // Multi-language support
  const [language, setLanguage] = useState<'en' | 'my'>('en');

  const translations = {
    en: {
      quizResults: 'Quiz Results',
      congratulations: 'Congratulations!',
      quizCompleted: 'You have completed the quiz',
      yourScore: 'Your Score',
      timeTaken: 'Time Taken',
      minutes: 'minutes',
      seconds: 'seconds',
      correctAnswers: 'Correct Answers',
      reviewAnswers: 'Review Your Answers',
      question: 'Question',
      yourAnswer: 'Your Answer',
      correctAnswer: 'Correct Answer',
      correct: 'Correct',
      incorrect: 'Incorrect',
      backToDashboard: 'Back to Dashboard',
      retakeQuiz: 'Retake Quiz',
      loading: 'Loading results...',
      error: 'Error loading results',
      noAnswerProvided: 'No answer provided',
      multipleAnswers: 'Multiple answers',
      points: 'points'
    },
    my: {
      quizResults: 'Keputusan Kuiz',
      congratulations: 'Tahniah!',
      quizCompleted: 'Anda telah menyelesaikan kuiz',
      yourScore: 'Markah Anda',
      timeTaken: 'Masa Diambil',
      minutes: 'minit',
      seconds: 'saat',
      correctAnswers: 'Jawapan Betul',
      reviewAnswers: 'Semak Jawapan Anda',
      question: 'Soalan',
      yourAnswer: 'Jawapan Anda',
      correctAnswer: 'Jawapan Betul',
      correct: 'Betul',
      incorrect: 'Salah',
      backToDashboard: 'Kembali ke Dashboard',
      retakeQuiz: 'Ulang Kuiz',
      loading: 'Memuatkan keputusan...',
      error: 'Ralat memuatkan keputusan',
      noAnswerProvided: 'Tiada jawapan diberikan',
      multipleAnswers: 'Jawapan berbilang',
      points: 'mata'
    }
  };

  const t = translations[language];

  useEffect(() => {
    fetchQuizResults();
    
    // Get stored quiz data from localStorage if available
    const storedAnswers = localStorage.getItem(`quiz_${quizId}_answers`);
    const storedTimeTaken = localStorage.getItem(`quiz_${quizId}_time_taken`);
    
    if (storedAnswers) {
      setUserAnswers(JSON.parse(storedAnswers));
    }
    
    if (storedTimeTaken) {
      setTimeTaken(parseInt(storedTimeTaken));
    }
  }, [contestantHashcode, quizId]);

  useEffect(() => {
    if (quiz && Object.keys(userAnswers).length > 0 && !isUsingDatabaseResults) {
      calculateScore();
    }
  }, [quiz, userAnswers, isUsingDatabaseResults]);

  const fetchQuizResults = async () => {
    try {
      setIsLoading(true);
      
      // First try to fetch completed quiz results from database
      const resultsResponse = await fetch(`/api/arena/contestant/${contestantHashcode}/quiz/${quizId}/results`);
      
      if (resultsResponse.ok) {
        // Quiz is completed - use database results
        const resultsData = await resultsResponse.json();
        
        if (resultsData.success) {
          // Set flag to indicate we're using database results
          setIsUsingDatabaseResults(true);
          
          // Set quiz data from database results
          setQuiz({
            ...resultsData.quiz,
            questions: resultsData.answers
          });
          
          // Set answers from database
          const dbAnswers: Record<number, string | string[]> = {};
          resultsData.answers.forEach((answer: any) => {
            dbAnswers[answer.questionId] = answer.selectedOptions;
          });
          setUserAnswers(dbAnswers);
          
          // Set time taken from database
          setTimeTaken(resultsData.attempt.timeTaken);
          
          // Set score from database
          setScore({
            correct: resultsData.summary.correctAnswers,
            total: resultsData.summary.totalQuestions,
            percentage: resultsData.summary.percentage
          });
          
          // Fetch contestant data
          const contestantResponse = await fetch(`/api/arena/contestant/${contestantHashcode}`);
          if (contestantResponse.ok) {
            const contestantResult = await contestantResponse.json();
            if (contestantResult.success) {
              setContestant(contestantResult);
            }
          }
          
          return; // Exit early - we have all the data we need
        }
      }
      
      // Fallback: Quiz not completed or error - use original logic with localStorage
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

      setQuiz({
        ...quizResult.quiz,
        questions: quizResult.questions
      });
      setContestant(contestantResult);

    } catch (err) {
      console.error('Error fetching quiz results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz results');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateScore = () => {
    if (!quiz) return;

    let correctCount = 0;
    const totalQuestions = quiz.questions.length;

    quiz.questions.forEach((question) => {
      const userAnswer = userAnswers[question.id];
      const correctAnswer = question.answer_correct;

      if (question.answer_type === 'multiple_selection') {
        // For multiple selection, compare arrays
        const userAnswerArray = Array.isArray(userAnswer) ? userAnswer : [];
        const correctAnswerArray = Array.isArray(correctAnswer) ? correctAnswer : correctAnswer.split(',');
        
        if (userAnswerArray.length === correctAnswerArray.length &&
            userAnswerArray.every(ans => correctAnswerArray.includes(ans))) {
          correctCount++;
        }
      } else {
        // For single selection and binary
        if (userAnswer === correctAnswer) {
          correctCount++;
        }
      }
    });

    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    setScore({ correct: correctCount, total: totalQuestions, percentage });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} ${t.minutes} ${secs} ${t.seconds}`;
  };

  const renderAnswerOptions = (question: Question, selectedAnswer: string | string[] | undefined, isCorrect: boolean) => {
    if (!question.answer_options || question.answer_options.length === 0) {
      return <span className="text-gray-500">{t.noAnswerProvided}</span>;
    }

    if (question.answer_type === 'multiple_selection') {
      const selectedArray = Array.isArray(selectedAnswer) ? selectedAnswer : [];
      return (
        <div className="space-y-1">
          {question.answer_options.map((option: any, index: number) => {
            const isSelected = selectedArray.includes(option.option);
            const isCorrectOption = question.answer_correct.split(',').includes(option.option);
            
            return (
              <div key={index} className={`p-2 rounded text-sm ${
                isSelected 
                  ? isCorrectOption 
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                  : isCorrectOption
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-gray-50 text-gray-600'
              }`}>
                <span className="font-medium">{option.option}:</span> <MathText>{option.answer}</MathText>
                {isSelected && (
                  <span className="ml-2">
                    {isCorrectOption ? (
                      <CheckCircle className="inline w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="inline w-4 h-4 text-red-600" />
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    } else {
      // Single selection or binary
      const selectedOption = question.answer_options.find((opt: any) => opt.option === selectedAnswer);
      const correctOption = question.answer_options.find((opt: any) => opt.option === question.answer_correct);
      
      return (
        <div className="space-y-2">
          {selectedOption && (
            <div className={`p-2 rounded text-sm ${
              isCorrect ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              <strong>{t.yourAnswer}:</strong> {selectedOption.option}: <MathText>{selectedOption.answer}</MathText>
              {isCorrect ? (
                <CheckCircle className="inline ml-2 w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="inline ml-2 w-4 h-4 text-red-600" />
              )}
            </div>
          )}
          {!isCorrect && correctOption && (
            <div className="p-2 rounded text-sm bg-green-50 text-green-700 border border-green-200">
              <strong>{t.correctAnswer}:</strong> {correctOption.option}: <MathText>{correctOption.answer}</MathText>
              <CheckCircle className="inline ml-2 w-4 h-4 text-green-600" />
            </div>
          )}
        </div>
      );
    }
  };

  const handleBackToDashboard = () => {
    // Clear stored quiz data
    localStorage.removeItem(`quiz_${quizId}_answers`);
    localStorage.removeItem(`quiz_${quizId}_time_taken`);
    
    // Redirect to arena dashboard
    router.push(`/arena/${contestantHashcode}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center p-6">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.error}</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleBackToDashboard} className="w-full">
              <Home className="w-4 h-4 mr-2" />
              {t.backToDashboard}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz || !contestant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center p-6">
            <p className="text-gray-600">{t.error}</p>
            <Button onClick={handleBackToDashboard} className="mt-4 w-full">
              <Home className="w-4 h-4 mr-2" />
              {t.backToDashboard}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Language Toggle */}
      <div className="flex justify-end mb-4">
        <div className="flex bg-white rounded-lg shadow-sm border">
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 text-sm rounded-l-lg ${
              language === 'en' 
                ? 'bg-indigo-600 text-white' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('my')}
            className={`px-3 py-1 text-sm rounded-r-lg ${
              language === 'my' 
                ? 'bg-indigo-600 text-white' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Bahasa
          </button>
        </div>
      </div>

      {/* Header */}
      <Card className="mb-6">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="w-12 h-12 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t.congratulations}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {t.quizCompleted}: <strong><MathText>{quiz.quiz_name}</MathText></strong>
          </p>
        </CardHeader>
      </Card>

      {/* Score Summary */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="text-center p-6">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">{t.yourScore}</h3>
            <p className="text-2xl font-bold text-indigo-600">
              {score.correct}/{score.total}
            </p>
            <p className="text-sm text-gray-600">({score.percentage}%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center p-6">
            <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">{t.timeTaken}</h3>
            <p className="text-lg font-bold text-blue-600">
              {formatTime(timeTaken)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center p-6">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">{t.correctAnswers}</h3>
            <p className="text-2xl font-bold text-green-600">
              {score.correct}
            </p>
            <p className="text-sm text-gray-600">out of {score.total}</p>
          </CardContent>
        </Card>
      </div>



      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={handleBackToDashboard}
          className="flex items-center justify-center px-6 py-3"
          size="lg"
        >
          <Home className="w-5 h-5 mr-2" />
          {t.backToDashboard}
        </Button>
      </div>
    </div>
  );
}

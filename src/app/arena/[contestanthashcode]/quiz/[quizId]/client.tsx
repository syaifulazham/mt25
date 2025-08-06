'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Clock, 
  CheckCircle, 
  ArrowLeft, 
  Timer, 
  AlertCircle,
  Star,
  Zap,
  Trophy,
  Target,
  Heart
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import Link from 'next/link';

interface QuizData {
  id: number;
  quiz_name: string;
  description: string;
  target_group: string;
  time_limit: number;
  totalQuestions: number;
  status: string;
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

interface QuizStartClientProps {
  contestantHashcode: string;
  quizId: number;
}

export default function QuizStartClient({ contestantHashcode, quizId }: QuizStartClientProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [contestant, setContestant] = useState<ContestantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [encouragingWord, setEncouragingWord] = useState('');
  const { t, language } = useLanguage();

  // Predefined encouraging words
  const encouragingWords = {
    en: [
      "You've got this! 🌟",
      "Believe in yourself! 💪",
      "Show your brilliance! ✨",
      "Make it count! 🎯",
      "You're amazing! 🚀"
    ],
    my: [
      "Anda pasti boleh! 🌟",
      "Percaya pada diri anda! 💪",
      "Tunjukkan kehebatan anda! ✨",
      "Buat yang terbaik! 🎯",
      "Anda hebat! 🚀"
    ]
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
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

        setQuiz(quizResult.quiz);
        setContestant(contestantResult);

        // Set random encouraging word
        const words = encouragingWords[language as keyof typeof encouragingWords] || encouragingWords.en;
        const randomWord = words[Math.floor(Math.random() * words.length)];
        setEncouragingWord(randomWord);

      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quiz data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [contestantHashcode, quizId, language]);

  const handleStartQuiz = async () => {
    try {
      setIsLoading(true);
      
      // Call the quiz start API to create quiz_attempt and quiz_answer records
      const startResponse = await fetch(`/api/arena/contestant/${contestantHashcode}/quiz/${quizId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const startResult = await startResponse.json();
      
      // Check if quiz is already completed (409 status)
      if (startResponse.status === 409 && startResult.isCompleted) {
        console.log('Quiz already completed, redirecting to results:', startResult);
        
        // Store the completed attempt data for results page
        localStorage.setItem(`quiz_${quizId}_answers`, '{}'); // Empty answers since it's completed
        localStorage.setItem(`quiz_${quizId}_time_taken`, startResult.timeTaken.toString());
        
        // Redirect directly to results page
        router.push(`/arena/${contestantHashcode}/quiz/${quizId}/results`);
        return;
      }

      if (!startResponse.ok) {
        const errorData = startResult || {};
        throw new Error(errorData.message || 'Failed to start quiz');
      }
      
      if (!startResult.success) {
        throw new Error(startResult.message || 'Failed to start quiz');
      }

      // Store attempt ID in localStorage for the quiz taking page
      localStorage.setItem(`quiz_${quizId}_attempt_id`, startResult.attemptId.toString());
      
      console.log('Quiz attempt started:', startResult);
      
      // Navigate to the actual quiz page
      router.push(`/arena/${contestantHashcode}/quiz/${quizId}/start`);
      
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to start quiz. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeLimit = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return language === 'my' ? `${hours} jam` : `${hours} hour${hours > 1 ? 's' : ''}`;
      }
      return language === 'my' 
        ? `${hours} jam ${remainingMinutes} minit`
        : `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
    }
    return language === 'my' ? `${minutes} minit` : `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 max-w-md mx-4">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-white/80">
                {language === 'my' ? 'Memuatkan...' : 'Loading...'}
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
              <Link href={`/arena/${contestantHashcode}`}>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {language === 'my' ? 'Kembali' : 'Go Back'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz || !contestant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <img 
              src={contestant.contingent.logoUrl || '/default-logo.png'} 
              alt="Contingent Logo" 
              className="w-12 h-12 rounded-full object-cover border-2 border-cyan-400"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">
                Malaysia Techlympics 2025
              </h1>
              <p className="text-cyan-400">
                {contestant.contingent.name.replace(/\bContingent\b/gi, '').trim()}
              </p>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              {language === 'my' ? 'Selamat datang' : 'Welcome'}, {contestant.contestant.name}!
            </h2>
            <div className="text-2xl font-bold text-cyan-400 mb-2">
              {encouragingWord}
            </div>
          </div>
        </div>

        {/* Quiz Information Card */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="text-white text-2xl flex items-center space-x-3">
                <Trophy className="w-8 h-8 text-yellow-400" />
                <span>{quiz.quiz_name}</span>
              </CardTitle>
              {quiz.description && (
                <CardDescription className="text-white/80 text-lg">
                  {quiz.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quiz Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <Timer className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <div className="text-white font-semibold">
                    {language === 'my' ? 'Had Masa' : 'Time Limit'}
                  </div>
                  <div className="text-cyan-400 text-lg font-bold">
                    {formatTimeLimit(quiz.time_limit)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-white font-semibold">
                    {language === 'my' ? 'Jumlah Soalan' : 'Total Questions'}
                  </div>
                  <div className="text-yellow-400 text-lg font-bold">
                    {quiz.totalQuestions}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-white font-semibold">
                    {language === 'my' ? 'Kumpulan Sasaran' : 'Target Group'}
                  </div>
                  <div className="text-green-400 text-lg font-bold">
                    {quiz.target_group}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-white/5 rounded-lg p-6">
                <h3 className="text-white text-xl font-semibold mb-4 flex items-center space-x-2">
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                  <span>{language === 'my' ? 'Arahan Penting' : 'Important Instructions'}</span>
                </h3>
                
                <div className="space-y-4 text-white/90">
                  <div className="flex items-start space-x-3">
                    <div className="bg-cyan-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</div>
                    <p>
                      {language === 'my' 
                        ? 'Pemasa akan bermula secara automatik sebaik sahaja anda menekan butang "Mula".'
                        : 'The timer will automatically start once you click the "Start" button.'
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-cyan-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</div>
                    <p>
                      {language === 'my' 
                        ? `Anda mempunyai ${formatTimeLimit(quiz.time_limit)} untuk menyelesaikan kuiz ini dari masa anda menekan "Mula".`
                        : `You have ${formatTimeLimit(quiz.time_limit)} to complete this quiz from when you click "Start".`
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-cyan-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</div>
                    <p>
                      {language === 'my' 
                        ? 'Apabila masa tamat, halaman soalan akan ditutup secara automatik dan anda akan dibawa ke halaman keputusan anda.'
                        : 'Once time runs out, the question page will automatically close and you will be redirected to your results page.'
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-cyan-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</div>
                    <p>
                      {language === 'my' 
                        ? 'Anda boleh kembali ke mana-mana soalan sebelumnya dan membuat pembetulan sebelum menekan butang "Selesai" atau masa tamat.'
                        : 'You can return to any previous question and make corrections before clicking the "Finish" button or time runs out.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href={`/arena/${contestantHashcode}`} className="flex-1">
                  <Button 
                    variant="outline" 
                    className="w-full border-white/20 text-black hover:bg-white/10 h-12"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2 text-black" />
                    {language === 'my' ? 'Kembali ke Arena' : 'Back to Arena'}
                  </Button>
                </Link>
                
                <Button 
                  onClick={handleStartQuiz}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-12 text-lg font-semibold"
                >
                  <Play className="w-6 h-6 mr-2" />
                  {language === 'my' ? 'Mula Kuiz' : 'Start Quiz'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

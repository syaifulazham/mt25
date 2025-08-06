'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Gamepad2, 
  Trophy, 
  Star, 
  Zap, 
  Clock, 
  Calendar,
  User,
  School,
  LogOut,
  Play,
  CheckCircle,
  XCircle,
  Timer,
  Key,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import Link from 'next/link';

interface ContestantData {
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
    logoUrl: string;
    institutionName: string;
    contingentType: string;
  };
  scheduledQuizzes: Array<{
    id: number;
    title: string;
    description: string;
    duration: number | null;
    targetGroup: string;
    targetGroupName: string;
    publishedAt: string;
    totalQuestions: number;
    status: string;
    canStart: boolean;
    attempt?: {
      id: number;
      status: string;
      score: number;
      timeTaken: number;
      startTime: string;
      endTime: string;
      isCompleted: boolean;
    } | null;
  }>;
  loginCount: number;
}

interface ContestantArenaClientProps {
  contestantHashcode: string;
}

export default function ContestantArenaClient({ contestantHashcode }: ContestantArenaClientProps) {
  const router = useRouter();
  const [data, setData] = useState<ContestantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [showPasscodeSection, setShowPasscodeSection] = useState(false);
  const [isUpdatingPasscode, setIsUpdatingPasscode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'manual' | 'random' | null>(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    const fetchContestantData = async () => {
      try {
        const response = await fetch(`/api/arena/contestant/${contestantHashcode}`);
        const result = await response.json();

        if (response.ok && result.success) {
          setData(result);
        } else {
          setError(result.message || 'Failed to load contestant data');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error('Arena data fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContestantData();
  }, [contestantHashcode]);

  const handleLogout = () => {
    router.push('/arena/login');
  };

  const generateRandomPasscode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handlePasscodeChange = (value: string) => {
    // Convert to uppercase and limit to 6 alphanumeric characters
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setNewPasscode(cleaned);
  };

  const handleGenerateRandom = () => {
    setConfirmAction('random');
    setNewPasscode(generateRandomPasscode());
    setShowConfirmDialog(true);
  };

  const handleManualUpdate = () => {
    if (newPasscode.length === 6) {
      setConfirmAction('manual');
      setShowConfirmDialog(true);
    }
  };

  const confirmPasscodeUpdate = async () => {
    if (!newPasscode || newPasscode.length !== 6) return;

    setIsUpdatingPasscode(true);
    try {
      const response = await fetch(`/api/arena/contestant/${contestantHashcode}/passcode`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ passcode: newPasscode }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(language === 'my' ? 'Kata laluan berjaya dikemaskini!' : 'Passcode updated successfully!');
        setNewPasscode('');
        setShowPasscodeSection(false);
      } else {
        alert(result.message || (language === 'my' ? 'Gagal mengemaskini kata laluan' : 'Failed to update passcode'));
      }
    } catch (err) {
      console.error('Passcode update error:', err);
      alert(language === 'my' ? 'Ralat tidak dijangka berlaku' : 'An unexpected error occurred');
    } finally {
      setIsUpdatingPasscode(false);
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  const cancelPasscodeUpdate = () => {
    setShowConfirmDialog(false);
    setConfirmAction(null);
    if (confirmAction === 'random') {
      setNewPasscode('');
    }
  };

  const getQuizStatus = (quiz: ContestantData['scheduledQuizzes'][0]) => {
    // For published quizzes, they are always available to start
    if (quiz.status === 'published' && quiz.canStart) {
      return { status: 'available', label: language === 'my' ? 'Tersedia' : 'Available', color: 'bg-green-500' };
    } else {
      return { status: 'unavailable', label: language === 'my' ? 'Tidak Tersedia' : 'Unavailable', color: 'bg-gray-500' };
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(language === 'my' ? 'ms-MY' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p>{language === 'my' ? 'Memuatkan Arena...' : 'Loading Arena...'}</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-white">
              {language === 'my' ? 'Arena Tidak Dijumpai' : 'Arena Not Found'}
            </CardTitle>
            <CardDescription className="text-white/70">
              {error || (language === 'my' ? 'Arena peserta tidak wujud atau tidak boleh diakses' : 'Contestant arena does not exist or is not accessible')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/arena/login">
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                {language === 'my' ? 'Kembali ke Log Masuk' : 'Back to Login'}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-cyan-400/10 rounded-full blur-3xl animate-bounce"></div>
      </div>

      {/* Floating game elements */}
      <div className="absolute inset-0 pointer-events-none">
        <Star className="absolute top-20 left-20 text-yellow-400 w-6 h-6 animate-spin" />
        <Zap className="absolute top-40 right-32 text-cyan-400 w-8 h-8 animate-pulse" />
        <Trophy className="absolute bottom-40 left-16 text-yellow-500 w-10 h-10 animate-bounce" />
      </div>

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Gamepad2 className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">ARENA</h1>
              <p className="text-sm text-white/60">Malaysia Techlympics 2025</p>
            </div>
          </div>
          <Button 
            onClick={handleLogout}
            variant="outline" 
            size="sm"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {language === 'my' ? 'Log Keluar' : 'Logout'}
          </Button>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Profile */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contestant Info */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-cyan-400">
                  <AvatarImage src={data.contingent.logoUrl} alt={data.contingent.name} />
                  <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xl">
                    {data.contestant.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-white text-xl">{data.contestant.name}</CardTitle>
                <CardDescription className="text-white/70">
                  {language === 'my' ? 'Peserta' : 'Contestant'} • {data.contestant.edu_level}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">

                <div className="flex items-center space-x-2 text-white/80">
                  <School className="w-4 h-4" />
                  <span className="text-sm">{data.contingent.institutionName}</span>
                </div>
                {data.contestant.class_grade && (
                  <div className="text-center">
                    <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                      {data.contestant.class_grade} {data.contestant.class_name}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contingent Info */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span>{language === 'my' ? 'Kontinjen' : 'Contingent'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  {data.contingent.logoUrl && (
                    <img 
                      src={data.contingent.logoUrl} 
                      alt={data.contingent.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <p className="text-white font-medium">{data.contingent.name.replace(/\bContingent\b/gi, '').trim()}</p>
                    <p className="text-white/60 text-sm">{data.contingent.institutionName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span>{language === 'my' ? 'Statistik' : 'Stats'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/70">{language === 'my' ? 'Log Masuk' : 'Logins'}:</span>
                    <span className="text-white font-medium">{data.loginCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">{language === 'my' ? 'Kuiz Dijadualkan' : 'Scheduled Quizzes'}:</span>
                    <span className="text-white font-medium">{data.scheduledQuizzes.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Passcode Renewal Section */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center space-x-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  <span>{language === 'my' ? 'Tukar Kata Laluan' : 'Renew Passcode'}</span>
                </CardTitle>
                <CardDescription className="text-white/70">
                  {language === 'my' ? 'Kemaskini kata laluan arena anda' : 'Update your arena passcode'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!showPasscodeSection ? (
                  <Button
                    onClick={() => setShowPasscodeSection(true)}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {language === 'my' ? 'Tukar Kata Laluan' : 'Change Passcode'}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-white/80 text-sm font-medium">
                        {language === 'my' ? 'Kata Laluan Baru (6 aksara)' : 'New Passcode (6 characters)'}
                      </label>
                      <input
                        type="text"
                        value={newPasscode}
                        onChange={(e) => handlePasscodeChange(e.target.value)}
                        placeholder="ABC123"
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                        maxLength={6}
                      />
                      <p className="text-white/50 text-xs">
                        {language === 'my' ? 'Hanya huruf besar dan nombor sahaja' : 'Uppercase letters and numbers only'}
                      </p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleGenerateRandom}
                        disabled={isUpdatingPasscode}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        {language === 'my' ? 'Jana Rawak' : 'Generate Random'}
                      </Button>
                      <Button
                        onClick={handleManualUpdate}
                        disabled={newPasscode.length !== 6 || isUpdatingPasscode}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-500"
                      >
                        {language === 'my' ? 'Kemaskini' : 'Update'}
                      </Button>
                    </div>
                    
                    <Button
                      onClick={() => {
                        setShowPasscodeSection(false);
                        setNewPasscode('');
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      {language === 'my' ? 'Batal' : 'Cancel'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quizzes Section */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-2xl flex items-center space-x-2">
                  <Gamepad2 className="w-6 h-6 text-cyan-400" />
                  <span>{language === 'my' ? 'Kuiz Dijadualkan' : 'Scheduled Quizzes'}</span>
                </CardTitle>
                <CardDescription className="text-white/70">
                  {language === 'my' ? 'Kuiz yang tersedia untuk anda' : 'Available quizzes for you'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.scheduledQuizzes.length === 0 ? (
                  <div className="text-center py-12">
                    <Timer className="w-16 h-16 text-white/40 mx-auto mb-4" />
                    <p className="text-white/60 text-lg">
                      {language === 'my' ? 'Tiada kuiz dijadualkan buat masa ini' : 'No quizzes scheduled at the moment'}
                    </p>
                    <p className="text-white/40 text-sm mt-2">
                      {language === 'my' ? 'Sila semak semula kemudian' : 'Please check back later'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.scheduledQuizzes.map((quiz) => {
                      const quizStatus = getQuizStatus(quiz);
                      return (
                        <Card key={quiz.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h3 className="text-white font-semibold text-lg">{quiz.title}</h3>
                                  <Badge className={`${quizStatus.color} text-white text-xs`}>
                                    {quizStatus.label}
                                  </Badge>
                                  {quiz.attempt?.isCompleted && (
                                    <div className="flex items-center space-x-1">
                                      <CheckCircle className="w-4 h-4 text-green-400 animate-pulse" />
                                      <span className="text-green-400 font-semibold text-xs">
                                        {language === 'my' ? 'Selesai' : 'Completed'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <p className="text-white/70 text-sm mb-3">{quiz.description}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div className="flex items-center space-x-2 text-white/60">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDateTime(quiz.publishedAt)}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-white/60">
                                    <Clock className="w-4 h-4" />
                                    <span>{quiz.duration ? `${quiz.duration} ${language === 'my' ? 'minit' : 'minutes'}` : (language === 'my' ? 'Tiada had masa' : 'No time limit')}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-white/60">
                                    <Trophy className="w-4 h-4" />
                                    <span>{quiz.targetGroupName}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 text-white/60">
                                    <Star className="w-4 h-4" />
                                    <span>{quiz.totalQuestions} {language === 'my' ? 'soalan' : 'questions'}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4">
                                {quiz.attempt?.isCompleted ? (
                                  <Button 
                                    onClick={() => router.push(`/arena/${contestantHashcode}/quiz/${quiz.id}/results`)}
                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                                  >
                                    <Trophy className="w-4 h-4 mr-2" />
                                    {language === 'my' ? 'Lihat Hasil' : 'View Results'}
                                  </Button>
                                ) : quizStatus.status === 'available' ? (
                                  <Button 
                                    onClick={() => router.push(`/arena/${contestantHashcode}/quiz/${quiz.id}`)}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                  >
                                    <Play className="w-4 h-4 mr-2" />
                                    {language === 'my' ? 'Mula' : 'Start'}
                                  </Button>
                                ) : (
                                  <Button disabled className="bg-gray-600 text-gray-300">
                                    <XCircle className="w-4 h-4 mr-2" />
                                    {language === 'my' ? 'Tidak Tersedia' : 'Unavailable'}
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            {/* Completed Quiz Results Section at Bottom */}
                            {quiz.attempt?.isCompleted && (
                              <div className="border-t border-white/10 pt-4">
                                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-green-400 font-semibold text-sm flex items-center space-x-2">
                                      <Trophy className="w-4 h-4" />
                                      <span>{language === 'my' ? 'Keputusan Kuiz' : 'Quiz Results'}</span>
                                    </h4>
                                  </div>
                                  <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="bg-white/5 rounded-lg p-3">
                                      <div className="flex items-center justify-center space-x-1 mb-1">
                                        <Star className="w-4 h-4 text-yellow-400" />
                                        <span className="text-white/60 text-xs">
                                          {language === 'my' ? 'Markah' : 'Points'}
                                        </span>
                                      </div>
                                      <div className="text-white font-bold text-lg">
                                        {quiz.attempt.score}<span className="text-white/60 text-sm">/{quiz.totalQuestions}</span>
                                      </div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3">
                                      <div className="flex items-center justify-center space-x-1 mb-1">
                                        <Timer className="w-4 h-4 text-blue-400" />
                                        <span className="text-white/60 text-xs">
                                          {language === 'my' ? 'Masa' : 'Time'}
                                        </span>
                                      </div>
                                      <div className="text-white font-bold text-lg">
                                        {Math.floor(quiz.attempt.timeTaken / 60)}:{(quiz.attempt.timeTaken % 60).toString().padStart(2, '0')}
                                      </div>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-3">
                                      <div className="flex items-center justify-center space-x-1 mb-1">
                                        <Zap className="w-4 h-4 text-purple-400" />
                                        <span className="text-white/60 text-xs">
                                          {language === 'my' ? 'Peratusan' : 'Percentage'}
                                        </span>
                                      </div>
                                      <div className="text-white font-bold text-lg">
                                        {Math.round((quiz.attempt.score / quiz.totalQuestions) * 100)}%
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="bg-white/10 backdrop-blur-md border-white/20 max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <span>{language === 'my' ? 'Pengesahan' : 'Confirmation'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-white/80">
                <p className="mb-2">
                  {confirmAction === 'random' 
                    ? (language === 'my' ? 'Anda akan menjana kata laluan rawak:' : 'You are about to generate a random passcode:')
                    : (language === 'my' ? 'Anda akan mengemaskini kata laluan kepada:' : 'You are about to update your passcode to:')
                  }
                </p>
                <div className="bg-white/10 border border-white/20 rounded-md p-3 text-center">
                  <span className="text-cyan-400 font-mono text-xl font-bold tracking-widest">{newPasscode}</span>
                </div>
                <p className="text-white/60 text-sm mt-2">
                  {language === 'my' 
                    ? 'Pastikan anda ingat kata laluan ini untuk log masuk pada masa hadapan.'
                    : 'Make sure to remember this passcode for future logins.'
                  }
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={cancelPasscodeUpdate}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={isUpdatingPasscode}
                >
                  {language === 'my' ? 'Batal' : 'Cancel'}
                </Button>
                <Button
                  onClick={confirmPasscodeUpdate}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isUpdatingPasscode}
                >
                  {isUpdatingPasscode 
                    ? (language === 'my' ? 'Mengemaskini...' : 'Updating...')
                    : (language === 'my' ? 'Sahkan' : 'Confirm')
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

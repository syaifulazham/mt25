'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Gamepad2, Trophy, Star, Zap, Shield } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';
import Link from 'next/link';

interface LoginFormData {
  ic: string;
  passcode: string;
}

export default function ArenaLoginClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginFormData>({ ic: '', passcode: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/arena/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Redirect to contestant's arena page
        router.push(`/arena/${result.contestantHashcode}`);
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Arena login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

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
        <Shield className="absolute bottom-20 right-20 text-green-400 w-7 h-7 animate-pulse delay-500" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <Link 
              href="/" 
              className="inline-block text-white/80 hover:text-white transition-colors text-sm"
            >
              ← {t('auth.back_to_main')}
            </Link>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <Gamepad2 className="w-8 h-8 text-cyan-400" />
                <h1 className="text-2xl font-bold text-white">ARENA</h1>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-white/60 tracking-wider">MALAYSIA</p>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500 bg-clip-text text-transparent">
                  {t('hero.title') || 'Techlympics 2025'}
                </h2>
                <p className="text-sm text-white/80">{t('hero.subtitle') || 'Extraordinary, Global, Inclusive'}</p>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-white text-xl">Enter the Arena</CardTitle>
              <CardDescription className="text-white/70">
                Login to your gaming dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert className="bg-red-500/20 border-red-500/50 text-red-100">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="ic" className="text-white text-sm font-medium">
                    Player ID (IC Number)
                  </Label>
                  <Input
                    id="ic"
                    type="text"
                    placeholder="Enter your IC number"
                    value={formData.ic}
                    onChange={handleInputChange('ic')}
                    required
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-cyan-400 focus:ring-cyan-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passcode" className="text-white text-sm font-medium">
                    Arena Passcode
                  </Label>
                  <Input
                    id="passcode"
                    type="password"
                    placeholder="Enter your passcode"
                    value={formData.passcode}
                    onChange={handleInputChange('passcode')}
                    required
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 focus:border-cyan-400 focus:ring-cyan-400"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Entering Arena...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Gamepad2 className="w-4 h-4" />
                      <span>Enter Arena</span>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Gaming-themed footer */}
          <div className="text-center text-white/60 text-xs space-y-2">
            <p>🎮 Ready to compete? 🏆</p>
            <p>Join the ultimate STEM challenge!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

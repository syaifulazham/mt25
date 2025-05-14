"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, User, Users, Award } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-context';

// Metadata is moved to layout.tsx when using client components

// Define a combined user type to handle both regular users and participants
type CombinedUser = {
  id: number;
  name: string | null;
  email: string;
  username: string;
  role?: string;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  // Participant-specific fields
  isParticipant?: boolean;
  ic?: string | null;
  phoneNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
  schoolId?: number | null;
  higherInstId?: number | null;
};

export default function ProfilePage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<CombinedUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch('/api/user/profile');
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, []);

  // Display loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t('profile.description')}
        </p>
      </div>

      <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">{t('profile.personal_info.title')}</CardTitle>
              <CardDescription>
                {t('profile.personal_info.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">{t('profile.field.name')}</h3>
                  <p className="text-base">{user?.name || t('profile.not_provided')}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">{t('profile.field.email')}</h3>
                  <p className="text-base break-all">{user?.email}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">{t('profile.field.username')}</h3>
                  <p className="text-base">{user?.username}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">{t('profile.field.role')}</h3>
                  <p className="text-base">{user?.role || 'PARTICIPANTS_MANAGER'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">{t('profile.field.account_created')}</h3>
                  <p className="text-base">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('profile.unknown')}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">{t('profile.field.last_login')}</h3>
                  <p className="text-base">{user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : t('profile.never')}</p>
                </div>
                
                {/* Participant-specific fields */}
                {user?.isParticipant && (
                  <>
                    {user?.ic && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">{t('profile.field.ic_number')}</h3>
                        <p className="text-base">{user.ic}</p>
                      </div>
                    )}
                    {user?.phoneNumber && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">{t('profile.field.phone_number')}</h3>
                        <p className="text-base">{user.phoneNumber}</p>
                      </div>
                    )}
                    {user?.gender && (
                      <div>
                        <h3 className="font-medium text-sm text-muted-foreground">{t('profile.field.gender')}</h3>
                        <p className="text-base">{user.gender}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div className="mt-6">
                <Button className="w-full sm:w-auto" asChild>
                  <Link href="/participants/profile/edit">{t('profile.edit_button')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
      </div>
      
      <div className="fixed bottom-4 right-4 md:hidden">
        <Button size="icon" className="rounded-full h-12 w-12 shadow-lg" asChild>
          <Link href="/participants/dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            <span className="sr-only">{t('nav.dashboard')}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

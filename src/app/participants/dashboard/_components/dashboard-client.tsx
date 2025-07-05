"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";
import { LanguageSwitcher } from "@/lib/i18n/language-switcher";
import ProfileSummary from "./profile-summary";
import ContingentSummary from "./contingent-summary";
import ContestantsSummary from "./contestants-summary";
import TeamsSummary from "./teams-summary";
import VideoGallery from "./video-gallery";
import PendingRequestsAlert from "./pending-requests-alert";
import ProfileCompletionAlert from "./profile-completion-alert";
import UnassignedContestantsAlert from "./unassigned-contestants-alert";
import ZoneRegistration from "./zone-registration";

interface DashboardClientProps {
  user: any;
  userDetails: any;
}

export default function DashboardClient({ user, userDetails }: DashboardClientProps) {
  const { t } = useLanguage();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome header with language switcher */}
      <div className="flex justify-between items-center pb-4 border-b mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('dashboard.welcome')}, {user?.name || user?.username}</h1>
          <p className="text-xs text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button size="sm" variant="outline" asChild>
            <Link href="/participants/profile" className="text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {t('dashboard.edit_profile')}
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Profile Completion Alert - shows when user profile is incomplete */}
      <ProfileCompletionAlert userDetails={userDetails} />
      
      {/* Pending Requests Alert - more compact, only shows if there are pending requests */}
      <PendingRequestsAlert userId={Number(user.id)} participantId={Number(user.id)} />
      
      {/* Unassigned Contestants Alert - shows when there are contestants without assigned contests */}
      <UnassignedContestantsAlert />
      
      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <Button variant="outline" size="sm" className="h-auto py-3 flex flex-col items-center justify-center gap-1" asChild>
          <Link href="/participants/teams">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="text-xs">{t('dashboard.my_teams')}</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-auto py-3 flex flex-col items-center justify-center gap-1" asChild>
          <Link href="/participants/contestants">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="text-xs">{t('dashboard.participants')}</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-auto py-3 flex flex-col items-center justify-center gap-1" asChild>
          <Link href="/participants/managers">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span className="text-xs">{t('dashboard.managers')}</span>
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-auto py-3 flex flex-col items-center justify-center gap-1" asChild>
          <Link href="/participants/contests">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span className="text-xs">{t('dashboard.contests')}</span>
          </Link>
        </Button>
      </div>

      {/* Statistics Grid - small, compact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Profile Summary - simplified */}
        <ProfileSummary user={userDetails} />
        
        {/* Contingent Summary - simplified */}
        <ContingentSummary participantId={Number(user.id)} />
        
        {/* Contestants Summary - simplified */}
        <ContestantsSummary userId={Number(user.id)} />
        
        {/* Teams Summary - simplified */}
        <TeamsSummary participantId={Number(user.id)} />
      </div>
      
      {/* Zone Physical Event Registration */}
      <ZoneRegistration participantId={Number(user.id)} />
      
      {/* Video Gallery - now more compact */}
      <div className="p-4 bg-muted/50 rounded-lg mb-6">
        <h2 className="text-sm font-medium mb-3">{t('dashboard.resources')}</h2>
        <VideoGallery />
      </div>

      {/* Floating Action Button - only on mobile */}
      <div className="fixed bottom-4 right-4 md:hidden">
        <Button size="icon" className="rounded-full h-10 w-10 shadow-lg bg-primary" asChild>
          <Link href="/participants/help">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
            <span className="sr-only">{t('dashboard.help')}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

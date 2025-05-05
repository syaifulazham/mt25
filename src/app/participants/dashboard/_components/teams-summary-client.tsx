"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Users } from "lucide-react";

interface TeamsSummaryClientProps {
  stats: {
    teamCount: number;
    contestsJoined: number;
    teamMembersCount: number;
  } | null;
  isLoading: boolean;
  error: string | null;
}

export default function TeamsSummaryClient({ stats, isLoading, error }: TeamsSummaryClientProps) {
  const { t } = useLanguage();
  
  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow transition-shadow duration-200">
      <CardHeader className="p-4 pb-0 flex justify-between items-start">
        <div>
          <CardTitle className="text-sm font-medium">{t('teams.title')}</CardTitle>
          {stats && stats.teamCount > 0 ? (
            <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 h-4">
              {stats.teamCount} {stats.teamCount === 1 ? t('teams.team') : t('teams.teams')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-4">
              {t('teams.no_teams')}
            </Badge>
          )}
        </div>
        <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center">
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        {isLoading ? (
          <div className="text-xs text-center p-2">{t('common.loading')}</div>
        ) : !stats ? (
          <div className="text-xs text-muted-foreground text-center p-2">
            {error || t('teams.error_loading')}
          </div>
        ) : stats.teamCount > 0 ? (
          <div className="text-xs space-y-2">
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">{t('teams.contests_joined')}:</span>
              <span className="font-medium">{stats.contestsJoined}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">{t('teams.members')}:</span>
              <span className="font-medium">{stats.teamMembersCount}</span>
            </div>
            <div className="mt-2">
              <Link 
                href="/participants/teams"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center mt-2"
              >
                {t('teams.manage')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-4">{t('teams.no_teams_yet')}</p>
            <Link 
              href="/participants/teams" 
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              {t('teams.create_team')}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Users } from "lucide-react";

interface ContestantsSummaryClientProps {
  stats: {
    totalContestants: number;
    educationLevels: {
      primaryCount: number;
      secondaryCount: number;
      higherCount: number;
      unknownCount: number;
    }
  } | null;
  isLoading: boolean;
}

export default function ContestantsSummaryClient({ stats, isLoading }: ContestantsSummaryClientProps) {
  const { t } = useLanguage();
  
  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow transition-shadow duration-200">
      <CardHeader className="p-4 pb-0 flex justify-between items-start">
        <div>
          <CardTitle className="text-sm font-medium">{t('participants.title')}</CardTitle>
          {stats ? (
            <Badge variant={stats.totalContestants > 0 ? "default" : "secondary"} className="mt-1 text-[10px] px-1.5 py-0 h-4">
              {stats.totalContestants} {t(stats.totalContestants === 1 ? 'participants.registered_singular' : 'participants.registered_plural')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-4">
              {t('participants.none')}
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
            {t('participants.error_loading')}
          </div>
        ) : stats.totalContestants > 0 ? (
          <div className="text-xs space-y-2">
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">{t('participants.primary')}:</span>
              <span className="font-medium">{stats.educationLevels.primaryCount}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">{t('participants.secondary')}:</span>
              <span className="font-medium">{stats.educationLevels.secondaryCount}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">{t('participants.higher')}:</span>
              <span className="font-medium">{stats.educationLevels.higherCount}</span>
            </div>
            {stats.educationLevels.unknownCount > 0 && (
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">{t('participants.unknown')}:</span>
                <span className="font-medium">{stats.educationLevels.unknownCount}</span>
              </div>
            )}
            <div className="mt-2">
              <Link 
                href="/participants/contestants"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center mt-2"
              >
                {t('participants.manage')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-4">{t('participants.no_participants_yet')}</p>
            <Link 
              href="/participants/contestants" 
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              {t('participants.add_participants')}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

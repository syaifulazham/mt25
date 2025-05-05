"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Users } from "lucide-react";
import Link from "next/link";

interface ContingentSummaryClientProps {
  contingent: {
    id: number;
    name: string;
    short_name?: string;
    logoUrl?: string;
    isManager: boolean;
    membersCount: number;
    institution?: {
      name: string;
      type: string;
    };
  } | null;
  isLoading: boolean;
  error: string | null;
  noContingentYet: boolean;
}

export default function ContingentSummaryClient({ 
  contingent, 
  isLoading, 
  error, 
  noContingentYet 
}: ContingentSummaryClientProps) {
  const { t } = useLanguage();
  
  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow transition-shadow duration-200">
      <CardHeader className="p-4 pb-0 flex justify-between items-start">
        <div>
          <CardTitle className="text-sm font-medium">{t('contingent.title')}</CardTitle>
          {contingent ? (
            <Badge variant="default" className="mt-1 text-[10px] px-1.5 py-0 h-4">
              {contingent.isManager ? t('contingent.manager') : t('contingent.member')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0 h-4">
              {t('contingent.none')}
            </Badge>
          )}
        </div>
        <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center overflow-hidden">
          {contingent?.logoUrl ? (
            <img 
              src={contingent.logoUrl} 
              alt={contingent.name} 
              className="h-full w-full object-cover"
            />
          ) : (
            <Building className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-3">
        {isLoading ? (
          <div className="text-xs text-center p-2">{t('common.loading')}</div>
        ) : error ? (
          <div className="text-xs text-muted-foreground text-center p-2">
            {t('contingent.error_loading')}
          </div>
        ) : contingent ? (
          <div className="text-xs space-y-2">
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground">{t('contingent.name')}:</span>
              <span className="font-medium truncate max-w-[150px]" title={contingent.name}>
                {contingent.name}
              </span>
            </div>
            
            {contingent.short_name && (
              <div className="flex justify-between items-center py-1 border-b">
                <span className="text-muted-foreground">{t('contingent.short_name') || 'Short Name'}:</span>
                <span className="font-medium truncate max-w-[150px]" title={contingent.short_name}>
                  {contingent.short_name}
                </span>
              </div>
            )}
            
            
            
            <div className="flex justify-between items-center py-1 border-b">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3 w-3" /> {t('contingent.members')}:
              </span>
              <span className="font-medium">{contingent.membersCount}</span>
            </div>
            
            <div className="mt-2">
              <Link 
                href="/participants/contingents"
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center mt-2"
              >
                {t('contingent.manage')}
              </Link>
            </div>
          </div>
        ) : noContingentYet ? (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-4">{t('contingent.no_contingent_yet')}</p>
            <Link 
              href="/participants/contingents" 
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              {t('contingent.create_contingent')}
            </Link>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground mb-4">{t('contingent.join_instruction')}</p>
            <Link 
              href="/participants/contingents" 
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              {t('contingent.join_or_create')}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, Users } from "lucide-react";
import Link from "next/link";

// Function to normalize image URLs for both development and production environments
function normalizeImageUrl(url: string): string {
  if (!url) return '';
  
  // If it's already an absolute URL (starts with http:// or https://), return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's already a proper relative URL (starts with /), just return it
  // In both development and production, Next.js will resolve this correctly
  // as it will be relative to the domain root
  if (url.startsWith('/')) {
    return url;
  }
  
  // If it doesn't start with /, add it (this shouldn't happen, but just in case)
  return `/${url}`;
}

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
              src={normalizeImageUrl(contingent.logoUrl)} 
              alt={contingent.name} 
              className="h-full w-full object-cover"
              onError={(e) => {
                console.error(`Failed to load image: ${contingent.logoUrl}`);
                // Replace with building icon on error
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('flex');
                e.currentTarget.parentElement?.classList.add('items-center');
                e.currentTarget.parentElement?.classList.add('justify-center');
                const building = document.createElement('div');
                // Add the building icon
                building.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 text-muted-foreground"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>';
                e.currentTarget.parentElement?.appendChild(building.firstChild!);
              }}
              crossOrigin="anonymous"
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

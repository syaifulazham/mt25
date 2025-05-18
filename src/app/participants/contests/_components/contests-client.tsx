"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Users, ArrowRight, Loader2, Trophy, Award } from "lucide-react";
import { toast } from "sonner";
import contestsApi, { ContestGroupedByTarget, Contest } from "./contests-api";
import { useLanguage } from "@/lib/i18n/language-context";
import Link from "next/link";
import Image from "next/image";

// Default theme color
const DEFAULT_THEME_COLOR = "#0070f3";

export default function ContestsClient() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [contestGroups, setContestGroups] = useState<ContestGroupedByTarget[]>([]);

  useEffect(() => {
    loadContests();
  }, []);
  
  // Function to get theme color for a specific contest
  const getThemeColor = (contest: Contest): string => {
    return contest.theme?.color || DEFAULT_THEME_COLOR;
  };

  const loadContests = async () => {
    try {
      setIsLoading(true);
      const data = await contestsApi.getContests();
      setContestGroups(data);
    } catch (error) {
      console.error("Error loading contests:", error);
      toast.error("Failed to load contests");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (contestGroups.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Trophy className="h-10 w-10 text-primary mb-4" />
          <h3 className="text-lg font-medium mb-2">No Contests Available</h3>
          <p className="text-muted-foreground max-w-md">
            There are currently no contests available for registration. Please check back later.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-center mb-6">
        <div className="flex items-center space-x-2">
          <div className="bg-primary/10 p-2 rounded-md">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-primary">2025 Competitions</h2>
        </div>
      </div>

      <div className="space-y-8">
        {contestGroups.map(group => {
          // Set icon and color based on education level
          let iconComponent;
          let borderColor;
          let bgColor;
          
          switch(group.targetGroup.schoolLevel) {
            case 'primary':
              iconComponent = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10.5V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v4.5" /><path d="M1 10.5h22" /><path d="M4 10.5V20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9.5" /><path d="M12 17v-6" /><path d="M8 17v-5" /><path d="M16 17v-5" /></svg>;
              borderColor = "border-amber-500";
              bgColor = "bg-amber-50";
              break;
            case 'secondary':
              iconComponent = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v1a2 2 0 0 1-2 2h-1" /><path d="M5 10v1a2 2 0 0 0 2 2h1" /><path d="M19 12V3H5v9" /><path d="M7 16h10" /><path d="M9 16v4" /><path d="M15 16v4" /><path d="M3 19a18.651 18.651 0 0 1 18 0" /></svg>;
              borderColor = "border-blue-500";
              bgColor = "bg-blue-50";
              break;
            case 'higher':
              iconComponent = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 9l10 7 10-7-10-7z" /><path d="M20 11v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" /><path d="M12 16v4" /><path d="M8 16v1" /><path d="M16 16v1" /></svg>;
              borderColor = "border-purple-500";
              bgColor = "bg-purple-50";
              break;
            default:
              iconComponent = <Trophy className="h-5 w-5" />;
              borderColor = "border-primary";
              bgColor = "bg-primary/5";
          }
          
          return (
            <div key={group.targetGroup.id} className="space-y-4 mb-8">
              <div className={`rounded-md ${bgColor} p-3 shadow-sm`}>
                <div className={`flex items-center gap-3 border-l-4 ${borderColor} pl-3 py-1`}>
                  {iconComponent}
                  <h2 className="text-lg font-semibold">{t(`contests.educationLevel.${group.targetGroup.schoolLevel}`) || group.targetGroup.name}</h2>
                  <Badge variant="outline" className="ml-auto uppercase text-xs">
                    {group.contests.length} {t('contests.available')}
                  </Badge>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {group.contests.map((contest) => (
                <Card 
                  key={contest.id} 
                  className="overflow-hidden border border-muted hover:border-primary/50 transition-colors relative"
                >
                  {/* Theme logo as backdrop on left */}
                  {contest.theme?.logoPath && (
                    <div className="absolute w-64 h-64 opacity-5 pointer-events-none" style={{ top: '-30%', left: '-30%' }}>
                      <Image 
                        src={contest.theme.logoPath} 
                        alt=""
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge 
                            className="text-xs py-0 px-1.5 h-5 font-mono border-0" 
                            style={{ 
                              backgroundColor: `${getThemeColor(contest)}15`,
                              color: getThemeColor(contest),
                              fontWeight: 600
                            }}
                          >
                            {contest.code}
                          </Badge>
                          <CardTitle className="text-base">{contest.name}</CardTitle>
                        </div>
                      </div>
                    </div>
                    <Badge 
                      className="mt-2 border-0" 
                      style={{ 
                        backgroundColor: `${getThemeColor(contest)}20`, 
                        color: getThemeColor(contest) 
                      }}
                    >
                      {contest.contestType}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="prose prose-sm prose-slate max-w-none mb-4">
                      <p className="text-muted-foreground">{contest.description}</p>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mt-3 border-t pt-3">
                      <Users 
                        className="h-4 w-4 mr-2" 
                        style={{ color: `${getThemeColor(contest)}70` }} 
                      />
                      <span>{contest.participation_mode === "INDIVIDUAL" ? "Individual" : "Team"} participation</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Separator className="mt-6" />
          </div>
        );})}
      </div>
    </div>
  );
}

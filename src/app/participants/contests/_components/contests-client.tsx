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

      <div className="space-y-6">
        {contestGroups.map(group => (
          <div key={group.targetGroup.id} className="space-y-4 mb-6">
            <div className="flex items-center gap-2 border-l-4 border-primary pl-3 py-1">
              <h2 className="text-lg font-medium">{group.targetGroup.name}</h2>
              <Badge variant="outline" className="ml-auto">
                {group.targetGroup.schoolLevel}
              </Badge>
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
                      <CardTitle className="text-base">{contest.name}</CardTitle>
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
                    <CardDescription className="line-clamp-2 mt-2">
                      {contest.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users 
                        className="h-4 w-4 mr-2" 
                        style={{ color: `${getThemeColor(contest)}70` }} 
                      />
                      <span>{contest.participation_mode === "INDIVIDUAL" ? "Individual" : "Team"} participation</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      asChild 
                      className="w-full hover:text-white"
                      style={{ 
                        borderColor: getThemeColor(contest), 
                        color: getThemeColor(contest),
                        "--hover-bg": getThemeColor(contest)
                      } as React.CSSProperties}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = getThemeColor(contest);
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "";
                      }}
                    >
                      <Link href={`/participants/contests/${contest.id}`}>
                        <span>View Details</span>
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            <Separator className="mt-6" />
          </div>
        ))}
      </div>
    </div>
  );
}

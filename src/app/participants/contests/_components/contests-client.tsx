"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Users, ArrowRight, Loader2, Trophy, Award } from "lucide-react";
import { toast } from "sonner";
import contestsApi, { ContestGroupedByTarget, Contest as ContestBase, TargetGroup } from "./contests-api";

// Extend the Contest interface to include our additional properties
interface Contest extends ContestBase {
  schoolLevelSource?: string;
  targetGroupName?: string;
  targetGroupId?: number;
}

// Interface for target group-specific contest
interface TargetGroupSpecificContest {
  id: number;
  name: string;
  code: string;
  contestId: number;
  schoolLevel: string;
}
import { useLanguage } from "@/lib/i18n/language-context";
import Link from "next/link";
import Image from "next/image";

// Interface for contests grouped by school level
interface ContestsBySchoolLevel {
  schoolLevel: string;
  contests: Contest[];
}

// Default theme color
const DEFAULT_THEME_COLOR = "#0070f3";

export default function ContestsClient() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [contestsByLevel, setContestsByLevel] = useState<ContestsBySchoolLevel[]>([]);

  useEffect(() => {
    loadContests();
  }, []);
  
  // Function to get theme color for a specific contest
  const getThemeColor = (contest: Contest): string => {
    return contest.theme?.color || DEFAULT_THEME_COLOR;
  };

  // Helper function to get the display name for a school level
  const getSchoolLevelDisplayName = (level: string): string => {
    switch(level.toLowerCase()) {
      case 'primary': return 'Primary School';
      case 'secondary': return 'Secondary School';
      case 'higher': return 'Higher Education';
      default: return level;
    }
  };

  const loadContests = async () => {
    try {
      setIsLoading(true);
      const data = await contestsApi.getContests();

      // FULL DEBUG: Print the complete raw API response
      console.log('COMPLETE API RESPONSE:', JSON.stringify(data, null, 2));
      
      // Count total unique contests by ID for debugging
      const uniqueContestIds = new Set();
      const uniqueContestCodes = new Set();
      const allContestNames = [];
      
      data.forEach((group: ContestGroupedByTarget) => {
        group.contests.forEach((contest: ContestBase) => {
          uniqueContestIds.add(contest.id);
          uniqueContestCodes.add(contest.code);
          allContestNames.push(`${contest.name} (${contest.code})`);
        });
      });
      
      console.log('DEBUGGING COUNTS:');
      console.log(`Total unique contest IDs: ${uniqueContestIds.size}`);
      console.log(`Total unique contest codes: ${uniqueContestCodes.size}`);
      console.log('All contest names with codes:', allContestNames);
      
      // Set up the ordered school levels we want to display
      const orderedLevels = ['primary', 'secondary', 'higher'];
      
      // NEW APPROACH: Directly create school level groups
      // Initialize empty groups for each education level
      const schoolLevelGroups: {[key: string]: Contest[]} = {};
      orderedLevels.forEach(level => {
        schoolLevelGroups[level] = [];
      });
      
      // Process each target group in the API response
      data.forEach((group: ContestGroupedByTarget) => {
        // Get the school level from this target group 
        // Convert to lowercase for case-insensitive comparison
        const schoolLevel = group.targetGroup.schoolLevel.toLowerCase();
        
        // Skip if not a recognized school level
        if (!orderedLevels.includes(schoolLevel)) {
          console.log(`Skipping unrecognized school level: ${schoolLevel}`);
          return;
        }
        
        console.log(`Processing target group: ${group.targetGroup.name} (${schoolLevel})`);
        console.log(`Contains ${group.contests.length} contests`);
        
        // Process each contest in this group
        group.contests.forEach((contest: ContestBase) => {
          console.log(`  - Contest: ${contest.name} (${contest.code})`);
          
          // Create a full contest object with school level info
          const contestWithMeta: Contest = {
            ...contest,
            schoolLevelSource: schoolLevel
          };
          
          // Check if this contest (by code) is already in this level
          const isDuplicate = schoolLevelGroups[schoolLevel].some(
            (c: Contest) => c.code === contest.code
          );
          
          if (isDuplicate) {
            console.log(`    > Skipping duplicate in ${schoolLevel}`);
          } else {
            console.log(`    > Adding to ${schoolLevel}`);
            schoolLevelGroups[schoolLevel].push(contestWithMeta);
          }
        });
      });
      
      // Log the contents of each school level group
      orderedLevels.forEach(level => {
        console.log(`${level} contests: ${schoolLevelGroups[level].length}`);
        schoolLevelGroups[level].forEach(contest => {
          console.log(`  - ${contest.name} (${contest.code})`);
        });
      });
      
      // Log for debugging
      console.log('School level groups:', schoolLevelGroups);
      
      // ADD MISSING CONTESTS MANUALLY (until they're added to the API response)
      
      // Add the missing Cabaran Cetakan 3D for Secondary School
      const missingContestSecondary: Contest = {
        id: 9999, // Temporary ID, will be replaced when the real contest is added to API
        name: "Cabaran Cetakan 3D",
        code: "5.1R",
        description: "Cabaran Cetakan 3D untuk Sekolah Menengah",
        contestType: "ENGINEERING_DESIGN",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-12-31"),
        participation_mode: "TEAM",
        targetGroups: [],
        theme: {
          id: 6,
          name: "Inovasi, Kreativiti untuk Kesejahteraan Rakyat",
          color: "#fbb318",
          logoPath: "/uploads/themes/theme_0e222a701324ed16.svg"
        },
        schoolLevelSource: "secondary"
      };
      
      // Add it to the secondary school level group if not already there
      const secondaryLevel = "secondary";
      if (!schoolLevelGroups[secondaryLevel].some(c => c.code === "5.1R")) {
        schoolLevelGroups[secondaryLevel].push(missingContestSecondary);
        console.log("Added missing Cabaran Cetakan 3D (5.1R) to Secondary School level manually");
      }
      
      // Add the missing Robot Sumo for Primary School
      const missingContestPrimary: Contest = {
        id: 9998, // Temporary ID, will be replaced when the real contest is added to API
        name: "Robot Sumo",
        code: "RSP",
        description: "Robot Sumo untuk Sekolah Rendah",
        contestType: "ENGINEERING_DESIGN",
        startDate: new Date("2025-05-01"),
        endDate: new Date("2025-12-31"),
        participation_mode: "TEAM",
        targetGroups: [],
        theme: {
          id: 2,
          name: "Sains & Inovasi",
          color: "#f85a25",
          logoPath: "/uploads/themes/theme_675581348bf4ffdf.svg"
        },
        schoolLevelSource: "primary"
      };
      
      // Add it to the primary school level group if not already there
      const primaryLevel = "primary";
      if (!schoolLevelGroups[primaryLevel].some(c => c.code === "RSP")) {
        schoolLevelGroups[primaryLevel].push(missingContestPrimary);
        console.log("Added missing Robot Sumo (RSP) to Primary School level manually");
      }
      
      // Convert the school level groups to the format needed for rendering
      const contestsByLevel: ContestsBySchoolLevel[] = [];
      
      // Process each school level in the specified order
      orderedLevels.forEach(level => {
        // Only add levels with contests
        if (schoolLevelGroups[level]?.length > 0) {
          contestsByLevel.push({
            schoolLevel: level,
            contests: schoolLevelGroups[level]
          });
        }
      });
      
      // Print the final contest groups for validation
      console.log('FINAL GROUPING:');
      contestsByLevel.forEach(group => {
        console.log(`${getSchoolLevelDisplayName(group.schoolLevel)} (${group.contests.length} contests):`);
        group.contests.forEach(contest => {
          console.log(`  - ${contest.name} (${contest.code})`);
        });
      });
      
      // Count total contests displayed
      const totalDisplayedContests = contestsByLevel.reduce(
        (total, group) => total + group.contests.length, 0
      );
      console.log(`Total contests displayed across all levels: ${totalDisplayedContests}`);
      
      console.log('Final contests by level:', contestsByLevel);
      setContestsByLevel(contestsByLevel);
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

  if (contestsByLevel.length === 0) {
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
        {contestsByLevel.map(levelGroup => (
          <div key={levelGroup.schoolLevel} className="space-y-4 mb-6">
            <div className="flex items-center gap-2 border-l-4 border-primary pl-3 py-1">
              <h2 className="text-lg font-medium">{getSchoolLevelDisplayName(levelGroup.schoolLevel)}</h2>
              <Badge variant="outline" className="ml-auto">
                {levelGroup.contests.length} Competitions
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {levelGroup.contests.map((contest: Contest) => (
                <Card 
                  key={`${levelGroup.schoolLevel}-${contest.code}-${contest.id}`} 
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
                      <CardTitle className="text-base">
                        <span className="flex flex-col sm:flex-row sm:items-center gap-1">
                          <Badge 
                            className="text-xs font-medium px-2 py-0.5 h-5 sm:mr-2 bg-primary/10 text-primary border-0"
                          >
                            {contest.code}
                          </Badge>
                          {contest.name}
                        </span>
                      </CardTitle>
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
        ))}
      </div>
    </div>
  );
}

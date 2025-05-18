import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Default theme color to use if no theme is specified
const DEFAULT_THEME_COLOR = "#0070f3";

// GET /api/participants/contests/with-target-groups - Get all contests with their target groups
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/participants/contests/with-target-groups - Request received");

    // Fetch all target groups
    const targetGroups = await prisma.targetgroup.findMany();
    console.log(`Found ${targetGroups.length} target groups`);

    // Fetch all contests with their target groups and themes
    const contests = await prisma.contest.findMany({
      where: {
        accessibility: true // Only fetch public contests
      },
      include: {
        targetgroup: true,
        theme: true
      }
    });
    console.log(`Found ${contests.length} contests`);

    // Format the results
    const formattedContests = contests.map(contest => ({
      id: contest.id,
      name: contest.name,
      code: contest.code,
      description: contest.description,
      contestType: contest.contestType,
      startDate: contest.startDate,
      endDate: contest.endDate,
      participation_mode: contest.participation_mode,
      targetGroups: contest.targetgroup,
      theme: {
        id: contest.theme?.id,
        name: contest.theme?.name,
        color: contest.theme?.color || DEFAULT_THEME_COLOR,
        logoPath: contest.theme?.logoPath
      }
    }));

    // Normalize education level strings
    const normalizeEducationLevel = (level: string): string => {
      const lowerLevel = level.toLowerCase();
      
      if (lowerLevel.includes('primary') || lowerLevel.includes('rendah')) {
        return 'primary';
      } else if (lowerLevel.includes('secondary') || lowerLevel.includes('menengah')) {
        return 'secondary';
      } else if (lowerLevel.includes('higher') || lowerLevel.includes('tinggi') || lowerLevel.includes('university') || lowerLevel.includes('college')) {
        return 'higher';
      }
      return lowerLevel;
    };
    
    // Group contests by education level (primary, secondary, higher)
    // Create a map of contests by education level
    const contestsByEducationLevel: { [key: string]: any[] } = {
      primary: [],
      secondary: [],
      higher: []
    };
    
    // Assign contests to their respective education levels
    formattedContests.forEach(contest => {
      contest.targetGroups.forEach(targetGroup => {
        const educationLevel = normalizeEducationLevel(targetGroup.schoolLevel);
        if (educationLevel in contestsByEducationLevel && 
            !contestsByEducationLevel[educationLevel].some(c => c.id === contest.id)) {
          contestsByEducationLevel[educationLevel].push(contest);
        }
      });
    });
    
    // Format the result as an array of groups with displayName and contests
    const groupNames = {
      primary: 'Primary School',
      secondary: 'Secondary School',
      higher: 'Higher Education'
    };
    
    const contestsByTargetGroup = Object.entries(contestsByEducationLevel)
      .filter(([_, contests]) => contests.length > 0)
      .map(([level, contests]) => ({
        targetGroup: {
          id: level,
          name: groupNames[level as keyof typeof groupNames] || level.charAt(0).toUpperCase() + level.slice(1),
          schoolLevel: level,
          // Keep other fields for compatibility
          code: level,
          ageGroup: '',
          maxAge: 0,
          minAge: 0
        },
        contests
      }));

    return NextResponse.json(contestsByTargetGroup);
  } catch (error) {
    console.error("Error fetching contests with target groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch contests" },
      { status: 500 }
    );
  }
}

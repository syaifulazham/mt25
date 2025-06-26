import { prismaExecute } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ContestParticipationChart from "./contest-participation-chart";

// Define types for our data structures
type ContestParticipationData = {
  contestKey: string;
  contestName: string;
  [key: string]: string | number; // For education level counts
  total: number;
};

type EducationLevelCount = {
  contestKey: string;
  contestName: string;
  eduLevel: string;
  count: number;
};

// Function to normalize school level from targetgroup to our standard categories
function normalizeSchoolLevel(schoolLevel: string): string {
  const normalized = schoolLevel?.toLowerCase().trim() || '';
  
  // Primary school variations
  if (normalized.includes('primary') || normalized.includes('sekolah rendah') || 
      normalized === 'primary school' || normalized === 'rendah') {
    return 'PRIMARY_SCHOOL';
  }
  
  // Secondary school variations
  if (normalized.includes('secondary') || normalized.includes('sekolah menengah') ||
      normalized === 'secondary school' || normalized === 'menengah') {
    return 'SECONDARY_SCHOOL';
  }
  
  // University/College variations
  if (normalized.includes('university') || normalized.includes('universiti') ||
      normalized.includes('college') || normalized.includes('kolej') ||
      normalized.includes('higher') || normalized.includes('tinggi')) {
    return 'UNIVERSITY';
  }
  
  // Default to OTHER for unrecognized levels
  return 'OTHER';
}

// Function to get a user-friendly display name for school levels
function getSchoolLevelDisplayName(normalizedLevel: string): string {
  switch (normalizedLevel) {
    case 'PRIMARY_SCHOOL': return 'Kids';
    case 'SECONDARY_SCHOOL': return 'Teens';
    case 'UNIVERSITY': 
    case 'COLLEGE':
    case 'OTHER':
      return 'Youth';
    default: return 'Youth';
  }
}

async function fetchContestParticipationData() {
  console.log('=== fetchContestParticipationData function called ===');
  try {
    // Fetch contest participation data - first get basic participation counts
    const participationData = await prismaExecute(async (prisma) => {
      console.log('Inside prismaExecute callback...');
      
      // First, check if tables exist to prevent errors
      const tableExists = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'contestParticipation'
      `;
      
      console.log('Table exists check result:', tableExists);
      
      if (Array.isArray(tableExists) && tableExists.length > 0 && tableExists[0].count === 0) {
        console.log('contestParticipation table does not exist');
        return [] as EducationLevelCount[];
      }
      
      console.log('Fetching contest participation data...');
      
      // Use a more efficient approach: Get unique contest IDs first, then fetch contest details separately
      // This avoids the "too many placeholders" error
      
      // Step 1: Get participation counts grouped by contest
      const participationCounts = await prisma.contestParticipation.groupBy({
        by: ['contestId'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 50 // Limit to top 50 contests to avoid performance issues
      });
      
      console.log('Participation counts by contest:', participationCounts.length, 'contests');
      
      if (participationCounts.length === 0) {
        console.log('No contest participation records found in database');
        return [] as EducationLevelCount[];
      }
      
      // Step 2: Get contest details and targetgroup info for these contests
      const contestIds = participationCounts.map((p: any) => p.contestId);
      const contests = await prisma.contest.findMany({
        where: {
          id: { in: contestIds }
        },
        include: {
          targetgroup: true
        }
      });
      
      console.log('Contests with targetgroups:', contests.length);
      
      // Step 3: Get a sample of contestants to determine edu_level fallback
      const sampleContestants = await prisma.contestParticipation.findMany({
        where: {
          contestId: { in: contestIds }
        },
        include: {
          contestant: {
            select: { edu_level: true }
          }
        },
        take: 1000 // Sample for edu_level distribution
      });
      
      console.log('Sample contestants for edu_level:', sampleContestants.length);
      
      // Process the data to count occurrences
      const countMap: Record<string, Record<string, number>> = {};
      
      // Create a map of contest details
      const contestMap = new Map();
      contests.forEach(contest => {
        contestMap.set(contest.id, contest);
      });
      
      // Process participation counts
      participationCounts.forEach((participation: any, index: number) => {
        const contest = contestMap.get(participation.contestId);
        if (!contest) return;
        
        const contestKey = `${contest.code}-${contest.name}`;
        
        // Try to get school level from targetgroup first, fallback to sample data
        let schoolLevel = '';
        
        if (contest.targetgroup && Array.isArray(contest.targetgroup) && contest.targetgroup.length > 0) {
          // Use targetgroup school level if available (use first targetgroup for simplicity)
          schoolLevel = contest.targetgroup[0].schoolLevel;
          if (index < 5) {
            console.log(`Using targetgroup for ${contestKey}:`, schoolLevel, `(${contest.targetgroup.length} targetgroups)`);
          }
        } else {
          // Fallback: Use the most common edu_level from sample contestants for this contest
          const contestantSamples = sampleContestants.filter(s => s.contestId === participation.contestId);
          if (contestantSamples.length > 0) {
            // Get the most common edu_level for this contest
            const eduLevelCounts: Record<string, number> = {};
            contestantSamples.forEach(sample => {
              const eduLevel = sample.contestant.edu_level || 'OTHER';
              eduLevelCounts[eduLevel] = (eduLevelCounts[eduLevel] || 0) + 1;
            });
            
            // Find the most common edu_level
            const mostCommonEduLevel = Object.entries(eduLevelCounts)
              .sort(([,a], [,b]) => b - a)[0]?.[0] || 'OTHER';
            
            schoolLevel = mostCommonEduLevel;
            if (index < 5) {
              console.log(`Using most common contestant edu_level for ${contestKey}:`, schoolLevel, `(from ${contestantSamples.length} samples)`);
            }
          } else {
            schoolLevel = 'OTHER';
            if (index < 5) {
              console.log(`No data available for ${contestKey}, using default: OTHER`);
            }
          }
        }
        
        const normalizedLevel = normalizeSchoolLevel(schoolLevel);
        
        if (!countMap[contestKey]) {
          countMap[contestKey] = {};
        }
        
        if (!countMap[contestKey][normalizedLevel]) {
          countMap[contestKey][normalizedLevel] = 0;
        }
        
        // Use the actual participation count
        countMap[contestKey][normalizedLevel] += participation._count.id;
      });
      
      console.log('Processed countMap:', Object.keys(countMap).length, 'contests');
      
      // Convert to expected format
      const result: EducationLevelCount[] = [];
      
      Object.entries(countMap).forEach(([contestKey, schoolLevelCounts]) => {
        Object.entries(schoolLevelCounts).forEach(([schoolLevel, count]) => {
          const [code, ...nameParts] = contestKey.split('-');
          const name = nameParts.join('-');
          result.push({
            contestKey,
            contestName: name,
            eduLevel: schoolLevel,
            count
          });
        });
      });
      
      console.log('Final result:', result.length, 'entries');
      return result;
    });

    console.log('participationData returned from prismaExecute:', participationData?.length || 0);

    // If no data, return empty array
    if (!participationData || participationData.length === 0) {
      console.log('No participation data found');
      return [];
    }

    // Transform data for the chart using contestKey
    const contestKeys = [...new Set(participationData.map(item => item.contestKey))];
    const schoolLevels = ['PRIMARY_SCHOOL', 'SECONDARY_SCHOOL', 'UNIVERSITY', 'COLLEGE', 'OTHER'];
    
    const transformedData: ContestParticipationData[] = contestKeys.map(contestKey => {
      const contestData: ContestParticipationData = {
        contestKey,
        contestName: participationData.find(item => item.contestKey === contestKey)?.contestName || '',
        total: 0
      };
      
      // Add counts for each school level
      schoolLevels.forEach(schoolLevel => {
        const entries = participationData.filter(item => item.contestKey === contestKey && item.eduLevel === schoolLevel);
        const count = entries.reduce((total, entry) => total + Number(entry.count), 0);
        contestData[schoolLevel] = count;
        contestData.total += count;
      });
      
      return contestData;
    });

    console.log('Transformed data:', transformedData.length, 'contests');
    return transformedData.sort((a, b) => b.total - a.total);
  } catch (error) {
    console.error('Error fetching contest participation data:', error);
    return [];
  }
}

// Define custom colors for different education levels
const EDUCATION_LEVEL_COLORS: Record<string, string> = {
  "PRIMARY_SCHOOL": "#8884d8",
  "SECONDARY_SCHOOL": "#82ca9d",
  "UNIVERSITY": "#ffc658",
  "COLLEGE": "#ff8042",
  "OTHER": "#0088fe"
};

export default async function ContestParticipationByNameSection() {
  console.log('=== ContestParticipationByNameSection component called ===');
  
  try {
    // Fetch data for the chart
    console.log('About to call fetchContestParticipationData...');
    const data = await fetchContestParticipationData();
    console.log('Data received from fetchContestParticipationData:', data?.length || 0, 'entries');
    
    // Check if we have data
    if (!data || data.length === 0) {
      console.log('No data found, showing empty state message');
      return (
        <Card className="w-full h-full">
          <CardHeader>
            <CardTitle>Contest Participation by Contest Name</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-center h-[500px]">
            <p className="text-muted-foreground">No contest participation data available</p>
          </CardContent>
        </Card>
      );
    }
    
    console.log('Data found, proceeding with chart rendering...');
    
    // Extract unique education levels from data
    const educationLevels = Object.keys(data[0] || {}).filter(
      key => key !== 'contestKey' && key !== 'contestName' && key !== 'total'
    );

    // Handle case where no education levels are found
    if (!educationLevels || educationLevels.length === 0) {
      console.log('No education levels found in data');
      return (
        <Card className="w-full h-full">
          <CardHeader>
            <CardTitle>Contest Participation by Contest Name</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex items-center justify-center h-[500px]">
            <p className="text-muted-foreground">No education level data available</p>
          </CardContent>
        </Card>
      );
    }

    console.log('Education levels found:', educationLevels);

    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>Contest Participation by Contest Name</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ContestParticipationChart 
            data={data} 
            educationLevels={educationLevels}
          />
        </CardContent>
      </Card>
    );

  } catch (error) {
    console.error('Error in ContestParticipationByNameSection:', error);
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>Contest Participation by Contest Name</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 flex items-center justify-center h-[500px]">
          <p className="text-muted-foreground text-red-500">Error loading contest participation data</p>
        </CardContent>
      </Card>
    );
  }
}

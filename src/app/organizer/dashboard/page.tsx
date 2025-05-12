import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { CalendarDays, CheckCircle, Users, Award, Layers, Database, Trophy, Bell, ArrowUpRight, School, Flag, UserCheck, UsersRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import the client components for charts
import ContingentStateChart from "./_components/contingent-state-chart";
import ParticipationStateChart from "./_components/participation-state-chart";


// Mark this page as dynamic since it uses session
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Dashboard | Organizer Portal",
  description: "Administrator dashboard for Techlympics 2025 event management",
};

// Dashboard stats component
const StatsCard = ({ title, value, icon: Icon, link, linkText }: { title: string; value: string | number; icon: any; link?: string; linkText?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="p-2 rounded-full bg-primary/10 text-primary">
        <Icon className="w-5 h-5" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
    </CardContent>
    {link && (
      <CardFooter className="pt-0">
        <Link href={link} className="text-xs text-primary flex items-center">
          {linkText || "View details"} <ArrowUpRight className="ml-1 h-3 w-3" />
        </Link>
      </CardFooter>
    )}
  </Card>
);

// Activity item component
const ActivityItem = ({ icon: Icon, title, time, user }: { icon: any; title: string; time: string; user?: string }) => (
  <div className="flex">
    <div className="flex-shrink-0">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="ml-4 flex-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{time}{user ? ` by ${user}` : ''}</div>
    </div>
  </div>
);

export default async function DashboardPage() {
  // Get the session using Next Auth
  const session = await getServerSession(authOptions);
  
  // If not authenticated, redirect to login
  if (!session || !session.user) {
    // Use the new unified organizer login path
    const loginPath = "/auth/organizer/login";
    
    redirect(`${loginPath}?redirect=/organizer/dashboard`);
  }

  // Get user from session
  const user = session.user;
  
  // For the role check, we'll be more permissive with the dashboard
  const isAdmin = user.role === 'ADMIN';
  if (!isAdmin) {
    // For non-admin users, we'll still show the dashboard but with potentially less data
    console.log('User is not an admin, showing limited dashboard');
  }
  
  // Fetch basic dashboard data
  const [userCount, participantCount, contestCount, schoolCount, highEduCount] = await Promise.all([
    prisma.user.count(),
    prisma.user_participant.count(), // 1. Number of created user_participant
    prisma.contest.count(),
    prisma.school.count(),
    prisma.higherinstitution.count(),
  ]);

  // 2. Number of contingents
  const contingentCount = await prisma.contingent.count();

  // 3. Number of contestants
  const contestantCount = await prisma.contestant.count();

  // 4. Number of contest participations
  let participationCount = 0;
  try {
    // Based on the schema, the correct model is contestParticipation
    participationCount = await prisma.contestParticipation.count();
    console.log('Got participation count:', participationCount);
    
    // If we got 0 but we know there should be data, try a different approach
    if (participationCount === 0) {
      // Try to count contestants that have contest participations
      const contestantsWithContests = await prisma.contestant.findMany({
        where: {
          contests: {
            some: {} // Any contest participation
          }
        }
      });
      
      if (contestantsWithContests.length > 0) {
        participationCount = contestantsWithContests.length;
        console.log('Got participation count from contestants:', participationCount);
      }
    }
  } catch (error) {
    console.error('Error fetching contest participation count:', error);
    // Use a fallback for demonstration purposes
    console.log('Using fallback participation count');
    participationCount = contestantCount; // Assuming all contestants are registered for at least one contest
  }

  // 5. Number of contingents by states
  // Fetch real contingent data by state 
  let contingentStateData: Array<{state: string, count: number}> = [];
  
  try {
    // Query contingents and join related tables to get state information
    // Using the relationship: contingent -> schoolid -> school -> stateid -> state
    const contingentsWithState = await prisma.contingent.findMany({
      include: {
        school: {
          include: {
            state: true
          }
        }
      }
    });
    
    console.log(`Found ${contingentsWithState.length} contingents in total`);
    
    // Group contingents by state and count them
    const stateCountMap = new Map<string, number>();
    
    contingentsWithState.forEach(contingent => {
      // Skip if school or state is null
      if (!contingent.school || !contingent.school.state) return;
      
      const stateName = contingent.school.state.name;
      if (!stateName) return; // Skip if state name is empty
      
      const currentCount = stateCountMap.get(stateName) || 0;
      stateCountMap.set(stateName, currentCount + 1);
    });
    
    console.log('State count map:', Object.fromEntries(stateCountMap));
    
    // Convert the map to the required array format
    contingentStateData = Array.from(stateCountMap.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count); // Sort by count in descending order
    
    console.log('Live contingent data by state:', contingentStateData);
    
    // Only use fallback if absolutely no data is found
    if (contingentStateData.length === 0) {
      console.log('No state data found, but not using fallback data since we want to show accurate numbers');
      // Create an empty state entry to show there's no data rather than showing fake data
      contingentStateData = [
        { state: "No Data Available", count: 0 }
      ];
    }
  } catch (error) {
    console.error('Error accessing contingent data by state:', error);
    // Show an error state instead of fake data
    contingentStateData = [
      { state: "Error Loading Data", count: 0 }
    ];
  }

  // 6. Number of contest participations by state and gender
  // Get real data for contest participations by state and gender
  let participationStateData: Array<{state: string, MALE: number, FEMALE: number}> = [];
  
  try {
    // Query contestants with their contest participations, contingent, school, and state information
    const contestants = await prisma.contestant.findMany({
      include: {
        contingent: {
          include: {
            school: {
              include: {
                state: true
              }
            }
          }
        },
        contests: true  // Include contest participations
      }
    });
    
    console.log(`Found ${contestants.length} contestants in total`);
    
    // Create a map to track state and gender counts
    const stateGenderMap = new Map<string, { MALE: number, FEMALE: number }>();
    
    // Process each contestant who has contest participations
    contestants.forEach(contestant => {
      // Only count contestants who have participations in contests
      if (!contestant.contests || contestant.contests.length === 0) return;
      
      // Skip if contingent, school, or state is missing
      if (!contestant.contingent || !contestant.contingent.school || !contestant.contingent.school.state) return;
      
      const stateName = contestant.contingent.school.state.name;
      if (!stateName) return; // Skip if state name is missing
      
      // Get gender (default to 'UNKNOWN' if missing)
      const gender = contestant.gender || 'UNKNOWN';
      
      // Only track MALE and FEMALE genders for the chart
      if (gender !== 'MALE' && gender !== 'FEMALE') return;
      
      // Update the state-gender map
      if (!stateGenderMap.has(stateName)) {
        stateGenderMap.set(stateName, { MALE: 0, FEMALE: 0 });
      }
      
      const stateData = stateGenderMap.get(stateName)!;
      stateData[gender as 'MALE' | 'FEMALE'] += 1;
    });
    
    console.log('State-gender participation map:', Object.fromEntries(stateGenderMap));
    
    // Convert the map to the required array format
    participationStateData = Array.from(stateGenderMap.entries())
      .map(([state, genderCounts]) => ({
        state,
        MALE: genderCounts.MALE,
        FEMALE: genderCounts.FEMALE
      }))
      .sort((a, b) => (b.MALE + b.FEMALE) - (a.MALE + a.FEMALE)); // Sort by total count
    
    console.log('Live participation data by state and gender:', participationStateData);
    
    // Handle empty data case
    if (participationStateData.length === 0) {
      console.log('No participation data by state and gender found');
      participationStateData = [
        { state: "No Data Available", MALE: 0, FEMALE: 0 }
      ];
    }
  } catch (error) {
    console.error('Error accessing contest participation data by state and gender:', error);
    // Show error state instead of fake data
    participationStateData = [
      { state: "Error Loading Data", MALE: 0, FEMALE: 0 }
    ];
  }
  
  // Get recent logins
  const recentLogins = await prisma.user.findMany({
    where: {
      lastLogin: {
        not: null
      }
    },
    orderBy: {
      lastLogin: 'desc'
    },
    take: 5,
    select: {
      id: true,
      name: true,
      lastLogin: true,
      role: true
    }
  });
  
  // Get recent participants
  const recentParticipants = await prisma.user_participant.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    take: 5,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });

  // Format date function
  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 172800) return "Yesterday";
    
    return new Date(date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {user.name || "User"}! Today is {new Date().toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Accounts Created" 
          value={participantCount.toLocaleString()} 
          icon={UserCheck} 
          link="/organizer/participants" 
          linkText="View participants"
        />
        <StatsCard 
          title="Contingents" 
          value={contingentCount.toLocaleString()} 
          icon={Flag} 
          link="/organizer/contingents" 
          linkText="View contingents"
        />
        <StatsCard 
          title="Contestants" 
          value={contestantCount.toLocaleString()} 
          icon={UsersRound} 
          link="/organizer/contestants" 
          linkText="View contestants"
        />
        <StatsCard 
          title="Contest Participations" 
          value={participationCount.toLocaleString()} 
          icon={Trophy} 
          link="/organizer/contests" 
          linkText="View contests"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
        <StatsCard 
          title="Active Contests" 
          value={contestCount} 
          icon={Award} 
          link="/organizer/contests" 
          linkText="Manage contests"
        />
      </div>

      {/* Visualization Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Use client component for Contingents by State Chart */}
        <ContingentStateChart data={contingentStateData} />
        
        {/* Use client component for Contest Participations by State and Gender Chart */}
        <ParticipationStateChart data={participationStateData} />
      </div>

      {/* Tabs for Recent Activity */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="participants">Recent Accounts</TabsTrigger>
          <TabsTrigger value="logins">Recent Logins</TabsTrigger>
        </TabsList>
        
        {/* Recent Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>Recent system events and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ActivityItem 
                icon={Trophy} 
                title={`${contestCount} Total Contests Available`}
                time={`As of ${formatDate(new Date())}`}
              />
              <ActivityItem 
                icon={Users} 
                title={`${participantCount} Accounts Created`}
                time={`Last updated ${formatDate(new Date())}`}
              />
              <ActivityItem 
                icon={Layers} 
                title={`${schoolCount} Schools and ${highEduCount} Higher Education Institutions Registered`}
                time={`Total of ${schoolCount + highEduCount} institutions`}
              />
            </CardContent>
            <CardFooter>
              <Link href="/organizer/system-logs" className="text-xs text-primary flex items-center">
                View detailed system logs <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Recent Participants Tab */}
        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Accounts</CardTitle>
              <CardDescription>New registrations in the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {recentParticipants.length > 0 ? (
                recentParticipants.map((participant) => (
                  <ActivityItem 
                    key={participant.id}
                    icon={Users} 
                    title={`${participant.name} (${participant.email})`}
                    time={formatDate(participant.createdAt)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent participant registrations</p>
              )}
            </CardContent>
            <CardFooter>
              <Link href="/organizer/participants" className="text-xs text-primary flex items-center">
                View all accounts <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Recent Logins Tab */}
        <TabsContent value="logins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Logins</CardTitle>
              <CardDescription>Latest user access to the system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {recentLogins.length > 0 ? (
                recentLogins.map((login) => (
                  <ActivityItem 
                    key={login.id}
                    icon={CheckCircle} 
                    title={`${login.name} (${login.role})`}
                    time={formatDate(login.lastLogin)}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent login activity</p>
              )}
            </CardContent>
            <CardFooter>
              <Link href="/organizer/users" className="text-xs text-primary flex items-center">
                View all users <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 rounded-lg">
            <Link href="/organizer/contests/new">
              <Trophy className="h-6 w-6" />
              <div>Create New Contest</div>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 rounded-lg">
            <Link href="/organizer/users/new">
              <Users className="h-6 w-6" />
              <div>Add New User</div>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 rounded-lg">
            <Link href="/organizer/schools">
              <Database className="h-6 w-6" />
              <div>Manage Institutions</div>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

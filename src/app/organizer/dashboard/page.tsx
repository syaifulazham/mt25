import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { CalendarDays, CheckCircle, Users, Award, Layers, Database, Trophy, Bell, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  
  // Fetch dashboard data
  const [contestCount, participantCount, schoolCount, highEduCount, userCount] = await Promise.all([
    prisma.contest.count(),
    prisma.user_participant.count(),
    prisma.school.count(),
    prisma.higherinstitution.count(),
    prisma.user.count(),
  ]);
  
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
      
      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Contests" 
          value={contestCount} 
          icon={Trophy} 
          link="/organizer/contests" 
          linkText="Manage contests"
        />
        <StatsCard 
          title="Accounts Created" 
          value={participantCount.toLocaleString()} 
          icon={Users} 
          link="/organizer/participants" 
          linkText="View participants"
        />
        <StatsCard 
          title="Educational Institutions" 
          value={schoolCount + highEduCount} 
          icon={Database} 
          link="/organizer/schools" 
          linkText="Manage institutions"
        />
        <StatsCard 
          title="Organizer Accounts" 
          value={userCount} 
          icon={CheckCircle} 
          link="/organizer/users" 
          linkText="Manage users"
        />
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

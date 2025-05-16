"use client";

import Link from "next/link";
import { FormattedDate } from "./time-display";
import { ArrowUpRight, Trophy, Users, Layers, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Client-side ActivityItem component with local time formatting
const ActivityItem = ({ 
  icon: Icon, 
  title, 
  time, 
  date,
  user 
}: { 
  icon: any; 
  title: string; 
  time?: string; 
  date?: Date | string | null;
  user?: string 
}) => (
  <div className="flex">
    <div className="flex-shrink-0">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <div className="ml-4 flex-1">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {date ? <FormattedDate date={date} format="relative" /> : time}
        {user ? ` by ${user}` : ''}
      </div>
    </div>
  </div>
);

// Client-side ActivityTab component with local time formatting
export default function ActivityTabs({ 
  systemStats, 
  recentParticipants, 
  recentLogins 
}: { 
  systemStats: {
    contestCount: number;
    participantCount: number;
  };
  recentParticipants: Array<{
    id: number;
    name: string;
    email: string;
    createdAt: Date | null;
  }>;
  recentLogins: Array<{
    id: number;
    name: string;
    role: string;
    lastLogin: Date | null;
  }>;
}) {
  const { contestCount, participantCount } = systemStats;

  return (
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
              date={new Date()}
            />
            <ActivityItem 
              icon={Users} 
              title={`${participantCount} Accounts Created`}
              date={new Date()}
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
                  date={participant.createdAt}
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
                  date={login.lastLogin}
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
  );
}

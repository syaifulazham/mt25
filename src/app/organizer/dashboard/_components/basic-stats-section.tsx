import { prismaExecute } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  User, 
  Users, 
  Trophy, 
  School, 
  UsersRound, 
  Award,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";

// StatsCard component (moved from page.tsx)
const StatsCard = ({ title, value, icon: Icon, link, linkText }: { 
  title: string; 
  value: string | number; 
  icon: any; 
  link?: string; 
  linkText?: string 
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
    {link && (
      <CardFooter>
        <Link 
          href={link} 
          className="text-xs text-muted-foreground hover:text-primary flex items-center"
        >
          {linkText || "View more"} <ArrowUpRight className="ml-1 h-3 w-3" />
        </Link>
      </CardFooter>
    )}
  </Card>
);

export default async function BasicStatsSection({ isAdmin = false }: { isAdmin?: boolean }) {
  // Fetch basic dashboard data using prismaExecute for efficient connection management
  const [userCount, participantCount, contestCount, schoolCount, highEduCount, contestParticipationCount] = await prismaExecute(async (prisma) => {
    return Promise.all([
      prisma.user.count(),
      prisma.user_participant.count(),
      prisma.contest.count(),
      prisma.school.count(),
      prisma.higherinstitution.count(),
      prisma.contestParticipation.count(),
    ]);
  });

  // Fetch contingent count separately to avoid blocking if it's slow
  const contingentCount = await prismaExecute(prisma => prisma.contingent.count());
  
  // Fetch teams count
  const teamsCount = await prismaExecute(prisma => prisma.team.count());

  // Format numbers with ###,##0 format
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard 
        title="Managers" 
        value={formatNumber(participantCount)} 
        icon={Users} 
        link="/organizer/participants"
        linkText="View all"
      />
      <StatsCard 
        title="Contingents" 
        value={formatNumber(contingentCount)} 
        icon={School} 
        link="/organizer/contingents"
        linkText="View all"
      />
      <StatsCard 
        title="Teams" 
        value={formatNumber(teamsCount)} 
        icon={UsersRound} 
        link="/organizer/teams"
        linkText="View all"
      />
      <StatsCard 
        title="Contest Participations" 
        value={formatNumber(contestParticipationCount)} 
        icon={Activity} 
        link="/organizer/events"
        linkText="View events"
      />
    </div>
  );
}

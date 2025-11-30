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
  ArrowUpRight,
  GraduationCap,
  BarChart
} from "lucide-react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils/format";
import SchoolContingentButton from "./school-contingent-button";

// StatsCard component (moved from page.tsx)
const StatsCard = ({ title, value, icon: Icon, link, linkText }: { 
  title: string; 
  value: string | number; 
  icon: any; 
  link?: string; 
  linkText?: string;
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

// Dual-value StatsCard for Managers & Trainers
const DualStatsCard = ({ title, value1, label1, value2, label2, icon: Icon, link, linkText }: { 
  title: string; 
  value1: string | number;
  label1: string;
  value2: string | number;
  label2: string;
  icon: any; 
  link?: string; 
  linkText?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label1}</p>
          <div className="text-2xl font-bold">{value1}</div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label2}</p>
          <div className="text-2xl font-bold">{value2}</div>
        </div>
      </div>
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
  const [userCount, contestCount, schoolCount, highEduCount, contestParticipationCount] = await prismaExecute(async (prisma) => {
    return Promise.all([
      prisma.user.count(),
      prisma.contest.count(),
      prisma.school.count(),
      prisma.higherinstitution.count(),
      prisma.contestParticipation.count(),
    ]);
  });

  // Count Managers: user_participant with active contingent relationships
  const participantCount = await prismaExecute(async (prisma) => {
    const result = await prisma.$queryRaw<Array<{count: bigint}>>`
      SELECT COUNT(DISTINCT up.id) as count
      FROM user_participant up
      INNER JOIN contingentManager cm ON cm.participantId = up.id
      INNER JOIN contingent c ON c.id = cm.contingentId
    `;
    return Number(result[0]?.count || 0);
  });

  // Count Trainers: manager with active team relationships
  const trainerCount = await prismaExecute(async (prisma) => {
    const result = await prisma.$queryRaw<Array<{count: bigint}>>`
      SELECT COUNT(DISTINCT m.id) as count
      FROM manager m
      INNER JOIN manager_team mt ON mt.managerId = m.id
      INNER JOIN team t ON t.id = mt.teamId
    `;
    return Number(result[0]?.count || 0);
  });

  // Fetch contingent count separately to avoid blocking if it's slow
  const contingentCount = await prismaExecute(prisma => prisma.contingent.count());
  
  // Fetch school contingents count
  const schoolContingentCount = await prismaExecute(prisma => 
    prisma.contingent.count({
      where: {
        contingentType: 'SCHOOL'
      }
    })
  );
  
  // Get school location data for the modal
  const schoolLocations = await prismaExecute(async (prisma) => {
    const result = await prisma.$queryRaw`
      SELECT s.location, COUNT(c.id) as count 
      FROM school s 
      JOIN contingent c ON c.schoolId = s.id 
      WHERE c.contingentType = 'SCHOOL' 
      GROUP BY s.location
    `;
    return result;
  });
  
  // Fetch teams count
  const teamsCount = await prismaExecute(prisma => prisma.team.count());

  // Using centralized formatNumber utility for ###,##0 format

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <DualStatsCard 
        title="Managers & Trainers" 
        value1={formatNumber(participantCount)}
        label1="Managers"
        value2={formatNumber(trainerCount)}
        label2="Trainers"
        icon={Users} 
        link="/organizer/dashboard/managers-trainers"
        linkText="View all"
      />
      <StatsCard 
        title="Contingents" 
        value={formatNumber(contingentCount)} 
        icon={School} 
        link="/organizer/contingents"
        linkText="View all"
      />
      <SchoolContingentButton 
        count={schoolContingentCount} 
        locations={schoolLocations}
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

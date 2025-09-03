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
import { formatNumber } from "@/lib/utils/format";

// StatsCard component
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

export default async function BasicStatsSection({ isAdmin = false, stateId }: { isAdmin?: boolean, stateId: string }) {
  // Using centralized formatNumber utility for ###,##0 format

  // Fetch contingent count filtered by state
  const contingentCount = await prismaExecute(async (prisma) => {
    return await prisma.contingent.count({
      where: {
        OR: [
          { school: { stateId: parseInt(stateId) } },
          { higherInstitution: { stateId: parseInt(stateId) } },
          { independent: { stateId: parseInt(stateId) } }
        ]
      }
    });
  });
  
  // Fetch teams count filtered by state
  const teamsCount = await prismaExecute(async (prisma) => {
    return await prisma.team.count({
      where: {
        contingent: {
          OR: [
            { school: { stateId: parseInt(stateId) } },
            { higherInstitution: { stateId: parseInt(stateId) } },
            { independent: { stateId: parseInt(stateId) } }
          ]
        }
      }
    });
  });

  // Fetch contest participations count filtered by state
  const contestParticipationCount = await prismaExecute(async (prisma) => {
    return await prisma.contestParticipation.count({
      where: {
        contestant: {
          contingent: {
            OR: [
              { school: { stateId: parseInt(stateId) } },
              { higherInstitution: { stateId: parseInt(stateId) } },
              { independent: { stateId: parseInt(stateId) } }
            ]
          }
        }
      }
    });
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";

// API to get attendance statistics for dashboard
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  // Parse contest group filters from URL
  const { searchParams } = new URL(request.url);
  console.log('Full URL:', request.url);
  console.log('Search params:', Object.fromEntries(searchParams.entries()));
  
  const contestGroups: string[] = [];
  
  // Use title case to match database values
  if (searchParams.has('kids')) contestGroups.push('Kids');
  if (searchParams.has('teens')) contestGroups.push('Teens');
  if (searchParams.has('youth')) contestGroups.push('Youth');
  
  // If no filters selected, show all contest groups
  const filterByContestGroup = contestGroups.length > 0;
  console.log('Contest groups selected:', contestGroups);
  console.log('filterByContestGroup:', filterByContestGroup);
  try {
    // Safety check for empty array
    if (filterByContestGroup && contestGroups.length === 0) {
      return NextResponse.json(
        { error: 'No contest groups specified for filtering' },
        { status: 400 }
      );
    }
    
    // Auth check
    const session = await getServerSession(authOptions);
    
    // Check if user is logged in and has the appropriate role
    if (!session || !(session.user.role === 'ADMIN' || session.user.role === 'OPERATOR')) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and operators can view attendance statistics.' },
        { status: 401 }
      );
    }

    const eventId = parseInt(params.eventId);
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Define type for the query results
    type CountResult = {
      count: number | bigint
    }[];

    // Get counts of total and present contingents using raw SQL with optional contest group filtering
    const [totalContingentsResult, presentContingentsResult] = await Promise.all([
      // Filter directly on attendanceContestant.contestGroup instead of contest.contestGroup
      filterByContestGroup
        ? prisma.$queryRaw<CountResult>`
            SELECT COUNT(DISTINCT contingentId) as count 
            FROM (
              SELECT contingentId 
              FROM attendanceContestant
              WHERE eventId = ${eventId}
              AND contestGroup IN (${Prisma.join(contestGroups)})
              
              UNION
              
              SELECT contingentId FROM attendanceManager 
              WHERE eventId = ${eventId} 
              AND contestGroup IN (${Prisma.join(contestGroups)})
            ) as combined
          `
        : prisma.$queryRaw<CountResult>`
            SELECT COUNT(DISTINCT contingentId) as count 
            FROM (
              SELECT contingentId FROM attendanceContestant WHERE eventId = ${eventId}
              UNION
              SELECT contingentId FROM attendanceManager WHERE eventId = ${eventId}
            ) as combined
          `,
      filterByContestGroup
        ? prisma.$queryRaw<CountResult>`
            SELECT COUNT(DISTINCT contingentId) as count 
            FROM (
              SELECT contingentId 
              FROM attendanceContestant
              WHERE eventId = ${eventId} AND attendanceStatus = 'Present'
              AND contestGroup IN (${Prisma.join(contestGroups)})
              
              UNION
              
              SELECT contingentId FROM attendanceManager 
              WHERE eventId = ${eventId} AND attendanceStatus = 'Present'
              AND contestGroup IN (${Prisma.join(contestGroups)})
            ) as combined
          `
        : prisma.$queryRaw<CountResult>`
            SELECT COUNT(DISTINCT contingentId) as count 
            FROM (
              SELECT contingentId FROM attendanceContestant WHERE eventId = ${eventId} AND attendanceStatus = 'Present'
              UNION
              SELECT contingentId FROM attendanceManager WHERE eventId = ${eventId} AND attendanceStatus = 'Present'
            ) as combined
          `,
    ]);
    
    // Extract counts from results
    const totalContingents = Number(totalContingentsResult[0].count);
    const presentContingents = Number(presentContingentsResult[0].count);

    // Get counts of total and present teams using raw SQL with optional contest group filtering
    // Use COUNT(DISTINCT teamId) to match state-based statistics logic
    const [totalTeamsResult, presentTeamsResult] = await Promise.all([
      filterByContestGroup
        ? prisma.$queryRaw<CountResult>`
            SELECT COUNT(DISTINCT at.teamId) as count 
            FROM attendanceTeam at
            JOIN attendanceContestant ac ON at.teamId = ac.teamId AND at.eventId = ac.eventId
            WHERE at.eventId = ${eventId}
            AND ac.contestGroup IN (${Prisma.join(contestGroups)})
          `
        : prisma.$queryRaw<CountResult>`
            SELECT COUNT(DISTINCT teamId) as count 
            FROM attendanceTeam 
            WHERE eventId = ${eventId}
          `,
      filterByContestGroup
        ? prisma.$queryRaw<CountResult>`
            SELECT COUNT(DISTINCT at.teamId) as count 
            FROM attendanceTeam at
            JOIN attendanceContestant ac ON at.teamId = ac.teamId AND at.eventId = ac.eventId
            WHERE at.eventId = ${eventId} 
            AND at.attendanceStatus = 'Present'
            AND ac.contestGroup IN (${Prisma.join(contestGroups)})
          `
        : prisma.$queryRaw<CountResult>`
            SELECT COUNT(DISTINCT teamId) as count 
            FROM attendanceTeam 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present'
          `,
    ]);
    
    // Extract counts from results
    const totalTeams = Number(totalTeamsResult[0].count);
    const presentTeams = Number(presentTeamsResult[0].count);

    // Get counts of total and present contestants using raw SQL with optional contest group filtering
    const [totalContestantsResult, presentContestantsResult] = await Promise.all([
      filterByContestGroup
        ? prisma.$queryRaw<CountResult>`
            SELECT COUNT(*) as count FROM attendanceContestant
            WHERE eventId = ${eventId}
            AND contestGroup IN (${Prisma.join(contestGroups)})
          `
        : prisma.$queryRaw<CountResult>`
            SELECT COUNT(*) as count FROM attendanceContestant 
            WHERE eventId = ${eventId}
          `,
      filterByContestGroup
        ? prisma.$queryRaw<CountResult>`
            SELECT COUNT(*) as count FROM attendanceContestant
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present'
            AND contestGroup IN (${Prisma.join(contestGroups)})
          `
        : prisma.$queryRaw<CountResult>`
            SELECT COUNT(*) as count FROM attendanceContestant 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present'
          `,
    ]);
    
    // Extract counts from results
    const totalContestants = Number(totalContestantsResult[0].count);
    const presentContestants = Number(presentContestantsResult[0].count);
    
    // Get counts of total and present managers using raw SQL with optional contest group filtering
    const [totalManagersResult, presentManagersResult] = await Promise.all([
      filterByContestGroup
        ? prisma.$queryRaw<CountResult>`
            SELECT COUNT(*) as count FROM attendanceManager 
            WHERE eventId = ${eventId}
            AND contestGroup IN (${Prisma.join(contestGroups)})
          `
        : prisma.$queryRaw<CountResult>`
            SELECT COUNT(*) as count FROM attendanceManager 
            WHERE eventId = ${eventId}
          `,
      filterByContestGroup
        ? prisma.$queryRaw<CountResult>`
            SELECT COUNT(*) as count FROM attendanceManager 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present'
            AND contestGroup IN (${Prisma.join(contestGroups)})
          `
        : prisma.$queryRaw<CountResult>`
            SELECT COUNT(*) as count FROM attendanceManager 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present'
          `,
    ]);
    
    // Extract counts from results
    const totalManagers = Number(totalManagersResult[0].count);
    const presentManagers = Number(presentManagersResult[0].count);
    
    // Calculate total participants (contestants + managers)
    const totalParticipants = totalContestants + totalManagers;
    const presentParticipants = presentContestants + presentManagers;

    // Calculate overall attendance rate (based on total participants)
    const attendanceRate = totalParticipants > 0 
      ? (presentParticipants / totalParticipants * 100)
      : 0;

    // Define type for the daily attendance data
    type DailyAttendanceResult = {
      date: string;
      count: number | bigint;
    }[];

    // Get daily attendance data with optional contest group filtering
    const dailyAttendance = filterByContestGroup
      ? await prisma.$queryRaw<DailyAttendanceResult>`
          SELECT DATE_FORMAT(attendanceDate, '%Y-%m-%d') as date, COUNT(*) as count
          FROM (
            SELECT attendanceDate 
            FROM attendanceContestant
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present' 
            AND attendanceDate IS NOT NULL
            AND contestGroup IN (${Prisma.join(contestGroups)})
            
            UNION ALL
            
            SELECT attendanceDate FROM attendanceManager 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present' 
            AND attendanceDate IS NOT NULL
            AND contestGroup IN (${Prisma.join(contestGroups)})
          ) as combined
          GROUP BY date
          ORDER BY date
        `
      : await prisma.$queryRaw<DailyAttendanceResult>`
          SELECT DATE_FORMAT(attendanceDate, '%Y-%m-%d') as date, COUNT(*) as count
          FROM (
            SELECT attendanceDate FROM attendanceContestant 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present' 
            AND attendanceDate IS NOT NULL
            
            UNION ALL
            
            SELECT attendanceDate FROM attendanceManager 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present' 
            AND attendanceDate IS NOT NULL
          ) as combined
          GROUP BY date
          ORDER BY date
        `;

    // Define type for the hourly attendance data
    type HourlyAttendanceResult = {
      hour: number | bigint;
      count: number | bigint;
    }[];

    // Get hourly attendance data with optional contest group filtering
    const hourlyAttendance = filterByContestGroup
      ? await prisma.$queryRaw<HourlyAttendanceResult>`
          SELECT HOUR(attendanceTime) as hour, COUNT(*) as count
          FROM (
            SELECT attendanceTime 
            FROM attendanceContestant
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present' 
            AND attendanceTime IS NOT NULL
            AND contestGroup IN (${Prisma.join(contestGroups)})
            
            UNION ALL
            
            SELECT attendanceTime FROM attendanceManager 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present' 
            AND attendanceTime IS NOT NULL
            AND contestGroup IN (${Prisma.join(contestGroups)})
          ) as combined
          GROUP BY hour
          ORDER BY hour
        `
      : await prisma.$queryRaw<HourlyAttendanceResult>`
          SELECT HOUR(attendanceTime) as hour, COUNT(*) as count
          FROM (
            SELECT attendanceTime FROM attendanceContestant 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present' 
            AND attendanceTime IS NOT NULL
            
            UNION ALL
            
            SELECT attendanceTime FROM attendanceManager 
            WHERE eventId = ${eventId} AND attendanceStatus = 'Present' 
            AND attendanceTime IS NOT NULL
          ) as combined
          GROUP BY hour
          ORDER BY hour
        `;

    // Convert BigInt values to Numbers for JSON serialization
    const formattedDailyAttendance = Array.isArray(dailyAttendance) 
      ? dailyAttendance.map((entry: any) => ({
          date: entry.date,
          count: Number(entry.count)
        }))
      : [];
      
    const formattedHourlyAttendance = Array.isArray(hourlyAttendance)
      ? hourlyAttendance.map((entry: any) => ({
          hour: Number(entry.hour),
          count: Number(entry.count)
        }))
      : [];

    // Get state-based attendance statistics
    type StateStatsResult = {
      stateId: number | bigint;
      stateName: string;
      totalContingents: number | bigint;
      totalTeams: number | bigint;
      totalContestants: number | bigint;
      presentContingents: number | bigint;
      presentTeams: number | bigint;
      presentContestants: number | bigint;
    }[];

    const stateStats = filterByContestGroup
      ? await prisma.$queryRaw<StateStatsResult>`
          SELECT 
            s.id as stateId,
            s.name as stateName,
            COUNT(DISTINCT ac.contingentId) as totalContingents,
            COUNT(DISTINCT ac.teamId) as totalTeams,
            COUNT(DISTINCT ac.id) as totalContestants,
            COUNT(DISTINCT CASE WHEN ac.attendanceStatus = 'Present' THEN ac.contingentId END) as presentContingents,
            COUNT(DISTINCT CASE WHEN ac.attendanceStatus = 'Present' THEN ac.teamId END) as presentTeams,
            COUNT(DISTINCT CASE WHEN ac.attendanceStatus = 'Present' THEN ac.id END) as presentContestants
          FROM attendanceContestant ac
          JOIN state s ON ac.stateId = s.id
          WHERE ac.eventId = ${eventId}
          AND ac.contestGroup IN (${Prisma.join(contestGroups)})
          GROUP BY s.id, s.name
          ORDER BY s.name
        `
      : await prisma.$queryRaw<StateStatsResult>`
          SELECT 
            s.id as stateId,
            s.name as stateName,
            COUNT(DISTINCT ac.contingentId) as totalContingents,
            COUNT(DISTINCT ac.teamId) as totalTeams,
            COUNT(DISTINCT ac.id) as totalContestants,
            COUNT(DISTINCT CASE WHEN ac.attendanceStatus = 'Present' THEN ac.contingentId END) as presentContingents,
            COUNT(DISTINCT CASE WHEN ac.attendanceStatus = 'Present' THEN ac.teamId END) as presentTeams,
            COUNT(DISTINCT CASE WHEN ac.attendanceStatus = 'Present' THEN ac.id END) as presentContestants
          FROM attendanceContestant ac
          JOIN state s ON ac.stateId = s.id
          WHERE ac.eventId = ${eventId}
          GROUP BY s.id, s.name
          ORDER BY s.name
        `;

    // Format state statistics
    const formattedStateStats = stateStats.map((state: any) => ({
      stateId: Number(state.stateId),
      stateName: state.stateName,
      totalContingents: Number(state.totalContingents),
      totalTeams: Number(state.totalTeams),
      totalContestants: Number(state.totalContestants),
      presentContingents: Number(state.presentContingents),
      presentTeams: Number(state.presentTeams),
      presentContestants: Number(state.presentContestants),
      totalParticipants: Number(state.totalContestants),
      presentParticipants: Number(state.presentContestants),
      attendanceRate: Number(state.totalContestants) > 0 
        ? Math.round((Number(state.presentContestants) / Number(state.totalContestants)) * 100)
        : 0
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalContingents,
        totalTeams,
        totalContestants,
        totalManagers,
        totalParticipants,
        presentContingents,
        presentTeams,
        presentContestants,
        presentManagers,
        presentParticipants,
        attendanceRate: Math.round(attendanceRate), // Round to whole number
      },
      stateStats: formattedStateStats,
      dailyAttendance: formattedDailyAttendance,
      hourlyAttendance: formattedHourlyAttendance,
    });
  } catch (error: any) {
    console.error('Error fetching attendance statistics:', error);
    // Include more detailed error information in development
    const errorMessage = process.env.NODE_ENV === 'development' && error?.message
      ? `Failed to fetch attendance statistics: ${error.message}` 
      : 'Failed to fetch attendance statistics';
    
    // Add SQL query details for debugging
    if (filterByContestGroup) {
      console.error('Contest groups for filtering:', contestGroups);
      console.error('SQL IN clause:', contestGroups.map(group => `'${group}'`).join(','));
    }
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' && error ? String(error) : undefined },
      { status: 500 }
    );
  }
}

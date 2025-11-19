import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/auth-options'
import { prisma } from '@/lib/prisma'

// Allowed roles
const ALLOWED_ROLES = ['ADMIN', 'OPERATOR']

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !session.user.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      )
    }

    const eventId = parseInt(params.id)
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const contestIdParam = searchParams.get('contestId')
    const rankByState = searchParams.get('rankByState') === 'true'

    if (!contestIdParam) {
      return NextResponse.json(
        { error: 'Contest ID is required' },
        { status: 400 }
      )
    }

    const contestId = parseInt(contestIdParam)
    if (isNaN(contestId)) {
      return NextResponse.json(
        { error: 'Invalid contest ID' },
        { status: 400 }
      )
    }

    // Find the event contest
    const eventContest = await prisma.eventcontest.findFirst({
      where: {
        eventId: eventId,
        contestId: contestId,
      },
    })

    if (!eventContest) {
      return NextResponse.json({
        rankings: [],
        total: 0,
        message: 'No event contest found'
      })
    }

    // Fetch team rankings with judging scores - using same query structure as scoreboard
    const querySQL = `
      SELECT
        at.Id as attendanceTeamId,
        at.teamId,
        t.name as teamName,
        c.id as contingentId,
        c.name as contingentName,
        c.logoUrl as contingentLogoUrl,
        CASE
          WHEN c.contingentType = 'SCHOOL' THEN (
            SELECT s2.id FROM state s2
            JOIN school sch ON sch.stateId = s2.id
            WHERE c.schoolId = sch.id
          )
          WHEN c.contingentType = 'INDEPENDENT' THEN (
            SELECT s2.id FROM state s2
            JOIN independent ind ON ind.stateId = s2.id
            WHERE c.independentId = ind.id
          )
          ELSE NULL
        END as stateId,
        CASE
          WHEN c.contingentType = 'SCHOOL' THEN (
            SELECT s2.name FROM state s2
            JOIN school sch ON sch.stateId = s2.id
            WHERE c.schoolId = sch.id
          )
          WHEN c.contingentType = 'INDEPENDENT' THEN (
            SELECT s2.name FROM state s2
            JOIN independent ind ON ind.stateId = s2.id
            WHERE c.independentId = ind.id
          )
          ELSE NULL
        END as stateName,
        js.totalScore,
        CASE
          WHEN js.id IS NULL THEN 'NOT_STARTED'
          WHEN js.status = 'IN_PROGRESS' THEN 'IN_PROGRESS'
          WHEN js.status = 'COMPLETED' THEN 'COMPLETED'
          ELSE 'NOT_STARTED'
        END as judgingStatus
      FROM attendanceTeam at
      JOIN team t ON at.teamId = t.id
      JOIN contingent c ON at.contingentId = c.id
      JOIN eventcontestteam ect ON ect.eventcontestId = ${eventContest.id} AND ect.teamId = at.teamId
      LEFT JOIN judgingSession js ON at.Id = js.attendanceTeamId AND js.eventContestId = ${eventContest.id}
      WHERE at.eventId = ${eventId}
      ORDER BY
        CASE WHEN js.totalScore IS NULL THEN 1 ELSE 0 END,
        js.totalScore DESC,
        t.name ASC
    `

    const results = await prisma.$queryRawUnsafe(querySQL) as any[]

    console.log(`Found ${results.length} teams for eventId=${eventId}, contestId=${contestId}, rankByState=${rankByState}`)

    // Add rank to each team
    let rankedTeams: any[] = []
    
    if (rankByState) {
      // Group teams by state and rank within each state
      const teamsByState: Record<string, any[]> = {}
      
      results.forEach(team => {
        const stateKey = team.stateId ? team.stateId.toString() : 'NO_STATE'
        if (!teamsByState[stateKey]) {
          teamsByState[stateKey] = []
        }
        teamsByState[stateKey].push(team)
      })
      
      // Rank teams within each state
      Object.values(teamsByState).forEach(stateTeams => {
        let currentRank = 1
        stateTeams.forEach(team => {
          const hasScore = team.totalScore !== null
          const rank = hasScore ? currentRank++ : 0
          
          rankedTeams.push({
            rank: rank,
            attendanceTeamId: Number(team.attendanceTeamId),
            team: {
              id: Number(team.teamId),
              name: team.teamName
            },
            contingent: {
              id: Number(team.contingentId),
              name: team.contingentName,
              logoUrl: team.contingentLogoUrl
            },
            state: team.stateId ? {
              id: Number(team.stateId),
              name: team.stateName || 'Unknown State'
            } : null,
            averageScore: team.totalScore ? parseFloat(team.totalScore.toString()) : 0,
            sessionCount: 1,
            contestId: contestId,
            judgingStatus: team.judgingStatus
          })
        })
      })
    } else {
      // National ranking - rank all teams together
      let currentRank = 1
      rankedTeams = results.map((team, index) => {
        const hasScore = team.totalScore !== null
        const rank = hasScore ? currentRank++ : 0
        
        return {
          rank: rank,
          attendanceTeamId: Number(team.attendanceTeamId),
          team: {
            id: Number(team.teamId),
            name: team.teamName
          },
          contingent: {
            id: Number(team.contingentId),
            name: team.contingentName,
            logoUrl: team.contingentLogoUrl
          },
          state: team.stateId ? {
            id: Number(team.stateId),
            name: team.stateName || 'Unknown State'
          } : null,
          averageScore: team.totalScore ? parseFloat(team.totalScore.toString()) : 0,
          sessionCount: 1,
          contestId: contestId,
          judgingStatus: team.judgingStatus
        }
      })
    }

    // Find national event for checking finals registration
    const nationalEvent = await prisma.event.findFirst({
      where: { scopeArea: 'NATIONAL' }
    })

    // Check for existing certificates and finals registration for each team
    const rankedTeamsWithCertStatus = await Promise.all(rankedTeams.map(async (team) => {
      // Get team members
      const teamMembersQuery = `
        SELECT con.ic
        FROM teamMember tm
        JOIN contestant con ON tm.contestantId = con.id
        WHERE tm.teamId = ${team.team.id}
        LIMIT 1
      `
      const teamMembers = await prisma.$queryRawUnsafe(teamMembersQuery) as any[]
      
      // Check if any certificate exists for team members with the expected award title
      let hasCertificates = false
      if (teamMembers.length > 0 && team.rank > 0) {
        const awardTitle = team.rank === 1 ? 'TEMPAT PERTAMA' : `TEMPAT KE-${team.rank}`
        
        const certCheckQuery = `
          SELECT COUNT(*) as count
          FROM certificate
          WHERE ic_number = '${teamMembers[0].ic}'
            AND awardTitle = '${awardTitle}'
          LIMIT 1
        `
        const certCheck = await prisma.$queryRawUnsafe(certCheckQuery) as any[]
        hasCertificates = certCheck[0]?.count > 0
      }

      // Check if team is already registered for national finals
      let isAddedToFinal = false
      if (nationalEvent) {
        const nationalEventContest = await prisma.eventcontest.findFirst({
          where: {
            eventId: nationalEvent.id,
            contestId: contestId
          }
        })

        if (nationalEventContest) {
          const finalsRegistration = await prisma.eventcontestteam.findFirst({
            where: {
              eventcontestId: nationalEventContest.id,
              teamId: team.team.id
            }
          })
          isAddedToFinal = !!finalsRegistration
        }
      }
      
      return {
        ...team,
        hasCertificates,
        isAddedToFinal
      }
    }))

    return NextResponse.json({
      rankings: rankedTeamsWithCertStatus,
      total: rankedTeamsWithCertStatus.length
    })

  } catch (error) {
    console.error('Failed to fetch team rankings:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch team rankings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { hashcode, endpointHash } = await request.json();

    if (!hashcode || !endpointHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the endpoint exists and is valid
    console.log('🔍 Debugging endpoint lookup:');
    console.log('- Received endpointHash:', endpointHash);
    console.log('- Looking for endpoint with endpointhash:', endpointHash);
    
    const endpoint = await prisma.attendanceagent_endpoint.findFirst({
      where: {
        endpointhash: endpointHash,
      },
    });

    console.log('- Found endpoint:', endpoint ? 'YES' : 'NO');
    if (endpoint) {
      console.log('- Endpoint details:', { id: endpoint.id, eventId: endpoint.eventId, endpointhash: endpoint.endpointhash });
    }

    if (!endpoint) {
      // Let's also check what endpoints exist for debugging
      const allEndpoints = await prisma.attendanceagent_endpoint.findMany({
        select: { id: true, endpointhash: true, eventId: true }
      });
      console.log('- Available endpoints in database:', allEndpoints);
      
      return NextResponse.json(
        { error: 'Invalid endpoint', debug: { receivedHash: endpointHash, availableEndpoints: allEndpoints } },
        { status: 404 }
      );
    }

    // Find the attendance record by hashcode or ic using attendanceContestant as base
    const attendanceRecord = await prisma.attendanceContestant.findFirst({
      where: {
        AND: [
          { eventId: endpoint.eventId },
          {
            OR: [
              { hashcode: hashcode },
              { ic: hashcode }
            ]
          }
        ]
      },
    });

    if (!attendanceRecord) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Contestant not found',
          message: 'No contestant found with this QR code for this event'
        },
        { status: 404 }
      );
    }

    // Use direct SQL to get detailed information with proper joins
    const contestantDetailsResult = await prisma.$queryRaw`
      SELECT 
        ac.id as attendanceId,
        ac.hashcode,
        ac.state,
        ac.contestName,
        c.name as contestantName,
        c.ic as contestantIc,
        cont.name as contingentName,
        cont.logoUrl as contingentLogo,
        t.name as teamName,
        concat(contest.code,' ',contest.name) as fullContestName
      FROM attendanceContestant ac
      LEFT JOIN contestant c ON ac.contestantId = c.id
      LEFT JOIN contingent cont ON ac.contingentId = cont.id  
      LEFT JOIN team t ON ac.teamId = t.id
      LEFT JOIN contest contest ON ac.contestId = contest.id
      WHERE (ac.hashcode = ${hashcode} OR ac.ic = ${hashcode}) 
        AND ac.eventId = ${endpoint.eventId}
      LIMIT 1
    `;

    // Type assertion to tell TypeScript this is an array
    const contestantDetails = contestantDetailsResult as any[];

    if (!Array.isArray(contestantDetails) || contestantDetails.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Contestant details not found',
          message: 'Unable to retrieve contestant details'
        },
        { status: 404 }
      );
    }

    const details = contestantDetails[0] as any;

    // Return contestant details
    return NextResponse.json({
      success: true,
      participant: {
        id: details.attendanceId,
        name: details.contestantName,
        ic: details.contestantIc,
        state: details.state || attendanceRecord.state,
        contingentName: details.contingentName,
        contingentLogo: details.contingentLogo,
        teamName: details.teamName,
        contestName: details.fullContestName || details.contestName || attendanceRecord.contestName,
        hashcode: details.hashcode,
      },
    });

  } catch (error) {
    console.error('Error checking participant details:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while checking participant details'
      },
      { status: 500 }
    );
  }
}

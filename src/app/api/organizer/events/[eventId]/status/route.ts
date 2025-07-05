import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { Prisma } from "@prisma/client";

// Add export config to mark this route as dynamic
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Define interface for user with role
interface UserWithRole {
  id: number;
  name?: string;
  email: string;
  role?: string;
  [key: string]: any; // Allow other properties
}

// Add type for event with status
interface EventWithStatus {
  id: number;
  name: string;
  status: string;
  [key: string]: any; // Allow other properties
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  // Enhanced error logging and handling
  try {
    const eventId = parseInt(params.eventId);
    
    if (isNaN(eventId)) {
      return NextResponse.json(
        { error: "Invalid event ID" },
        { status: 400 }
      );
    }

    // Verify user session and permissions
    const user = await getSessionUser({ redirectToLogin: false }) as UserWithRole;
    if (!user || !["ADMIN", "OPERATOR"].includes(user.role || "")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    console.log(`User authenticated: ${user.name || user.email} (${user.role})`);

    // Get request body with new status
    const body = await request.json();
    const { status } = body;

    // Validate status value
    if (!status || !["OPEN", "CLOSED", "CUTOFF_REGISTRATION"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }
    
    console.log(`Updating event ${eventId} to status: ${status}`);
    
    // Use a direct SQL query to update the status field
    // This bypasses Prisma's schema validation entirely
    try {
      console.log(`Attempting direct SQL update for event ${eventId} to status ${status}`);
      
      await prisma.$executeRawUnsafe(
        "UPDATE `event` SET status = ? WHERE id = ?",
        status,
        eventId
      );
      
      console.log(`SQL update completed successfully`);
    } catch (sqlError) {
      console.error('SQL update error:', sqlError);
      throw sqlError;
    }
    
    // Get the updated event (even though status might not be visible in the object)
    const updatedEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });
    
    // Get all eventcontests for this event (do this once to reuse for different status updates)
    const eventContests = await prisma.eventcontest.findMany({
      where: {
        eventId: eventId
      },
      select: {
        id: true
      }
    });
    
    const eventContestIds = eventContests.length > 0 ? eventContests.map(ec => ec.id) : [];
    
    // If changing to CUTOFF_REGISTRATION, apply complex team status logic
    if (status === "CUTOFF_REGISTRATION" && eventContestIds.length > 0) {
      console.log('Processing CUTOFF_REGISTRATION with complex team status logic');
      
      // Step 1: Get all teams in these contests with their related team members
      const teamsWithMembers = await prisma.eventcontestteam.findMany({
        where: {
          eventcontestId: {
            in: eventContestIds
          }
        },
        include: {
          team: {
            include: {
              members: true
            }
          }
        }
      });
      
      console.log(`Found ${teamsWithMembers.length} teams to process`);
      
      // Step 2: Teams with no members remain with whatever status they have
      const teamsWithoutMembers = teamsWithMembers.filter(team => team.team.members.length === 0);
      const teamsWithMembersArray = teamsWithMembers.filter(team => team.team.members.length > 0);
      
      console.log(`Teams with no members: ${teamsWithoutMembers.length}`);
      console.log(`Teams with members: ${teamsWithMembersArray.length}`);
      
      // Step 3: Build a map of member IDs to the teams they belong to
      const memberToTeams = new Map<number, number[]>();
      teamsWithMembersArray.forEach(team => {
        team.team.members.forEach(member => {
          const memberId = member.contestantId;
          if (!memberToTeams.has(memberId)) {
            memberToTeams.set(memberId, []);
          }
          memberToTeams.get(memberId)?.push(team.id);
        });
      });
      
      // Step 4: Identify teams with overlapping members
      const teamsWithOverlappingMembers = new Set<number>();
      memberToTeams.forEach((teamIds, memberId) => {
        if (teamIds.length > 1) {
          // This member belongs to multiple teams
          teamIds.forEach(teamId => teamsWithOverlappingMembers.add(teamId));
        }
      });
      
      console.log(`Teams with overlapping members: ${teamsWithOverlappingMembers.size}`);
      
      // Step 5: Set status for teams with members but no overlaps = APPROVED
      const teamsToApprove = teamsWithMembersArray
        .filter(team => !teamsWithOverlappingMembers.has(team.id))
        .map(team => team.id);
      
      if (teamsToApprove.length > 0) {
        const approvedTeams = await prisma.eventcontestteam.updateMany({
          where: {
            id: {
              in: teamsToApprove
            }
          },
          data: {
            status: "APPROVED"
          }
        });
        
        console.log(`Set ${approvedTeams.count} teams to APPROVED status (have members, no overlaps)`);
      }
      
      // Step 6: Set status for teams with overlapping members = CONDITIONAL
      const teamsToConditional = Array.from(teamsWithOverlappingMembers) as number[];
      
      if (teamsToConditional.length > 0) {
        const conditionalTeams = await prisma.eventcontestteam.updateMany({
          where: {
            id: {
              in: teamsToConditional
            }
          },
          data: {
            status: "CONDITIONAL"
          }
        });
        
        console.log(`Set ${conditionalTeams.count} teams to CONDITIONAL status (have overlapping members)`);
      }
    }
    
    // If changing to OPEN, update all associated eventcontestteam.status to 'PENDING'
    else if (status === "OPEN" && eventContestIds.length > 0) {
      // Update all eventcontestteams associated with these eventcontests
      const teamsUpdated = await prisma.eventcontestteam.updateMany({
        where: {
          eventcontestId: {
            in: eventContestIds
          }
        },
        data: {
          status: "PENDING"
        }
      });
      
      console.log(`Updated ${teamsUpdated.count} teams to PENDING status`);
    }

    // Safely handle the event data in case it's null
    if (!updatedEvent) {
      console.log('Event was updated but could not be retrieved afterwards');
      return NextResponse.json({
        message: "Event status updated successfully, but could not retrieve updated event",
        event: {
          id: eventId,
          status: status // Use the input status as we know that was set
        },
      });
    }
    
    // Try to read the status directly from the database to verify it was set
    let verifiedStatus;
    try {
      const result = await prisma.$queryRaw`
        SELECT status FROM "event" WHERE id = ${eventId}
      `;
      const rows = result as any[];
      if (rows.length > 0) {
        verifiedStatus = rows[0].status;
        console.log(`Verified status directly from DB: ${verifiedStatus}`);
      }
    } catch (verifyError) {
      console.error('Error verifying status:', verifyError);
    }
    
    return NextResponse.json({
      message: "Event status updated successfully",
      event: {
        id: updatedEvent.id,
        name: updatedEvent.name,
        status: status, // Use input status as we know this was set via SQL
        verifiedStatus: verifiedStatus || 'unknown' // Include directly verified status if available
      },
    });
  } catch (error) {
    console.error("Error updating event status:", error);
    
    // Provide more detailed error response
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { 
          error: "Database error", 
          message: error.message,
          code: error.code 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update event status", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

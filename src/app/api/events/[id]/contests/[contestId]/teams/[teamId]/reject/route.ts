import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { authenticateAdminAPI } from "@/lib/api-middlewares";

// POST /api/events/[id]/contests/[contestId]/teams/[teamId]/reject
// Reject a team from participation in an event contest
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; contestId: string; teamId: string } }
) {
  try {
    // Authenticate user and ensure they have proper permissions
    const authResult = await authenticateAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || "Not authorized" },
        { status: authResult.status || 401 }
      );
    }
    
    const user = authResult.user;
    
    const eventId = parseInt(params.id);
    const eventContestId = parseInt(params.contestId);
    const teamId = parseInt(params.teamId);

    if (isNaN(eventId) || isNaN(eventContestId) || isNaN(teamId)) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    // Get request body for rejection reason
    const data = await request.json();
    const { reason } = data;

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    // Check if the team exists and belongs to the specified event contest
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        eventcontestId: eventContestId,
      },
      include: {
        eventcontest: {
          include: {
            event: true,
            contest: true,
          }
        },
        contingent: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found or does not belong to this event contest" },
        { status: 404 }
      );
    }

    // Verify the event contest belongs to the specified event
    if (team.eventcontest.eventId !== eventId) {
      return NextResponse.json(
        { error: "Event contest does not belong to the specified event" },
        { status: 400 }
      );
    }

    // Update the team status to REJECTED
    const updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        statusUpdatedAt: new Date(),
        approvedById: user.id, // This is the admin who made the decision
      },
    });

    // Create a notification for the contingent managers
    await createTeamRejectionNotification(team, user, reason);

    return NextResponse.json({
      success: true,
      message: "Team rejected successfully",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("Error rejecting team:", error);
    return NextResponse.json(
      { error: "Failed to reject team" },
      { status: 500 }
    );
  }
}

// Helper function to create notifications for contingent managers
async function createTeamRejectionNotification(team: any, admin: any, reason: string) {
  try {
    // Get all managers for the contingent
    const contingentManagers = await prisma.contingentManager.findMany({
      where: {
        contingentId: team.contingentId,
        isActive: true,
      },
      include: {
        user: true,
      },
    });

    // Create notifications for each manager
    const notifications = await Promise.all(
      contingentManagers.map(manager => 
        prisma.notification.create({
          data: {
            userId: manager.userId,
            title: "Team Rejected",
            message: `Your team "${team.name}" for the contest "${team.eventcontest.contest?.name}" has been rejected. Reason: ${reason}`,
            type: "TEAM_REJECTION",
            isRead: false,
            metadata: {
              teamId: team.id,
              eventContestId: team.eventcontestId,
              eventId: team.eventcontest.eventId,
              reason: reason,
            },
          },
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error("Error creating rejection notifications:", error);
    // Don't throw error, just log it - we don't want to block the rejection process if notification fails
    return null;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { authenticateAdminAPI } from "@/lib/api-middlewares";

// POST /api/events/[id]/contests/[contestId]/teams/[teamId]/approve
// Approve a team for participation in an event contest
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

    // Get request body for notes
    const data = await request.json();
    const { notes } = data;

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

    // Update the team status to APPROVED
    const updatedTeam = await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        status: "APPROVED",
        adminNotes: notes || null,
        statusUpdatedAt: new Date(),
        approvedById: user.id,
      },
    });

    // Create a notification for the contingent managers
    await createTeamApprovalNotification(team, user);

    return NextResponse.json({
      success: true,
      message: "Team approved successfully",
      team: updatedTeam,
    });
  } catch (error) {
    console.error("Error approving team:", error);
    return NextResponse.json(
      { error: "Failed to approve team" },
      { status: 500 }
    );
  }
}

// Helper function to create notifications for contingent managers
async function createTeamApprovalNotification(team: any, approver: any) {
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
            title: "Team Approved",
            message: `Your team "${team.name}" for the contest "${team.eventcontest.contest?.name}" has been approved.`,
            type: "TEAM_APPROVAL",
            isRead: false,
            metadata: {
              teamId: team.id,
              eventContestId: team.eventcontestId,
              eventId: team.eventcontest.eventId,
            },
          },
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error("Error creating approval notifications:", error);
    // Don't throw error, just log it - we don't want to block the approval process if notification fails
    return null;
  }
}

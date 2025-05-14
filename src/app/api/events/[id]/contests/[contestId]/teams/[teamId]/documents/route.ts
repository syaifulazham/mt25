import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { authenticateAPI, authenticateAdminAPI } from "@/lib/api-middlewares";

// GET /api/events/[id]/contests/[contestId]/teams/[teamId]/documents
// Get all documents for a team
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; contestId: string; teamId: string } }
) {
  try {
    // Authenticate the user
    const authResult = await authenticateAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || "Not authenticated" },
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

    // Check if the team exists
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        eventcontestId: eventContestId,
      },
      include: {
        eventcontest: {
          include: {
            event: true,
          }
        },
        contingent: {
          include: {
            contingentManagers: true,
          }
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if the user is an admin or a manager of the team's contingent
    const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
    const isContingentManager = team.contingent.contingentManagers.some(
      manager => manager.userId === user.id && manager.isActive
    );

    if (!isAdmin && !isContingentManager) {
      return NextResponse.json(
        { error: "You do not have permission to view these documents" },
        { status: 403 }
      );
    }

    // Get all documents for the team
    const documents = await prisma.teamDocument.findMany({
      where: {
        teamId: teamId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error getting team documents:", error);
    return NextResponse.json(
      { error: "Failed to get team documents" },
      { status: 500 }
    );
  }
}

// POST /api/events/[id]/contests/[contestId]/teams/[teamId]/documents
// Upload a document for a team
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; contestId: string; teamId: string } }
) {
  try {
    // Authenticate the user (only contingent managers can upload documents)
    const authResult = await authenticateAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || "Not authenticated" },
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

    // Check if team exists and belongs to the user's contingent
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        eventcontestId: eventContestId,
      },
      include: {
        eventcontest: {
          include: {
            event: true,
          }
        },
        contingent: {
          include: {
            contingentManagers: true,
          }
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    // Check if user is a manager of the team's contingent (or admin)
    const isAdmin = user.role === "ADMIN" || user.role === "SUPERADMIN";
    const isContingentManager = team.contingent.contingentManagers.some(
      manager => manager.userId === user.id && manager.isActive
    );

    if (!isAdmin && !isContingentManager) {
      return NextResponse.json(
        { error: "You do not have permission to upload documents for this team" },
        { status: 403 }
      );
    }

    // Process the form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const description = formData.get("description") as string;
    const documentType = formData.get("documentType") as string || "PROOF";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type (allow only images and PDFs)
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Please upload an image (JPEG, PNG) or PDF" },
        { status: 400 }
      );
    }

    // Check file size (limit to 5MB)
    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: "File size exceeds the 5MB limit" },
        { status: 400 }
      );
    }

    // Upload the file to blob storage
    const fileName = `team-${teamId}-${Date.now()}-${file.name}`;
    const blob = await put(fileName, file, {
      access: "public",
    });

    // Save the document info in the database
    const document = await prisma.teamDocument.create({
      data: {
        teamId: teamId,
        name: file.name,
        url: blob.url,
        mimetype: file.type,
        size: file.size,
        description: description || null,
        type: documentType,
        uploadedById: user.id,
      },
    });

    // Update the team to show it has documents
    await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        hasDocuments: true,
      },
    });

    // If team status is REJECTED, change it back to PENDING
    if (team.status === "REJECTED") {
      await prisma.team.update({
        where: {
          id: teamId,
        },
        data: {
          status: "PENDING",
          statusUpdatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
      document: document,
    });
  } catch (error) {
    console.error("Error uploading team document:", error);
    return NextResponse.json(
      { error: "Failed to upload document" },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id]/contests/[contestId]/teams/[teamId]/documents
// Delete all documents for a team (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contestId: string; teamId: string } }
) {
  try {
    // Authenticate the user (only admins can delete all documents)
    const authResult = await authenticateAdminAPI();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error || "Not authorized" },
        { status: authResult.status || 401 }
      );
    }
    
    const eventId = parseInt(params.id);
    const eventContestId = parseInt(params.contestId);
    const teamId = parseInt(params.teamId);

    if (isNaN(eventId) || isNaN(eventContestId) || isNaN(teamId)) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    // Delete all documents for the team
    await prisma.teamDocument.deleteMany({
      where: {
        teamId: teamId,
      },
    });

    // Update the team to show it has no documents
    await prisma.team.update({
      where: {
        id: teamId,
      },
      data: {
        hasDocuments: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "All documents deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting team documents:", error);
    return NextResponse.json(
      { error: "Failed to delete documents" },
      { status: 500 }
    );
  }
}

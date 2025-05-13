import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prismaExecute } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/auth-options";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

// This API endpoint safely deletes a user_participant by handling all dependencies
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin/operator privileges
  if (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR") {
    return NextResponse.json(
      { error: "Insufficient permissions. Requires ADMIN or OPERATOR role." },
      { status: 403 }
    );
  }

  const userId = parseInt(params.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json(
      { error: "Invalid participant ID" },
      { status: 400 }
    );
  }

  try {
    // Get the deletion details from the request
    const deleteOptions = await request.json();
    
    // Check if the participant exists
    const participant = await prismaExecute(prisma => 
      prisma.user_participant.findUnique({ 
        where: { id: userId },
        include: {
          contingents: true,
          managedContingents: true,
          teamManagers: true,
          createdManagers: true,
          contingentRequests: true,
          submissions: true,
        }
      })
    );

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Collect statistics about dependencies
    const dependencies = {
      contingents: participant.contingents.length,
      managedContingents: participant.managedContingents.length,
      teamManagers: participant.teamManagers.length,
      createdManagers: participant.createdManagers.length,
      contingentRequests: participant.contingentRequests.length,
      submissions: participant.submissions.length,
    };

    // Check if we're just getting dependency info
    if (deleteOptions.checkOnly) {
      return NextResponse.json({
        id: userId,
        name: participant.name,
        email: participant.email,
        dependencies
      });
    }

    // For permanent deletion, verify admin password
    if (deleteOptions.strategy === "full") {
      // Require admin password for permanent deletion
      if (!deleteOptions.adminPassword) {
        return NextResponse.json(
          { error: "Admin password is required for permanent deletion" },
          { status: 400 }
        );
      }

      // Double-check user is admin or operator from the session
      if (session.user.role !== "ADMIN" && session.user.role !== "OPERATOR") {
        return NextResponse.json(
          { error: "Only administrators can perform permanent deletion" },
          { status: 403 }
        );
      }

      // Fetch the current user to verify password
      const currentUser = await prismaExecute(prisma =>
        prisma.user.findUnique({
          where: { email: session.user.email as string },
          select: { password: true }
        })
      );

      if (!currentUser) {
        return NextResponse.json(
          { error: "Current admin user not found" },
          { status: 404 }
        );
      }

      // Verify the password
      const isValidPassword = currentUser.password 
        ? await bcrypt.compare(deleteOptions.adminPassword, currentUser.password)
        : false;

      if (!isValidPassword) {
        return NextResponse.json(
          { error: "Incorrect password" },
          { status: 403 }
        );
      }
    }

    // Handle actual deletion with Prisma transaction to ensure atomicity
    const result = await prismaExecute(async (prisma) => {
      // Handle different deletion strategies
      if (deleteOptions.strategy === "full") {
        // Full deletion - actually delete all related records
        
        // Option 1: Delete cascading relations first
        if (participant.teamManagers.length > 0) {
          await prisma.teamManager.deleteMany({
            where: { participantId: userId }
          });
        }
        
        if (participant.managedContingents.length > 0) {
          await prisma.contingentManager.deleteMany({
            where: { participantId: userId }
          });
        }
        
        if (participant.contingentRequests.length > 0) {
          await prisma.contingentRequest.deleteMany({
            where: { participantId: userId }
          });
        }
        
        if (participant.submissions.length > 0) {
          // Update submissions to remove participant reference
          await prisma.submission.updateMany({
            where: { participantId: userId },
            data: { participantId: null }
          });
        }

        // Handle contingents
        for (const contingent of participant.contingents) {
          // Delete or reassign teams belonging to this contingent
          if (deleteOptions.reassignTeamsTo) {
            // Reassign teams to another participant
            const reassignToId = parseInt(deleteOptions.reassignTeamsTo, 10);
            if (!isNaN(reassignToId)) {
              await prisma.team.updateMany({
                where: { contingentId: contingent.id },
                data: { contingentId: reassignToId }
              });
            }
          }
          
          // Delete the contingent if specified
          if (deleteOptions.deleteContingents) {
            await prisma.contingent.delete({
              where: { id: contingent.id }
            });
          } else {
            // Update the contingent to break association
            await prisma.contingent.update({
              where: { id: contingent.id },
              data: { participantId: null }
            });
          }
        }
        
        // Delete the participant
        return await prisma.user_participant.delete({
          where: { id: userId }
        });
      } 
      else if (deleteOptions.strategy === "soft") {
        // Soft deletion - mark as inactive but preserve relationships
        return await prisma.user_participant.update({
          where: { id: userId },
          data: {
            isActive: false,
            email: `deleted-${userId}-${participant.email}`,
            // Optional: Encrypt or remove sensitive data
            password: null,
          }
        });
      }
      else {
        throw new Error("Invalid deletion strategy");
      }
    });

    return NextResponse.json({
      success: true,
      message: `Participant ${userId} deleted using ${deleteOptions.strategy} strategy`,
      dependencies
    });
  } catch (error) {
    console.error("Error deleting participant:", error);
    return NextResponse.json(
      { error: "Failed to delete participant", details: (error as Error).message },
      { status: 500 }
    );
  }
}

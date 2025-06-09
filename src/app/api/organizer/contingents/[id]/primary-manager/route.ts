import { NextRequest, NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";
import { authenticateOrganizerApi } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// PATCH - Update the primary manager of a contingent
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authorization - only organizers can manage contingents
    console.log('Authenticating organizer API request for primary-manager update...');
    const authResult = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
    
    if (!authResult.success) {
      console.error('Authentication failed:', authResult.message);
      return NextResponse.json({ 
        error: `Authentication failed: ${authResult.message}`,
        details: authResult
      }, { status: authResult.status || 401 });
    }
    
    console.log('Authentication successful, proceeding with primary manager update');

    const contingentId = parseInt(params.id);
    if (isNaN(contingentId)) {
      return NextResponse.json({ error: "Invalid contingent ID" }, { status: 400 });
    }

    const body = await req.json();
    const { newPrimaryManagerId } = body;

    if (!newPrimaryManagerId || typeof newPrimaryManagerId !== 'number') {
      return NextResponse.json({ error: "Invalid new primary manager ID" }, { status: 400 });
    }

    // Run the update in a transaction to ensure consistency
    const result = await prismaExecute(async (prisma) => {
      // 1. Check if contingent exists
      const contingent = await prisma.contingent.findUnique({
        where: { id: contingentId },
        include: {
          managers: true,
        },
      });

      if (!contingent) {
        throw new Error("Contingent not found");
      }

      // 2. Check if the new primary manager is actually a manager of this contingent
      const newPrimaryManager = contingent.managers.find(manager => manager.id === newPrimaryManagerId);
      if (!newPrimaryManager) {
        throw new Error("Selected manager is not associated with this contingent");
      }

      // 3. Check if the manager is already the primary manager
      if (newPrimaryManager.isOwner) {
        return { success: true, message: "Manager is already the primary manager" };
      }

      // 4. Find current primary manager(s)
      const currentPrimaryManagers = contingent.managers.filter(manager => manager.isOwner);

      // 5. Update in a transaction
      return await prisma.$transaction(async (tx) => {
        // First, remove primary status from current primary managers
        for (const manager of currentPrimaryManagers) {
          await tx.contingentManager.update({
            where: { id: manager.id },
            data: { isOwner: false },
          });
        }

        // Then set the new primary manager
        await tx.contingentManager.update({
          where: { id: newPrimaryManagerId },
          data: { isOwner: true },
        });

        return {
          success: true,
          message: "Primary manager updated successfully",
        };
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating primary manager:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// NO AUTH CHECK - DIRECT PRIMARY MANAGER UPDATE
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('========== FORCE UPDATE PRIMARY MANAGER - NO AUTH CHECKS ==========');
    
    // Parse request body
    const body = await req.json();
    const { newPrimaryManagerId } = body;
    
    // Validate contingent ID
    const contingentId = parseInt(params.id);
    if (isNaN(contingentId)) {
      return NextResponse.json({ error: "Invalid contingent ID" }, { status: 400 });
    }
    
    // Validate newPrimaryManagerId
    if (!newPrimaryManagerId || typeof newPrimaryManagerId !== 'number') {
      return NextResponse.json({ error: "Invalid new primary manager ID" }, { status: 400 });
    }
    
    console.log(`Force updating primary manager for contingent ${contingentId} to ${newPrimaryManagerId}`);

    // Run the update in a transaction for consistency - NO AUTH CHECKS
    const result = await prisma.$transaction(async (tx) => {
      // 1. Check if contingent exists
      const contingent = await tx.contingent.findUnique({
        where: { id: contingentId },
        include: { managers: true },
      });
      
      if (!contingent) {
        throw new Error("Contingent not found");
      }
      
      // 2. Check if the new primary manager is part of this contingent
      const newPrimaryManager = contingent.managers.find(manager => manager.id === newPrimaryManagerId);
      if (!newPrimaryManager) {
        throw new Error("Selected manager is not associated with this contingent");
      }
      
      // 3. Check if already the primary manager
      if (newPrimaryManager.isOwner) {
        return { success: true, message: "Manager is already the primary manager" };
      }
      
      // 4. Find current primary manager(s)
      const currentPrimaryManagers = contingent.managers.filter(manager => manager.isOwner);
      
      console.log('Changing primary manager:');
      console.log('- Current primary:', currentPrimaryManagers.map(m => m.id));
      console.log('- New primary:', newPrimaryManagerId);
      
      // 5. Update all managers in a transaction
      
      // First, remove primary status from all current primary managers
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
        message: "Primary manager updated successfully - no auth checks",
      };
    });
    
    console.log('UPDATE RESULT:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in force primary manager update:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    );
  }
}

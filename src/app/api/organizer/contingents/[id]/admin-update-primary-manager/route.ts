import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// PATCH - Update primary manager by admin only
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Simple authentication - only check if user is ADMIN
    const currentUser = await getCurrentUser();
    
    // Admin-only endpoint
    if (!currentUser || currentUser.role !== 'ADMIN') {
      console.error('Admin-only endpoint accessed by non-admin user');
      return NextResponse.json({ 
        error: `This endpoint is restricted to ADMIN users only` 
      }, { status: 403 });
    }
    
    console.log('ADMIN user confirmed, proceeding with primary manager update');
    
    // Parse request and validate parameters
    const contingentId = parseInt(params.id);
    if (isNaN(contingentId)) {
      return NextResponse.json({ error: "Invalid contingent ID" }, { status: 400 });
    }
    
    const body = await req.json();
    const { newPrimaryManagerId } = body;
    
    if (!newPrimaryManagerId || typeof newPrimaryManagerId !== 'number') {
      return NextResponse.json({ error: "Invalid new primary manager ID" }, { status: 400 });
    }
    
    // Run the update in a transaction for consistency
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
        message: "Primary manager updated successfully by administrator",
      };
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in admin primary manager update:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    );
  }
}

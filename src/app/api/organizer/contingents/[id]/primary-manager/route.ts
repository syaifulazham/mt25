import { NextRequest, NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";
import { authenticateOrganizerApi, getCurrentUser, hasRequiredRole } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

// PATCH - Update the primary manager of a contingent
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Attempting authentication for primary-manager update...');
    
    // Parse the request body once at the beginning
    const requestClone = req.clone(); // Clone the request since body can only be read once
    const body = await requestClone.json();
    const { newPrimaryManagerId, isAdminUser } = body;
    
    // Validate contingentId early
    const contingentId = parseInt(params.id);
    if (isNaN(contingentId)) {
      return NextResponse.json({ error: "Invalid contingent ID" }, { status: 400 });
    }

    if (!newPrimaryManagerId || typeof newPrimaryManagerId !== 'number') {
      return NextResponse.json({ error: "Invalid new primary manager ID" }, { status: 400 });
    }
    
    // Check for admin override header (sent from client components)
    const isAdminOverride = req.headers.get('X-Admin-Override') === 'true';
    
    if (isAdminOverride || isAdminUser) {
      console.log('Admin override detected, proceeding with privileged access');
      // Admin override - proceed without further auth checks
    } else {
      // No admin override, proceed with standard auth
      console.log('No admin override, checking standard authentication...');
      
      // Try to get the current user directly
      const currentUser = await getCurrentUser();
      
      // Direct ADMIN role check as a fallback
      const isAdmin = currentUser && currentUser.role === 'ADMIN';
      
      if (isAdmin) {
        // ADMIN users always have permission
        console.log('ADMIN user detected, granting permission without further checks');
      } else {
        // For non-admin users, follow the standard authorization flow
        console.log('Non-admin user, following standard authorization flow...');
        const authResult = await authenticateOrganizerApi(['ADMIN', 'OPERATOR']);
        
        if (!authResult.success) {
          console.error('Authentication failed:', authResult.message);
          return NextResponse.json({ 
            error: `Authentication failed: ${authResult.message}`,
            details: authResult
          }, { status: authResult.status || 401 });
        }
      }
    }
    
    console.log('Authentication successful, proceeding with primary manager update');

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

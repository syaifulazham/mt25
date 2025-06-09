import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

export const dynamic = 'force-dynamic';

// Direct admin access endpoint for primary manager change
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('========== ADMIN DIRECT API STARTING ==========');
    
    // First extract the email from the JWT token if available
    let adminEmail = null;
    const cookieStore = cookies();
    const token = cookieStore.get('next-auth.session-token')?.value;
    
    if (token) {
      try {
        // Basic JWT decode to extract payload without verification
        const decoded = jose.decodeJwt(token);
        if (decoded && decoded.email) {
          adminEmail = decoded.email;
          console.log('Found email in token:', adminEmail);
        }
      } catch (e) {
        console.log('Could not decode token, will try fallback method');
      }
    } else {
      console.log('No auth token found in cookies');
    }
    
    // If no email found in token, check request headers or body
    if (!adminEmail) {
      // Try to get email from request headers
      adminEmail = req.headers.get('X-Admin-Email');
      
      // If not in headers, check the request body
      if (!adminEmail) {
        const body = await req.json();
        adminEmail = body.adminEmail;
        
        // Store body data for later use
        var { newPrimaryManagerId } = body;
      } else {
        // Parse body separately if we already have the email from headers
        const body = await req.json();
        var { newPrimaryManagerId } = body;
      }
    } else {
      // Parse body if we already got email from token
      const body = await req.json();
      var { newPrimaryManagerId } = body;
    }
    
    console.log('Admin email to check:', adminEmail);
    
    if (!adminEmail) {
      console.error('No admin email provided');
      return NextResponse.json({ error: 'Admin email required' }, { status: 400 });
    }
    
    // Parse and validate contingent ID
    const contingentId = parseInt(params.id);
    if (isNaN(contingentId)) {
      return NextResponse.json({ error: "Invalid contingent ID" }, { status: 400 });
    }
    
    // Validate newPrimaryManagerId
    if (!newPrimaryManagerId || typeof newPrimaryManagerId !== 'number') {
      return NextResponse.json({ error: "Invalid new primary manager ID" }, { status: 400 });
    }

    // Direct database check if the email belongs to an ADMIN user
    const adminUser = await prisma.user.findFirst({
      where: {
        email: adminEmail,
        role: 'ADMIN'
      }
    });

    if (!adminUser) {
      console.error('User is not an admin:', adminEmail);
      return NextResponse.json({ 
        error: 'Only ADMIN users can use this endpoint',
        userEmail: adminEmail 
      }, { status: 403 });
    }

    console.log('CONFIRMED ADMIN USER:', adminUser.email);
    
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
        message: "Primary manager updated successfully by administrator",
        admin: adminUser.email
      };
    });
    
    console.log('UPDATE RESULT:', result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in admin direct primary manager update:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unknown error occurred" },
      { status: 500 }
    );
  }
}

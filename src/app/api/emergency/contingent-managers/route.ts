import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

// EMERGENCY ENDPOINT - ABSOLUTELY NO AUTH CHECKS WHATSOEVER
export async function GET(req: NextRequest) {
  try {
    console.log('========== EMERGENCY FETCH CONTINGENT MANAGERS - NO AUTH ==========');
    
    // Parse contingent ID from URL query parameters
    const url = new URL(req.url);
    const contingentIdStr = url.searchParams.get('id');
    
    if (!contingentIdStr) {
      return NextResponse.json({ error: "Missing contingent ID" }, { status: 400 });
    }
    
    const contingentId = parseInt(contingentIdStr);
    if (isNaN(contingentId)) {
      return NextResponse.json({ error: "Invalid contingent ID" }, { status: 400 });
    }
    
    console.log(`Emergency endpoint: Fetching managers for contingent ${contingentId}`);

    // Fetch contingent and its managers directly from database - no auth check
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId },
      include: {
        managers: {
          include: {
            participant: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true,
      contingentName: contingent.name,
      managers: contingent.managers
    });
    
  } catch (error) {
    console.error('Error in emergency fetch contingent managers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0; // Disable all caching

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`Fetching requests for contingent ID: ${params.id}`);
    
    // Authenticate the request
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log('Unauthorized: No session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contingentId = parseInt(params.id);
    if (isNaN(contingentId)) {
      console.log(`Invalid contingent ID: ${params.id}`);
      return NextResponse.json(
        { error: "Invalid contingent ID" },
        { status: 400 }
      );
    }
    
    // Get current user's participant ID to exclude their own requests
    const currentUser = await prisma.user_participant.findFirst({
      where: {
        email: session.user?.email ? session.user.email : ""
      }
    });
    
    const currentUserId = currentUser?.id || 0;
    console.log(`Current user: ${currentUserId}, ${currentUser?.email}`);

    // Use a direct query approach instead of complex relations
    // This is more efficient and less likely to cause issues
    try {
      // First make sure the contingent exists
      const contingent = await prisma.contingent.findUnique({
        where: { id: contingentId }
      });

      if (!contingent) {
        console.log(`Contingent not found: ${contingentId}`);
        return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
      }

      console.log(`Found contingent: ${contingent.name}`);

      // User info already fetched outside the try block
      
      // Get the contingent requests - only PENDING status and excluding the current user's requests
      const contingentRequests = await prisma.$queryRaw`
        SELECT 
          cr.id, 
          cr.contingentId, 
          cr.participantId, 
          cr.status, 
          cr.createdAt,
          p.id as userId, 
          p.name, 
          p.email, 
          p.phoneNumber
        FROM contingentRequest cr
        JOIN user_participant p ON cr.participantId = p.id
        WHERE cr.contingentId = ${contingentId}
          AND cr.status = 'PENDING'
          AND cr.participantId != ${currentUserId}
        ORDER BY cr.createdAt DESC
      `;

      console.log(`Found ${Array.isArray(contingentRequests) ? contingentRequests.length : 0} requests`);

      // Convert raw SQL results to the expected format
      const formattedResults = Array.isArray(contingentRequests) ? contingentRequests.map((req: any) => ({
        id: req.id,
        contingentId: req.contingentId,
        participantId: req.participantId,
        status: req.status || 'UNKNOWN',
        createdAt: req.createdAt,
        user: {
          id: req.userId,
          name: req.name || 'Unknown',
          email: req.email || '',
          phoneNumber: req.phoneNumber || ''
          // Note: No profileImage field as it doesn't exist in user_participant
        }
      })) : [];

      return NextResponse.json(formattedResults);
    } catch (dbError) {
      console.error("Database error:", dbError);
      
      // Fallback approach if raw query fails
      console.log("Trying fallback approach with separate queries...");
      
      // Get all pending requests and exclude the current user's requests
      const requests = await prisma.contingentRequest.findMany({
        where: { 
          contingentId,
          status: 'PENDING',
          participantId: { not: currentUserId }
        }
      });
      
      // Create a simplified response with minimal data
      const fallbackResults = await Promise.all(
        requests.map(async (req) => {
          // Get participant info for each request
          let participant;
          try {
            participant = await prisma.user_participant.findUnique({
              where: { id: req.participantId },
              select: { id: true, name: true, email: true, phoneNumber: true }
            });
          } catch (e) {
            console.error(`Error fetching participant ${req.participantId}:`, e);
            participant = null;
          }
          
          return {
            id: req.id,
            contingentId: req.contingentId,
            participantId: req.participantId,
            status: req.status || 'UNKNOWN',
            createdAt: req.createdAt,
            user: participant ? {
              id: participant.id,
              name: participant.name || 'Unknown',
              email: participant.email || '',
              phoneNumber: participant.phoneNumber || ''
            } : { id: req.participantId, name: 'Unknown User', email: '', phoneNumber: '' }
          };
        })
      );
      
      return NextResponse.json(fallbackResults);
    }
  } catch (error) {
    // Detailed error logging
    console.error("Error fetching contingent requests:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch contingent requests", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

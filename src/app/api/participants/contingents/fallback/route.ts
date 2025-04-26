import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// GET handler - Fallback method to get participant's contingents using direct SQL queries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get participant ID from query params
    const searchParams = request.nextUrl.searchParams;
    const participantIdParam = searchParams.get("participantId");
    
    // For backward compatibility, still accept userId but prefer participantId
    const userIdParam = searchParams.get("userId");
    
    let participantId: number | null = null;
    
    if (participantIdParam) {
      // If participantId is provided directly, use it
      participantId = parseInt(participantIdParam);
      console.log(`Fallback API: Using provided participant ID: ${participantId}`);
    } else if (userIdParam) {
      // For backward compatibility: if only userId is provided, find the corresponding participant
      const userId = parseInt(userIdParam);
      console.log(`Fallback API: Looking up participant ID for user ID: ${userId}`);
      
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });
        
        if (user) {
          const participant = await prisma.user_participant.findUnique({
            where: { email: user.email },
            select: { id: true }
          });
          
          if (participant) {
            participantId = participant.id;
            console.log(`Fallback API: Found participant ID ${participantId} for user ${userId}`);
          }
        }
      } catch (error) {
        console.error("Fallback API: Error finding participant:", error);
      }
    } else {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }
    
    if (!participantId) {
      return NextResponse.json({ error: "Could not determine participant ID" }, { status: 404 });
    }
    
    // Define the type for contingent data
    interface ContingentData {
      id: number;
      name: string;
      description: string;
      school: any | null;
      higherInstitution: any | null;
      isManager: boolean;
      isOwner: boolean;
      status: string; // Use string instead of union type to accommodate raw SQL results
      memberCount: number;
      managerCount?: number;
    }
    
    // Fetch contingents using raw SQL to be compatible with both schemas
    let contingentsData: ContingentData[] = [];
    
    try {
      // Get contingents where the participant is a manager
      const managedContingentsQuery = `
        SELECT 
          c.id, c.name, c.description, c.schoolId, c.higherInstId,
          c.managedByParticipant, c.participantId
        FROM contingent c
        LEFT JOIN contingentManager cm ON c.id = cm.contingentId
        WHERE 
          (cm.participantId = ${participantId})
          OR (c.managedByParticipant = 1 AND c.participantId = ${participantId})
        GROUP BY c.id
      `;
      
      const managedContingents = await prisma.$queryRawUnsafe(managedContingentsQuery);
      console.log(`Fallback API: Found ${Array.isArray(managedContingents) ? managedContingents.length : 0} managed contingents`);
      
      // Also get contingents where the participant is a member
      const memberContingentsQuery = `
        SELECT 
          c.id, c.name, c.description, c.schoolId, c.higherInstId,
          c.managedByParticipant, c.participantId
        FROM contingent c
        WHERE c.participantId = ${participantId}
        AND c.id NOT IN (
          SELECT c2.id FROM contingent c2
          LEFT JOIN contingentManager cm ON c2.id = cm.contingentId
          WHERE 
            (cm.participantId = ${participantId})
            OR (c2.managedByParticipant = 1 AND c2.participantId = ${participantId})
        )
      `;
      
      const memberContingents = await prisma.$queryRawUnsafe(memberContingentsQuery);
      console.log(`Fallback API: Found ${Array.isArray(memberContingents) ? memberContingents.length : 0} member contingents`);
      
      // Get pending requests
      const pendingRequestsQuery = `
        SELECT 
          cr.id as requestId, cr.status,
          c.id, c.name, c.description, c.schoolId, c.higherInstId
        FROM contingentRequest cr
        JOIN contingent c ON cr.contingentId = c.id
        WHERE cr.participantId = ${participantId} AND cr.status = 'PENDING'
      `;
      
      const pendingRequests = await prisma.$queryRawUnsafe(pendingRequestsQuery);
      console.log(`Fallback API: Found ${Array.isArray(pendingRequests) ? pendingRequests.length : 0} pending requests`);
      
      // Process and format the results
      const processedContingents = [];
      
      // Process managed contingents
      if (Array.isArray(managedContingents)) {
        for (const contingent of managedContingents) {
          let school = null;
          let higherInstitution = null;
          
          if (contingent.schoolId) {
            try {
              const schoolData = await prisma.school.findUnique({
                where: { id: contingent.schoolId },
                include: { state: true }
              });
              if (schoolData) school = schoolData;
            } catch (error) {
              console.error(`Fallback API: Error fetching school ${contingent.schoolId}:`, error);
            }
          }
          
          if (contingent.higherInstId) {
            try {
              const higherInstData = await prisma.higherinstitution.findUnique({
                where: { id: contingent.higherInstId },
                include: { state: true }
              });
              if (higherInstData) higherInstitution = higherInstData;
            } catch (error) {
              console.error(`Fallback API: Error fetching higher institution ${contingent.higherInstId}:`, error);
            }
          }
          
          processedContingents.push({
            id: Number(contingent.id),
            name: String(contingent.name),
            description: String(contingent.description || ""),
            school,
            higherInstitution,
            isManager: true,
            isOwner: Boolean(contingent.managedByParticipant && contingent.participantId === participantId),
            status: "ACTIVE",
            memberCount: 0, // We don't have this information in the fallback
            managerCount: 1  // Default value
          });
        }
      }
      
      // Process member contingents
      if (Array.isArray(memberContingents)) {
        for (const contingent of memberContingents) {
          let school = null;
          let higherInstitution = null;
          
          if (contingent.schoolId) {
            try {
              const schoolData = await prisma.school.findUnique({
                where: { id: contingent.schoolId },
                include: { state: true }
              });
              if (schoolData) school = schoolData;
            } catch (error) {
              console.error(`Fallback API: Error fetching school ${contingent.schoolId}:`, error);
            }
          }
          
          if (contingent.higherInstId) {
            try {
              const higherInstData = await prisma.higherinstitution.findUnique({
                where: { id: contingent.higherInstId },
                include: { state: true }
              });
              if (higherInstData) higherInstitution = higherInstData;
            } catch (error) {
              console.error(`Fallback API: Error fetching higher institution ${contingent.higherInstId}:`, error);
            }
          }
          
          processedContingents.push({
            id: Number(contingent.id),
            name: String(contingent.name),
            description: String(contingent.description || ""),
            school,
            higherInstitution,
            isManager: false,
            isOwner: false,
            status: "ACTIVE",
            memberCount: 0, // We don't have this information in the fallback
            managerCount: 0  // Default value
          });
        }
      }
      
      // Process pending requests
      if (Array.isArray(pendingRequests)) {
        for (const request of pendingRequests) {
          let school = null;
          let higherInstitution = null;
          
          if (request.schoolId) {
            try {
              const schoolData = await prisma.school.findUnique({
                where: { id: request.schoolId },
                include: { state: true }
              });
              if (schoolData) school = schoolData;
            } catch (error) {
              console.error(`Fallback API: Error fetching school ${request.schoolId}:`, error);
            }
          }
          
          if (request.higherInstId) {
            try {
              const higherInstData = await prisma.higherinstitution.findUnique({
                where: { id: request.higherInstId },
                include: { state: true }
              });
              if (higherInstData) higherInstitution = higherInstData;
            } catch (error) {
              console.error(`Fallback API: Error fetching higher institution ${request.higherInstId}:`, error);
            }
          }
          
          processedContingents.push({
            id: Number(request.id),
            name: String(request.name),
            description: String(request.description || ""),
            school,
            higherInstitution,
            isManager: false,
            isOwner: false,
            status: "PENDING",
            memberCount: 0, // We don't have this information for pending requests
            managerCount: 0  // Default value
          });
        }
      }
      
      contingentsData = processedContingents;
    } catch (error) {
      console.error("Fallback API: Error executing raw SQL queries:", error);
    }
    
    console.log(`Fallback API: Returning ${contingentsData.length} contingents`);
    return NextResponse.json(contingentsData as ContingentData[]);
  } catch (error) {
    console.error("Fallback API: Error fetching contingents:", error);
    return NextResponse.json(
      { error: "Failed to fetch contingents" },
      { status: 500 }
    );
  }
}

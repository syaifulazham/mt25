import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for creating a new contingent request
const createRequestSchema = z.object({
  participantId: z.number(),
  institutionType: z.enum(["SCHOOL", "HIGHER_INSTITUTION"]),
  institutionId: z.number()
});

// GET handler - Get contingent requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get contingent ID from query params
    const searchParams = request.nextUrl.searchParams;
    const contingentIdParam = searchParams.get("contingentId");
    
    if (!contingentIdParam) {
      return NextResponse.json({ error: "Contingent ID is required" }, { status: 400 });
    }
    
    const contingentId = parseInt(contingentIdParam);
    
    // Get contingent
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId }
    });
    
    if (!contingent) {
      return NextResponse.json({ error: "Contingent not found" }, { status: 404 });
    }
    
    // Get participant ID from the session user
    const userId = parseInt(session.user.id);
    
    // Find the participant record for this user
    const participant = await prisma.user_participant.findFirst({
      where: { 
        email: session.user.email || '' // Ensure email is never null or undefined
      },
      select: { id: true }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant record not found" }, { status: 404 });
    }
    
    const participantId = participant.id;
    
    // Log the participant ID and contingent ID for debugging
    console.log(`Checking if participant ${participantId} is a manager of contingent ${contingentId}`);
    
    // Check if the participant is a manager of this contingent using the contingentManager model
    const managerRecord = await prisma.contingentManager.findFirst({
      where: {
        contingentId: contingentId,
        participantId: participantId
      }
    });
    
    console.log(`Manager record found: ${managerRecord !== null}`, managerRecord);
    
    // Also check the legacy relationship (direct participantId)
    const isLegacyManager = contingent.managedByParticipant && contingent.participantId === participantId;
    console.log(`Is legacy manager: ${isLegacyManager}`);
    
    const isManager = managerRecord !== null || isLegacyManager;
    console.log(`Final manager status: ${isManager}`);
    
    if (!isManager) {
      console.log(`Participant ${participantId} is not authorized to view requests for contingent ${contingentId}`);
      console.log(`Contingent data:`, JSON.stringify(contingent, null, 2));
      return NextResponse.json({ error: "You are not authorized to view these requests" }, { status: 403 });
    }
    
    console.log(`Participant ${participantId} is authorized to view requests for contingent ${contingentId}`);
    
    // Get contingent requests for this contingent
    const requests = await prisma.contingentRequest.findMany({
      where: {
        contingentId,
        status: "PENDING"
      },
      include: {
        contingent: {
          select: {
            id: true,
            name: true
          }
        },
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            gender: true,
            schoolId: true,
            higherInstId: true,
            school: {
              select: {
                name: true
              }
            },
            higherInstitution: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    console.log(`Found ${requests.length} pending requests for contingent ${contingentId}:`, JSON.stringify(requests, null, 2));
    
    // Format the response
    const formattedRequests = requests.map(request => ({
      id: request.id,
      contingentId: request.contingentId,
      participantId: request.participantId,
      status: request.status,
      createdAt: request.createdAt,
      contingentName: request.contingent.name, 
      user: {
        id: request.participant.id,
        name: request.participant.name,
        email: request.participant.email,
        phoneNumber: request.participant.phoneNumber,
        gender: request.participant.gender,
        school: request.participant.school?.name,
        higherInstitution: request.participant.higherInstitution?.name
      }
    }));
    
    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error("Error fetching contingent requests:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Failed to fetch contingent requests" },
      { status: 500 }
    );
  }
}

// POST handler - Create a new contingent request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate request body
    const validationResult = createRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { participantId, institutionType, institutionId } = validationResult.data;
    
    // Check if participant exists
    const participant = await prisma.user_participant.findUnique({
      where: { id: participantId }
    });
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Find contingent for the institution
    let contingent;
    
    if (institutionType === "SCHOOL") {
      contingent = await prisma.contingent.findFirst({
        where: { schoolId: institutionId }
      });
    } else {
      contingent = await prisma.contingent.findFirst({
        where: { higherInstId: institutionId }
      });
    }
    
    if (!contingent) {
      return NextResponse.json(
        { error: "No contingent found for this institution. Please create one instead." },
        { status: 404 }
      );
    }
    
    // Check if participant is already a member of this contingent
    const isMember = await prisma.contingent.findFirst({
      where: {
        id: contingent.id,
        OR: [
          {
            managers: {
              some: {
                participantId: participantId
              }
            }
          },
          { participantId: participantId }
        ]
      }
    });
    
    if (isMember) {
      return NextResponse.json(
        { error: "You are already a member of this contingent" },
        { status: 400 }
      );
    }
    
    // Check if there's already a pending request
    const existingRequest = await prisma.contingentRequest.findFirst({
      where: {
        contingentId: contingent.id,
        participantId: participantId,
        status: "PENDING"
      }
    });
    
    if (existingRequest) {
      return NextResponse.json(
        { error: "You already have a pending request to join this contingent" },
        { status: 400 }
      );
    }
    
    // Create a new contingent request
    const newRequest = await prisma.contingentRequest.create({
      data: {
        contingentId: contingent.id,
        participantId: participantId,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("Error creating contingent request:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Return more detailed error message if available
    const errorMessage = error instanceof Error ? error.message : "Failed to create contingent request";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

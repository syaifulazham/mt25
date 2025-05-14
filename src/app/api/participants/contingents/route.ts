import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0; // Disable all caching

// Schema for creating a new independent contingent
const createIndependentSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().optional(),
  town: z.string().optional(),
  postcode: z.string().optional(),
  stateId: z.number(),
  institution: z.string().optional(),
  type: z.enum(['PARENT', 'YOUTH_GROUP']),
});

// Schema for creating a new contingent
const createContingentSchema = z.object({
  schoolId: z.number().optional(),
  higherInstId: z.number().optional(),
  independentData: createIndependentSchema.optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  short_name: z.string().optional(),
  participantId: z.number(),
  contingentType: z.enum(['SCHOOL', 'HIGHER_INST', 'INDEPENDENT']).default('SCHOOL'),
});

// Schema for updating a contingent
const updateContingentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  short_name: z.string().optional(),
  logoUrl: z.string().optional(),
});

// GET handler - Retrieve contingents for a participant
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get participant ID from URL query string
    const searchParams = request.nextUrl.searchParams;
    const participantIdStr = searchParams.get("participantId");

    if (!participantIdStr) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    const participantId = parseInt(participantIdStr, 10);

    if (isNaN(participantId)) {
      return NextResponse.json(
        { error: "Invalid participant ID" },
        { status: 400 }
      );
    }

    console.log(`Fetching contingents for participant ${participantId}`);

    try {
      // Try to get contingents where the participant is a manager
      // This includes both direct management (legacy) and via contingentManager relation
      const managedContingents = await prisma.contingent.findMany({
        where: {
          OR: [
            { managers: { some: { participantId } } },
            { managedByParticipant: true, participantId }
          ]
        },
        include: {
          school: { include: { state: true } },
          higherInstitution: { include: { state: true } },
          managers: { where: { participantId } },
          _count: { select: { contestants: true, managers: true } }
        }
      });

      console.log(`Found ${managedContingents.length} contingents managed by participant ${participantId}`);

      if (managedContingents.length > 0) {
        // Format the contingents for the response
        const formattedContingents = managedContingents.map(c => ({
          id: c.id,
          name: c.name,
          short_name: c.short_name || "",
          logoUrl: c.logoUrl || "",
          description: c.description || "",
          school: c.school,
          higherInstitution: c.higherInstitution,
          isManager: true,
          isOwner: c.managers.length > 0 ? c.managers[0].isOwner : true,
          managedByParticipant: c.managedByParticipant,
          status: "ACTIVE",
          memberCount: c._count.contestants,
          managerCount: c._count.managers
        }));

        return NextResponse.json(formattedContingents);
      }
    } catch (err) {
      console.error("Database error when fetching contingents:", err);
    }

    // No contingents found - return empty array to trigger creation form
    console.log("No contingents found for participant", participantId);
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching contingents:", error);
    return NextResponse.json(
      { error: "Failed to fetch contingents" },
      { status: 500 }
    );
  }
}

// POST handler - Create a new contingent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the request body and validate against the schema
    const body = await request.json();
    const validationResult = createContingentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { 
      name, 
      description, 
      participantId, 
      schoolId, 
      higherInstId,
      short_name
    } = validationResult.data;

    // Validate contingent type requirements
    if (validationResult.data.contingentType === 'SCHOOL' && !schoolId) {
      return NextResponse.json(
        { error: "schoolId is required for school contingents" },
        { status: 400 }
      );
    }
    
    if (validationResult.data.contingentType === 'HIGHER_INST' && !higherInstId) {
      return NextResponse.json(
        { error: "higherInstId is required for higher institution contingents" },
        { status: 400 }
      );
    }
    
    if (validationResult.data.contingentType === 'INDEPENDENT' && !validationResult.data.independentData) {
      return NextResponse.json(
        { error: "Independent contingent details are required" },
        { status: 400 }
      );
    }

    // Check if participant exists
    const participant = await prisma.user_participant.findUnique({
      where: { id: participantId }
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found" },
        { status: 404 }
      );
    }

    // Use a transaction to create both the contingent and manager relationship
    const result = await prisma.$transaction(async (tx) => {
      let independentId: number | undefined = undefined;
      
      // Create independent record if needed
      if (validationResult.data.contingentType === 'INDEPENDENT' && validationResult.data.independentData) {
        const { name: indName, address, town, postcode, stateId, institution, type } = validationResult.data.independentData;
        
        const newIndependent = await tx.independent.create({
          data: {
            name: indName,
            address,
            town,
            postcode,
            stateId,
            institution,
            type,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        independentId = newIndependent.id;
      }
      
      // Create the contingent
      const newContingent = await tx.contingent.create({
        data: {
          name,
          description: description || "",
          short_name: short_name || "",
          managedByParticipant: true,
          participantId,
          schoolId: validationResult.data.contingentType === 'SCHOOL' ? schoolId : undefined,
          higherInstId: validationResult.data.contingentType === 'HIGHER_INST' ? higherInstId : undefined,
          independentId,
          contingentType: validationResult.data.contingentType,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Create the contingent manager record for many-to-many relationship
      await tx.contingentManager.create({
        data: {
          contingentId: newContingent.id,
          participantId,
          isOwner: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      return newContingent;
    });

    return NextResponse.json(
      { success: true, contingent: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating contingent:", error);
    return NextResponse.json(
      { error: "Failed to create contingent" },
      { status: 500 }
    );
  }
}

// PUT handler - Update a contingent
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the request body and validate against the schema
    const body = await request.json();
    const validationResult = updateContingentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { name, description, short_name, logoUrl } = validationResult.data;

    // Get contingent ID from URL query parameter
    const { searchParams } = request.nextUrl;
    const contingentIdStr = searchParams.get("id");
    const participantIdStr = searchParams.get("participantId");

    if (!contingentIdStr) {
      return NextResponse.json(
        { error: "Contingent ID is required" },
        { status: 400 }
      );
    }

    if (!participantIdStr) {
      return NextResponse.json(
        { error: "Participant ID is required" },
        { status: 400 }
      );
    }

    const contingentId = parseInt(contingentIdStr, 10);
    const participantId = parseInt(participantIdStr, 10);

    if (isNaN(contingentId) || isNaN(participantId)) {
      return NextResponse.json(
        { error: "Invalid ID format" },
        { status: 400 }
      );
    }

    // Check if the participant is a manager of this contingent
    const isManager = await prisma.contingentManager.findFirst({
      where: {
        contingentId,
        participantId
      }
    });

    // Also check if it's a legacy direct management
    const contingent = await prisma.contingent.findUnique({
      where: { id: contingentId }
    });

    if (!contingent) {
      return NextResponse.json(
        { error: "Contingent not found" },
        { status: 404 }
      );
    }

    const isLegacyManager = contingent.managedByParticipant && contingent.participantId === participantId;

    if (!isManager && !isLegacyManager) {
      return NextResponse.json(
        { error: "You don't have permission to update this contingent" },
        { status: 403 }
      );
    }

    // Update the contingent
    const updatedContingent = await prisma.contingent.update({
      where: { id: contingentId },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        short_name: short_name !== undefined ? short_name : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      contingent: updatedContingent
    });
  } catch (error) {
    console.error("Error updating contingent:", error);
    return NextResponse.json(
      { error: "Failed to update contingent" },
      { status: 500 }
    );
  }
}

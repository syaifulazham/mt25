import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { prismaExecute } from "@/lib/prisma";

// GET handler - Get contestants for a contingent
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get contingent ID from query params
    const searchParams = request.nextUrl.searchParams;
    const contingentId = searchParams.get("contingentId");
    const contestantId = searchParams.get("id");
    
    // If contestant ID is provided, we're looking for a specific contestant
    if (contestantId) {
      const contestant = await prismaExecute(prisma => prisma.contestant.findUnique({
        where: { id: parseInt(contestantId) },
        include: {
          contingent: {
            select: {
              id: true,
              name: true,
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
        }
      }));
      
      if (!contestant) {
        return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
      }
      
      return NextResponse.json(contestant);
    }
    
    // Find the participant by email
    const participant = await prismaExecute(prisma => prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    }));
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // If no contingentId is provided, fetch all contingents managed by the participant
    if (!contingentId) {
      // Get all contingents managed by this participant
      const managedContingents = await prismaExecute(prisma => prisma.contingentManager.findMany({
        where: {
          participantId: participant.id
        },
        select: {
          contingentId: true
        }
      }));
      
      // Also check legacy relationship
      const legacyContingents = await prismaExecute(prisma => prisma.contingent.findMany({
        where: {
          managedByParticipant: true,
          participantId: participant.id
        },
        select: {
          id: true
        }
      }));
      
      // Combine both types of managed contingents
      const contingentIds = [
        ...managedContingents.map(c => c.contingentId),
        ...legacyContingents.map(c => c.id)
      ];
      
      if (contingentIds.length === 0) {
        return NextResponse.json([]);
      }
      
      // Get query parameters for filtering
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const class_grade = searchParams.get("class_grade");
      const class_name = searchParams.get("class_name");
      const age = searchParams.get("age") ? parseInt(searchParams.get("age")!) : undefined;
      const searchQuery = searchParams.get("search");
      const eduLevelFilter = searchParams.get("edu_level");
      
      // Calculate pagination values
      const skip = (page - 1) * limit;
      
      // Build the where clause
      const where: any = {
        contingentId: {
          in: contingentIds
        }
      };
      
      // Add filters if provided
      if (class_grade) {
        where.class_grade = class_grade;
      }
      
      if (class_name) {
        where.class_name = {
          contains: class_name
        };
      }
      
      if (age) {
        where.age = age;
      }
      
      // Add search query filter if provided
      if (searchQuery) {
        // Use a simpler approach with lowercase for case-insensitive search
        const lowerQuery = searchQuery.toLowerCase();
        where.OR = [
          {
            name: {
              contains: searchQuery
              // Removed 'mode: insensitive' as it might not be supported by some DB configs
            }
          },
          {
            ic: {
              contains: searchQuery
            }
          }
        ];
      }
      
      // Add education level filter if provided
      if (eduLevelFilter && eduLevelFilter !== "all") {
        where.edu_level = eduLevelFilter;
      }
      
      // Get total count for pagination
      const totalCount = await prismaExecute(prisma => prisma.contestant.count({
        where
      }));
      
      // Get contestants for all managed contingents with filters and pagination
      const contestants = await prismaExecute(prisma => prisma.contestant.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc'
        },
        include: {
          contingent: {
            select: {
              id: true,
              name: true,
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
        }
      }));
      
      // Return contestants with pagination metadata
      return NextResponse.json({
        data: contestants,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        }
      });
    }
    
    // If contingentId is provided, check if participant is a manager of this contingent
    const isManager = await prismaExecute(prisma => prisma.contingentManager.findFirst({
      where: {
        participantId: participant.id,
        contingentId: parseInt(contingentId)
      }
    }));
    
    // Also check legacy relationship
    const contingent = await prismaExecute(prisma => prisma.contingent.findUnique({
      where: { id: parseInt(contingentId) }
    }));
    
    const hasAccess = isManager !== null || 
      (contingent?.managedByParticipant && contingent?.participantId === participant.id);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You do not have permission to view contestants for this contingent" },
        { status: 403 }
      );
    }
    
    // Get contestants for this specific contingent with updated fields
    const contestants = await prismaExecute(prisma => prisma.contestant.findMany({
      where: {
        contingentId: parseInt(contingentId)
      },
      include: {
        contingent: {
          select: {
            id: true,
            name: true,
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
        name: 'asc'
      }
    }));
    
    return NextResponse.json(contestants);
  } catch (error) {
    console.error("Error fetching contestants:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Failed to fetch contestants" },
      { status: 500 }
    );
  }
}

// POST handler - Create a new contestant
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'ic', 'gender', 'age', 'edu_level', 'contingentId'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }
    
    // Find the participant by email
    const participant = await prismaExecute(prisma => prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    }));
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
    // Verify that the contingent exists
    const contingentId = parseInt(body.contingentId);
    
    const contingent = await prismaExecute(prisma => prisma.contingent.findUnique({
      where: { id: contingentId }
    }));
    
    if (!contingent) {
      return NextResponse.json(
        { error: "Contingent not found" },
        { status: 404 }
      );
    }
    
    // Check if participant is a manager of this contingent
    const isManager = await prismaExecute(prisma => prisma.contingentManager.findFirst({
      where: {
        participantId: participant.id,
        contingentId: contingentId
      }
    }));
    
    // Also check legacy relationship
    const hasAccess = isManager !== null || 
      (contingent.managedByParticipant && contingent.participantId === participant.id);
    
    if (!hasAccess) {
      return NextResponse.json(
        { error: "You can only add contestants to contingents you manage" },
        { status: 403 }
      );
    }
    
    // Validate education level
    const validEduLevels = ['sekolah rendah', 'sekolah menengah', 'belia'];
    if (!validEduLevels.includes(body.edu_level)) {
      return NextResponse.json(
        { error: "Invalid education level. Must be one of: sekolah rendah, sekolah menengah, belia" },
        { status: 400 }
      );
    }
    
    // Check if IC number is already registered
    const existingContestant = await prismaExecute(prisma => prisma.contestant.findFirst({
      where: { ic: body.ic }
    }));
    
    if (existingContestant) {
      return NextResponse.json(
        { error: "A contestant with this IC number already exists" },
        { status: 400 }
      );
    }
    
    // Generate a unique hashcode
    const hashcode = `TC25-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Optional fields
    const classGrade = body.class_grade || null;
    const className = body.class_name || null;
    
    // Format class name if both class_grade and class_name are provided
    let formattedClassName = null;
    if (classGrade && className) {
      formattedClassName = `${classGrade} - ${className}`;
    } else if (className) {
      formattedClassName = className;
    }
    
    // Create the contestant with only contingent association
    const createData: any = {
      name: body.name,
      ic: body.ic,
      gender: body.gender,
      age: parseInt(body.age),
      edu_level: body.edu_level,
      class_name: formattedClassName,
      class_grade: classGrade, // Keep as string to match schema
      hashcode,
      contingentId: contingentId,
      updatedById: participant.id, // Use participant ID as the updater ID
      createdById: participant.id, // Also set creator ID
      status: "ACTIVE",
      is_ppki: body.is_ppki === true ? true : false // Set PPKI status, default to false if not provided
    };
    
    // Only add email and phoneNumber if they're provided
    if (body.email) createData.email = body.email;
    if (body.phoneNumber) createData.phoneNumber = body.phoneNumber;
    
    // Try a simplified approach by explicitly setting all fields without any relations
    try {
      // First, try to create with the standard approach
      const contestant = await prismaExecute(prisma => prisma.contestant.create({
        data: {
          ...createData,
          // Explicitly set createdAt and updatedAt to avoid issues
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }));
      
      return NextResponse.json(contestant, { status: 201 });
    } catch (error) {
      console.error("Error creating contestant:", error);
      
      // If the standard approach fails, try a direct database query
      if (error instanceof Error && error.message.includes('user')) {
        console.log("Attempting to create contestant with direct database query");
        
        try {
          // Use Prisma's queryRaw to execute a direct SQL query via prismaExecute
          // Use participant ID for updatedById and createdById
          await prismaExecute(prisma => prisma.$queryRaw`
            INSERT INTO contestant 
            (name, ic, gender, age, edu_level, class_name, class_grade, hashcode, contingentId, updatedById, createdById, createdAt, updatedAt, is_ppki) 
            VALUES 
            (${body.name}, ${body.ic}, ${body.gender}, ${parseInt(body.age)}, 
             ${body.edu_level}, ${formattedClassName}, ${classGrade}, 
             ${hashcode}, ${contingentId}, ${participant.id}, ${participant.id}, NOW(), NOW(), ${body.is_ppki === true ? 1 : 0})
          `);
          
          // Fetch the created contestant
          const createdContestant = await prismaExecute(prisma => prisma.contestant.findFirst({
            where: { ic: body.ic }
          }));
          
          if (!createdContestant) {
            throw new Error("Contestant was created but could not be retrieved");
          }
          
          return NextResponse.json(createdContestant, { status: 201 });
        } catch (sqlError) {
          console.error("SQL approach also failed:", sqlError);
          throw sqlError;
        }
      }
      
      // If it's not a user relation issue or the SQL approach also failed
      throw error;
    }
    
  } catch (error) {
    console.error("Error creating contestant:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    // Log the error details in a structured way
    try {
      console.error("Error details:", JSON.stringify(error, null, 2));
    } catch (jsonError) {
      console.error("Error could not be stringified:", error);
    }
    
    // Return a more specific error message if possible
    const errorMessage = error instanceof Error ? error.message : "Failed to create contestant";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

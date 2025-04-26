import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Schema for creating a new contingent
const createContingentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  participantId: z.number(),
  institutionType: z.enum(["SCHOOL", "HIGHER_INSTITUTION"]),
  institutionId: z.number(),
  managedByParticipant: z.boolean().default(true),
  managerIds: z.array(z.number()).optional() // Field for multiple managers
});

// GET handler - Get participant's contingents
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
    
    let participantId: number;
    
    if (participantIdParam) {
      // If participantId is provided directly, use it
      participantId = parseInt(participantIdParam);
      console.log(`Using provided participant ID: ${participantId}`);
    } else if (userIdParam) {
      // For backward compatibility: if only userId is provided, find the corresponding participant
      const userId = parseInt(userIdParam);
      console.log(`Looking up participant ID for user ID: ${userId}`);
      
      // Get the user details to find their email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });
      
      if (!user) {
        console.log(`User ${userId} not found`);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      
      // Find the participant with the same email
      const participant = await prisma.user_participant.findUnique({
        where: { email: user.email },
        select: { id: true }
      });
      
      if (!participant) {
        console.log(`No participant found with email ${user.email}`);
        return NextResponse.json({ error: "Participant record not found" }, { status: 404 });
      }
      
      participantId = participant.id;
      console.log(`Found participant ID ${participantId} for user ${userId}`);
    } else {
      return NextResponse.json({ error: "Participant ID is required" }, { status: 400 });
    }
    
    // Get contingents where the participant is a manager
    const contingentsAsManager = await prisma.contingent.findMany({
      where: {
        OR: [
          // Contingents where the participant is a manager via contingentManager
          {
            managers: {
              some: {
                participantId: participantId
              }
            }
          },
          // Legacy contingents directly managed by the participant
          {
            managedByParticipant: true,
            participantId: participantId
          }
        ]
      },
      include: {
        school: {
          include: {
            state: true
          }
        },
        higherInstitution: {
          include: {
            state: true
          }
        },
        managers: {
          where: {
            participantId: participantId
          },
          select: {
            isOwner: true
          }
        },
        _count: {
          select: {
            contestants: true,
            managers: true
          }
        }
      }
    });
    
    console.log(`Found ${contingentsAsManager.length} contingents where participant ${participantId} is a manager`);
    
    const contingentsAsMember = await prisma.contingent.findMany({
      where: {
        participantId: participantId
      },
      include: {
        school: {
          include: {
            state: true
          }
        },
        higherInstitution: {
          include: {
            state: true
          }
        },
        _count: {
          select: {
            contestants: true
          }
        }
      }
    });
    
    // Check if there are any pending requests
    const pendingRequests = await prisma.contingentRequest.findMany({
      where: {
        participantId: participantId,
        status: "PENDING"
      },
      include: {
        contingent: {
          include: {
            school: {
              include: {
                state: true
              }
            },
            higherInstitution: {
              include: {
                state: true
              }
            }
          }
        }
      }
    });
    
    // Format the response
    const formattedContingents = [
      ...contingentsAsManager.map(contingent => ({
        id: contingent.id,
        name: contingent.name,
        description: contingent.description || "",
        school: contingent.school,
        higherInstitution: contingent.higherInstitution,
        isManager: true, // These are all contingents the participant manages
        isOwner: contingent.managers.length > 0 ? contingent.managers[0].isOwner : false,
        managedByParticipant: contingent.managedByParticipant,
        status: "ACTIVE",
        memberCount: contingent._count.contestants,
        managerCount: contingent._count.managers
      })),
      ...contingentsAsMember.map(contingent => ({
        id: contingent.id,
        name: contingent.name,
        description: contingent.description || "",
        school: contingent.school,
        higherInstitution: contingent.higherInstitution,
        isManager: false,
        status: "ACTIVE",
        memberCount: contingent._count.contestants
      })),
      ...pendingRequests.map(request => ({
        id: request.contingent.id,
        name: request.contingent.name,
        description: request.contingent.description || "",
        school: request.contingent.school,
        higherInstitution: request.contingent.higherInstitution,
        isManager: false,
        status: "PENDING",
        memberCount: 0 // We don't have this information for pending requests
      }))
    ];
    
    return NextResponse.json(formattedContingents);
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
    
    const body = await request.json();
    
    // Validate request body
    const validationResult = createContingentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid contingent data", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const { name, description, institutionType, institutionId } = validationResult.data;
    
    // Check if institution already has a contingent
    let existingInstitutionContingent;
    
    if (institutionType === "SCHOOL") {
      existingInstitutionContingent = await prisma.contingent.findFirst({
        where: {
          schoolId: institutionId
        }
      });
    } else {
      existingInstitutionContingent = await prisma.contingent.findFirst({
        where: {
          higherInstId: institutionId
        }
      });
    }
    
    if (existingInstitutionContingent) {
      return NextResponse.json(
        { 
          error: "A contingent already exists for this institution. Please request to join instead of creating a new one." 
        }, 
        { status: 400 }
      );
    }
    
    // First, check if we have any contests in the database
    const contests = await prisma.contest.findMany({
      take: 1,
      orderBy: {
        id: 'asc'
      }
    });
    
    // If no contests exist, we need to create one
    let contestId: number;
    
    if (contests.length === 0) {
      // First, check if we have any events
      const events = await prisma.event.findMany({
        take: 1,
        orderBy: {
          id: 'asc'
        }
      });
      
      // Create a default event if none exists
      let eventId: number;
      if (events.length === 0) {
        // Check if we have any zones
        const zones = await prisma.zone.findMany({
          take: 1,
          orderBy: {
            id: 'asc'
          }
        });
        
        // Create a default zone if none exists
        let zoneId: number;
        if (zones.length === 0) {
          const defaultZone = await prisma.zone.create({
            data: {
              name: 'National'
            }
          });
          zoneId = defaultZone.id;
        } else {
          zoneId = zones[0].id;
        }
        
        // Create a default event
        const defaultEvent = await prisma.event.create({
          data: {
            name: 'Techlympics 2025',
            code: 'TC25-EVENT-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
            description: 'Default event for Techlympics 2025',
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year from now
            zoneId,
            scopeArea: 'OPEN',
            updatedAt: new Date()
          }
        });
        eventId = defaultEvent.id;
      } else {
        eventId = events[0].id;
      }
      
      // Create a default contest
      const defaultContest = await prisma.contest.create({
        data: {
          name: 'Techlympics 2025',
          code: 'TC25-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
          contestType: 'QUIZ',
          method: 'ONLINE',
          judgingMethod: 'POINT_SCORE',
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // 1 year from now
          accessibility: true,
          eventId
        }
      });
      contestId = defaultContest.id;
    } else {
      contestId = contests[0].id;
    }
    
    // Create a new contingent
    // Prepare data based on institution type
    const contingentData: any = {
      name,
      description,
      participantId: validationResult.data.participantId, // Set the participant as a member
      managedByParticipant: true, // Mark as managed by a participant user
      createdAt: new Date(),
      updatedAt: new Date(),
      contestId // Use the existing or newly created contest ID
    };
    
    // We no longer need to add userId to contingentData as it's now handled through contingentManager
    
    // Add the correct institution ID based on type
    if (institutionType === "SCHOOL") {
      contingentData.schoolId = institutionId;
    } else {
      contingentData.higherInstId = institutionId;
    }
    
    // Create the contingent first
    const newContingent = await prisma.contingent.create({
      data: contingentData
    });
    
    // Now create the contingent manager relationship using the validated data
    
    // If participant is managing, add them directly as a manager
    if (validationResult.data.managedByParticipant) {
      try {
        // Create the contingent manager relationship with the participant ID directly
        await prisma.contingentManager.create({
          data: {
            participantId: validationResult.data.participantId,
            contingentId: newContingent.id,
            isOwner: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log(`Added participant ${validationResult.data.participantId} as manager for contingent ${newContingent.id}`);
      } catch (error) {
        console.error('Error adding participant as manager:', error);
        // Continue without adding this manager - the contingent is still created
      }
    }
    
    // If additional managers were specified, add them too
    if (validationResult.data.managerIds && validationResult.data.managerIds.length > 0) {
      for (const managerId of validationResult.data.managerIds) {
        // Skip if it's the same as participantId to avoid duplicates
        if (validationResult.data.managedByParticipant && managerId === validationResult.data.participantId) {
          continue;
        }
        
        try {
          // For additional managers, we need to check if the ID is a participant ID
          const participant = await prisma.user_participant.findUnique({
            where: { id: managerId },
            select: { id: true }
          });
          
          if (participant) {
            // If it's a valid participant ID, add them directly
            await prisma.contingentManager.create({
              data: {
                participantId: managerId,
                contingentId: newContingent.id,
                isOwner: false,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            console.log(`Added additional participant manager ${managerId} for contingent ${newContingent.id}`);
          } else {
            // If not a participant ID, try to find a user with this ID and then their participant record
            const user = await prisma.user.findUnique({
              where: { id: managerId },
              select: { email: true }
            });
            
            if (user) {
              const participantFromUser = await prisma.user_participant.findUnique({
                where: { email: user.email },
                select: { id: true }
              });
              
              if (participantFromUser) {
                await prisma.contingentManager.create({
                  data: {
                    participantId: participantFromUser.id,
                    contingentId: newContingent.id,
                    isOwner: false,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }
                });
                console.log(`Added participant ${participantFromUser.id} (from user ${managerId}) as manager for contingent ${newContingent.id}`);
              } else {
                console.error(`No participant found with email ${user.email} for user ${managerId}`);
              }
            } else {
              console.error(`Invalid manager ID ${managerId} - not a participant or user ID`);
            }
          }
        } catch (error) {
          console.error(`Error adding additional manager ${managerId}:`, error);
          // Continue without adding this manager - the contingent is still created
        }
      }
    }
    
    return NextResponse.json(newContingent, { status: 201 });
  } catch (error) {
    // Log detailed error information
    console.error("Error creating contingent:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    
    // Return more detailed error message if available
    const errorMessage = error instanceof Error ? error.message : "Failed to create contingent";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

// Define interface for manager type
interface Manager {
  id: number;
  name: string;
  ic: string;
  email: string | null;
  phoneNumber: string | null;
  hashcode: string;
  teamId: number | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  team?: {
    id: number;
    name: string;
    hashcode: string;
  } | null;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
}

// Singleton pattern for Prisma instance to avoid multiple connections
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Input validation schema for creating/updating managers
const managerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ic: z.string()
    .min(12, "IC number must be 12 digits")
    .max(12, "IC number must be 12 digits")
    .regex(/^\d+$/, "IC number must contain only digits"),
  email: z.string().email("Invalid email format").optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  teamId: z.number().optional().nullable(), // For backwards compatibility
  teamIds: z.array(z.number()).optional().default([]),
  hashcode: z.string().optional(),
});

// GET /api/participants/managers
// Get all managers for the current participant
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Allow both participants and organizers with PARTICIPANTS_MANAGER or ADMIN role
    if (!('role' in user) || user.role === 'PARTICIPANTS_MANAGER' || user.role === 'ADMIN') {
      // First, find all contingents where current user is a manager (primary or co-manager)
      const userContingents = await prisma.contingentManager.findMany({
        where: {
          participantId: user.id,
        },
        select: {
          contingentId: true,
        },
      });
      
      const contingentIds = userContingents.map(c => c.contingentId);
      console.log('User contingent IDs:', contingentIds);
      
      // Find all user IDs who are managers in the same contingents as the current user
      let managers;
      
      if (contingentIds.length === 0) {
        // If user is not a manager of any contingent, only return their own managers
        managers = await (prisma as any).manager.findMany({
          where: {
            createdBy: user.id,
          },
          select: {
            id: true,
            name: true,
            ic: true,
            email: true,
            phoneNumber: true,
            hashcode: true,
            teamId: true,
            createdAt: true,
            createdBy: true,
            team: {
              select: {
                id: true,
                name: true,
                hashcode: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc',
          },
        }) as any[];
      } else {
        // User is a manager of at least one contingent
        // Find all users who are managers of the same contingents
        const contingentManagers = await prisma.contingentManager.findMany({
          where: {
            contingentId: { in: contingentIds }
          },
          select: {
            participantId: true
          }
        });
        
        const managerUserIds = contingentManagers.map(cm => cm.participantId);
        console.log('Manager participant IDs in same contingents:', managerUserIds);
        
        // Get all managers created by any of these users
        managers = await (prisma as any).manager.findMany({
          where: {
            createdBy: { in: managerUserIds }
          },
          select: {
            id: true,
            name: true,
            ic: true,
            email: true,
            phoneNumber: true,
            hashcode: true,
            teamId: true,
            createdAt: true,
            createdBy: true,
            team: {
              select: {
                id: true,
                name: true,
                hashcode: true,
              },
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc',
          },
        }) as any[];
      }
      
      console.log('Prisma query results:', JSON.stringify(managers));
      
      // Format managers to ensure email and phoneNumber are always defined
      const formattedManagers = managers.map(manager => ({
        id: manager.id,
        name: manager.name,
        ic: manager.ic,
        email: manager.email || '', // Explicitly ensure email is included
        phoneNumber: manager.phoneNumber || '', // Explicitly ensure phoneNumber is included
        hashcode: manager.hashcode,
        teamId: manager.teamId || null,
        teamName: manager.team?.name || null,
        createdAt: manager.createdAt.toISOString(),
        createdBy: manager.creator ? {
          id: manager.creator.id,
          name: manager.creator.name,
          email: manager.creator.email,
        } : undefined
      }));
      
      return NextResponse.json(formattedManagers);
    } else {
      // For admin users, use standard Prisma query with explicit select
      const managers = await (prisma as any).manager.findMany({
        select: {
          id: true,
          name: true,
          ic: true,
          email: true,
          phoneNumber: true,
          hashcode: true,
          teamId: true,
          createdAt: true,
          createdBy: true,
          team: {
            select: {
              id: true,
              name: true,
              hashcode: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
      }) as any[];
      
      console.log('Admin query results:', JSON.stringify(managers.slice(0, 1)));
      
      // Format managers to ensure email and phoneNumber are always defined
      const formattedManagers = managers.map(manager => ({
        id: manager.id,
        name: manager.name,
        ic: manager.ic,
        email: manager.email || '',
        phoneNumber: manager.phoneNumber || '',
        hashcode: manager.hashcode,
        teamId: manager.teamId || null,
        teamName: manager.team?.name || null,
        createdAt: manager.createdAt.toISOString(),
        createdBy: manager.creator ? {
          id: manager.creator.id,
          name: manager.creator.name,
          email: manager.creator.email,
        } : undefined
      }));
      
      console.log('Final response:', JSON.stringify(formattedManagers));
      return NextResponse.json(formattedManagers);
    }
  } catch (error) {
    console.error("Error fetching managers:", error);
    return NextResponse.json(
      { error: "Failed to fetch managers" },
      { status: 500 }
    );
  }
}

// POST /api/participants/managers
// Create a new manager
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Allow both participants and organizers with PARTICIPANTS_MANAGER or ADMIN role
    if (!('role' in user) || user.role === 'PARTICIPANTS_MANAGER' || user.role === 'ADMIN') {
      // Parse and validate the request body
      const body = await request.json();
      
      try {
        // Validate input with Zod
        const validatedData = managerSchema.parse(body);
        
        // Check if IC is already in use
        const existingIC = await (prisma as any).manager.findFirst({
          where: {
            ic: validatedData.ic,
            createdBy: user.id,
          },
        });
        
        if (existingIC) {
          return NextResponse.json(
            { error: "A manager with this IC already exists" },
            { status: 400 }
          );
        }
        
        // Generate hashcode if not provided
        const hashcode = validatedData.hashcode || 
          `MGR-${validatedData.name.substring(0, 3).toLowerCase()}-${Date.now().toString(36)}`;
        
        // Explicitly log the data we're trying to insert
        console.log("Attempting to create manager with data:", {
          name: validatedData.name,
          ic: validatedData.ic,
          hashcode,
          teamId: validatedData.teamId || null,
          createdBy: user.id,
          userId: typeof user.id
        });
        
        // Try a direct database approach instead of using the Prisma model
        try {
          console.log("Creating manager with user ID:", user.id, "type:", typeof user.id);
          
          // First try using raw SQL with placeholders which proved to work in our diagnostic test
          try {
            // Generate current timestamp for createdAt and updatedAt
            const now = new Date();
            
            // Use queryRawUnsafe with placeholders for safer SQL execution
            const query = `
              INSERT INTO manager (name, ic, email, phoneNumber, hashcode, teamId, createdBy, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            // Convert user ID to integer safely
            const userId = parseInt(user.id.toString());
            const teamId = validatedData.teamId || null;
            
            // Execute the insert query for the manager (without teamId)
            await prisma.$executeRawUnsafe(
              query, 
              validatedData.name, 
              validatedData.ic, 
              validatedData.email || null, 
              validatedData.phoneNumber || null,
              hashcode, 
              null, // Set teamId to null since we'll use manager_team table
              userId, 
              now,
              now
            );
            
            // Retrieve the newly created manager
            const selectQuery = `SELECT * FROM manager WHERE hashcode = ?`;
            const createdManagers = await prisma.$queryRawUnsafe(selectQuery, hashcode);
            
            // Use the first result if it's an array
            const manager = Array.isArray(createdManagers) ? createdManagers[0] : createdManagers;
            
            // Handle teamIds assignment - prefer the teamIds array if available, fall back to single teamId
            const teamsToAssign = validatedData.teamIds && validatedData.teamIds.length > 0 
              ? validatedData.teamIds 
              : (validatedData.teamId ? [validatedData.teamId] : []);
              
            console.log("Teams to assign:", teamsToAssign);
            
            // Create manager-team relationships for each team
            if (teamsToAssign.length > 0) {
              // Create a manager_team table if it doesn't exist
              await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS manager_team (
                  id INT AUTO_INCREMENT PRIMARY KEY,
                  managerId INT NOT NULL,
                  teamId INT NOT NULL,
                  createdAt DATETIME NOT NULL,
                  updatedAt DATETIME NOT NULL,
                  UNIQUE KEY manager_team_unique (managerId, teamId),
                  FOREIGN KEY (managerId) REFERENCES manager(id) ON DELETE CASCADE,
                  FOREIGN KEY (teamId) REFERENCES team(id) ON DELETE CASCADE
                )
              `);
              
              // Insert relationships for each team
              for (const teamId of teamsToAssign) {
                try {
                  await prisma.$executeRawUnsafe(`
                    INSERT INTO manager_team (managerId, teamId, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?)
                  `, manager.id, teamId, now, now);
                  console.log(`Added manager ${manager.id} to team ${teamId}`);
                } catch (teamAssignError) {
                  console.error(`Error assigning manager to team ${teamId}:`, teamAssignError);
                }
              }
            }
            
            console.log("Manager created successfully with SQL:", manager);
            
            return NextResponse.json({
              id: manager.id,
              name: manager.name,
              ic: manager.ic,
              hashcode: manager.hashcode,
              teams: teamsToAssign,
              createdAt: now.toISOString(),
              message: "Manager created successfully"
            });
          } catch (sqlError) {
            // If the raw SQL method fails too, log detailed error and throw
            console.error("SQL error creating manager:", sqlError);
            throw sqlError;
          }
        } catch (sqlError) {
          console.error("SQL error creating manager:", sqlError);
          return NextResponse.json(
            { 
              error: "Database error creating manager", 
              details: sqlError instanceof Error ? sqlError.message : String(sqlError),
              stack: sqlError instanceof Error ? sqlError.stack : undefined
            },
            { status: 500 }
          );
        }
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return NextResponse.json(
            { error: "Validation error", details: validationError.errors },
            { status: 400 }
          );
        }
        throw validationError;
      }
    } else {
      return NextResponse.json(
        { error: "You don't have permission to manage independent managers" },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error("Error creating manager:", error);
    return NextResponse.json(
      { error: "Failed to create manager", message: (error as Error).message },
      { status: 500 }
    );
  }
}

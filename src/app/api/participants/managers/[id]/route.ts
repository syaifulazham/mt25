import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

// Define interface for manager type
interface Manager {
  id: number;
  name: string;
  ic: string;
  email?: string | null;
  phoneNumber?: string | null;
  hashcode: string;
  teamId: number | null;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  team?: {
    id: number;
    name: string;
    hashcode: string;
    contestId?: number;
    contest?: {
      id: number;
      name: string;
    }
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

// Input validation schema for updating managers
const managerUpdateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  ic: z.string()
    .min(12, "IC number must be 12 digits")
    .max(12, "IC number must be 12 digits")
    .regex(/^\d+$/, "IC number must contain only digits"),
  email: z.string().email("Invalid email format").optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  teamId: z.number().optional().nullable(), // For backward compatibility
  teamIds: z.array(z.number()).optional().default([]),
});

// GET /api/participants/managers/[id]
// Get a specific manager by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const managerId = parseInt(params.id);
    
    if (isNaN(managerId)) {
      return NextResponse.json(
        { error: "Invalid manager ID" },
        { status: 400 }
      );
    }
    
    // Get manager by ID with explicit select to ensure all fields are included
    const manager = await (prisma as any).manager.findUnique({
      where: {
        id: managerId,
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
        updatedAt: true,
        team: {
          select: {
            id: true,
            name: true,
            hashcode: true,
            contestId: true,
            contest: {
              select: {
                id: true,
                name: true,
              },
            },
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
    }) as Manager | null;
    
    if (!manager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }
    
    // For participants, check if they created this manager
    if (!('role' in user) && manager.createdBy !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to view this manager" },
        { status: 403 }
      );
    }
    
    // Format response with null checks for possibly undefined properties
    const formattedManager = {
      id: manager.id,
      name: manager.name,
      ic: manager.ic,
      email: manager.email || null,
      phoneNumber: manager.phoneNumber || null,
      hashcode: manager.hashcode,
      teamId: manager.teamId || null,
      team: manager.team ? {
        id: manager.team.id,
        name: manager.team.name,
        hashcode: manager.team.hashcode,
        contestId: manager.team.contestId,
        contestName: manager.team.contest?.name || null,
      } : null,
      createdAt: manager.createdAt.toISOString(),
      updatedAt: manager.updatedAt.toISOString(),
      createdBy: manager.creator ? {
        id: manager.creator.id,
        name: manager.creator.name,
        email: manager.creator.email,
      } : null
    };
    
    return NextResponse.json(formattedManager);
  } catch (error) {
    console.error("Error fetching manager:", error);
    return NextResponse.json(
      { error: "Failed to fetch manager" },
      { status: 500 }
    );
  }
}

// PATCH /api/participants/managers/[id]
// Update a specific manager
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const managerId = parseInt(params.id);
    
    if (isNaN(managerId)) {
      return NextResponse.json(
        { error: "Invalid manager ID" },
        { status: 400 }
      );
    }
    
    // Get the manager to check permissions
    const manager = await (prisma as any).manager.findUnique({
      where: {
        id: managerId,
      },
    }) as Manager | null;
    
    if (!manager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }
    
    // For participants, check if they created this manager
    if (!('role' in user) && manager.createdBy !== user.id) {
      return NextResponse.json(
        { error: "You don't have permission to update this manager" },
        { status: 403 }
      );
    }
    
    try {
      // Parse and validate input
      const body = await request.json();
      const validatedData = managerUpdateSchema.parse(body);
      
      // Check if IC is already in use by another manager
      if (validatedData.ic !== manager.ic) {
        const existingIC = await (prisma as any).manager.findFirst({
          where: {
            ic: validatedData.ic,
            createdBy: ('role' in user) ? undefined : user.id,
            id: {
              not: managerId,
            },
          },
        });
        
        if (existingIC) {
          return NextResponse.json(
            { error: "A manager with this IC already exists" },
            { status: 400 }
          );
        }
      }
      
      // Update the manager's basic info first
      const updatedManager = await (prisma as any).manager.update({
        where: {
          id: managerId,
        },
        data: {
          name: validatedData.name,
          ic: validatedData.ic,
          email: validatedData.email,
          phoneNumber: validatedData.phoneNumber,
          // Set teamId to null if we're using the new team assignments approach
          teamId: validatedData.teamIds && validatedData.teamIds.length > 0 ? null : validatedData.teamId,
          updatedAt: new Date(), // Ensure update timestamp is refreshed
        },
      }) as Manager;
      
      // Handle team assignments if teamIds is provided
      if (validatedData.teamIds && validatedData.teamIds.length > 0) {
        try {
          const now = new Date();
          
          // Create the manager_team table if it doesn't exist
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
          
          // Remove existing team assignments
          await prisma.$executeRawUnsafe(`
            DELETE FROM manager_team
            WHERE managerId = ?
          `, managerId);
          
          // Add new team assignments
          for (const teamId of validatedData.teamIds) {
            try {
              await prisma.$executeRawUnsafe(`
                INSERT INTO manager_team (managerId, teamId, createdAt, updatedAt)
                VALUES (?, ?, ?, ?)
              `, managerId, teamId, now, now);
              console.log(`Updated manager ${managerId} assignment to team ${teamId}`);
            } catch (teamAssignError) {
              console.error(`Error assigning manager to team ${teamId}:`, teamAssignError);
            }
          }
        } catch (error) {
          console.error("Error updating manager team assignments:", error);
          // Continue with the response even if team assignments failed
        }
      }
      
      // Fetch the updated teams to include in the response
      let teams: any[] = [];
      try {
        // Check if the manager_team table exists
        const tableExists = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() 
          AND table_name = 'manager_team'
        `;
        
        if (Array.isArray(tableExists) && tableExists[0].count > 0) {
          teams = await prisma.$queryRaw`
            SELECT t.id, t.name, t.hashcode 
            FROM team t
            JOIN manager_team mt ON t.id = mt.teamId
            WHERE mt.managerId = ${managerId}
          `;
        } else if (updatedManager.teamId) {
          // If using legacy teamId
          const team = await prisma.team.findUnique({
            where: {
              id: updatedManager.teamId,
            },
            select: {
              id: true,
              name: true,
              hashcode: true,
            },
          });
          
          if (team) {
            teams = [team];
          }
        }
      } catch (error) {
        console.error("Error fetching manager teams for response:", error);
      }
      
      // Return a consistent format with explicit handling for email and phoneNumber
      return NextResponse.json({
        id: updatedManager.id,
        name: updatedManager.name,
        ic: updatedManager.ic,
        email: updatedManager.email || '',
        phoneNumber: updatedManager.phoneNumber || '',
        hashcode: updatedManager.hashcode,
        teamId: updatedManager.teamId || null,
        teams: teams,
        updatedAt: updatedManager.updatedAt.toISOString(),
        message: "Manager updated successfully"
      });
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
    
    // The return statement is now in the try block
  } catch (error) {
    console.error("Error updating manager:", error);
    return NextResponse.json(
      { error: "Failed to update manager" },
      { status: 500 }
    );
  }
}

// DELETE /api/participants/managers/[id]
// Delete a specific manager
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const managerId = parseInt(params.id);
    
    if (isNaN(managerId)) {
      return NextResponse.json(
        { error: "Invalid manager ID" },
        { status: 400 }
      );
    }
    
    try {
      // Get the manager to check permissions
      const manager = await (prisma as any).manager.findUnique({
        where: {
          id: managerId,
        },
      }) as Manager | null;
      
      if (!manager) {
        return NextResponse.json(
          { error: "Manager not found" },
          { status: 404 }
        );
      }
      
      // Dual user model check - different permissions for participants vs organizers
      // Participants can only delete managers they created, while admin users can delete any
      if (!('role' in user) && manager.createdBy !== user.id) {
        return NextResponse.json(
          { error: "You don't have permission to delete this manager" },
          { status: 403 }
        );
      }
      
      // First check if manager is currently assigned to a team
      if (manager.teamId) {
        // For safety, you might want to prevent deletion of managers assigned to teams
        // Uncomment this block if needed based on business rules
        /* 
        return NextResponse.json(
          { 
            error: "Cannot delete manager currently assigned to a team", 
            teamId: manager.teamId,
            message: "Please reassign or remove the manager from the team first" 
          },
          { status: 400 }
        );
        */
      }
      
      // Delete the manager
      await (prisma as any).manager.delete({
        where: {
          id: managerId,
        },
      });
      
      return NextResponse.json({ 
        message: "Manager deleted successfully",
        id: managerId,
        deletedAt: new Date().toISOString()
      });
    } catch (deleteError) {
      // More specific error handling
      if (deleteError instanceof Error) {
        // Check for foreign key constraint violations
        if (deleteError.message.includes('Foreign key constraint')) {
          return NextResponse.json(
            { 
              error: "Cannot delete this manager because it's referenced by other records", 
              details: deleteError.message
            },
            { status: 400 }
          );
        }
      }
      throw deleteError;
    }
  } catch (error) {
    console.error("Error deleting manager:", error);
    return NextResponse.json(
      { error: "Failed to delete manager" },
      { status: 500 }
    );
  }
}

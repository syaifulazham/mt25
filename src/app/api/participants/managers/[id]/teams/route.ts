import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { PrismaClient } from "@prisma/client";

// Singleton pattern for Prisma instance to avoid multiple connections
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// GET /api/participants/managers/[id]/teams
// Get all teams associated with a manager
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
    
    // First, check if the manager exists and belongs to the user
    const manager = await prisma.manager.findUnique({
      where: {
        id: managerId,
      },
    });
    
    if (!manager) {
      return NextResponse.json(
        { error: "Manager not found" },
        { status: 404 }
      );
    }
    
    // Check if the user is authorized to access this manager
    // Only the creator or an admin can access the manager
    if ('role' in user) {
      if (user.role !== 'PARTICIPANTS_MANAGER' && user.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (manager.createdBy !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get all teams associated with the manager via the manager_team junction table
    try {
      // First check if the manager_team table exists
      const tableExists = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = 'manager_team'
      `;
      
      // If the manager_team table exists, get teams from there
      if (Array.isArray(tableExists) && tableExists[0].count > 0) {
        const teams = await prisma.$queryRaw`
          SELECT t.id, t.name, t.hashcode 
          FROM team t
          JOIN manager_team mt ON t.id = mt.teamId
          WHERE mt.managerId = ${managerId}
        `;
        
        return NextResponse.json(teams);
      } else {
        // If the table doesn't exist yet, check if there's a legacy teamId
        if (manager.teamId) {
          const team = await prisma.team.findUnique({
            where: {
              id: manager.teamId,
            },
            select: {
              id: true,
              name: true,
              hashcode: true,
            },
          });
          
          if (team) {
            return NextResponse.json([team]);
          }
        }
        
        // If no teams found, return empty array
        return NextResponse.json([]);
      }
    } catch (error) {
      console.error("Error fetching manager teams:", error);
      return NextResponse.json(
        { error: "Error fetching manager teams" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

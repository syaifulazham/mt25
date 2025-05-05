import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import prisma from "@/lib/prisma";

// Handle emergency manager creation via direct SQL
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await request.json();
    const { name, ic, hashcode } = body;
    
    // Log the data we're trying to insert
    console.log("Emergency manager creation with:", {
      name,
      ic,
      hashcode,
      userId: user.id,
      userIdType: typeof user.id
    });
    
    // Try four different approaches to diagnose/fix the issue
    const results: Record<string, any> = {};
    let success = false;
    
    // Method 1: Try standard Prisma API
    try {
      const createResult = await (prisma as any).manager.create({
        data: {
          name,
          ic,
          hashcode,
          teamId: null,
          createdBy: parseInt(user.id.toString()),
        },
      });
      results.prismaApi = { success: true, data: createResult };
      success = true;
    } catch (err) {
      results.prismaApi = { success: false, error: err instanceof Error ? err.message : String(err) };
    }
    
    if (!success) {
      // Method 2: Try raw SQL executeRaw
      try {
        await prisma.$executeRaw`
          INSERT INTO manager (name, ic, hashcode, teamId, createdBy, createdAt, updatedAt)
          VALUES (${name}, ${ic}, ${hashcode}, NULL, ${parseInt(user.id.toString())}, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
        `;
        
        const createdRecord = await prisma.$queryRaw`SELECT * FROM manager WHERE hashcode = ${hashcode}`;
        results.executeRaw = { success: true, data: createdRecord };
        success = true;
      } catch (err) {
        results.executeRaw = { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    
    if (!success) {
      // Method 3: Try plain SQL with placeholders
      try {
        const query = `
          INSERT INTO manager (name, ic, hashcode, teamId, createdBy, createdAt, updatedAt)
          VALUES (?, ?, ?, NULL, ?, NOW(), NOW())
        `;
        
        await prisma.$queryRawUnsafe(query, name, ic, hashcode, parseInt(user.id.toString()));
        
        const checkQuery = `SELECT * FROM manager WHERE hashcode = ?`;
        const createdRecord = await prisma.$queryRawUnsafe(checkQuery, hashcode);
        
        results.queryRawUnsafe = { success: true, data: createdRecord };
        success = true;
      } catch (err) {
        results.queryRawUnsafe = { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    }
    
    return NextResponse.json({
      action: "emergency_manager_creation",
      results,
      success,
      user: {
        id: user.id,
        idType: typeof user.id,
        role: 'role' in user ? user.role : 'participant'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Emergency manager creation error:", error);
    return NextResponse.json(
      { 
        error: "Failed emergency manager creation", 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the user information
    const user = await getCurrentUser();
    
    // Check database connection by fetching a simple count
    const userCount = await prisma.user.count();
    
    // Check if manager table exists and its structure
    let managerTableInfo;
    let error = null;
    
    try {
      // Try to get the database schema information
      const schemaInfo = await prisma.$queryRaw`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'manager'
      `;
      managerTableInfo = schemaInfo;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      managerTableInfo = "Failed to get table info";
    }
    
    // Return diagnostic information
    return NextResponse.json({
      userInfo: {
        id: user?.id,
        idType: typeof user?.id,
        isParticipant: !('role' in (user || {})),
        userType: 'role' in (user || {}) ? 'organizer' : 'participant',
        userObject: user,
      },
      databaseInfo: {
        userCount,
        managerTableInfo,
        error
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Diagnostic error:", error);
    return NextResponse.json(
      { error: "Diagnostic failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

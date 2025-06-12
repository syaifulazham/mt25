import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { prismaExecute } from "@/lib/prisma";

// GET handler - Get contestant statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Find the participant by email
    const participant = await prismaExecute(prisma => prisma.user_participant.findUnique({
      where: { email: session.user.email! }
    }));
    
    if (!participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }
    
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
      return NextResponse.json({
        total: 0,
        byEduLevel: {
          "sekolah rendah": 0,
          "sekolah menengah": 0,
          "belia": 0
        }
      });
    }
    
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const class_grade = searchParams.get("class_grade");
    const class_name = searchParams.get("class_name");
    const age = searchParams.get("age") ? parseInt(searchParams.get("age")!) : undefined;
    const searchQuery = searchParams.get("search");
    
    // Build the where clause
    const baseWhere: any = {
      contingentId: {
        in: contingentIds
      }
    };
    
    // Add filters if provided
    if (class_grade) {
      baseWhere.class_grade = class_grade;
    }
    
    if (class_name) {
      baseWhere.class_name = {
        contains: class_name
      };
    }
    
    if (age) {
      baseWhere.age = age;
    }
    
    // Add search query filter if provided
    if (searchQuery) {
      // Use a simpler approach with lowercase for case-insensitive search
      const lowerQuery = searchQuery.toLowerCase();
      baseWhere.OR = [
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
    
    // Get total count
    const totalCount = await prismaExecute(prisma => prisma.contestant.count({
      where: baseWhere
    }));
    
    // Get counts by education level
    const primarySchoolCount = await prismaExecute(prisma => prisma.contestant.count({
      where: {
        ...baseWhere,
        edu_level: "sekolah rendah"
      }
    }));
    
    const secondarySchoolCount = await prismaExecute(prisma => prisma.contestant.count({
      where: {
        ...baseWhere,
        edu_level: "sekolah menengah"
      }
    }));
    
    const youthCount = await prismaExecute(prisma => prisma.contestant.count({
      where: {
        ...baseWhere,
        edu_level: "belia"
      }
    }));
    
    // Return stats
    return NextResponse.json({
      total: totalCount,
      byEduLevel: {
        "sekolah rendah": primarySchoolCount,
        "sekolah menengah": secondarySchoolCount,
        "belia": youthCount
      }
    });
    
  } catch (error) {
    console.error("Error fetching contestant stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch contestant statistics" },
      { status: 500 }
    );
  }
}

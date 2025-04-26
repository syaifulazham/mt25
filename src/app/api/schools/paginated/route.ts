import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const stateId = searchParams.get("stateId");
    const level = searchParams.get("level");
    const category = searchParams.get("category");
    const ppd = searchParams.get("ppd");
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    // Build where conditions
    let whereConditions: Prisma.schoolWhereInput = {};
    
    // Add filters for stateId, level, category, and ppd if provided
    if (stateId && stateId !== "all") {
      whereConditions.stateId = parseInt(stateId);
    }
    
    if (level && level !== "all") {
      whereConditions.level = level;
    }
    
    if (category && category !== "all") {
      whereConditions.category = category;
    }
    
    if (ppd && ppd !== "all") {
      whereConditions.ppd = ppd;
    }
    
    // Get total count and schools with pagination
    let totalCount = 0;
    let schools = [];
    
    if (search) {
      // For search queries, use a more specific approach
      const searchCondition = `%${search}%`;
      
      // Get total count with search
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM school
        WHERE (name LIKE ${searchCondition} OR code LIKE ${searchCondition} 
        OR ppd LIKE ${searchCondition} OR city LIKE ${searchCondition})
        ${stateId && stateId !== "all" ? Prisma.sql`AND stateId = ${parseInt(stateId)}` : Prisma.sql``}
        ${level && level !== "all" ? Prisma.sql`AND level = ${level}` : Prisma.sql``}
        ${category && category !== "all" ? Prisma.sql`AND category = ${category}` : Prisma.sql``}
        ${ppd && ppd !== "all" ? Prisma.sql`AND ppd = ${ppd}` : Prisma.sql``}
      `;
      
      totalCount = Number(countResult[0].count);
      
      // Get schools with search
      const schoolResults = await prisma.$queryRaw<any[]>`
        SELECT s.*, st.id as state_id, st.name as state_name
        FROM school s
        LEFT JOIN state st ON s.stateId = st.id
        WHERE (s.name LIKE ${searchCondition} OR s.code LIKE ${searchCondition} 
        OR s.ppd LIKE ${searchCondition} OR s.city LIKE ${searchCondition})
        ${stateId && stateId !== "all" ? Prisma.sql`AND s.stateId = ${parseInt(stateId)}` : Prisma.sql``}
        ${level && level !== "all" ? Prisma.sql`AND s.level = ${level}` : Prisma.sql``}
        ${category && category !== "all" ? Prisma.sql`AND s.category = ${category}` : Prisma.sql``}
        ${ppd && ppd !== "all" ? Prisma.sql`AND s.ppd = ${ppd}` : Prisma.sql``}
        ORDER BY s.name ASC
        LIMIT ${skip}, ${pageSize}
      `;
      
      // Format the results to match the expected structure
      schools = schoolResults.map((school: any) => ({
        ...school,
        state: {
          id: school.state_id,
          name: school.state_name
        }
      }));
    } else {
      // Without search, use the standard Prisma query
      totalCount = await prisma.school.count({ where: whereConditions });
      
      schools = await prisma.school.findMany({
        where: whereConditions,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          state: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      data: schools,
      totalCount,
      totalPages,
      currentPage: page
    });
  } catch (error: any) {
    console.error("Error fetching paginated schools:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch schools" },
      { status: 500 }
    );
  }
}

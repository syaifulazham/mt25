import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const stateId = searchParams.get("stateId");
    
    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    // Build where conditions
    let whereConditions: Prisma.higherinstitutionWhereInput = {};
    
    // Add filters if provided
    if (stateId && stateId !== "all") {
      whereConditions.stateId = parseInt(stateId);
    }
    
    // Get total count and higher institutions with pagination
    let totalCount = 0;
    let institutions = [];

    if (!search) {
      // For non-search queries, use Prisma's standard functionality
      totalCount = await prisma.higherinstitution.count({
        where: whereConditions,
      });

      institutions = await prisma.higherinstitution.findMany({
        where: whereConditions,
        include: {
          state: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: pageSize,
      });
    } else {
      // For search queries, use a more specific approach
      const searchCondition = `%${search}%`;
      
      // Get total count with search
      const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM higherinstitution
        WHERE (name LIKE ${searchCondition} OR code LIKE ${searchCondition} 
        OR city LIKE ${searchCondition})
        ${stateId && stateId !== "all" ? Prisma.sql`AND stateId = ${parseInt(stateId)}` : Prisma.sql``}
      `;
      
      totalCount = Number(countResult[0].count);
      
      // Get higher institutions with search
      const institutionResults = await prisma.$queryRaw<any[]>`
        SELECT h.*, s.id as state_id, s.name as state_name
        FROM higherinstitution h
        LEFT JOIN state s ON h.stateId = s.id
        WHERE (h.name LIKE ${searchCondition} OR h.code LIKE ${searchCondition} 
        OR h.city LIKE ${searchCondition})
        ${stateId && stateId !== "all" ? Prisma.sql`AND h.stateId = ${parseInt(stateId)}` : Prisma.sql``}
        ORDER BY h.name ASC
        LIMIT ${skip}, ${pageSize}
      `;
      
      institutions = institutionResults.map(institution => ({
        id: institution.id,
        name: institution.name,
        code: institution.code,
        address: institution.address,
        city: institution.city,
        postcode: institution.postcode,
        stateId: institution.stateId,
        latitude: institution.latitude,
        longitude: institution.longitude,
        createdAt: institution.createdAt,
        state: {
          id: institution.state_id,
          name: institution.state_name,
        }
      }));
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({
      data: institutions,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      }
    });
  } catch (error) {
    console.error("Error fetching paginated higher institutions:", error);
    return NextResponse.json(
      { error: "Failed to fetch higher institutions" },
      { status: 500 }
    );
  }
}

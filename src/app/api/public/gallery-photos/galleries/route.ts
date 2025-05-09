import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Mark this route as dynamic to fix the build error
export const dynamic = 'force-dynamic';

// GET /api/public/gallery-photos/galleries - Get all published galleries (no auth required)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "12");
    
    // Calculate pagination
    const skip = (page - 1) * pageSize;
    
    // Get published galleries
    const galleries = await prisma.photogallery.findMany({
      where: {
        isPublished: true
      },
      orderBy: {
        createdAt: "desc"
      },
      skip,
      take: pageSize
    });
    
    // Get total count for pagination
    const totalGalleries = await prisma.photogallery.count({
      where: {
        isPublished: true
      }
    });
    
    // Add pagination metadata
    const result = {
      data: galleries,
      pagination: {
        page,
        pageSize,
        totalItems: totalGalleries,
        totalPages: Math.ceil(totalGalleries / pageSize)
      }
    };
    
    return NextResponse.json(galleries);
  } catch (error: any) {
    console.error("Error getting galleries:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get galleries" },
      { status: 500 }
    );
  }
}

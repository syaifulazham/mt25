import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import prisma from "@/lib/prisma";

// GET /api/photo-galleries - Get all photo galleries with optional filters and pagination
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get("publishedOnly") === "true";
    
    // Only check authentication if not requesting just published galleries
    // This allows public access to published galleries without authentication
    if (!publishedOnly) {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const publishedOnly = searchParams.get("publishedOnly") === "true";
    const draftOnly = searchParams.get("draftOnly") === "true";
    const searchTerm = searchParams.get("search") || "";

    // Calculate skip for pagination
    const skip = (page - 1) * pageSize;

    // Build filter object
    const whereClause: any = {};
    
    if (publishedOnly) {
      whereClause.isPublished = true;
    } else if (draftOnly) {
      whereClause.isPublished = false;
    }
    
    if (searchTerm) {
      whereClause.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Count total galleries matching the filter
    const totalGalleries = await prisma.photogallery.count({
      where: whereClause,
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalGalleries / pageSize);

    // Get galleries with pagination
    const galleries = await prisma.photogallery.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
      include: {
        _count: {
          select: { photos: true },
        },
      },
    });

    // Format response with photo count
    const formattedGalleries = galleries.map(gallery => ({
      ...gallery,
      photoCount: gallery._count.photos,
      _count: undefined,
    }));

    return NextResponse.json({
      data: formattedGalleries,
      meta: {
        total: totalGalleries,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error("Error getting photo galleries:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get photo galleries" },
      { status: 500 }
    );
  }
}

// POST /api/photo-galleries - Create a new photo gallery
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Create new gallery
    const gallery = await prisma.photogallery.create({
      data: {
        title: data.title,
        description: data.description,
        coverPhoto: data.coverPhoto,
        isPublished: data.isPublished || false,
        userId: user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(gallery, { status: 201 });
  } catch (error: any) {
    console.error("Error creating photo gallery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create photo gallery" },
      { status: 500 }
    );
  }
}

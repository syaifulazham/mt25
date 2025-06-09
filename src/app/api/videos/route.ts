import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/videos - Get all videos with optional filters and pagination
export async function GET(req: NextRequest) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const groupName = searchParams.get('group_name');
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const isPaginated = searchParams.has('paginated');
    
    // Pagination parameters
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 10;
    const skip = (page - 1) * pageSize;
    
    // Build the where clause
    const where: any = {};
    
    // Add group filter if provided
    if (groupName) {
      where.group_name = groupName;
    }
    
    // Add active filter if provided
    if (activeOnly) {
      where.isActive = true;
    }
    
    // Add search filter if provided
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { video_description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isPaginated) {
      // Get total count for pagination
      const total = await (prisma as any).video.count({ where });
      
      // Fetch paginated videos from the database
      const videos = await (prisma as any).video.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: pageSize,
      });
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(total / pageSize);
      
      return NextResponse.json({
        data: videos,
        meta: {
          total,
          page,
          pageSize,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    } else {
      // Fetch all videos matching criteria without pagination
      const videos = await (prisma as any).video.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        },
      });
      
      return NextResponse.json(videos);
    }
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

// POST /api/videos - Create a new video
export async function POST(req: NextRequest) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get request body
    const data = await req.json();
    
    // Validate required fields
    if (!data.title || !data.group_name || !data.video_link) {
      return NextResponse.json(
        { error: "Missing required fields: title, group_name, video_link" },
        { status: 400 }
      );
    }
    
    // Create video in database
    const newVideo = await (prisma as any).video.create({
      data: {
        title: data.title,
        group_name: data.group_name,
        video_description: data.video_description || null,
        video_link: data.video_link,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({ data: newVideo }, { status: 201 });
  } catch (error) {
    console.error("Error creating video:", error);
    return NextResponse.json(
      { error: "Failed to create video" },
      { status: 500 }
    );
  }
}

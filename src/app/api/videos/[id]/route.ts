import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = 'force-dynamic';

// GET /api/videos/[id] - Get a specific video by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Fetch video from database
    const video = await (prisma as any).video.findUnique({
      where: { id }
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json({ data: video });
  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { error: "Failed to fetch video" },
      { status: 500 }
    );
  }
}

// PUT /api/videos/[id] - Update a video
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if video exists
    const existingVideo = await (prisma as any).video.findUnique({
      where: { id }
    });

    if (!existingVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Get request body
    const data = await req.json();

    // Update video in database
    const updatedVideo = await (prisma as any).video.update({
      where: { id },
      data: {
        title: data.title,
        group_name: data.group_name,
        video_description: data.video_description,
        video_link: data.video_link,
        isActive: data.isActive !== undefined ? data.isActive : existingVideo.isActive,
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({ data: updatedVideo });
  } catch (error) {
    console.error("Error updating video:", error);
    return NextResponse.json(
      { error: "Failed to update video" },
      { status: 500 }
    );
  }
}

// DELETE /api/videos/[id] - Delete a video
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Check if video exists
    const existingVideo = await (prisma as any).video.findUnique({
      where: { id }
    });

    if (!existingVideo) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Delete video from database
    await (prisma as any).video.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "Failed to delete video" },
      { status: 500 }
    );
  }
}

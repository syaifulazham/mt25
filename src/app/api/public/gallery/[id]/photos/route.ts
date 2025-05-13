import { NextRequest, NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";

// Mark this route as dynamic to fix the build error
export const dynamic = 'force-dynamic';

// GET /api/public/gallery/[id]/photos - Get all photos for a gallery (public, no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const galleryId = parseInt(params.id);
    if (isNaN(galleryId)) {
      return NextResponse.json(
        { error: "Invalid gallery ID" },
        { status: 400 }
      );
    }

    // Check if gallery exists and is published using prismaExecute for connection management
    const gallery = await prismaExecute(prisma => prisma.photogallery.findUnique({
      where: { 
        id: galleryId,
        isPublished: true // Only check published galleries
      }
    }));

    if (!gallery) {
      return NextResponse.json(
        { error: "Gallery not found" },
        { status: 404 }
      );
    }

    // Get all photos in the gallery ordered by sortOrder using prismaExecute for connection management
    const photos = await prismaExecute(prisma => prisma.photo.findMany({
      where: { galleryId },
      orderBy: {
        sortOrder: "asc",
      }
    }));

    return NextResponse.json(photos);
  } catch (error: any) {
    console.error("Error getting gallery photos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get photos" },
      { status: 500 }
    );
  }
}

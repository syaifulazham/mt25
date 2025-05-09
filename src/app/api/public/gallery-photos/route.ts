import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/public/gallery-photos - Get random photos from published galleries (no auth required)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "5");
    
    // Get all published galleries
    const galleries = await prisma.photogallery.findMany({
      where: {
        isPublished: true
      }
    });
    
    if (galleries.length === 0) {
      return NextResponse.json([]);
    }
    
    // Get IDs of all galleries
    const galleryIds = galleries.map(gallery => gallery.id);
    
    // Get all photos from these galleries
    const photos = await prisma.photo.findMany({
      where: {
        galleryId: {
          in: galleryIds
        }
      }
    });
    
    // Shuffle and limit the photos
    const shuffled = [...photos].sort(() => 0.5 - Math.random());
    const randomPhotos = shuffled.slice(0, limit);
    
    return NextResponse.json(randomPhotos);
  } catch (error: any) {
    console.error("Error getting public gallery photos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get photos" },
      { status: 500 }
    );
  }
}

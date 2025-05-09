import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import prisma from "@/lib/prisma";

// GET /api/photo-galleries/[id]/photos - Get all photos for a gallery
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const galleryId = parseInt(params.id);
    if (isNaN(galleryId)) {
      return NextResponse.json(
        { error: "Invalid gallery ID" },
        { status: 400 }
      );
    }

    // Check if gallery exists
    const gallery = await prisma.photoGallery.findUnique({
      where: { id: galleryId },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: "Gallery not found" },
        { status: 404 }
      );
    }

    // Get all photos in the gallery ordered by sortOrder
    const photos = await prisma.photo.findMany({
      where: { galleryId },
      orderBy: {
        sortOrder: "asc",
      },
    });

    return NextResponse.json(photos);
  } catch (error: any) {
    console.error("Error getting photos:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get photos" },
      { status: 500 }
    );
  }
}

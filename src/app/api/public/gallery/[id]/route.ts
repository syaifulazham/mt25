import { NextRequest, NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";

// Mark this route as dynamic to fix the build error
export const dynamic = 'force-dynamic';

// GET /api/public/gallery/[id] - Get a gallery by ID (public, no auth required)
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

    // Get the gallery with creator info using prismaExecute for connection management
    const gallery = await prismaExecute(prisma => prisma.photogallery.findUnique({
      where: { 
        id: galleryId,
        isPublished: true // Only return published galleries
      },
      include: {
        user: {
          select: {
            name: true,
            username: true
          }
        }
      }
    }));

    if (!gallery) {
      return NextResponse.json(
        { error: "Gallery not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(gallery);
  } catch (error: any) {
    console.error("Error getting gallery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get gallery" },
      { status: 500 }
    );
  }
}

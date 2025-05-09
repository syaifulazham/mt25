import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import prisma from "@/lib/prisma";

// POST /api/photo-galleries/photos - Create a new photo
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    
    // Validate required fields
    if (!data.galleryId) {
      return NextResponse.json(
        { error: "Gallery ID is required" },
        { status: 400 }
      );
    }

    if (!data.path) {
      return NextResponse.json(
        { error: "Photo path is required" },
        { status: 400 }
      );
    }

    const galleryId = parseInt(data.galleryId);
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

    // Create the photo
    const photo = await prisma.photo.create({
      data: {
        path: data.path,
        title: data.title || null,
        description: data.description || null,
        sortOrder: data.sortOrder || 0,
        galleryId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error: any) {
    console.error("Error creating photo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create photo" },
      { status: 500 }
    );
  }
}

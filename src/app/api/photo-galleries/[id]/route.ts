import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import prisma from "@/lib/prisma";

// GET /api/photo-galleries/[id] - Get a specific photo gallery by ID
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

    // Get the gallery with photos
    const gallery = await prisma.photoGallery.findUnique({
      where: { id: galleryId },
      include: {
        photos: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!gallery) {
      return NextResponse.json(
        { error: "Gallery not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(gallery);
  } catch (error: any) {
    console.error("Error getting photo gallery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get photo gallery" },
      { status: 500 }
    );
  }
}

// PATCH /api/photo-galleries/[id] - Update a photo gallery
export async function PATCH(
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

    const data = await request.json();
    
    // Check if gallery exists and belongs to the user
    const existingGallery = await prisma.photoGallery.findUnique({
      where: { id: galleryId },
    });

    if (!existingGallery) {
      return NextResponse.json(
        { error: "Gallery not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    if (data.title !== undefined && !data.title.trim()) {
      return NextResponse.json(
        { error: "Title cannot be empty" },
        { status: 400 }
      );
    }

    // Update the gallery
    const updatedGallery = await prisma.photoGallery.update({
      where: { id: galleryId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        coverPhoto: data.coverPhoto !== undefined ? data.coverPhoto : undefined,
        isPublished: data.isPublished !== undefined ? data.isPublished : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedGallery);
  } catch (error: any) {
    console.error("Error updating photo gallery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update photo gallery" },
      { status: 500 }
    );
  }
}

// DELETE /api/photo-galleries/[id] - Delete a photo gallery
export async function DELETE(
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
    const existingGallery = await prisma.photoGallery.findUnique({
      where: { id: galleryId },
    });

    if (!existingGallery) {
      return NextResponse.json(
        { error: "Gallery not found" },
        { status: 404 }
      );
    }

    // Delete all photos in the gallery first (this should be handled by onDelete: Cascade,
    // but we'll make sure all related data is cleaned up)
    await prisma.photo.deleteMany({
      where: { galleryId },
    });

    // Delete the gallery
    await prisma.photoGallery.delete({
      where: { id: galleryId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting photo gallery:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete photo gallery" },
      { status: 500 }
    );
  }
}

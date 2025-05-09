import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import prisma from "@/lib/prisma";

// GET /api/photo-galleries/photos/[id] - Get a specific photo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const photoId = parseInt(params.id);
    if (isNaN(photoId)) {
      return NextResponse.json(
        { error: "Invalid photo ID" },
        { status: 400 }
      );
    }

    // Get the photo
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(photo);
  } catch (error: any) {
    console.error("Error getting photo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get photo" },
      { status: 500 }
    );
  }
}

// PATCH /api/photo-galleries/photos/[id] - Update a photo
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const photoId = parseInt(params.id);
    if (isNaN(photoId)) {
      return NextResponse.json(
        { error: "Invalid photo ID" },
        { status: 400 }
      );
    }

    const data = await request.json();
    
    // Check if photo exists
    const existingPhoto = await prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!existingPhoto) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    // Update the photo
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        path: data.path !== undefined ? data.path : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedPhoto);
  } catch (error: any) {
    console.error("Error updating photo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update photo" },
      { status: 500 }
    );
  }
}

// DELETE /api/photo-galleries/photos/[id] - Delete a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const photoId = parseInt(params.id);
    if (isNaN(photoId)) {
      return NextResponse.json(
        { error: "Invalid photo ID" },
        { status: 400 }
      );
    }

    // Check if photo exists
    const existingPhoto = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        gallery: true,
      },
    });

    if (!existingPhoto) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    // Delete the photo
    await prisma.photo.delete({
      where: { id: photoId },
    });

    // If this photo was used as the gallery's cover photo, remove it
    if (existingPhoto.gallery.coverPhoto === existingPhoto.path) {
      await prisma.photoGallery.update({
        where: { id: existingPhoto.galleryId },
        data: {
          coverPhoto: null,
          updatedAt: new Date(),
        },
      });
    }

    // Reorder remaining photos to maintain consistent order
    const galleryPhotos = await prisma.photo.findMany({
      where: { galleryId: existingPhoto.galleryId },
      orderBy: { sortOrder: 'asc' },
    });

    // Update sortOrder for all photos to ensure sequential ordering
    for (let i = 0; i < galleryPhotos.length; i++) {
      if (galleryPhotos[i].sortOrder !== i) {
        await prisma.photo.update({
          where: { id: galleryPhotos[i].id },
          data: { sortOrder: i },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete photo" },
      { status: 500 }
    );
  }
}

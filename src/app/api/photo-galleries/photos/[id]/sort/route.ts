import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import prisma from "@/lib/prisma";

// PATCH /api/photo-galleries/photos/[id]/sort - Update a photo's sort order
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
    
    // Validate required fields
    if (data.sortOrder === undefined || typeof data.sortOrder !== 'number') {
      return NextResponse.json(
        { error: "Sort order is required and must be a number" },
        { status: 400 }
      );
    }

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

    const oldSortOrder = existingPhoto.sortOrder;
    const newSortOrder = data.sortOrder;

    // Get all photos in the same gallery
    const galleryPhotos = await prisma.photo.findMany({
      where: { galleryId: existingPhoto.galleryId },
      orderBy: { sortOrder: 'asc' },
    });

    // Prevent out of bounds sort order
    if (newSortOrder < 0 || newSortOrder >= galleryPhotos.length) {
      return NextResponse.json(
        { error: `Sort order must be between 0 and ${galleryPhotos.length - 1}` },
        { status: 400 }
      );
    }

    // If the sort order hasn't changed, no need to do anything
    if (oldSortOrder === newSortOrder) {
      return NextResponse.json(existingPhoto);
    }

    // Update the sort orders
    // If moving up (lower index), increment all photos in between
    if (newSortOrder < oldSortOrder) {
      await prisma.$transaction(
        galleryPhotos
          .filter(photo => photo.sortOrder >= newSortOrder && photo.sortOrder < oldSortOrder)
          .map(photo => 
            prisma.photo.update({
              where: { id: photo.id },
              data: { sortOrder: photo.sortOrder + 1 },
            })
          )
      );
    } 
    // If moving down (higher index), decrement all photos in between
    else {
      await prisma.$transaction(
        galleryPhotos
          .filter(photo => photo.sortOrder > oldSortOrder && photo.sortOrder <= newSortOrder)
          .map(photo => 
            prisma.photo.update({
              where: { id: photo.id },
              data: { sortOrder: photo.sortOrder - 1 },
            })
          )
      );
    }

    // Update the target photo's sort order
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        sortOrder: newSortOrder,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedPhoto);
  } catch (error: any) {
    console.error("Error updating photo sort order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update photo sort order" },
      { status: 500 }
    );
  }
}

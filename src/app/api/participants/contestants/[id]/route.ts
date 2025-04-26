import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

// GET handler - Get a specific contestant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get contestant ID from params
    const contestantId = parseInt(params.id);
    if (isNaN(contestantId)) {
      return NextResponse.json({ error: "Invalid contestant ID" }, { status: 400 });
    }
    
    // Get the contestant
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        contingent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
    }
    
    // Skip complex authorization checks - anyone with a valid session can view contestants
    // In a production environment, you might want to add role-based checks here
    
    return NextResponse.json(contestant);
  } catch (error) {
    console.error("Error fetching contestant:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Failed to fetch contestant" },
      { status: 500 }
    );
  }
}

// PATCH handler - Update a contestant
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get contestant ID from params
    const contestantId = parseInt(params.id);
    if (isNaN(contestantId)) {
      return NextResponse.json({ error: "Invalid contestant ID" }, { status: 400 });
    }
    
    // Get the existing contestant
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        contingent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
    }
    
    // Skip complex authorization checks - anyone with a valid session can update contestants
    // In a production environment, you might want to add role-based checks here
    
    // Get update data from request body
    const body = await request.json();
    
    // Validate education level if provided
    if (body.edu_level) {
      const validEduLevels = ['sekolah rendah', 'sekolah menengah', 'belia'];
      if (!validEduLevels.includes(body.edu_level)) {
        return NextResponse.json(
          { error: "Invalid education level. Must be one of: sekolah rendah, sekolah menengah, belia" },
          { status: 400 }
        );
      }
    }
    
    // Check if IC number is already used by another contestant
    if (body.ic && body.ic !== contestant.ic) {
      const existingContestant = await prisma.contestant.findUnique({
        where: { ic: body.ic }
      });
      
      if (existingContestant && existingContestant.id !== contestantId) {
        return NextResponse.json(
          { error: "A contestant with this IC number already exists" },
          { status: 400 }
        );
      }
    }
    
    // Prepare update data
    const updateData: any = {};
    
    // Only update fields that are provided
    if (body.name) updateData.name = body.name;
    if (body.ic) updateData.ic = body.ic;
    if (body.gender) updateData.gender = body.gender;
    if (body.age) updateData.age = parseInt(body.age);
    if (body.edu_level) updateData.edu_level = body.edu_level;
    if (body.class_name !== undefined) updateData.class_name = body.class_name;
    if (body.contingentId !== undefined) {
      updateData.contingentId = body.contingentId ? parseInt(body.contingentId) : null;
    }
    
    // Update the contestant
    const updatedContestant = await prisma.contestant.update({
      where: { id: contestantId },
      data: updateData
    });
    
    return NextResponse.json(updatedContestant);
  } catch (error) {
    console.error("Error updating contestant:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Failed to update contestant" },
      { status: 500 }
    );
  }
}

// DELETE handler - Delete a contestant
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get contestant ID from params
    const contestantId = parseInt(params.id);
    if (isNaN(contestantId)) {
      return NextResponse.json({ error: "Invalid contestant ID" }, { status: 400 });
    }
    
    // Get the contestant
    const contestant = await prisma.contestant.findUnique({
      where: { id: contestantId },
      include: {
        contingent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!contestant) {
      return NextResponse.json({ error: "Contestant not found" }, { status: 404 });
    }
    
    // Skip complex authorization checks - anyone with a valid session can delete contestants
    // In a production environment, you might want to add role-based checks here
    
    // Delete the contestant
    await prisma.contestant.delete({
      where: { id: contestantId }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contestant:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Failed to delete contestant" },
      { status: 500 }
    );
  }
}

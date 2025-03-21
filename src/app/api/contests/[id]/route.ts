import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// GET /api/contests/[id] - Get a specific contest
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    // Check authentication
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid contest ID" },
        { status: 400 }
      );
    }

    const contest = await prisma.contest.findUnique({
      where: { id },
      include: {
        targetGroup: true,
        _count: {
          select: {
            submissions: true,
            contingents: true,
            judgings: true,
            results: true
          }
        }
      }
    });

    if (!contest) {
      return NextResponse.json(
        { error: "Contest not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(contest);
  } catch (error) {
    console.error("Error fetching contest:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest" },
      { status: 500 }
    );
  }
}

// PUT /api/contests/[id] - Update a contest
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    // Check authentication
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check authorization (only ADMIN and OPERATOR can update contests)
    if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR'])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid contest ID" },
        { status: 400 }
      );
    }

    // Check if contest exists
    const existingContest = await prisma.contest.findUnique({
      where: { id }
    });

    if (!existingContest) {
      return NextResponse.json(
        { error: "Contest not found" },
        { status: 404 }
      );
    }

    const data = await req.json();
    
    // Parse dates if provided
    const startDate = data.startDate ? new Date(data.startDate) : undefined;
    const endDate = data.endDate ? new Date(data.endDate) : undefined;

    // Validate date range if both dates are provided
    if (startDate && endDate && endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name: data.name,
      description: data.description,
      contestType: data.contestType,
      method: data.method,
      judgingMethod: data.judgingMethod,
      accessibility: data.accessibility
    };

    // Only include dates if they're provided
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;

    // Update the contest
    const updatedContest = await prisma.contest.update({
      where: { id },
      data: updateData
    });

    // Update target groups if provided
    if (data.targetGroupIds && Array.isArray(data.targetGroupIds)) {
      // First disconnect all existing target groups
      await prisma.contest.update({
        where: { id },
        data: {
          targetGroup: {
            set: []
          }
        }
      });
      
      // Then connect the new ones
      await prisma.contest.update({
        where: { id },
        data: {
          targetGroup: {
            connect: data.targetGroupIds.map((id: number) => ({ id }))
          }
        }
      });
    }

    return NextResponse.json(updatedContest);
  } catch (error) {
    console.error("Error updating contest:", error);
    return NextResponse.json(
      { error: "Failed to update contest" },
      { status: 500 }
    );
  }
}

// DELETE /api/contests/[id] - Delete a contest
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    // Check authentication
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Check authorization (only ADMIN can delete contests)
    if (!hasRequiredRole(user, ['ADMIN'])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid contest ID" },
        { status: 400 }
      );
    }

    // Check if contest exists
    const existingContest = await prisma.contest.findUnique({
      where: { id }
    });

    if (!existingContest) {
      return NextResponse.json(
        { error: "Contest not found" },
        { status: 404 }
      );
    }

    // First disconnect all relationships
    await prisma.contest.update({
      where: { id },
      data: {
        targetGroup: {
          set: []
        }
      }
    });

    // Then delete the contest
    await prisma.contest.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contest:", error);
    return NextResponse.json(
      { error: "Failed to delete contest" },
      { status: 500 }
    );
  }
}

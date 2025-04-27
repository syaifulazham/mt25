import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// Mark this route as dynamic since it uses getCurrentUser() which uses headers()
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// GET /api/contests/[id] - Get a specific contest
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
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
        targetgroup: true,
        judgingtemplate: {
          include: {
            judgingtemplatecriteria: true
          }
        },
        _count: {
          select: {
            submission: true,
            contestants: true, // Changed from contingent to contestants (contestParticipation)
            judging: true,
            result: true
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

    // Parse discreteValues from JSON string to array for each criterion if judging template exists
    const processedContest = {
      ...contest,
      judgingtemplate: contest.judgingtemplate ? {
        ...contest.judgingtemplate,
        judgingtemplatecriteria: contest.judgingtemplate.judgingtemplatecriteria.map(criterion => ({
          ...criterion,
          discreteValues: criterion.discreteValues 
            ? JSON.parse(criterion.discreteValues) 
            : null
        }))
      } : null
    };

    return NextResponse.json(processedContest);
  } catch (error) {
    console.error("Error fetching contest:", error);
    return NextResponse.json(
      { error: "Failed to fetch contest" },
      { status: 500 }
    );
  }
}

// PATCH /api/contests/[id] - Update a contest (alias for PUT)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateContest(req, params);
}

// PUT /api/contests/[id] - Update a contest
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateContest(req, params);
}

// Shared function for PUT and PATCH
async function updateContest(
  req: NextRequest,
  params: { id: string }
) {
  try {
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      // Check authorization (only ADMIN and OPERATOR can update contests)
      if (!hasRequiredRole(user, ['ADMIN', 'OPERATOR'])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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
    console.log("Received contest update data:", data);
    
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

    // Add themeId if provided
    if (data.themeId !== undefined) {
      if (data.themeId === null) {
        // If null, remove theme association
        updateData.themeId = null;
      } else {
        // Otherwise set the theme ID
        updateData.themeId = typeof data.themeId === 'string' 
          ? parseInt(data.themeId) 
          : data.themeId;
      }
    }

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
          targetgroup: {
            set: []
          }
        }
      });
      
      // Then connect the new ones
      await prisma.contest.update({
        where: { id },
        data: {
          targetgroup: {
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
    // Skip authentication in development mode
    if (process.env.NODE_ENV !== 'development') {
      const user = await getCurrentUser();
      
      // Check authentication
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      // Check authorization (only ADMIN can delete contests)
      if (!hasRequiredRole(user, ['ADMIN'])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
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

    // Check if contest has related data
    const contestWithRelations = await prisma.contest.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            submission: true,
            contestants: true, // Changed from contingent to contestants (contestParticipation)
            judging: true,
            result: true
          }
        }
      }
    });

    if (contestWithRelations?._count) {
      const hasRelations = 
        contestWithRelations._count.submission > 0 ||
        contestWithRelations._count.contestants > 0 || // Changed from contingent to contestants
        contestWithRelations._count.judging > 0 ||
        contestWithRelations._count.result > 0;
      
      if (hasRelations) {
        return NextResponse.json(
          { error: "Cannot delete contest with related data" },
          { status: 400 }
        );
      }
    }

    // First disconnect all relationships
    await prisma.contest.update({
      where: { id },
      data: {
        targetgroup: {
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

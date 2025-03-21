import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// GET /api/themes/[id] - Get a specific theme
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ["ADMIN", "OPERATOR", "VIEWER"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid theme ID" },
        { status: 400 }
      );
    }

    const theme = await prisma.theme.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contests: true,
          },
        },
      },
    });

    if (!theme) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(theme);
  } catch (error) {
    console.error("Error fetching theme:", error);
    return NextResponse.json(
      { error: "Failed to fetch theme" },
      { status: 500 }
    );
  }
}

// PATCH /api/themes/[id] - Update a theme
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid theme ID" },
        { status: 400 }
      );
    }

    const json = await request.json();
    const { name, color, logoPath, description } = json;

    if (!name) {
      return NextResponse.json(
        { error: "Theme name is required" },
        { status: 400 }
      );
    }

    // Check if theme exists
    const existingTheme = await prisma.theme.findUnique({
      where: { id },
    });

    if (!existingTheme) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    // Check if another theme with the same name exists (excluding current theme)
    const duplicateTheme = await prisma.theme.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });

    if (duplicateTheme) {
      return NextResponse.json(
        { error: "Another theme with this name already exists" },
        { status: 400 }
      );
    }

    // Update theme
    const updatedTheme = await prisma.theme.update({
      where: { id },
      data: {
        name,
        color,
        logoPath,
        description,
      },
    });

    return NextResponse.json(updatedTheme);
  } catch (error) {
    console.error("Error updating theme:", error);
    return NextResponse.json(
      { error: "Failed to update theme" },
      { status: 500 }
    );
  }
}

// DELETE /api/themes/[id] - Delete a theme
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid theme ID" },
        { status: 400 }
      );
    }

    // Check if theme exists
    const theme = await prisma.theme.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            contests: true,
          },
        },
      },
    });

    if (!theme) {
      return NextResponse.json(
        { error: "Theme not found" },
        { status: 404 }
      );
    }

    // Check if theme is being used by any contests
    if (theme._count.contests > 0) {
      return NextResponse.json(
        { error: "Cannot delete theme that is being used by contests" },
        { status: 400 }
      );
    }

    // Delete theme
    await prisma.theme.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting theme:", error);
    return NextResponse.json(
      { error: "Failed to delete theme" },
      { status: 500 }
    );
  }
}

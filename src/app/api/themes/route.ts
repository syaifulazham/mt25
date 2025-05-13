import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prismaExecute } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";

// GET /api/themes - Get all themes with optional pagination and search
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ["ADMIN", "OPERATOR", "VIEWER"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    // Build filter conditions
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {};

    // Get total count for pagination using prismaExecute for connection management
    const totalCount = await prismaExecute(prisma => prisma.theme.count({ where }));

    // Get themes with pagination using prismaExecute for connection management
    const themes = await prismaExecute(prisma => prisma.theme.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            contest: true,
          },
        },
      },
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      data: themes,
      meta: {
        currentPage: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPreviousPage: hasPreviousPage,
      },
    });
  } catch (error) {
    console.error("Error fetching themes:", error);
    return NextResponse.json(
      { error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}

// POST /api/themes - Create a new theme
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await request.json();
    const { name, color, logoPath, description } = json;

    if (!name) {
      return NextResponse.json(
        { error: "Theme name is required" },
        { status: 400 }
      );
    }

    // Check if theme with the same name already exists using prismaExecute for connection management
    const existingTheme = await prismaExecute(prisma => prisma.theme.findFirst({
      where: { name },
    }));

    if (existingTheme) {
      return NextResponse.json(
        { error: "A theme with this name already exists" },
        { status: 400 }
      );
    }

    // Create new theme using prismaExecute for connection management
    const theme = await prismaExecute(prisma => prisma.theme.create({
      data: {
        name,
        color,
        logoPath,
        description,
        updatedAt: new Date(), // Add the current date for updatedAt
      },
    }));

    return NextResponse.json(theme, { status: 201 });
  } catch (error) {
    console.error("Error creating theme:", error);
    return NextResponse.json(
      { error: "Failed to create theme" },
      { status: 500 }
    );
  }
}

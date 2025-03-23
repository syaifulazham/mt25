import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";
import slugify from "slugify";

// GET /api/news/[id] - Get a specific news item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid news ID" },
        { status: 400 }
      );
    }

    const news = await prisma.news.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!news) {
      return NextResponse.json(
        { error: "News not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(news);
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}

// PUT /api/news/[id] - Update a news item
export async function PUT(
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
        { error: "Invalid news ID" },
        { status: 400 }
      );
    }

    // Check if news exists
    const existingNews = await prisma.news.findUnique({
      where: { id },
    });

    if (!existingNews) {
      return NextResponse.json(
        { error: "News not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      title, 
      excerpt, 
      content, 
      coverImage, 
      readTime,
      author,
      featured,
      isPublished,
      slug: customSlug 
    } = body;

    // Generate slug from title if title changed and slug not provided
    let slug = existingNews.slug;
    if (title && title !== existingNews.title && !customSlug) {
      slug = slugify(title, { lower: true, strict: true });
    } else if (customSlug && customSlug !== existingNews.slug) {
      slug = customSlug;
    }

    // Check if new slug already exists (if changed)
    if (slug !== existingNews.slug) {
      const slugExists = await prisma.news.findFirst({
        where: {
          slug,
          id: { not: id },
        },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: "A news item with this slug already exists" },
          { status: 400 }
        );
      }
    }

    // Update news
    const updatedNews = await prisma.news.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(excerpt && { excerpt }),
        ...(content && { content }),
        ...(slug && { slug }),
        ...(coverImage && { coverImage }),
        ...(readTime && { readTime }),
        ...(author && { author }),
        ...(featured !== undefined && { featured }),
        ...(isPublished !== undefined && { isPublished }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedNews);
  } catch (error) {
    console.error("Error updating news:", error);
    return NextResponse.json(
      { error: "Failed to update news" },
      { status: 500 }
    );
  }
}

// DELETE /api/news/[id] - Delete a news item
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
        { error: "Invalid news ID" },
        { status: 400 }
      );
    }

    // Check if news exists
    const existingNews = await prisma.news.findUnique({
      where: { id },
    });

    if (!existingNews) {
      return NextResponse.json(
        { error: "News not found" },
        { status: 404 }
      );
    }

    // Delete news
    await prisma.news.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting news:", error);
    return NextResponse.json(
      { error: "Failed to delete news" },
      { status: 500 }
    );
  }
}

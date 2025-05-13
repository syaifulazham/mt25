import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prismaExecute } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";
import slugify from "slugify";

// Mock data for development
const mockNews = [
  {
    id: "1",
    title: "Techlympics 2025 Registration Now Open",
    excerpt: "Registration for the highly anticipated Techlympics 2025 is now open. Participants from around the world can now register for various technology competitions.",
    content: "Registration for the highly anticipated Techlympics 2025 is now open. Participants from around the world can now register for various technology competitions. The event will feature contests in AI, robotics, cybersecurity, and more.",
    coverImage: "/images/news/techlympics-registration.jpg",
    date: new Date("2025-01-15").toISOString(),
    readTime: "3 min",
    author: "Organizing Committee",
    featured: true,
    slug: "techlympics-2025-registration-now-open",
    isPublished: true,
    user: {
      id: "1",
      name: "Admin User",
      username: "admin",
    },
  },
  {
    id: "2",
    title: "New AI Competition Added to Techlympics 2025",
    excerpt: "A new artificial intelligence competition has been added to the Techlympics 2025 lineup, focusing on generative AI applications.",
    content: "A new artificial intelligence competition has been added to the Techlympics 2025 lineup, focusing on generative AI applications. Participants will develop AI solutions for real-world problems.",
    coverImage: "/images/news/ai-competition.jpg",
    date: new Date("2025-01-20").toISOString(),
    readTime: "4 min",
    author: "Technology Team",
    featured: false,
    slug: "new-ai-competition-added",
    isPublished: true,
    user: {
      id: "1",
      name: "Admin User",
      username: "admin",
    },
  },
  {
    id: "3",
    title: "Sponsorship Opportunities for Techlympics 2025",
    excerpt: "Companies interested in sponsoring Techlympics 2025 can now apply through our new sponsorship portal.",
    content: "Companies interested in sponsoring Techlympics 2025 can now apply through our new sponsorship portal. Various sponsorship tiers are available with different benefits.",
    coverImage: "/images/news/sponsorship.jpg",
    date: new Date("2025-01-25").toISOString(),
    readTime: "2 min",
    author: "Sponsorship Team",
    featured: false,
    slug: "sponsorship-opportunities",
    isPublished: true,
    user: {
      id: "1",
      name: "Admin User",
      username: "admin",
    },
  },
  {
    id: "4",
    title: "Techlympics 2025 Venue Announced",
    excerpt: "The main venue for Techlympics 2025 has been announced. The event will take place at the International Convention Center.",
    content: "The main venue for Techlympics 2025 has been announced. The event will take place at the International Convention Center, which offers state-of-the-art facilities for all competitions.",
    coverImage: "/images/news/venue.jpg",
    date: new Date("2025-01-30").toISOString(),
    readTime: "3 min",
    author: "Organizing Committee",
    featured: false,
    slug: "venue-announced",
    isPublished: true,
    user: {
      id: "1",
      name: "Admin User",
      username: "admin",
    },
  },
  {
    id: "5",
    title: "International Judges Panel Formed for Techlympics 2025",
    excerpt: "A panel of international technology experts has been formed to judge the various competitions at Techlympics 2025.",
    content: "A panel of international technology experts has been formed to judge the various competitions at Techlympics 2025. The panel includes renowned experts from academia, industry, and research institutions.",
    coverImage: "/images/news/judges.jpg",
    date: new Date("2025-02-05").toISOString(),
    readTime: "5 min",
    author: "Judging Committee",
    featured: false,
    slug: "international-judges-panel",
    isPublished: true,
    user: {
      id: "1",
      name: "Admin User",
      username: "admin",
    },
  },
];

// GET /api/news - Get all news with optional pagination and search
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;
    const publishedOnly = url.searchParams.get("publishedOnly") === "true";
    const featuredOnly = url.searchParams.get("featuredOnly") === "true";

    // For development, use mock data if database is empty
    let news: any[] = [];
    let totalCount = 0;

    try {
      // Build filter conditions
      const where = {
        ...(search ? {
          OR: [
            { title: { contains: search } },
            { excerpt: { contains: search } },
            { content: { contains: search } },
          ],
        } : {}),
        ...(publishedOnly ? { isPublished: true } : {}),
        ...(featuredOnly ? { featured: true } : {}),
      };

      // Get total count for pagination using prismaExecute for connection management
      totalCount = await prismaExecute(prisma => prisma.news.count({ where }));

      // Get news with pagination using prismaExecute for connection management
      news = await prismaExecute(prisma => prisma.news.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { date: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      }));
    } catch (dbError) {
      console.error("Database error:", dbError);
      // If database error or no results, use mock data
      if (news.length === 0) {
        // Filter mock data based on query parameters
        let filteredMockNews = [...mockNews];
        
        if (search) {
          const searchLower = search.toLowerCase();
          filteredMockNews = filteredMockNews.filter(item => 
            item.title.toLowerCase().includes(searchLower) || 
            item.excerpt.toLowerCase().includes(searchLower) || 
            item.content.toLowerCase().includes(searchLower)
          );
        }
        
        if (publishedOnly) {
          filteredMockNews = filteredMockNews.filter(item => item.isPublished);
        }
        
        if (featuredOnly) {
          filteredMockNews = filteredMockNews.filter(item => item.featured);
        }
        
        // Sort by date (newest first)
        filteredMockNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        totalCount = filteredMockNews.length;
        news = filteredMockNews.slice(skip, skip + pageSize);
      }
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return paginated results
    if (url.searchParams.has("page")) {
      return NextResponse.json({
        data: news,
        meta: {
          total: totalCount,
          page,
          pageSize,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      });
    }

    // Return all results without pagination
    return NextResponse.json(news);
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}

// POST /api/news - Create a new news item
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user || !hasRequiredRole(user, ["ADMIN", "OPERATOR"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Validate required fields
    if (!title || !excerpt || !content) {
      return NextResponse.json(
        { error: "Title, excerpt, and content are required" },
        { status: 400 }
      );
    }

    // Generate slug from title if not provided
    const slug = customSlug || slugify(title, { lower: true, strict: true });

    // Check if slug already exists using prismaExecute for connection management
    const existingNews = await prismaExecute(prisma => prisma.news.findUnique({
      where: { slug },
    }));

    if (existingNews) {
      return NextResponse.json(
        { error: "A news item with this slug already exists" },
        { status: 400 }
      );
    }

    // Create new news item using prismaExecute for connection management
    const news = await prismaExecute(prisma => prisma.news.create({
      data: {
        title,
        excerpt,
        content,
        slug,
        coverImage,
        readTime: readTime || `${Math.ceil(content.length / 1000)} min read`,
        author: author || user.name || user.username,
        featured: featured || false,
        isPublished: isPublished || false,
        userId: user.id,
        updatedAt: new Date(),
      },
    }));

    return NextResponse.json(news, { status: 201 });
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json(
      { error: "Failed to create news" },
      { status: 500 }
    );
  }
}

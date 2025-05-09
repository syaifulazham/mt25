import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { hasRequiredRole } from "@/lib/auth";
import slugify from "slugify";

// Mock data for development - for providing fallback content
const mockNews = [
  {
    id: "1",
    title: "Techlympics 2025 Registration Now Open",
    excerpt: "Registration for the highly anticipated Techlympics 2025 is now open. Participants from around the world can now register for various technology competitions.",
    content: "Registration for the highly anticipated Techlympics 2025 is now open. Participants from around the world can now register for various technology competitions. The event will feature contests in AI, robotics, cybersecurity, and more.\n\nParticipants can register through our online portal, which is accessible from the main website. Early registration offers special benefits, including priority access to workshops and training sessions.\n\nSchools are encouraged to register their teams early to secure spots in the most popular competition categories. Individual participants can also register for select events.\n\nThe Techlympics 2025 organizing committee is excited to welcome talented students and educators from across Malaysia and beyond to showcase their technological skills and creativity.",
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
    content: "A new artificial intelligence competition has been added to the Techlympics 2025 lineup, focusing on generative AI applications. Participants will develop AI solutions for real-world problems.\n\nThis exciting new category will challenge participants to create AI systems that can generate creative content, solve complex problems, or assist in educational contexts.\n\nThe competition will be judged by a panel of AI experts from academia and industry. Submissions will be evaluated based on innovation, technical implementation, practical application, and presentation.\n\nTraining resources and workshops will be provided to participants to help them prepare for this cutting-edge competition. Schools are encouraged to form dedicated AI teams to participate in this prestigious event.",
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
    content: "Companies interested in sponsoring Techlympics 2025 can now apply through our new sponsorship portal. Various sponsorship tiers are available with different benefits.\n\nTechlympics 2025 offers an excellent opportunity for companies to connect with talented students, showcase their brand, and support STEM education in Malaysia. Sponsors will receive prominent visibility throughout the event and in all digital and print materials.\n\nSponsorship packages range from Bronze to Platinum levels, with each tier offering increasing levels of brand exposure and engagement opportunities. Custom packages are also available for companies with specific partnership goals.\n\nInterested companies can visit the sponsorship portal on our website to view detailed information about sponsorship opportunities and submit their applications.",
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
    content: "The main venue for Techlympics 2025 has been announced. The event will take place at the International Convention Center, which offers state-of-the-art facilities for all competitions.\n\nThe International Convention Center provides ample space for all Techlympics events, including the robotics arena, coding stations, innovation showcase, and presentation halls. The venue's advanced technological infrastructure is ideal for supporting the various competition categories.\n\nLocated in the heart of the city, the venue is easily accessible by public transportation and has ample parking facilities. Accommodation options are available nearby for participants traveling from other regions.\n\nThe organizing committee selected this venue after careful consideration to ensure the best possible experience for all Techlympics participants, judges, and visitors.",
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
    content: "A panel of international technology experts has been formed to judge the various competitions at Techlympics 2025. The panel includes renowned experts from academia, industry, and research institutions.\n\nThese distinguished judges bring extensive expertise in fields such as artificial intelligence, robotics, software development, cybersecurity, and digital innovation. Their involvement ensures that participant projects will receive expert evaluation and valuable feedback.\n\nThe international composition of the panel reflects the global nature of the Techlympics competition and provides participants with exposure to diverse perspectives in technology assessment. Judges will be using standardized evaluation criteria to ensure fair and consistent judging across all competition categories.\n\nParticipants will have opportunities to interact with judges during designated feedback sessions, providing a valuable learning experience beyond the competition itself.",
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

// GET /api/news/[id] - Get a specific news item by ID or slug
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idOrSlug = params.id;
    let news = null;

    // First try to find by numeric ID
    const numericId = parseInt(idOrSlug);
    if (!isNaN(numericId)) {
      // It's a numeric ID, search by ID
      news = await prisma.news.findUnique({
        where: { id: numericId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });
    } else {
      // It's likely a slug, search by slug
      news = await prisma.news.findUnique({
        where: { slug: idOrSlug },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      });
    }

    // If found in database, return it
    if (news) {
      return NextResponse.json(news);
    }
    
    // If not found in database, check mock data
    const mockItem = mockNews.find(item => 
      (item.id === idOrSlug) || (item.slug === idOrSlug)
    );
    
    if (mockItem) {
      return NextResponse.json(mockItem);
    }

    // If not found anywhere, return 404
    return NextResponse.json(
      { error: "News not found" },
      { status: 404 }
    );
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

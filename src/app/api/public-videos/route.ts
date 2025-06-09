import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/public-videos
// Fetches videos with group_name "Main page" and isActive=true
// This endpoint does not require authentication
export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      where: {
        group_name: "Main page",
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(videos, { status: 200 });
  } catch (error) {
    console.error("Error fetching public videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch public videos" },
      { status: 500 }
    );
  }
}

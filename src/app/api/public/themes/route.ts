import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import prisma from "@/lib/prisma";

// Public endpoint for themes - no authentication required
export async function GET() {
  try {
    // Fetch all themes for public display
    const themes = await prisma.theme.findMany({
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json(themes);
  } catch (error) {
    console.error("Error fetching themes:", error);
    return NextResponse.json({ error: "Failed to fetch themes" }, { status: 500 });
  }
}

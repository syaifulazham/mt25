import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/auth-options'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// GET handler to fetch events for certificate templates
export async function GET() {
  try {
    // Authenticate user using NextAuth
    const session = await getServerSession(authOptions)
    
    // Check if user is authenticated and has required role
    if (!session?.user || !session.user.role || !["ADMIN", "OPERATOR"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      )
    }

    // Fetch all events that are active
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        scopeArea: true,
      },
      orderBy: {
        startDate: 'desc', // Most recent events first
      },
    });

    // Return the events
    return NextResponse.json({
      events: events.map(event => ({
        id: event.id,
        name: event.name,
        // Format dates for display
        date: `${event.startDate.toLocaleDateString()} - ${event.endDate.toLocaleDateString()}`,
        scopeArea: event.scopeArea
      }))
    });
  } catch (error) {
    console.error("Error fetching events for certificate templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

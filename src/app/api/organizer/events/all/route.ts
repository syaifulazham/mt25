import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

// Define interface for user with role
interface UserWithRole {
  id: number;
  name?: string;
  email: string;
  role?: string;
  [key: string]: any; // Allow other properties
}

// GET handler to fetch all events regardless of scope area
export async function GET() {
  try {
    // Verify user session and permissions
    const user = await getSessionUser({ redirectToLogin: false }) as UserWithRole;
    if (!user || !["ADMIN", "OPERATOR"].includes(user.role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all events with their associated zone/state information
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
      },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
          },
        },
        state: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Transform data to include scope area information
    const formattedEvents = events.map(event => ({
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      status: (event as any).status || "OPEN", // Cast to any to access status
      scopeArea: event.scopeArea,
      zoneId: event.zoneId || null,
      zoneName: event.zone?.name || null,
      stateId: event.stateId || null,
      stateName: event.state?.name || null,
    }));

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("Error fetching all events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

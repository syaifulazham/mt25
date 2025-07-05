import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Define interface for user with role
interface UserWithRole {
  id: number;
  name?: string;
  email: string;
  role?: string;
  [key: string]: any; // Allow other properties
}

// GET handler to fetch all events with scopeArea = ZONE
export async function GET() {
  try {
    // Verify user session and permissions
    const user = await getSessionUser({ redirectToLogin: false }) as UserWithRole;
    if (!user || !["ADMIN", "OPERATOR"].includes(user.role || "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all zone events
    const events = await prisma.event.findMany({
      where: {
        scopeArea: "ZONE",
        isActive: true,
      },
      include: {
        zone: {
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

    // Transform data to include zone name
    const formattedEvents = events.map(event => ({
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      status: (event as any).status || "OPEN", // Cast to any to access status
      zoneId: event.zoneId || 0,
      zoneName: event.zone?.name || "Unknown Zone",
    }));

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("Error fetching zone events:", error);
    return NextResponse.json(
      { error: "Failed to fetch zone events" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prismaExecute } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = 'force-dynamic';

// GET /api/organizer/reference-data/schools/[id] - Get school details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the school ID from the URL
    const schoolId = Number(params.id);
    
    if (isNaN(schoolId)) {
      return NextResponse.json({ error: "Invalid school ID" }, { status: 400 });
    }

    console.log(`Fetching school details for ID: ${schoolId}`);
    
    // Get school data from database using prismaExecute for connection management
    const school = await prismaExecute(prisma => prisma.school.findUnique({
      where: {
        id: schoolId
      },
      include: {
        state: true
      }
    }));

    if (!school) {
      console.log(`School with ID ${schoolId} not found`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    console.log(`School found:`, JSON.stringify(school, null, 2));

    // Format the response to match the expected SchoolDetails interface
    const schoolDetails = {
      id: school.id,
      name: school.name,
      address: school.address || "",
      city: school.city || "",
      postcode: school.postcode || "",
      state: school.state?.name || "",
      phone: "", // Add dummy data for fields not in schema
      email: "", // Add dummy data for fields not in schema
      level: school.level || "",
      category: school.category || "",
      code: school.code || "",
      district: "", // Add dummy data for fields not in schema
      ppd: school.ppd || "" // PPD is a string field, not an object relation
    };

    return NextResponse.json(schoolDetails);
  } catch (error) {
    console.error("Error fetching school details:", error);
    return NextResponse.json(
      { error: "Failed to fetch school details" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/auth-options";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0; // Disable all caching

// GET handler - Check if a contingent exists for an institution
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get institution type and ID from URL query string
    const searchParams = request.nextUrl.searchParams;
    const institutionType = searchParams.get("institutionType");
    const institutionIdStr = searchParams.get("institutionId");

    if (!institutionType || !institutionIdStr) {
      return NextResponse.json(
        { error: "Institution type and ID are required" },
        { status: 400 }
      );
    }

    const institutionId = parseInt(institutionIdStr, 10);

    if (isNaN(institutionId)) {
      return NextResponse.json(
        { error: "Invalid institution ID" },
        { status: 400 }
      );
    }

    console.log(`Checking if contingent exists for ${institutionType} with ID ${institutionId}`);

    // Check if a contingent exists for this institution
    let existingContingent;
    
    if (institutionType === "SCHOOL") {
      existingContingent = await prisma.contingent.findFirst({
        where: { schoolId: institutionId }
      });
    } else if (institutionType === "HIGHER_INSTITUTION") {
      existingContingent = await prisma.contingent.findFirst({
        where: { higherInstId: institutionId }
      });
    } else {
      return NextResponse.json(
        { error: "Invalid institution type. Must be SCHOOL or HIGHER_INSTITUTION" },
        { status: 400 }
      );
    }

    // Return result
    return NextResponse.json({
      exists: !!existingContingent,
      contingentId: existingContingent?.id || null
    });
  } catch (error) {
    console.error("Error checking contingent existence:", error);
    return NextResponse.json(
      { error: "Failed to check contingent existence" },
      { status: 500 }
    );
  }
}

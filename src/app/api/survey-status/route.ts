import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/session";

const prisma = new PrismaClient();

// POST /api/survey-status
export async function POST(
  request: NextRequest
) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { id } = data;
    
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ error: "Invalid survey ID" }, { status: 400 });
    }

    // Get current survey to check status
    const [existingSurvey] = await prisma.$queryRaw<any[]>`
      SELECT id, status FROM survey WHERE id = ${id}
    `;

    if (!existingSurvey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    // Toggle status between "draft" and "active"
    const newStatus = existingSurvey.status === "draft" ? "active" : "draft";
    
    // Update survey status
    await prisma.$executeRaw`
      UPDATE survey
      SET status = ${newStatus}, updatedAt = NOW()
      WHERE id = ${id}
    `;

    return NextResponse.json({
      message: "Survey status updated successfully",
      status: newStatus
    });
  } catch (error) {
    console.error(`Error updating survey status:`, error);
    return NextResponse.json(
      { error: "Failed to update survey status" },
      { status: 500 }
    );
  }
}

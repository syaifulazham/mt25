import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/session";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

// GET /api/survey-debug - Diagnostic endpoint for survey debugging
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get direct SQL survey data with status
    const surveysWithStatus = await prisma.$queryRaw`
      SELECT id, name, status FROM survey ORDER BY updatedAt DESC
    `;

    // Get question counts for each survey
    const questionCounts = await prisma.$queryRaw`
      SELECT surveyId, COUNT(*) as count 
      FROM survey_question 
      GROUP BY surveyId
    `;

    // Get answer counts
    const answerCounts = await prisma.$queryRaw`
      SELECT sq.surveyId, COUNT(DISTINCT sa.id) as count 
      FROM survey_answer sa
      JOIN survey_question sq ON sa.questionId = sq.id
      GROUP BY sq.surveyId
    `;

    return NextResponse.json({
      surveys: surveysWithStatus,
      questionCounts,
      answerCounts
    });
  } catch (error) {
    console.error(`Error in survey debug endpoint:`, error);
    return NextResponse.json(
      { error: "Failed to fetch survey debug data" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSessionUser } from "@/lib/session";

const prisma = new PrismaClient();

// GET /api/survey/[id]/contestants
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Get all contestant assignments for this survey using raw query
    const contestantAssignments = await prisma.$queryRaw`
      SELECT 
        sc.id, 
        sc.surveyId, 
        sc.contestantId,
        c.name AS contestantName,
        c.email AS contestantEmail,
        up.firstname AS participantFirstname, 
        up.lastname AS participantLastname
      FROM survey_contestants_composition sc
      JOIN contestant c ON sc.contestantId = c.id
      LEFT JOIN user_participant up ON c.userId = up.id
      WHERE sc.surveyId = ${id}
    `;

    return NextResponse.json(contestantAssignments);
  } catch (error) {
    console.error(`Error fetching survey contestants ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch survey contestants" },
      { status: 500 }
    );
  }
}

// PUT /api/survey/[id]/contestants
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const user = await getSessionUser({ redirectToLogin: false });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const data = await request.json();
    
    // Validate data
    if (!Array.isArray(data.contestantIds)) {
      return NextResponse.json(
        { error: "contestantIds must be an array" },
        { status: 400 }
      );
    }

    // Get current assignments with raw SQL
    const currentAssignments = await prisma.$queryRaw<{contestantId: number}[]>`
      SELECT contestantId FROM survey_contestants_composition 
      WHERE surveyId = ${id}
    `;
    
    const currentAssignmentIds = new Set(
      currentAssignments.map(a => Number(a.contestantId))
    );
    
    const newAssignmentIds = new Set(data.contestantIds);
    
    // Find contestants to add and remove
    const toAdd = data.contestantIds.filter(
      (cId: number) => !currentAssignmentIds.has(cId)
    );
    
    const toRemove = Array.from(currentAssignmentIds).filter(
      (cId) => !newAssignmentIds.has(cId)
    );
    
    // Start a transaction to update assignments using raw queries
    await prisma.$transaction(async (tx) => {
      // Remove assignments that are no longer selected
      if (toRemove.length > 0) {
        for (const contestantId of toRemove) {
          await tx.$executeRaw`
            DELETE FROM survey_contestants_composition 
            WHERE surveyId = ${id} AND contestantId = ${contestantId}
          `;
        }
      }
      
      // Add new assignments
      if (toAdd.length > 0) {
        for (const contestantId of toAdd) {
          await tx.$executeRaw`
            INSERT INTO survey_contestants_composition (surveyId, contestantId)
            VALUES (${id}, ${contestantId})
            ON DUPLICATE KEY UPDATE surveyId = surveyId
          `;
        }
      }
    });
    
    // Get updated assignments using raw SQL
    const updatedAssignments = await prisma.$queryRaw`
      SELECT 
        sc.id, 
        sc.surveyId, 
        sc.contestantId,
        c.name AS contestantName,
        c.email AS contestantEmail,
        up.firstname AS participantFirstname, 
        up.lastname AS participantLastname
      FROM survey_contestants_composition sc
      JOIN contestant c ON sc.contestantId = c.id
      LEFT JOIN user_participant up ON c.userId = up.id
      WHERE sc.surveyId = ${id}
    `;
    
    return NextResponse.json(updatedAssignments);
  } catch (error) {
    console.error(`Error updating survey contestants ${params.id}:`, error);
    return NextResponse.json(
      { error: "Failed to update survey contestants" },
      { status: 500 }
    );
  }
}
